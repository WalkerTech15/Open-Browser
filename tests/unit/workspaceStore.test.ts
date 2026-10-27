import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { WorkspaceStore } from '../../src/core/workspaces/WorkspaceStore';

test('WorkspaceStore saves named HTTP(S) groups locally without URL credentials', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'open-browser-workspaces-'));
  const filePath = path.join(directory, 'workspaces.json');
  try {
    const store = new WorkspaceStore(filePath);
    assert.deepEqual(await store.load(), []);
    const first = await store.save(['https://user:secret@example.com/path', 'javascript:alert(1)']);
    assert.equal(first.name, 'Workspace 1');
    assert.deepEqual(first.urls, ['https://example.com/path']);
    assert.equal((await store.save(['https://second.example/'])).name, 'Workspace 2');

    const reloaded = new WorkspaceStore(filePath);
    assert.deepEqual((await reloaded.load()).map(({ name, urls }) => ({ name, urls })), [
      { name: 'Workspace 1', urls: ['https://example.com/path'] },
      { name: 'Workspace 2', urls: ['https://second.example/'] }
    ]);
    await reloaded.clear();
    assert.deepEqual(await new WorkspaceStore(filePath).load(), []);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('WorkspaceStore rejects malformed saved data without replacing it', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'open-browser-workspaces-'));
  const filePath = path.join(directory, 'workspaces.json');
  try {
    await fs.writeFile(filePath, '{broken', 'utf8');
    await assert.rejects(new WorkspaceStore(filePath).load());
    assert.equal(await fs.readFile(filePath, 'utf8'), '{broken');
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
