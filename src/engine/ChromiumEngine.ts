import type { BrowserEngine } from './BrowserEngine';

export class ChromiumEngine implements BrowserEngine {
  readonly name = 'chromium';

  async createTab(_url = 'about:blank'): Promise<void> {
    throw new Error('Chromium tab creation is not implemented yet.');
  }

  async navigate(_url: string): Promise<void> {
    throw new Error('Chromium navigation is not implemented yet.');
  }

  async reload(): Promise<void> {
    throw new Error('Chromium reload is not implemented yet.');
  }

  async stop(): Promise<void> {
    throw new Error('Chromium stop is not implemented yet.');
  }
}
