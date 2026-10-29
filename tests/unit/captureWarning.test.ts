import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import type { App, BrowserWindow } from 'electron';
import { CaptureWarningStore, warningWindowTitle } from '../../src/services/permissions/captureWarning';
import { registerCaptureWarningTitles } from '../../src/main/windows/captureWarningTitles';

test('session warning accumulates devices without exposing mutable state', () => {
  const store = new CaptureWarningStore();
  let changes = 0;
  const unsubscribe = store.subscribe(() => { changes++; });
  store.mark(['video']);
  store.mark(['video']);
  assert.deepEqual(store.snapshot(), { camera: true, microphone: false });
  const copy = store.snapshot();
  copy.camera = false;
  assert.equal(store.snapshot().camera, true);
  store.mark(['audio']);
  assert.deepEqual(store.snapshot(), { camera: true, microphone: true });
  assert.equal(changes, 2);
  unsubscribe();
  assert.equal(warningWindowTitle(store.snapshot()), 'Camera and microphone may be in use — Open Browser');
});

test('native window titles retain the warning when a page changes its title', () => {
  const store = new CaptureWarningStore();
  const app = new EventEmitter();
  const popup = new EventEmitter() as EventEmitter & { isDestroyed(): boolean; setTitle(value: string): void };
  let title = 'Site';
  popup.isDestroyed = () => false;
  popup.setTitle = value => { title = value; };
  registerCaptureWarningTitles(app as unknown as Pick<App, 'on'>, store);
  app.emit('browser-window-created', {}, popup as unknown as BrowserWindow);
  assert.equal(title, 'Site');
  store.mark(['video']);
  assert.equal(title, 'Camera may be in use — Open Browser');
  let prevented = false;
  popup.emit('page-title-updated', { preventDefault: () => { prevented = true; } }, 'Site-controlled title');
  assert.equal(prevented, true);
  assert.equal(title, 'Camera may be in use — Open Browser');
  popup.emit('closed');
  store.mark(['audio']);
  assert.equal(title, 'Camera may be in use — Open Browser');
});
