import type { BrowserWindow } from 'electron';
import type { BrowserEngine } from '../../engines/interface/BrowserEngine';
import type { NavigationState } from '../../shared/types/navigationState';
import type { BrowserTabsState } from '../../shared/types/browserTabs';

export type BrowserEngineFactory = () => BrowserEngine;
export type TabManagerListener = (tabs: BrowserTabsState, activeState: NavigationState) => void;

interface ManagedTab {
  id: string;
  engine: BrowserEngine;
  state: NavigationState;
  unsubscribe: () => void;
}

const EMPTY_NAVIGATION_STATE: NavigationState = {
  url: '',
  isLoading: false,
  canGoBack: false,
  canGoForward: false,
  error: null
};

/** Owns the independent engines and selection state for one browser window. */
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

    const engine = this.createEngine();
    const tab: ManagedTab = {
      id: `tab-${this.nextId++}`,
      engine,
      state: engine.getState(),
      unsubscribe: () => {}
    };

    try {
      engine.attach(this.window, this.browserChromeHeight);
      engine.setVisible(false);
      tab.unsubscribe = engine.onStateChange((state) => {
        if (this.destroyed || !this.tabs.includes(tab)) return;
        tab.state = state;
        this.emit();
      });
      this.tabs.push(tab);
    } catch (error) {
      engine.destroy();
      throw error;
    }

    this.activateTab(tab.id);
    void engine.navigate(url);
    return tab.id;
  }

  activateTab(tabId: string): boolean {
    if (this.destroyed) return false;
    const next = this.tabs.find((tab) => tab.id === tabId);
    if (!next) return false;

    if (this.activeTabId === next.id) {
      next.engine.setVisible(true);
      return true;
    }

    this.activeTab()?.engine.setVisible(false);
    this.activeTabId = next.id;
    next.engine.setVisible(true);
    this.emit();
    return true;
  }

  closeTab(tabId: string): boolean {
    if (this.destroyed) return false;
    const index = this.tabs.findIndex((tab) => tab.id === tabId);
    if (index < 0) return false;

    const [closed] = this.tabs.splice(index, 1);
    const wasActive = this.activeTabId === closed.id;
    closed.unsubscribe();
    closed.engine.setVisible(false);
    closed.engine.destroy();

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
    if (tab) void tab.engine.navigate(url);
  }

  goBack(): void {
    this.activeTab()?.engine.goBack();
  }

  goForward(): void {
    this.activeTab()?.engine.goForward();
  }

  reload(): void {
    this.activeTab()?.engine.reload();
  }

  stop(): void {
    this.activeTab()?.engine.stop();
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
      tab.engine.setVisible(false);
      tab.engine.destroy();
    }
    this.tabs.length = 0;
    this.activeTabId = null;
    this.listeners.clear();
  }

  private activeTab(): ManagedTab | undefined {
    return this.tabs.find((tab) => tab.id === this.activeTabId);
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
