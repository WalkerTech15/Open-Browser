import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { BrowserProfile } from '../../shared/types/browserProfiles';
import { SessionStore } from '../sessions/SessionStore';

interface PersistedProfiles {
  version: 1;
  activeProfileId: string;
  profiles: BrowserProfile[];
}

const PERSONAL_PROFILE: BrowserProfile = {
  id: 'personal',
  name: 'Personal',
  createdAt: 0
};

/** Stores profile identities and gives each profile its own session-data path. */
export class ProfileStore {
  private readonly sessionStores = new Map<string, SessionStore>();
  private data: PersistedProfiles = {
    version: 1,
    activeProfileId: PERSONAL_PROFILE.id,
    profiles: [{ ...PERSONAL_PROFILE }]
  };

  constructor(private readonly userDataPath: string) {}

  async load(): Promise<BrowserProfile> {
    const filePath = this.registryPath();
    let raw: string;
    try {
      raw = await fs.readFile(filePath, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      await this.persist();
      return this.activeProfile();
    }

    this.data = parseProfiles(JSON.parse(raw));
    return this.activeProfile();
  }

  profiles(): BrowserProfile[] {
    return this.data.profiles.map((profile) => ({ ...profile }));
  }

  activeProfile(): BrowserProfile {
    const profile = this.data.profiles.find(({ id }) => id === this.data.activeProfileId);
    if (!profile) throw new Error('The active browser profile does not exist.');
    return { ...profile };
  }

  sessionFilePath(profileId: string): string {
    const profile = this.requireProfile(profileId);
    // Keep the original app-wide path as the Personal profile so existing
    // history and restored tabs remain in place without a risky migration.
    return profile.id === PERSONAL_PROFILE.id
      ? path.join(this.userDataPath, 'browser-data.json')
      : path.join(this.userDataPath, 'profiles', profile.id, 'browser-data.json');
  }

  sessionStore(profileId: string): SessionStore {
    const profile = this.requireProfile(profileId);
    let store = this.sessionStores.get(profile.id);
    if (!store) {
      store = new SessionStore(this.sessionFilePath(profile.id));
      this.sessionStores.set(profile.id, store);
    }
    return store;
  }

  async flushSessions(): Promise<void> {
    await Promise.all([...this.sessionStores.values()].map((store) => store.flush()));
  }

  async activate(profileId: string): Promise<BrowserProfile> {
    this.requireProfile(profileId);
    const previousId = this.data.activeProfileId;
    this.data.activeProfileId = profileId;
    try {
      await this.persist();
    } catch (error) {
      this.data.activeProfileId = previousId;
      throw error;
    }
    return this.activeProfile();
  }

  async createProfile(): Promise<BrowserProfile> {
    const usedNames = new Set(this.data.profiles.map(({ name }) => name.toLocaleLowerCase()));
    let number = 2;
    while (usedNames.has(`profile ${number}`)) number += 1;

    const profile: BrowserProfile = {
      id: randomUUID(),
      name: `Profile ${number}`,
      createdAt: Date.now()
    };
    this.data.profiles.push(profile);
    try {
      await this.persist();
    } catch (error) {
      this.data.profiles.pop();
      throw error;
    }
    return { ...profile };
  }

  private requireProfile(profileId: string): BrowserProfile {
    const profile = this.data.profiles.find(({ id }) => id === profileId);
    if (!profile) throw new Error('Unknown browser profile.');
    return profile;
  }

  private registryPath(): string {
    return path.join(this.userDataPath, 'profiles.json');
  }

  private async persist(): Promise<void> {
    const filePath = this.registryPath();
    await fs.mkdir(this.userDataPath, { recursive: true });
    const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    try {
      await fs.writeFile(temporaryPath, JSON.stringify(this.data, null, 2), { encoding: 'utf8', flag: 'wx' });
      await fs.rename(temporaryPath, filePath);
    } catch (error) {
      await fs.rm(temporaryPath, { force: true }).catch(() => undefined);
      throw error;
    }
  }
}

function parseProfiles(value: unknown): PersistedProfiles {
  if (!value || typeof value !== 'object') throw new Error('Invalid browser profile registry.');
  const input = value as Partial<PersistedProfiles>;
  if (input.version !== 1 || !Array.isArray(input.profiles) || typeof input.activeProfileId !== 'string') {
    throw new Error('Unsupported browser profile registry format.');
  }

  const ids = new Set<string>();
  const names = new Set<string>();
  const profiles = input.profiles.map((item): BrowserProfile => {
    if (!item || typeof item !== 'object' ||
      typeof item.id !== 'string' || !/^(personal|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(item.id) ||
      typeof item.name !== 'string' || item.name.length < 1 || item.name.length > 40 ||
      typeof item.createdAt !== 'number' || !Number.isFinite(item.createdAt)) {
      throw new Error('Invalid browser profile record.');
    }
    const normalizedName = item.name.trim().toLocaleLowerCase();
    if (!normalizedName || ids.has(item.id) || names.has(normalizedName)) {
      throw new Error('Duplicate browser profile id or name.');
    }
    ids.add(item.id);
    names.add(normalizedName);
    return { id: item.id, name: item.name.trim(), createdAt: item.createdAt };
  });

  if (profiles.length === 0 || !ids.has(input.activeProfileId) || !ids.has(PERSONAL_PROFILE.id)) {
    throw new Error('The browser profile registry has no valid active profile.');
  }
  return { version: 1, activeProfileId: input.activeProfileId, profiles };
}
