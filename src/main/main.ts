import { app, BrowserWindow } from 'electron';
import { createMainWindow } from './windows/createMainWindow';
import { registerNavigationIpcHandlers } from './security/ipcHandlers';
import * as path from 'node:path';
import { SessionStore } from '../core/sessions/SessionStore';

registerNavigationIpcHandlers();

let sessionStore: SessionStore | null = null;
let allowQuitAfterFlush = false;

app.on('before-quit', (event) => {
  if (!sessionStore || allowQuitAfterFlush) return;
  event.preventDefault();
  void sessionStore.flush().catch((error) => {
    console.error('Could not finish saving browser data before exit.', error);
  }).finally(() => {
    allowQuitAfterFlush = true;
    app.quit();
  });
});

app.whenReady().then(async () => {
  sessionStore = new SessionStore(path.join(app.getPath('userData'), 'browser-data.json'));
  const savedData = await sessionStore.load();
  createMainWindow(sessionStore, savedData);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0 && sessionStore) {
      createMainWindow(sessionStore, sessionStore.snapshot());
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
