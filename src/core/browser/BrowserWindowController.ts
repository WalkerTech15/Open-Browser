import type { BrowserWindow } from 'electron';
import type { BrowserEngine } from '../../engines/interface/BrowserEngine';
import { IpcChannel } from '../../shared/constants/ipcChannels';
import { resolveAddressInput } from '../navigation/navigation';

const TOOLBAR_HEIGHT = 56;
const START_URL = 'https://duckduckgo.com';

const controllers = new Map<number, BrowserWindowController>();

/**
 * Looks up the controller that owns a given webContents id. Used by the IPC
 * handlers (src/main/security/ipcHandlers.ts) to find the right controller
 * for whichever window actually sent the message — never trust an id the
 * renderer claims, only Electron's own `event.sender`.
 */
export function getBrowserWindowController(webContentsId: number): BrowserWindowController | undefined {
  return controllers.get(webContentsId);
}

/**
 * Wires one BrowserWindow to one BrowserEngine: attaches the engine's
 * content view below the toolbar, forwards engine state to the renderer over
 * IPC, and cleans up when the window closes.
 *
 * This is the engine-agnostic "browser session" for a single window — it
 * only depends on the BrowserEngine interface, so it works the same whether
 * the engine is Chromium or (in the future) Gecko. Multi-tab/session support
 * would build on top of this, one controller per tab — see
 * src/core/tabs/README.md and src/core/sessions/README.md.
 */
export class BrowserWindowController {
  private readonly window: BrowserWindow;
  private readonly engine: BrowserEngine;
  private readonly unsubscribe: () => void;

  constructor(window: BrowserWindow, engine: BrowserEngine) {
    this.window = window;
    this.engine = engine;

    engine.attach(window, TOOLBAR_HEIGHT);
    controllers.set(window.webContents.id, this);

    this.unsubscribe = engine.onStateChange(() => this.pushState());
    window.webContents.once('did-finish-load', () => this.pushState());
    window.on('closed', () => this.dispose());

    void engine.navigate(START_URL);
  }

  /** Resolves free-form address-bar input, then delegates to the engine. */
  handleNavigate(rawInput: string): void {
    const target = resolveAddressInput(rawInput);
    if (target) void this.engine.navigate(target);
  }

  goBack(): void {
    this.engine.goBack();
  }

  goForward(): void {
    this.engine.goForward();
  }

  reload(): void {
    this.engine.reload();
  }

  stop(): void {
    this.engine.stop();
  }

  private pushState(): void {
    // Both checks matter: the window and its webContents can each report
    // destroyed independently depending on teardown order, and this can run
    // from a queued callback (e.g. 'did-finish-load') that fires just after
    // the window was closed.
    if (this.window.isDestroyed()) return;
    const webContents = this.window.webContents;
    if (webContents.isDestroyed()) return;
    webContents.send(IpcChannel.State, this.engine.getState());
  }

  private dispose(): void {
    this.unsubscribe();
    this.engine.destroy();
    controllers.delete(this.window.webContents.id);
  }
}
