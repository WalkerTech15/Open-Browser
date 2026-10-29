import { app, BrowserWindow } from 'electron';
import { createMainWindow } from './windows/createMainWindow';
import { registerNavigationIpcHandlers } from './security/ipcHandlers';
import { ProfileStore } from '../core/profiles/ProfileStore';
import { registerCaptureWarningTitles } from './windows/captureWarningTitles';

registerCaptureWarningTitles(app);
registerNavigationIpcHandlers();

let profileStore: ProfileStore | null = null;
let allowQuitAfterFlush = false;

app.on('before-quit', (event) => {
  if (!profileStore || allowQuitAfterFlush) return;
  event.preventDefault();
  void profileStore.flushSessions().catch((error) => {
    console.error('Could not finish saving browser data before exit.', error);
  }).finally(() => {
    allowQuitAfterFlush = true;
    app.quit();
  });
});

app.whenReady().then(async () => {
  profileStore = new ProfileStore(app.getPath('userData'));
  const activeProfile = await profileStore.load();
  const sessionStore = profileStore.sessionStore(activeProfile.id);
  const savedData = await sessionStore.load();
  createMainWindow(sessionStore, savedData, profileStore, activeProfile);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0 && profileStore) {
      const profile = profileStore.activeProfile();
      const store = profileStore.sessionStore(profile.id);
      createMainWindow(store, store.snapshot(), profileStore, profile);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
