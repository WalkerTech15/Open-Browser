import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { BrowserWindow } from 'electron';
import { BrowserWindowController } from '../../src/core/browser/BrowserWindowController';
import type { BrowserEngine } from '../../src/engines/interface/BrowserEngine';
import type { NavigationState, NavigationStateListener } from '../../src/shared/types/navigationState';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { SessionStore } from '../../src/core/sessions/SessionStore';

/**
 * Regression coverage for "TypeError: Object has been destroyed" crashes
 * that happened when a window/tab was closed while a navigation or an
 * async engine callback was still in flight. These fakes implement just the
 * BrowserWindow/BrowserEngine surface BrowserWindowController actually
 * uses, so this runs under plain node:test without a real Electron runtime.
 */

function createFakeEngine(): {
  engine: BrowserEngine;
  destroyCallCount: () => number;
  emitStateChange: () => void;
} {
  let listener: NavigationStateListener | null = null;
  let destroyCallCount = 0;
  const state: NavigationState = { url: '', isLoading: false, canGoBack: false, canGoForward: false, error: null };

  const engine: BrowserEngine = {
    name: 'fake',
    attach: () => {},
    setVisible: () => {},
    navigate: async (url) => {
      state.url = url;
      listener?.(state);
    },
    goBack: () => {},
    goForward: () => {},
    reload: () => {},
    stop: () => {},
    getState: () => state,
    onStateChange: (l) => {
      listener = l;
      return () => {
        listener = null;
      };
    },
    destroy: () => {
      destroyCallCount += 1;
    }
  };

  return {
    engine,
    destroyCallCount: () => destroyCallCount,
    // Simulates a late async engine event (e.g. a network callback)
    // resolving after the controller has already unsubscribed.
    emitStateChange: () => listener?.(state)
  };
}

function createFakeWindow(): {
  window: BrowserWindow;
  sentMessageCount: () => number;
  close: () => void;
  triggerDidFinishLoad: () => void;
} {
  let destroyed = false;
  let closedHandler: (() => void) | null = null;
  let finishLoadHandler: (() => void) | null = null;
  let sentMessageCount = 0;

  const window = {
    isDestroyed: () => destroyed,
    webContents: {
      id: 1,
      isDestroyed: () => destroyed,
      once: (event: string, handler: () => void) => {
        if (event === 'did-finish-load') finishLoadHandler = handler;
      },
      send: (_channel: string, _payload: unknown) => {
        // A real destroyed webContents throws here — this fake mirrors that
        // so a regression (a missing isDestroyed guard upstream) fails loudly.
        if (destroyed) throw new TypeError('Object has been destroyed');
        sentMessageCount += 1;
      }
    },
    on: (event: string, handler: () => void) => {
      if (event === 'closed') closedHandler = handler;
    },
    setTitle: (_title: string) => {}
    // deliberately no `off` — BrowserWindowController never removes its own
    // 'closed' listener, matching the real BrowserWindow API it depends on.
  } as unknown as BrowserWindow;

  return {
    window,
    sentMessageCount: () => sentMessageCount,
    close: () => {
      destroyed = true;
      closedHandler?.();
    },
    triggerDidFinishLoad: () => finishLoadHandler?.()
  };
}

test('BrowserWindowController: closing the window disposes the engine exactly once', () => {
  const fake = createFakeEngine();
  const fakeWindow = createFakeWindow();

  new BrowserWindowController(fakeWindow.window, () => fake.engine);
  fakeWindow.close();

  assert.equal(fake.destroyCallCount(), 1);
});

test('BrowserWindowController: a late did-finish-load after close does not throw or send IPC', () => {
  const fake = createFakeEngine();
  const fakeWindow = createFakeWindow();

  new BrowserWindowController(fakeWindow.window, () => fake.engine);
  const sentBeforeClose = fakeWindow.sentMessageCount();
  fakeWindow.close();

  // Simulates Electron firing the queued 'did-finish-load' callback after
  // the window was already closed — this is exactly the race that used to
  // throw "Object has been destroyed" from pushState().
  assert.doesNotThrow(() => fakeWindow.triggerDidFinishLoad());
  assert.equal(fakeWindow.sentMessageCount(), sentBeforeClose);
});

test('BrowserWindowController: a late engine state change after close does not throw or send IPC', () => {
  const fake = createFakeEngine();
  const fakeWindow = createFakeWindow();

  new BrowserWindowController(fakeWindow.window, () => fake.engine);
  const sentBeforeClose = fakeWindow.sentMessageCount();
  fakeWindow.close();

  // Simulates an in-flight navigation's async callback resolving after the
  // window was already closed.
  assert.doesNotThrow(() => fake.emitStateChange());
  assert.equal(fakeWindow.sentMessageCount(), sentBeforeClose);
});

test('BrowserWindowController: persists navigation history and the active tab snapshot', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'open-browser-controller-'));
  try {
    const store = new SessionStore(path.join(directory, 'browser-data.json'));
    await store.load();
    const fake = createFakeEngine();
    const fakeWindow = createFakeWindow();
    const controller = new BrowserWindowController(fakeWindow.window, () => fake.engine, store);
    controller.handleNavigate('https://example.com/path');
    await store.flush();

    assert.deepEqual(store.snapshot().tabs, ['https://example.com/path']);
    assert.ok(store.history().some((entry) => entry.url === 'https://example.com/path'));

    await controller.clearHistoryAndSession();
    assert.deepEqual(store.snapshot().tabs, []);
    assert.deepEqual(store.history(), []);
    await store.flush();
    fakeWindow.close();
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('BrowserWindowController: switching profiles restores separate history and tabs', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'open-browser-profile-switch-'));
  try {
    const { ProfileStore } = await import('../../src/core/profiles/ProfileStore');
    const profiles = new ProfileStore(directory);
    const personal = await profiles.load();
    const personalStore = profiles.sessionStore(personal.id);
    const personalSession = await personalStore.load();
    const fakeWindow = createFakeWindow();
    const engineProfiles: string[] = [];
    const controller = new BrowserWindowController(
      fakeWindow.window,
      (profileId) => {
        engineProfiles.push(profileId);
        return createFakeEngine().engine;
      },
      personalStore,
      personalSession,
      profiles,
      personal
    );

    controller.handleNavigate('https://personal.example/');
    await personalStore.flush();
    const workProfile = await profiles.createProfile();
    await controller.switchProfile(workProfile.id);
    assert.equal(profiles.activeProfile().id, workProfile.id);
    assert.ok(engineProfiles.includes(workProfile.id));

    const workStore = profiles.sessionStore(workProfile.id);
    controller.handleNavigate('https://work.example/');
    await workStore.flush();
    assert.ok(workStore.history().some(({ url }) => url === 'https://work.example/'));
    assert.equal(workStore.history().some(({ url }) => url === 'https://personal.example/'), false);

    await controller.switchProfile(personal.id);
    assert.ok(personalStore.history().some(({ url }) => url === 'https://personal.example/'));
    assert.equal(personalStore.history().some(({ url }) => url === 'https://work.example/'), false);
    fakeWindow.close();
    await profiles.flushSessions();
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
