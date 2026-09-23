import type { BrowserWindow } from 'electron';

export interface NavigationState {
  /** Address-bar URL: the last requested URL, even if it failed to load. */
  url: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  error: string | null;
}

export type NavigationStateListener = (state: NavigationState) => void;

export interface BrowserEngine {
  readonly name: string;

  /** Mounts the engine's content view into a window, below a toolbar of the given height. */
  attach(window: BrowserWindow, toolbarHeight: number): void;

  navigate(url: string): Promise<void>;
  goBack(): void;
  goForward(): void;
  reload(): void;
  stop(): void;

  getState(): NavigationState;
  onStateChange(listener: NavigationStateListener): () => void;

  destroy(): void;
}
