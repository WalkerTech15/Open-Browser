import { dialog, Menu } from 'electron';
import type { BrowserWindow } from 'electron';
import { ChromiumEngine } from '../../engines/chromium/ChromiumEngine';
import { IpcChannel } from '../../shared/constants/ipcChannels';
import { resolveAddressInput } from '../navigation/navigation';
import { TabManager, type BrowserEngineFactory } from '../tabs/TabManager';
import { SessionStore, type BrowserSessionSnapshot } from '../sessions/SessionStore';

const BROWSER_CHROME_HEIGHT = 96;
const START_URL = 'https://duckduckgo.com';

const controllers = new Map<number, BrowserWindowController>();

/**
 * Looks up the controller for a toolbar renderer using Electron's sender ID.
 * Renderer-provided window ownership is never trusted.
 */
export function getBrowserWindowController(webContentsId: number): BrowserWindowController | undefined {
  return controllers.get(webContentsId);
}

/** Owns one window's tabs and forwards active-tab state to its toolbar. */
export class BrowserWindowController {
  private readonly window: BrowserWindow;
  private readonly webContentsId: number;
  private readonly tabManager: TabManager;
  private readonly unsubscribe: () => void;
  private disposed = false;
  private readonly sessionStore?: SessionStore;
  private readonly lastUrlByTab = new Map<string, string>();
  private lastSavedSessionKey = '';

  constructor(
    window: BrowserWindow,
    createEngine: BrowserEngineFactory = () => new ChromiumEngine(),
    sessionStore?: SessionStore,
    initialSession?: BrowserSessionSnapshot
  ) {
    this.window = window;
    this.webContentsId = window.webContents.id;
    this.tabManager = new TabManager(window, BROWSER_CHROME_HEIGHT, createEngine, START_URL);
    this.sessionStore = sessionStore;

    this.unsubscribe = this.tabManager.onChange((tabs) => {
      this.pushState();
      this.persistTabState(tabs);
      this.recordChangedUrls(tabs.tabs.map((tab) => ({ id: tab.id, url: tab.url })));
    });
    controllers.set(this.webContentsId, this);
    window.webContents.once('did-finish-load', () => this.pushState());
    window.on('closed', () => this.dispose());

    if (initialSession?.tabs.length) {
      // Seed the URL cache so restoring a page does not create a new history visit.
      initialSession.tabs.forEach((url, index) => this.lastUrlByTab.set(`tab-${index + 1}`, url));
      this.tabManager.restoreTabs(initialSession.tabs, initialSession.activeTabIndex);
    } else {
      this.tabManager.createTab(START_URL);
    }
    this.lastSavedSessionKey = this.sessionKey();
  }

  /** Resolves free-form address-bar input before navigating the active tab. */
  handleNavigate(rawInput: string): void {
    const target = resolveAddressInput(rawInput);
    if (target) this.tabManager.navigateActive(target);
  }

  createTab(): void {
    this.tabManager.createTab();
  }

  activateTab(tabId: string): void {
    this.tabManager.activateTab(tabId);
  }

  closeTab(tabId: string): void {
    this.tabManager.closeTab(tabId);
  }

  goBack(): void {
    this.tabManager.goBack();
  }

  goForward(): void {
    this.tabManager.goForward();
  }

  reload(): void {
    this.tabManager.reload();
  }

  stop(): void {
    this.tabManager.stop();
  }

  showHistoryMenu(): void {
    const entries = this.sessionStore?.history() ?? [];
    const hasSavedTabs = (this.sessionStore?.snapshot().tabs.length ?? 0) > 0;
    const template: Electron.MenuItemConstructorOptions[] = [
      { label: 'Recently visited', enabled: false },
      ...(entries.length > 0
        ? entries.map((entry) => ({
          label: historyEntryLabel(entry.url, entry.visitedAt),
          click: () => this.handleNavigate(entry.url)
        }))
        : [{ label: 'No history yet', enabled: false }]),
      { type: 'separator' },
      {
        label: 'Clear history and saved tabs…',
        enabled: entries.length > 0 || hasSavedTabs,
        click: () => { void this.confirmClearHistoryAndSession(); }
      }
    ];
    Menu.buildFromTemplate(template).popup({ window: this.window });
  }

