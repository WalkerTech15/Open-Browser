import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { isNavigableUrl } from '../navigation/navigation';
import type { BrowserWorkspace } from '../../shared/types/browserWorkspaces';

interface PersistedWorkspaces {
  version: 1;
  workspaces: BrowserWorkspace[];
}

/** Stores saved URL groups locally inside one browser profile. */
export class WorkspaceStore {
  private workspaces: BrowserWorkspace[] = [];

  constructor(private readonly filePath: string) {}

  async load(): Promise<BrowserWorkspace[]> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      this.workspaces = parseWorkspaces(JSON.parse(raw));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      this.workspaces = [];
    }
    return this.list();
  }

  list(): BrowserWorkspace[] {
    return this.workspaces.map((workspace) => ({ ...workspace, urls: [...workspace.urls] }));
  }

  async save(urls: string[]): Promise<BrowserWorkspace> {
    const safeUrls = urls.filter(isNavigableUrl).map(stripUrlCredentials);
    if (safeUrls.length === 0) throw new Error('A workspace needs at least one web page.');

    const usedNames = new Set(this.workspaces.map(({ name }) => name.toLocaleLowerCase()));
    let number = 1;
    while (usedNames.has(`workspace ${number}`)) number += 1;
    const workspace: BrowserWorkspace = {
      id: randomUUID(),
      name: `Workspace ${number}`,
      urls: safeUrls,
      createdAt: Date.now()
    };
    this.workspaces.push(workspace);
    try {
      await this.persist();
    } catch (error) {
      this.workspaces.pop();
      throw error;
    }
    return { ...workspace, urls: [...workspace.urls] };
  }

  async clear(): Promise<void> {
    const previous = this.workspaces;
    this.workspaces = [];
    try {
      await this.persist();
    } catch (error) {
      this.workspaces = previous;
      throw error;
    }
  }

  private async persist(): Promise<void> {
    const directory = path.dirname(this.filePath);
    await fs.mkdir(directory, { recursive: true });
    const temporaryPath = `${this.filePath}.${process.pid}.${randomUUID()}.tmp`;
    try {
      await fs.writeFile(temporaryPath, JSON.stringify({ version: 1, workspaces: this.workspaces }, null, 2), {
        encoding: 'utf8', flag: 'wx'
      });
      await fs.rename(temporaryPath, this.filePath);
    } catch (error) {
      await fs.rm(temporaryPath, { force: true }).catch(() => undefined);
      throw error;
    }
  }
}

function parseWorkspaces(value: unknown): BrowserWorkspace[] {
  if (!value || typeof value !== 'object' || (value as Partial<PersistedWorkspaces>).version !== 1 ||
      !Array.isArray((value as Partial<PersistedWorkspaces>).workspaces)) {
    throw new Error('Invalid browser workspace data.');
  }
  const names = new Set<string>();
  const ids = new Set<string>();
  return (value as PersistedWorkspaces).workspaces.map((item) => {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id) ||
        typeof item.name !== 'string' || !item.name.trim() || item.name.trim().length > 40 ||
        typeof item.createdAt !== 'number' || !Number.isFinite(item.createdAt) || !Array.isArray(item.urls)) {
      throw new Error('Invalid browser workspace record.');
    }
    const name = item.name.trim();
    const normalizedName = name.toLocaleLowerCase();
    if (ids.has(item.id) || names.has(normalizedName) || item.urls.length === 0 ||
        !item.urls.every((url) => typeof url === 'string' && isNavigableUrl(url))) {
      throw new Error('Duplicate or invalid browser workspace.');
    }
    ids.add(item.id);
    names.add(normalizedName);
    return { id: item.id, name, createdAt: item.createdAt, urls: item.urls.map(stripUrlCredentials) };
  });
}

function stripUrlCredentials(value: string): string {
  const url = new URL(value);
  url.username = '';
  url.password = '';
  return url.toString();
}
