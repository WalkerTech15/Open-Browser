import { contextBridge, ipcRenderer } from 'electron';
import type { NavigationState } from '../../shared/types/navigationState';
import type { OpenBrowserApi } from '../../shared/types/openBrowserApi';

// SECURITY: a sandboxed preload script (sandbox: true) can only `require` a
// small allowlist of built-ins plus 'electron' — it cannot load other local
// project files at runtime. So these channel names are duplicated from
// src/shared/constants/ipcChannels.ts rather than imported; keep them in
// sync if that file changes.
const IpcChannel = {
  Navigate: 'nav:navigate',
  Back: 'nav:back',
  Forward: 'nav:forward',
  Reload: 'nav:reload',
  Stop: 'nav:stop',
  State: 'nav:state'
} as const;

// SECURITY: this is the entire API surface exposed to every renderer. It is
// intentionally narrow — five fixed one-way commands and one subscription —
// with no generic ipcRenderer passthrough and no Node/filesystem access.
const openBrowserApi: OpenBrowserApi = {
  navigate(input: string): void {
    ipcRenderer.send(IpcChannel.Navigate, input);
  },
  goBack(): void {
    ipcRenderer.send(IpcChannel.Back);
  },
  goForward(): void {
    ipcRenderer.send(IpcChannel.Forward);
  },
  reload(): void {
    ipcRenderer.send(IpcChannel.Reload);
  },
  stop(): void {
    ipcRenderer.send(IpcChannel.Stop);
  },
  onState(listener: (state: NavigationState) => void): () => void {
    const handler = (_event: Electron.IpcRendererEvent, state: NavigationState): void => listener(state);
    ipcRenderer.on(IpcChannel.State, handler);
    return () => ipcRenderer.removeListener(IpcChannel.State, handler);
  }
};

contextBridge.exposeInMainWorld('openBrowser', openBrowserApi);
