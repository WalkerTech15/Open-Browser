import type { PossibleMediaAccess } from './mediaAccess';

/** Public, renderer-safe summary of one open browser tab. */
export interface BrowserTabSummary {
  id: string;
  label: string;
  url: string;
  isActive: boolean;
  isLoading: boolean;
  possibleMediaAccess?: PossibleMediaAccess;
}

/** Snapshot of the tabs owned by one browser window. */
export interface BrowserTabsState {
  tabs: BrowserTabSummary[];
  activeTabId: string | null;
  sessionMediaAccess?: PossibleMediaAccess;
}
