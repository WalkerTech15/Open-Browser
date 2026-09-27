/** Snapshot of one window's navigation state, pushed from main to renderer. */
export interface NavigationState {
  /** Address-bar URL: the last requested URL, even if it failed to load. */
  url: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  error: string | null;
}

export type NavigationStateListener = (state: NavigationState) => void;
