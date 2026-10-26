import type { BrowserWindow } from 'electron';
import { ChromiumEngine } from '../../engines/chromium/ChromiumEngine';
import { IpcChannel } from '../../shared/constants/ipcChannels';
import { resolveAddressInput } from '../navigation/navigation';
import { TabManager, type BrowserEngineFactory } from '../tabs/TabManager';

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

  constructor(window: BrowserWindow, createEngine: BrowserEngineFactory = () => new ChromiumEngine()) {
    this.window = window;
    this.webContentsId = window.webContents.id;
    this.tabManager = new TabManager(window, BROWSER_CHROME_HEIGHT, createEngine, START_URL);

    this.unsubscribe = this.tabManager.onChange(() => this.pushState());
    controllers.set(this.webContentsId, this);
    window.webContents.once('did-finish-load', () => this.pushState());
    window.on('closed', () => this.dispose());

    this.tabManager.createTab(START_URL);
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
