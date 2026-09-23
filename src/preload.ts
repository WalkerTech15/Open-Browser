import { contextBridge, ipcRenderer } from 'electron';
import type { NavigationState } from './engine/BrowserEngine';

// A sandboxed preload script can only `require` a small allowlist of built-ins
// (plus 'electron') — it cannot load other local project files. So the IPC
// channel names are duplicated here rather than imported from ./shared/ipc.
const IpcChannel = {
  Navigate: 'nav:navigate',
  Back: 'nav:back',
  Forward: 'nav:forward',
  Reload: 'nav:reload',
  Stop: 'nav:stop',
  State: 'nav:state'
} as const;

const openBrowserApi = {
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

export type OpenBrowserApi = typeof openBrowserApi;
