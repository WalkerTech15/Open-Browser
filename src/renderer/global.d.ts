import type { OpenBrowserApi } from '../preload';

declare global {
  interface Window {
    openBrowser: OpenBrowserApi;
  }
}

export {};
