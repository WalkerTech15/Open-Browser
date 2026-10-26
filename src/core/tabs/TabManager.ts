import type { BrowserWindow } from 'electron';
import type { BrowserEngine } from '../../engines/interface/BrowserEngine';
import type { NavigationState } from '../../shared/types/navigationState';
import type { BrowserTabsState } from '../../shared/types/browserTabs';

export type BrowserEngineFactory = () => BrowserEngine;
export type TabManagerListener = (tabs: BrowserTabsState, activeState: NavigationState) => void;

interface ManagedTab {
  id: string;
  engine: BrowserEngine | null;
  state: NavigationState;
  unsubscribe: () => void;
  pendingInitialNavigation: boolean;
}

const EMPTY_NAVIGATION_STATE: NavigationState = {
  url: '',
  isLoading: false,
  canGoBack: false,
  canGoForward: false,
  error: null
};

/** Owns tab metadata, on-demand engines, and selection state for one window. */
export class TabManager {
  private readonly tabs: ManagedTab[] = [];
  private readonly listeners = new Set<TabManagerListener>();
  private nextId = 1;
  private activeTabId: string | null = null;
  private destroyed = false;

  constructor(
    private readonly window: BrowserWindow,
    private readonly browserChromeHeight: number,
    private readonly createEngine: BrowserEngineFactory,
    private readonly startUrl: string
  ) {}

  createTab(url = this.startUrl): string {
    if (this.destroyed) throw new Error('Cannot create a tab after the tab manager is destroyed.');
    const tab = this.addTab(url, false);
    this.activateTab(tab.id);
    this.navigateTab(tab, url);
    return tab.id;
  }

  /** Restores tab metadata but initially loads only the previously active page. */
  restoreTabs(urls: string[], activeTabIndex: number): void {
    if (this.destroyed) return;
    for (const url of urls) this.addTab(url, true);
    if (this.tabs.length === 0) {
      this.createTab(this.startUrl);
      return;
    }
    const index = Math.min(Math.max(0, Math.trunc(activeTabIndex)), this.tabs.length - 1);
    this.activateTab(this.tabs[index].id);
  }

  private addTab(url: string, pendingInitialNavigation: boolean): ManagedTab {
    const tab: ManagedTab = {
      id: `tab-${this.nextId++}`,
      engine: null,
      state: { ...EMPTY_NAVIGATION_STATE, url: pendingInitialNavigation ? url : '' },
      unsubscribe: () => {},
      pendingInitialNavigation
    };
    this.tabs.push(tab);
    return tab;
  }

  activateTab(tabId: string): boolean {
    if (this.destroyed) return false;
    const next = this.tabs.find((tab) => tab.id === tabId);
    if (!next) return false;

    this.ensureEngine(next);

    if (this.activeTabId === next.id) {
      next.engine?.setVisible(true);
      this.loadPendingTab(next);
      return true;
    }

    this.activeTab()?.engine?.setVisible(false);
    this.activeTabId = next.id;
    next.engine?.setVisible(true);
    this.emit();
    this.loadPendingTab(next);
    return true;
  }

  closeTab(tabId: string): boolean {
    if (this.destroyed) return false;
    const index = this.tabs.findIndex((tab) => tab.id === tabId);
    if (index < 0) return false;

    const [closed] = this.tabs.splice(index, 1);
    const wasActive = this.activeTabId === closed.id;
    closed.unsubscribe();
    closed.engine?.setVisible(false);
    closed.engine?.destroy();

    if (wasActive) this.activeTabId = null;

    if (this.tabs.length === 0) {
      // Keep the browser window usable after its last tab is closed.
      this.createTab(this.startUrl);
    } else if (wasActive) {
      const replacementIndex = Math.max(0, index - 1);
      this.activateTab(this.tabs[replacementIndex].id);
    } else {
      this.emit();
    }

    return true;
  }

  getTabsState(): BrowserTabsState {
    return {
      activeTabId: this.activeTabId,
      tabs: this.tabs.map((tab) => ({
        id: tab.id,
        label: tabLabel(tab.state.url),
        url: tab.state.url,
        isActive: tab.id === this.activeTabId,
        isLoading: tab.state.isLoading
      }))
    };
  }

  getActiveNavigationState(): NavigationState {
    return this.activeTab()?.state ?? EMPTY_NAVIGATION_STATE;
  }

  navigateActive(url: string): void {
    const tab = this.activeTab();
    if (tab) this.navigateTab(tab, url);
  }

  goBack(): void {
    this.activeTab()?.engine?.goBack();
  }

  goForward(): void {
    this.activeTab()?.engine?.goForward();
  }

  reload(): void {
    this.activeTab()?.engine?.reload();
  }

  stop(): void {
    this.activeTab()?.engine?.stop();
  }

  onChange(listener: TabManagerListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const tab of this.tabs) {
      tab.unsubscribe();
      tab.engine?.setVisible(false);
      tab.engine?.destroy();
    }
    this.tabs.length = 0;
    this.activeTabId = null;
    this.listeners.clear();
  }

  private activeTab(): ManagedTab | undefined {
    return this.tabs.find((tab) => tab.id === this.activeTabId);
  }

  private loadPendingTab(tab: ManagedTab): void {
    if (tab.pendingInitialNavigation) this.navigateTab(tab, tab.state.url);
  }

  /** Restored background tabs stay metadata-only until the user selects them. */
  private ensureEngine(tab: ManagedTab): void {
    if (tab.engine) return;
    const engine = this.createEngine();
    try {
      engine.attach(this.window, this.browserChromeHeight);
      engine.setVisible(false);
      tab.unsubscribe = engine.onStateChange((state) => {
        if (this.destroyed || !this.tabs.includes(tab)) return;
        tab.state = state;
        this.emit();
      });
      tab.state = { ...engine.getState(), url: tab.state.url || engine.getState().url };
      tab.engine = engine;
    } catch (error) {
      engine.destroy();
      throw error;
    }
  }

  private navigateTab(tab: ManagedTab, url: string): void {
    tab.pendingInitialNavigation = false;
    if (!tab.engine) throw new Error('Cannot navigate a tab before its engine is created.');
    void tab.engine.navigate(url);
  }

  private emit(): void {
    const tabs = this.getTabsState();
    const activeState = this.getActiveNavigationState();
    for (const listener of this.listeners) listener(tabs, activeState);
  }
}

function tabLabel(url: string): string {
  if (!url) return 'New tab';
  try {
    return new URL(url).hostname.replace(/^www\./i, '') || 'New tab';
  } catch {
    return 'New tab';
  }
}
