import { dialog, Menu } from 'electron';
import type { BrowserWindow } from 'electron';
import { ChromiumEngine } from '../../engines/chromium/ChromiumEngine';
import { IpcChannel } from '../../shared/constants/ipcChannels';
import { resolveAddressInput } from '../navigation/navigation';
import { TabManager, type BrowserEngineFactory } from '../tabs/TabManager';
import { SessionStore, type BrowserSessionSnapshot } from '../sessions/SessionStore';
import { ProfileStore } from '../profiles/ProfileStore';
import type { BrowserProfile } from '../../shared/types/browserProfiles';
import { captureWarningStore, warningWindowTitle } from '../../services/permissions/captureWarning';

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
  private tabManager!: TabManager;
  private unsubscribe: () => void = () => {};
  private unsubscribeCaptureWarning: () => void = () => {};
  private disposed = false;
  private sessionStore?: SessionStore;
  private readonly lastUrlByTab = new Map<string, string>();
  private lastSavedSessionKey = '';
  private activeProfile: BrowserProfile = { id: 'personal', name: 'Personal', createdAt: 0 };

  constructor(
    window: BrowserWindow,
    private readonly createEngineForProfile: (profileId: string) => ReturnType<BrowserEngineFactory> = () => new ChromiumEngine(),
    sessionStore?: SessionStore,
    initialSession?: BrowserSessionSnapshot,
    private readonly profileStore?: ProfileStore,
    activeProfile?: BrowserProfile
  ) {
    this.window = window;
    this.webContentsId = window.webContents.id;
    this.sessionStore = sessionStore;
    if (activeProfile) this.activeProfile = activeProfile;
    controllers.set(this.webContentsId, this);
    window.webContents.once('did-finish-load', () => this.pushState());
    window.on('closed', () => this.dispose());
    this.startTabManager(initialSession);
    this.unsubscribeCaptureWarning = captureWarningStore.subscribe(() => {
      this.updateWindowTitle();
      this.pushState();
    });
    this.updateWindowTitle();
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
        enabled: true,
        click: () => { void this.confirmClearHistoryAndSession(); }
      }
    ];
    Menu.buildFromTemplate(template).popup({ window: this.window });
  }

  showProfilesMenu(): void {
    if (!this.profileStore) return;
    const template: Electron.MenuItemConstructorOptions[] = [
      ...this.profileStore.profiles().map((profile) => ({
        label: profile.name,
        type: 'radio' as const,
        checked: profile.id === this.activeProfile.id,
        click: () => { void this.switchProfile(profile.id); }
      })),
      { type: 'separator' },
      { label: 'Create profile…', click: () => { void this.createAndSwitchProfile(); } }
    ];
    Menu.buildFromTemplate(template).popup({ window: this.window });
  }

  async showWorkspacesMenu(): Promise<void> {
    if (!this.profileStore || this.disposed) return;
    try {
      const store = this.profileStore.workspaceStore(this.activeProfile.id);
      const workspaces = await store.load();
      if (this.disposed || this.window.isDestroyed()) return;
      const currentUrls = this.tabManager.getTabsState().tabs
        .map(({ url }) => url)
        .filter((url) => /^https?:\/\//i.test(url));
      const template: Electron.MenuItemConstructorOptions[] = [
        { label: 'Saved workspaces', enabled: false },
        ...(workspaces.length > 0
          ? workspaces.map((workspace) => ({
            label: `${workspace.name} (${workspace.urls.length} tabs)`,
            click: () => this.openWorkspace(workspace.id)
          }))
          : [{ label: 'No saved workspaces', enabled: false }]),
        { type: 'separator' },
        {
          label: 'Save current tabs as a workspace',
          enabled: currentUrls.length > 0,
          click: () => { void this.saveCurrentWorkspace(); }
        }
      ];
      Menu.buildFromTemplate(template).popup({ window: this.window });
    } catch (error) {
      console.error('Could not load browser workspaces.', error);
      if (!this.window.isDestroyed()) {
        await dialog.showMessageBox(this.window, {
          type: 'error',
          message: 'Could not load workspaces.',
          detail: 'Workspace data could not be read. Your current tabs are still open.',
          buttons: ['OK'],
          noLink: true
        });
      }
    }
  }

  private async saveCurrentWorkspace(): Promise<void> {
    if (!this.profileStore || this.disposed) return;
    const urls = this.tabManager.getTabsState().tabs
      .map(({ url }) => url)
      .filter((url) => /^https?:\/\//i.test(url));
    try {
      const workspace = await this.profileStore.workspaceStore(this.activeProfile.id).save(urls);
      if (!this.window.isDestroyed()) {
        await dialog.showMessageBox(this.window, {
          type: 'info',
          message: `${workspace.name} saved`,
          detail: `${workspace.urls.length} tab URLs were saved in the ${this.activeProfile.name} profile.`,
          buttons: ['OK'],
          noLink: true
        });
      }
    } catch (error) {
      console.error('Could not save the browser workspace.', error);
      if (!this.window.isDestroyed()) {
        await dialog.showMessageBox(this.window, {
          type: 'error',
          message: 'Could not save the workspace.',
          detail: 'Check available disk space and try again.',
          buttons: ['OK'],
          noLink: true
        });
      }
    }
  }

  private async openWorkspace(workspaceId: string): Promise<void> {
    if (!this.profileStore || this.disposed) return;
    try {
      const workspaces = await this.profileStore.workspaceStore(this.activeProfile.id).load();
      const workspace = workspaces.find(({ id }) => id === workspaceId);
      if (!workspace || this.disposed) return;
      const result = await dialog.showMessageBox(this.window, {
        type: 'warning',
        message: `Open ${workspace.name}?`,
        detail: 'Opening this workspace replaces the tabs currently open in this window. Save them as a workspace first if you want to keep them.',
        buttons: ['Cancel', 'Replace tabs'],
        defaultId: 0,
        cancelId: 0,
        noLink: true
      });
      if (result.response !== 1 || this.disposed) return;
      this.lastUrlByTab.clear();
      this.tabManager.replaceTabs(workspace.urls);
    } catch (error) {
      console.error('Could not open the browser workspace.', error);
      if (!this.window.isDestroyed()) {
        await dialog.showMessageBox(this.window, {
          type: 'error',
          message: 'Could not open the workspace.',
          detail: 'Your current tabs are still open. Check the saved workspace data and try again.',
          buttons: ['OK'],
          noLink: true
        });
      }
    }
  }

  async switchProfile(profileId: string): Promise<void> {
    if (!this.profileStore || profileId === this.activeProfile.id || this.disposed) return;
    const profile = this.profileStore.profiles().find((item) => item.id === profileId);
    if (!profile) return;

    try {
      const nextStore = this.profileStore.sessionStore(profile.id);
      const nextSnapshot = await nextStore.load();
      await this.sessionStore?.flush();
      await this.profileStore.activate(profile.id);

      this.unsubscribe();
      this.tabManager.destroy();
      this.lastUrlByTab.clear();
      this.activeProfile = profile;
      this.sessionStore = nextStore;
      this.startTabManager(nextSnapshot);
      this.updateWindowTitle();
    } catch (error) {
      console.error('Could not switch browser profiles.', error);
      if (!this.window.isDestroyed()) {
        await dialog.showMessageBox(this.window, {
          type: 'error',
          message: 'Could not switch profiles.',
          detail: 'The current profile is still open. Check available disk space and try again.',
          buttons: ['OK'],
          noLink: true
        });
      }
    }
  }

  private async createAndSwitchProfile(): Promise<void> {
    if (!this.profileStore) return;
    try {
      const profile = await this.profileStore.createProfile();
      await this.switchProfile(profile.id);
    } catch (error) {
      console.error('Could not create a browser profile.', error);
      if (!this.window.isDestroyed()) {
        await dialog.showMessageBox(this.window, {
          type: 'error',
          message: 'Could not create a profile.',
          detail: 'Check available disk space and try again.',
          buttons: ['OK'],
          noLink: true
        });
      }
    }
  }

  private startTabManager(initialSession?: BrowserSessionSnapshot): void {
    const profileId = this.activeProfile.id;
    const createEngine = (): ReturnType<BrowserEngineFactory> => this.createEngineForProfile(profileId);
    this.tabManager = new TabManager(this.window, BROWSER_CHROME_HEIGHT, createEngine, START_URL);
    this.unsubscribe = this.tabManager.onChange((tabs) => {
      this.pushState();
      this.persistTabState(tabs);
      this.recordChangedUrls(tabs.tabs.map((tab) => ({ id: tab.id, url: tab.url })));
    });

    if (initialSession?.tabs.length) {
      initialSession.tabs.forEach((url, index) => this.lastUrlByTab.set(`tab-${index + 1}`, url));
      this.tabManager.restoreTabs(initialSession.tabs, initialSession.activeTabIndex);
    } else {
      this.tabManager.createTab(START_URL);
    }
    this.lastSavedSessionKey = this.sessionKey();
  }

  private updateWindowTitle(): void {
    if (!this.window.isDestroyed()) {
      this.window.setTitle(warningWindowTitle(captureWarningStore.snapshot(), `${this.activeProfile.name} — Open Browser`));
    }
  }

  async clearHistoryAndSession(): Promise<void> {
    if (!this.sessionStore) return;
    await this.sessionStore.clearHistoryAndSession();
    if (this.profileStore) await this.profileStore.workspaceStore(this.activeProfile.id).clear();
    this.lastSavedSessionKey = this.sessionKey();
  }

  private async confirmClearHistoryAndSession(): Promise<void> {
    const result = await dialog.showMessageBox(this.window, {
      type: 'warning',
      message: 'Clear history, saved tabs, and workspaces?',
      detail: 'Your open pages stay open. Saved workspaces and the session restore list for this profile are removed.',
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
    webContents.send(IpcChannel.TabsState, { ...this.tabManager.getTabsState(), sessionMediaAccess: captureWarningStore.snapshot() });
  }

  private dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.unsubscribe();
    this.unsubscribeCaptureWarning();
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
