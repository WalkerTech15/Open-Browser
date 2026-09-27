import type { OpenBrowserApi } from '../../shared/types/openBrowserApi';

// Ambient typing for the API the preload script exposes via contextBridge.
// This is the renderer's entire view of application state/commands.
declare global {
  interface Window {
    openBrowser: OpenBrowserApi;
  }
}

export {};
