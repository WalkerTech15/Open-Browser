import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { BrowserWindow } from 'electron';
import type { BrowserEngine } from '../../src/engines/interface/BrowserEngine';
import type { NavigationState, NavigationStateListener } from '../../src/shared/types/navigationState';
import { TabManager } from '../../src/core/tabs/TabManager';

const START_URL = 'https://duckduckgo.com';

function createFakeEngineFactory() {
  const engines: Array<{
    engine: BrowserEngine;
    isVisible: () => boolean;
    destroyCount: () => number;
    lastNavigatedUrl: () => string;
    emitState: (patch: Partial<NavigationState>) => void;
  }> = [];

  const factory = (): BrowserEngine => {
    let visible = false;
    let destroyed = 0;
    let lastUrl = '';
    let listener: NavigationStateListener | null = null;
    const state: NavigationState = {
      url: '',
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      error: null
    };

    const engine: BrowserEngine = {
      name: 'fake',
      attach: () => {},
      setVisible: (next) => { visible = next; },
      navigate: async (url) => {
        lastUrl = url;
        Object.assign(state, { url, isLoading: true });
        listener?.(state);
      },
      goBack: () => {},
      goForward: () => {},
      reload: () => {},
      stop: () => {},
      getState: () => state,
      onStateChange: (nextListener) => {
        listener = nextListener;
        return () => { listener = null; };
      },
      destroy: () => { destroyed += 1; }
    };

    engines.push({
      engine,
      isVisible: () => visible,
      destroyCount: () => destroyed,
      lastNavigatedUrl: () => lastUrl,
      emitState: (patch) => {
        Object.assign(state, patch);
        listener?.(state);
      }
    });
    return engine;
  };

  return { factory, engines };
}

function createManager() {
  const engines = createFakeEngineFactory();
  const manager = new TabManager({} as BrowserWindow, 96, engines.factory, START_URL);
  return { manager, ...engines };
}

test('TabManager creates, activates, and keeps independent pages alive', () => {
  const { manager, engines } = createManager();
  const firstId = manager.createTab();
  const secondId = manager.createTab();

  assert.equal(firstId, 'tab-1');
  assert.equal(secondId, 'tab-2');
  assert.equal(engines[0].isVisible(), false);
  assert.equal(engines[1].isVisible(), true);
  assert.equal(engines[0].destroyCount(), 0);
  assert.equal(engines[0].lastNavigatedUrl(), START_URL);
  assert.equal(manager.getTabsState().activeTabId, secondId);

  assert.equal(manager.activateTab(firstId), true);
  assert.equal(engines[0].isVisible(), true);
  assert.equal(engines[1].isVisible(), false);
  assert.equal(manager.getTabsState().activeTabId, firstId);
});

test('TabManager routes navigation through the active engine only', () => {
  const { manager, engines } = createManager();
  const firstId = manager.createTab();
  manager.createTab();

  manager.activateTab(firstId);
  manager.navigateActive('https://example.com/path');

  assert.equal(engines[0].lastNavigatedUrl(), 'https://example.com/path');
  assert.equal(engines[1].lastNavigatedUrl(), START_URL);
});

test('TabManager restores only the active engine and creates background engines on selection', () => {
  const { manager, engines } = createManager();
  manager.restoreTabs(['https://one.example/', 'https://two.example/'], 0);

  assert.deepEqual(manager.getTabsState().tabs.map((tab) => tab.url), [
    'https://one.example/',
    'https://two.example/'
  ]);
  assert.equal(engines.length, 1);
  assert.equal(engines[0].lastNavigatedUrl(), 'https://one.example/');

  manager.activateTab('tab-2');
  assert.equal(engines.length, 2);
  assert.equal(engines[1].lastNavigatedUrl(), 'https://two.example/');
});

test('closing an unselected restored tab does not create its engine', () => {
  const { manager, engines } = createManager();
  manager.restoreTabs(['https://one.example/', 'https://two.example/'], 0);

  assert.equal(manager.closeTab('tab-2'), true);
  assert.equal(engines.length, 1);
  assert.deepEqual(manager.getTabsState().tabs.map((tab) => tab.url), ['https://one.example/']);
});

test('TabManager closes a tab once and selects its neighbor', () => {
  const { manager, engines } = createManager();
  const firstId = manager.createTab();
  const secondId = manager.createTab();
  const thirdId = manager.createTab();

  assert.equal(manager.closeTab(thirdId), true);
  assert.equal(engines[2].destroyCount(), 1);
  assert.equal(engines[2].isVisible(), false);
  assert.equal(manager.getTabsState().activeTabId, secondId);
  assert.deepEqual(manager.getTabsState().tabs.map((tab) => tab.id), [firstId, secondId]);
  assert.equal(manager.closeTab('not-a-tab'), false);
});

test('closing the final tab opens a fresh start tab to keep the window usable', () => {
  const { manager, engines } = createManager();
  const lastId = manager.createTab();

  assert.equal(manager.closeTab(lastId), true);
  assert.equal(engines[0].destroyCount(), 1);
  assert.equal(manager.getTabsState().tabs.length, 1);
  assert.equal(manager.getTabsState().activeTabId, 'tab-2');
  assert.equal(engines[1].isVisible(), true);
  assert.equal(engines[1].lastNavigatedUrl(), START_URL);
});

test('TabManager destroys every engine once and ignores later engine events', () => {
  const { manager, engines } = createManager();
  manager.createTab();
  manager.createTab();
  let notifications = 0;
  manager.onChange(() => { notifications += 1; });

  manager.destroy();
  const afterDestroy = notifications;
  engines[0].emitState({ url: 'https://late.example/' });

  assert.equal(engines[0].destroyCount(), 1);
  assert.equal(engines[1].destroyCount(), 1);
  assert.equal(notifications, afterDestroy);
  assert.equal(manager.getTabsState().tabs.length, 0);
});
