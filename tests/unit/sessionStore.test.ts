import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { SessionStore } from '../../src/core/sessions/SessionStore';

async function withStore(run: (store: SessionStore, filePath: string) => Promise<void>): Promise<void> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'open-browser-session-'));
  const filePath = path.join(directory, 'browser-data.json');
  try {
    await run(new SessionStore(filePath), filePath);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}

test('SessionStore persists restorable tabs and history locally', async () => {
  await withStore(async (store, filePath) => {
    await store.load();
    await store.saveSession({ tabs: ['https://one.example/', 'https://two.example/'], activeTabIndex: 1 });
    await store.recordVisit('https://one.example/path', 100);
    await store.recordVisit('https://two.example/path', 200);

    const restored = await new SessionStore(filePath).load();
    assert.deepEqual(restored.tabs, ['https://one.example/', 'https://two.example/']);
    assert.equal(restored.activeTabIndex, 1);
    assert.deepEqual(restored.history.map((entry) => entry.visitedAt), [200, 100]);
  });
});

test('SessionStore clears history and the saved restore snapshot together', async () => {
  await withStore(async (store, filePath) => {
    await store.load();
    await store.saveSession({ tabs: ['https://example.com/'], activeTabIndex: 0 });
    await store.recordVisit('https://example.com/', 100);
    await store.clearHistoryAndSession();

    const restored = await new SessionStore(filePath).load();
    assert.deepEqual(restored.tabs, []);
    assert.deepEqual(restored.history, []);
  });
});

test('SessionStore rejects unsafe URLs and strips credentials from saved URLs', async () => {
  await withStore(async (store, filePath) => {
    await store.load();
    await store.saveSession({
      tabs: ['file:///private.txt', 'https://user:password@example.com/path'],
      activeTabIndex: 0
    });
    await store.recordVisit('https://user:password@example.com/secret', 100);

    const restored = await new SessionStore(filePath).load();
    assert.deepEqual(restored.tabs, ['https://example.com/path']);
    assert.deepEqual(restored.history.map((entry) => entry.url), ['https://example.com/secret']);
  });
});

test('SessionStore safely ignores malformed records in a valid data file', async () => {
  await withStore(async (store, filePath) => {
    await fs.writeFile(filePath, JSON.stringify({
      version: 1,
      tabs: ['javascript:alert(1)', 'https://valid.example/'],
      activeTabIndex: 99,
      history: [
        { url: 'file:///private.txt', visitedAt: 1 },
        { url: 'https://valid.example/', visitedAt: 2 },
        { url: 'https://invalid.example/', visitedAt: 'yesterday' }
      ]
    }));

    const restored = await store.load();
    assert.deepEqual(restored.tabs, ['https://valid.example/']);
    assert.equal(restored.activeTabIndex, 0);
    assert.deepEqual(restored.history.map((entry) => entry.visitedAt), [2]);
  });
});
