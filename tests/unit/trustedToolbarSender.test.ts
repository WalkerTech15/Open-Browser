import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { IpcMainEvent } from 'electron';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { isTrustedToolbarSender } from '../../src/main/security/trustedToolbarSender';

const toolbarUrl = pathToFileURL(join(tmpdir(), 'Open Browser # QA', 'index.html')).href;

function senderEvent(mainUrl = toolbarUrl, frameUrl: string | null = mainUrl, destroyed = false) {
  const mainFrame = { url: mainUrl };
  const senderFrame = frameUrl === null ? null : frameUrl === mainUrl ? mainFrame : { url: frameUrl };
  return { sender: { isDestroyed: () => destroyed, mainFrame }, senderFrame } as unknown as IpcMainEvent;
}

test('IPC accepts the top-level frame at the exact toolbar URL', () => {
  assert.equal(isTrustedToolbarSender(senderEvent(), toolbarUrl), true);
});

test('IPC rejects remote pages and other local documents in the same window', () => {
  for (const url of ['https://example.com', 'about:blank', `${toolbarUrl}?other`, `${toolbarUrl}#other`, toolbarUrl.replace('index.html', 'another.html')]) {
    assert.equal(isTrustedToolbarSender(senderEvent(url), toolbarUrl), false, url);
  }
});

test('IPC rejects child frames even when they load the toolbar URL', () => {
  const event = senderEvent();
  const childEvent = { sender: event.sender, senderFrame: { url: toolbarUrl } } as unknown as IpcMainEvent;
  assert.equal(isTrustedToolbarSender(childEvent, toolbarUrl), false);
});

test('IPC rejects missing frames and destroyed senders', () => {
  assert.equal(isTrustedToolbarSender(senderEvent(toolbarUrl, null), toolbarUrl), false);
  assert.equal(isTrustedToolbarSender(senderEvent(toolbarUrl, toolbarUrl, true), toolbarUrl), false);
});
