import { WebContentsView } from 'electron';
import type { BrowserWindow } from 'electron';
import type { BrowserEngine, NavigationState, NavigationStateListener } from './BrowserEngine';
import { isNavigableUrl } from './navigation';

const ABORTED_ERROR_CODE = -3; // ERR_ABORTED, expected when the user hits Stop.

function errorPageDataUrl(url: string, description: string): string {
  const safeUrl = escapeHtml(url);
  const safeDescription = escapeHtml(description);
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Can't reach this page</title>
<style>
  body { font-family: system-ui, sans-serif; background: #111318; color: #f3f4f6; display: grid; place-content: center; min-height: 100vh; margin: 0; text-align: center; padding: 24px; }
  h1 { font-size: 20px; margin: 0 0 8px; }
  p { color: #aab2c0; margin: 0; word-break: break-word; }
</style></head>
<body><h1>Can't reach this page</h1><p>${safeUrl}</p><p>${safeDescription}</p></body></html>`;
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export class ChromiumEngine implements BrowserEngine {
  readonly name = 'chromium';

  private view: WebContentsView | null = null;
  private window: BrowserWindow | null = null;
  private toolbarHeight = 0;
  private listeners = new Set<NavigationStateListener>();
  private lastRequestedUrl = '';

  private state: NavigationState = {
    url: '',
    isLoading: false,
    canGoBack: false,
    canGoForward: false,
    error: null
  };

  attach(window: BrowserWindow, toolbarHeight: number): void {
    this.window = window;
    this.toolbarHeight = toolbarHeight;

    const view = new WebContentsView({
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    });
    this.view = view;

    window.contentView.addChildView(view);
    this.layout();
    window.on('resize', this.layout);

    const wc = view.webContents;
    wc.on('did-start-loading', () => this.updateState({ isLoading: true }));
    wc.on('did-navigate', (_event, url) => this.handleNavigated(url));
    wc.on('did-navigate-in-page', (_event, url) => this.handleNavigated(url));
    wc.on('did-stop-loading', () => {
      this.updateState({
        isLoading: false,
        canGoBack: wc.navigationHistory.canGoBack(),
        canGoForward: wc.navigationHistory.canGoForward()
      });
    });
    wc.on('did-fail-load', (_event, errorCode, errorDescription, _validatedUrl, isMainFrame) => {
      if (errorCode === ABORTED_ERROR_CODE || !isMainFrame) return;
      const failedUrl = this.lastRequestedUrl;
      this.updateState({ isLoading: false, error: errorDescription || 'Failed to load page' });
      void wc.loadURL(errorPageDataUrl(failedUrl, errorDescription || 'Failed to load page'));
    });
  }

  private layout = (): void => {
    if (!this.window || !this.view) return;
    const bounds = this.window.getContentBounds();
    this.view.setBounds({
      x: 0,
      y: this.toolbarHeight,
      width: bounds.width,
      height: Math.max(0, bounds.height - this.toolbarHeight)
    });
  };

  private handleNavigated(url: string): void {
    if (url.startsWith('data:')) return; // internal error page, not a real navigation
    this.lastRequestedUrl = url;
    const wc = this.view?.webContents;
    this.updateState({
      url,
      error: null,
      canGoBack: wc?.navigationHistory.canGoBack() ?? false,
      canGoForward: wc?.navigationHistory.canGoForward() ?? false
    });
  }

  async navigate(url: string): Promise<void> {
    if (!this.view) throw new Error('ChromiumEngine is not attached to a window.');
    if (!isNavigableUrl(url)) throw new Error(`Refusing to navigate to unsupported URL: ${url}`);

    this.lastRequestedUrl = url;
    this.updateState({ url, isLoading: true, error: null });
    await this.view.webContents.loadURL(url);
  }

  goBack(): void {
    const history = this.view?.webContents.navigationHistory;
    if (history?.canGoBack()) history.goBack();
  }

  goForward(): void {
    const history = this.view?.webContents.navigationHistory;
    if (history?.canGoForward()) history.goForward();
  }

  reload(): void {
    if (!this.view) return;
    if (this.state.error && this.lastRequestedUrl) {
      void this.navigate(this.lastRequestedUrl);
      return;
    }
    this.view.webContents.reload();
  }

  stop(): void {
    this.view?.webContents.stop();
  }

  getState(): NavigationState {
    return this.state;
  }

  onStateChange(listener: NavigationStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  destroy(): void {
    this.window?.off('resize', this.layout);
    if (this.window && this.view) {
      this.window.contentView.removeChildView(this.view);
    }
    this.view?.webContents.close();
    this.view = null;
    this.window = null;
    this.listeners.clear();
  }

  private updateState(patch: Partial<NavigationState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener(this.state);
  }
}
