import type { NavigationState } from './navigationState';
import type { BrowserTabsState } from './browserTabs';

/**
 * The renderer-facing API exposed on `window.openBrowser` by the preload
 * script (src/main/security/preload.ts). This is the entire surface a
 * renderer can use to reach the main process — see docs/SECURITY.md.
 */
export interface OpenBrowserApi {
  navigate(input: string): void;
  goBack(): void;
  goForward(): void;
  reload(): void;
  stop(): void;
  onState(listener: (state: NavigationState) => void): () => void;
  newTab(): void;
  activateTab(tabId: string): void;
  closeTab(tabId: string): void;
  onTabs(listener: (state: BrowserTabsState) => void): () => void;
  showHistory(): void;
  showProfiles(): void;
  showWorkspaces(): void;
}
