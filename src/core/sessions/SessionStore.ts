import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { isNavigableUrl } from '../navigation/navigation';
import type { BrowserHistoryEntry } from '../../shared/types/browserHistory';

export interface BrowserSessionSnapshot {
  tabs: string[];
  activeTabIndex: number;
}

interface PersistedBrowserData extends BrowserSessionSnapshot {
  version: 1;
  history: BrowserHistoryEntry[];
}

const EMPTY_DATA: PersistedBrowserData = { version: 1, tabs: [], activeTabIndex: 0, history: [] };

/** Stores local tab-restore data and browsing history in Electron's user-data directory. */
export class SessionStore {
  private data: PersistedBrowserData = { ...EMPTY_DATA, tabs: [], history: [] };
  private pendingWrite: Promise<void> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  async load(): Promise<PersistedBrowserData> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      this.data = parseData(JSON.parse(raw));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.warn('Could not read browser session data; starting with an empty session.', error);
      }
      this.data = { ...EMPTY_DATA, tabs: [], history: [] };
    }
    return this.snapshot();
  }

  snapshot(): PersistedBrowserData {
    return {
      version: 1,
      tabs: [...this.data.tabs],
      activeTabIndex: this.data.activeTabIndex,
      history: this.history()
    };
  }

  history(): BrowserHistoryEntry[] {
    return this.data.history.map((entry) => ({ ...entry })).reverse();
  }

  async saveSession(session: BrowserSessionSnapshot): Promise<void> {
    this.data.tabs = session.tabs.filter(isNavigableUrl);
    this.data.activeTabIndex = this.data.tabs.length === 0
      ? 0
      : Math.min(Math.max(0, Math.trunc(session.activeTabIndex)), this.data.tabs.length - 1);
    await this.persist();
  }

  async recordVisit(url: string, visitedAt = Date.now()): Promise<void> {
    if (!isNavigableUrl(url)) return;
    const safeUrl = stripUrlCredentials(url);
    this.data.history.push({ url: safeUrl, visitedAt });
    await this.persist();
  }

  /** Clears history and the restore snapshot together, without affecting open pages. */
  async clearHistoryAndSession(): Promise<void> {
    const previous = this.data;
    this.data = { ...EMPTY_DATA, tabs: [], history: [] };
    try {
      await this.persist();
    } catch (error) {
      this.data = previous;
      throw error;
    }
  }

  async flush(): Promise<void> {
    await this.pendingWrite;
  }

  private persist(): Promise<void> {
    const serialized = JSON.stringify(this.data, null, 2);
    this.pendingWrite = this.pendingWrite.catch(() => undefined).then(async () => {
      const directory = path.dirname(this.filePath);
      await fs.mkdir(directory, { recursive: true });
      const temporaryPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
      try {
        await fs.writeFile(temporaryPath, serialized, { encoding: 'utf8', flag: 'wx' });
        await fs.rename(temporaryPath, this.filePath);
      } catch (error) {
        await fs.rm(temporaryPath, { force: true }).catch(() => undefined);
        throw error;
      }
    });
    return this.pendingWrite;
  }
}

function parseData(value: unknown): PersistedBrowserData {
  if (!value || typeof value !== 'object') return { ...EMPTY_DATA, tabs: [], history: [] };
  const input = value as Partial<PersistedBrowserData>;
  if (input.version !== 1) {
    console.warn('Unsupported browser session data version; starting with an empty session.');
    return { ...EMPTY_DATA, tabs: [], history: [] };
  }

  const tabs = Array.isArray(input.tabs) ? input.tabs.filter((url): url is string =>
    typeof url === 'string' && isNavigableUrl(url)
  ).map(stripUrlCredentials) : [];
  const history = Array.isArray(input.history) ? input.history.filter((entry): entry is BrowserHistoryEntry =>
    !!entry && typeof entry === 'object' &&
    typeof entry.url === 'string' && isNavigableUrl(entry.url) &&
    typeof entry.visitedAt === 'number' && Number.isFinite(entry.visitedAt)
  ).map((entry) => ({ url: stripUrlCredentials(entry.url), visitedAt: entry.visitedAt })) : [];

  const activeTabIndex = typeof input.activeTabIndex === 'number' && Number.isInteger(input.activeTabIndex)
    ? Math.min(Math.max(0, input.activeTabIndex), Math.max(0, tabs.length - 1))
    : 0;
  return { version: 1, tabs, activeTabIndex, history };
}

function stripUrlCredentials(value: string): string {
  const url = new URL(value);
  url.username = '';
  url.password = '';
  return url.toString();
}
