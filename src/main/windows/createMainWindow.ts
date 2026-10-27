import { app, BrowserWindow } from 'electron';
import * as path from 'node:path';
import { SECURE_WEB_PREFERENCES } from '../../shared/constants/secureWebPreferences';
import { ChromiumEngine } from '../../engines/chromium/ChromiumEngine';
import { BrowserWindowController } from '../../core/browser/BrowserWindowController';
import type { BrowserSessionSnapshot, SessionStore } from '../../core/sessions/SessionStore';
import type { BrowserProfile } from '../../shared/types/browserProfiles';
import type { ProfileStore } from '../../core/profiles/ProfileStore';

// app.getAppPath() (rather than a chain of __dirname + '..') keeps this
// correct regardless of how deep this compiled file lives under dist/, and
// still resolves correctly inside a packaged asar.
const RENDERER_ENTRY = path.join(app.getAppPath(), 'src/renderer/layout/index.html');

/**
 * Creates the single toolbar window for this prototype (multi-window/tab
 * support is future work — see src/core/tabs/README.md). The window's
 * webPreferences use the shared hardened policy; see docs/SECURITY.md.
 */
export function createMainWindow(
  sessionStore?: SessionStore,
  initialSession?: BrowserSessionSnapshot,
  profileStore?: ProfileStore,
  activeProfile: BrowserProfile = { id: 'personal', name: 'Personal', createdAt: 0 }
): BrowserWindow {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      ...SECURE_WEB_PREFERENCES,
      preload: path.join(__dirname, '../security/preload.js')
    }
  });

  new BrowserWindowController(
    window,
    (profileId) => new ChromiumEngine(
      profileId === 'personal' ? undefined : `persist:open-browser-${profileId}`
    ),
    sessionStore,
    initialSession,
    profileStore,
    activeProfile
  );

  void window.loadFile(RENDERER_ENTRY);

  return window;
}
