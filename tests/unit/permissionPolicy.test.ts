import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import type { BrowserWindow, Session, WebContents } from 'electron';
import { PermissionPolicy, type PermissionPrompt } from '../../src/services/permissions/permissionPolicy';

type RequestHandler = NonNullable<Parameters<Session['setPermissionRequestHandler']>[0]>;
type CheckHandler = NonNullable<Parameters<Session['setPermissionCheckHandler']>[0]>;
type DeviceHandler = NonNullable<Parameters<Session['setDevicePermissionHandler']>[0]>;
const tick = () => new Promise<void>(resolve => setImmediate(resolve));

class FakeContents extends EventEmitter {
  url = 'https://example.com/page';
  destroyed = false;
  constructor(readonly id: number) { super(); }
  getURL() { return this.url; }
  isDestroyed() { return this.destroyed; }
}

function fixture() {
  const handlers: { request?: RequestHandler; check?: CheckHandler; device?: DeviceHandler } = {};
  const session = {
    setPermissionRequestHandler: (handler: RequestHandler) => { handlers.request = handler; },
    setPermissionCheckHandler: (handler: CheckHandler) => { handlers.check = handler; },
    setDevicePermissionHandler: (handler: DeviceHandler) => { handlers.device = handler; }
  } as unknown as Session;
  const prompts: Array<{ prompt: PermissionPrompt; resolve: (allow: boolean) => void }> = [];
  const policy = new PermissionPolicy(session, async (_window, prompt) => new Promise(resolve => prompts.push({ prompt, resolve })));
  const contents = new FakeContents(1);
  const state = { focused: true, destroyed: false };
  const window = { isFocused: () => state.focused, isDestroyed: () => state.destroyed } as unknown as BrowserWindow;
  const tracking = policy.track(contents as unknown as WebContents, window);
  tracking.setActive(true);
  const request = (permission: Parameters<RequestHandler>[1], details: Partial<Electron.PermissionRequest & Electron.MediaAccessPermissionRequest> = {}) => {
    const responses: boolean[] = [];
    handlers.request!(contents as unknown as WebContents, permission, (allowed) => responses.push(allowed), {
      requestingUrl: contents.url, isMainFrame: true, ...details
    });
    return responses;
  };
  const check = (permission: Parameters<CheckHandler>[1], origin = 'https://example.com', main = true) =>
    handlers.check!(contents as unknown as WebContents, permission, origin, { isMainFrame: main, requestingUrl: contents.url });
  return { policy, handlers, prompts, contents, window, state, tracking, request, check };
}

test('camera and microphone access needs approval for each request', async () => {
  const f = fixture();
  const first = f.request('media', { mediaTypes: ['audio', 'video'], securityOrigin: f.contents.url });
  await tick();
  assert.equal(f.prompts[0].prompt.description, 'your camera and microphone');
  assert.equal(f.prompts[0].prompt.origin, 'https://example.com');
  f.prompts[0].resolve(true);
  await tick();
  assert.deepEqual(first, [true]);
  assert.equal(f.check('media'), false);
  const second = f.request('media', { mediaTypes: ['audio'] });
  await tick();
  assert.equal(f.prompts[1].prompt.description, 'your microphone');
  f.prompts[1].resolve(false);
  await tick();
  assert.deepEqual(second, [false]);
  f.tracking.dispose();
});

test('notifications are temporary, origin-scoped, and revoked when the tab changes', async () => {
  const f = fixture();
  const answer = f.request('notifications');
  await tick();
  f.prompts[0].resolve(true);
  await tick();
  assert.deepEqual(answer, [true]);
  assert.equal(f.check('notifications'), true);
  assert.equal(f.check('notifications', 'https://other.example'), false);
  assert.equal(f.check('notifications', 'https://example.com', false), false);
  assert.equal(f.handlers.check!(null, 'notifications', 'https://example.com', { isMainFrame: true }), false);
  const other = fixture();
  assert.equal(other.check('notifications'), false);
  f.tracking.setActive(false);
  f.tracking.setActive(true);
  assert.equal(f.check('notifications'), false);
  f.tracking.dispose();
  other.tracking.dispose();
});

test('unsupported, untrusted, background and ambiguous requests fail closed', async () => {
  const f = fixture();
  for (const [permission, details] of [
    ['display-capture', {}], ['media', {}], ['media', { mediaTypes: ['audio'], securityOrigin: 'https://evil.example' }],
    ['notifications', { isMainFrame: false }], ['geolocation', { requestingUrl: 'http://example.com/' }],
    ['geolocation', { requestingUrl: 'https://evil.example/' }]
  ] as Array<[Parameters<RequestHandler>[1], Partial<Electron.MediaAccessPermissionRequest>]>) {
    assert.deepEqual(f.request(permission, details), [false]);
  }
  f.state.focused = false;
  assert.deepEqual(f.request('geolocation'), [false]);
  f.state.focused = true;
  f.tracking.setActive(false);
  assert.deepEqual(f.request('notifications'), [false]);
  assert.equal(f.handlers.device!({ deviceType: 'usb', origin: 'https://example.com', device: {} } as Parameters<DeviceHandler>[0]), false);
  await tick();
  assert.equal(f.prompts.length, 0);
  f.tracking.dispose();
});

test('navigation cancels a pending decision and a late approval cannot grant access', async () => {
  const f = fixture();
  const answer = f.request('geolocation');
  await tick();
  f.contents.emit('did-start-navigation', {}, 'https://other.example', false, true);
  assert.deepEqual(answer, [false]);
  f.prompts[0].resolve(true);
  await tick();
  assert.deepEqual(answer, [false]);
  f.tracking.dispose();
});

test('switching tabs or closing a page cancels pending access and prevents stacked prompts', async () => {
  const f = fixture();
  const answer = f.request('notifications');
  await tick();
  assert.deepEqual(f.request('geolocation'), [false]);
  f.tracking.setActive(false);
  assert.deepEqual(answer, [false]);
  f.prompts[0].resolve(true);
  await tick();
  assert.deepEqual(answer, [false]);
  f.tracking.setActive(true);
  assert.equal(f.check('notifications'), false);
  f.tracking.dispose();
});

test('different profile sessions cannot stack prompts on the same window', async () => {
  const first = fixture();
  const second = fixture();
  second.tracking.dispose();
  const secondTracking = second.policy.track(second.contents as unknown as WebContents, first.window);
  secondTracking.setActive(true);
  const firstAnswer = first.request('notifications');
  await tick();
  assert.deepEqual(second.request('geolocation'), [false]);
  assert.equal(second.prompts.length, 0);
  first.prompts[0].resolve(false);
  await tick();
  assert.deepEqual(firstAnswer, [false]);
  const nextAnswer = second.request('geolocation');
  await tick();
  assert.equal(second.prompts.length, 1);
  second.prompts[0].resolve(true);
  await tick();
  assert.deepEqual(nextAnswer, [true]);
  first.tracking.dispose();
  secondTracking.dispose();
});

test('late requests and checks reject destroyed contents without reading native fields', () => {
  const f = fixture();
  const destroyed = {
    isDestroyed: () => true,
    get id(): number { throw new Error('native object already destroyed'); }
  } as unknown as WebContents;
  const answers: boolean[] = [];
  assert.doesNotThrow(() => f.handlers.request!(destroyed, 'notifications', allowed => answers.push(allowed), {
    isMainFrame: true, requestingUrl: 'https://example.com/'
  }));
  assert.deepEqual(answers, [false]);
  assert.equal(f.handlers.check!(destroyed, 'notifications', 'https://example.com', { isMainFrame: true }), false);
  f.tracking.dispose();
});