  async clearHistoryAndSession(): Promise<void> {
    if (!this.sessionStore) return;
    await this.sessionStore.clearHistoryAndSession();
    this.lastSavedSessionKey = this.sessionKey();
  }

  private async confirmClearHistoryAndSession(): Promise<void> {
    const result = await dialog.showMessageBox(this.window, {
      type: 'warning',
      message: 'Clear browsing history and saved tabs?',
      detail: 'Your open pages will stay open, but they will not be restored next time.',
      buttons: ['Cancel', 'Clear'],
      defaultId: 0,
      cancelId: 0,
      noLink: true
    });
    if (result.response !== 1) return;
    try {
      await this.clearHistoryAndSession();
    } catch (error) {
      console.error('Could not clear browsing history and saved tabs.', error);
      await dialog.showMessageBox(this.window, {
        type: 'error',
        message: 'Could not clear browsing data.',
        detail: 'Please check available disk space and try again.',
        buttons: ['OK'],
        noLink: true
      });
    }
  }

  private persistTabState(state: ReturnType<TabManager['getTabsState']>): void {
    if (!this.sessionStore) return;
    const session = sessionSnapshot(state);
    const key = JSON.stringify(session);
    if (key === this.lastSavedSessionKey) return;
    this.lastSavedSessionKey = key;
    void this.sessionStore.saveSession(session).catch((error) => {
      console.error('Could not save the browser session.', error);
    });
  }

  private recordChangedUrls(tabs: Array<{ id: string; url: string }>): void {
    if (!this.sessionStore) return;
    const currentIds = new Set(tabs.map((tab) => tab.id));
    for (const id of this.lastUrlByTab.keys()) if (!currentIds.has(id)) this.lastUrlByTab.delete(id);

    for (const tab of tabs) {
      const previousUrl = this.lastUrlByTab.get(tab.id);
      this.lastUrlByTab.set(tab.id, tab.url);
      if (tab.url && previousUrl !== undefined && previousUrl !== tab.url) {
        void this.sessionStore.recordVisit(tab.url).catch((error) => {
          console.error('Could not save a browsing-history entry.', error);
        });
      } else if (tab.url && previousUrl === undefined) {
        void this.sessionStore.recordVisit(tab.url).catch((error) => {
          console.error('Could not save a browsing-history entry.', error);
        });
      }
    }
  }

  private sessionKey(): string {
    return JSON.stringify(sessionSnapshot(this.tabManager.getTabsState()));
  }

  private pushState(): void {
    // Chromium may queue events while a window is closing. Never send to a
    // destroyed toolbar renderer.
    if (this.window.isDestroyed()) return;
    const webContents = this.window.webContents;
    if (webContents.isDestroyed()) return;
    webContents.send(IpcChannel.State, this.tabManager.getActiveNavigationState());
    webContents.send(IpcChannel.TabsState, this.tabManager.getTabsState());
  }

  private dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.unsubscribe();
    this.tabManager.destroy();
    controllers.delete(this.webContentsId);
  }
}

function historyEntryLabel(value: string, visitedAt: number): string {
  try {
    const url = new URL(value);
    const page = `${url.hostname}${url.pathname === '/' ? '' : url.pathname}`;
    return `${page.slice(0, 140)} — ${new Date(visitedAt).toLocaleString()}`;
  } catch {
    return 'Previously visited page';
  }
}

function sessionSnapshot(state: ReturnType<TabManager['getTabsState']>): BrowserSessionSnapshot {
  const tabs = state.tabs.filter((tab) => tab.url && /^https?:\/\//i.test(tab.url));
  const activeTabIndex = tabs.findIndex((tab) => tab.id === state.activeTabId);
  return { tabs: tabs.map((tab) => tab.url), activeTabIndex: Math.max(0, activeTabIndex) };
}
