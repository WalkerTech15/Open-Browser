import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'node:path';
import { ChromiumEngine } from './engine/ChromiumEngine';
import { resolveAddressInput } from './engine/navigation';
import type { BrowserEngine } from './engine/BrowserEngine';
import { IpcChannel } from './shared/ipc';

const TOOLBAR_HEIGHT = 56;
const START_URL = 'https://duckduckgo.com';

// Maps each window's webContents id to the engine driving its content view,
// so IPC handlers (registered once) can find the right engine per sender.
const engines = new Map<number, BrowserEngine>();

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  const engine: BrowserEngine = new ChromiumEngine();
  engine.attach(window, TOOLBAR_HEIGHT);
  engines.set(window.webContents.id, engine);

  const pushState = (): void => {
    if (!window.isDestroyed()) window.webContents.send(IpcChannel.State, engine.getState());
  };
  const unsubscribe = engine.onStateChange(pushState);

  window.on('closed', () => {
    unsubscribe();
    engine.destroy();
    engines.delete(window.webContents.id);
  });

  window.webContents.once('did-finish-load', pushState);

  void window.loadFile(path.join(__dirname, '../src/renderer/index.html'));
  void engine.navigate(START_URL);
}

ipcMain.on(IpcChannel.Navigate, (event, input: unknown) => {
  const engine = engines.get(event.sender.id);
  if (!engine || typeof input !== 'string') return;
  const target = resolveAddressInput(input);
  if (target) void engine.navigate(target);
});

ipcMain.on(IpcChannel.Back, (event) => {
  engines.get(event.sender.id)?.goBack();
});

ipcMain.on(IpcChannel.Forward, (event) => {
  engines.get(event.sender.id)?.goForward();
});

ipcMain.on(IpcChannel.Reload, (event) => {
  engines.get(event.sender.id)?.reload();
});

ipcMain.on(IpcChannel.Stop, (event) => {
  engines.get(event.sender.id)?.stop();
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
