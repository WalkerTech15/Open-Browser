import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { BrowserWindow } from 'electron';
import { BrowserWindowController } from '../../src/core/browser/BrowserWindowController';
import type { BrowserEngine } from '../../src/engines/interface/BrowserEngine';
import type { NavigationState, NavigationStateListener } from '../../src/shared/types/navigationState';

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
    navigate: async () => {},
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
    }
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

  new BrowserWindowController(fakeWindow.window, fake.engine);
  fakeWindow.close();

  assert.equal(fake.destroyCallCount(), 1);
});

test('BrowserWindowController: a late did-finish-load after close does not throw or send IPC', () => {
  const fake = createFakeEngine();
  const fakeWindow = createFakeWindow();

  new BrowserWindowController(fakeWindow.window, fake.engine);
  fakeWindow.close();

  // Simulates Electron firing the queued 'did-finish-load' callback after
  // the window was already closed — this is exactly the race that used to
  // throw "Object has been destroyed" from pushState().
  assert.doesNotThrow(() => fakeWindow.triggerDidFinishLoad());
  assert.equal(fakeWindow.sentMessageCount(), 0);
});

test('BrowserWindowController: a late engine state change after close does not throw or send IPC', () => {
  const fake = createFakeEngine();
  const fakeWindow = createFakeWindow();

  new BrowserWindowController(fakeWindow.window, fake.engine);
  fakeWindow.close();

  // Simulates an in-flight navigation's async callback resolving after the
  // window was already closed.
  assert.doesNotThrow(() => fake.emitStateChange());
  assert.equal(fakeWindow.sentMessageCount(), 0);
});
