import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { ProfileStore } from '../../src/core/profiles/ProfileStore';

async function withProfileStore(run: (store: ProfileStore, directory: string) => Promise<void>): Promise<void> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'open-browser-profiles-'));
  try {
    await run(new ProfileStore(directory), directory);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}

test('ProfileStore creates Personal and preserves its legacy session path', async () => {
  await withProfileStore(async (store, directory) => {
    const active = await store.load();
    assert.equal(active.id, 'personal');
    assert.equal(active.name, 'Personal');
    assert.equal(store.sessionFilePath(active.id), path.join(directory, 'browser-data.json'));
    assert.deepEqual(store.profiles().map(({ name }) => name), ['Personal']);
  });
});

test('ProfileStore creates and switches to separate profile history/session paths', async () => {
  await withProfileStore(async (store, directory) => {
    await store.load();
    const profile = await store.createProfile();
    assert.equal(profile.name, 'Profile 2');
    assert.match(profile.id, /^[0-9a-f-]{36}$/i);
    assert.equal(store.sessionFilePath(profile.id), path.join(directory, 'profiles', profile.id, 'browser-data.json'));

    await store.activate(profile.id);
    const reloaded = new ProfileStore(directory);
    assert.equal((await reloaded.load()).id, profile.id);
  });
});

test('ProfileStore keeps workspace files separate for each profile', async () => {
  await withProfileStore(async (store, directory) => {
    const personal = await store.load();
    const personalWorkspaces = store.workspaceStore(personal.id);
    await personalWorkspaces.load();
    await personalWorkspaces.save(['https://personal.example/']);

    const work = await store.createProfile();
    const workspaces = store.workspaceStore(work.id);
    assert.deepEqual(await workspaces.load(), []);
    await workspaces.save(['https://work.example/']);
    await fs.access(path.join(directory, 'workspaces.json'));
    await fs.access(path.join(directory, 'profiles', work.id, 'workspaces.json'));
    assert.deepEqual((await personalWorkspaces.load()).map(({ name }) => name), ['Workspace 1']);
  });
});

test('ProfileStore does not replace a corrupt registry with a fresh profile set', async () => {
  await withProfileStore(async (store, directory) => {
    await fs.writeFile(path.join(directory, 'profiles.json'), '{broken', 'utf8');
    await assert.rejects(store.load());
    assert.equal(await fs.readFile(path.join(directory, 'profiles.json'), 'utf8'), '{broken');
  });
});
