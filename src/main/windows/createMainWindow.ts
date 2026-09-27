import { app, BrowserWindow } from 'electron';
import * as path from 'node:path';
import { SECURE_WEB_PREFERENCES } from '../../shared/constants/secureWebPreferences';
import { ChromiumEngine } from '../../engines/chromium/ChromiumEngine';
import { BrowserWindowController } from '../../core/browser/BrowserWindowController';

// app.getAppPath() (rather than a chain of __dirname + '..') keeps this
// correct regardless of how deep this compiled file lives under dist/, and
// still resolves correctly inside a packaged asar.
const RENDERER_ENTRY = path.join(app.getAppPath(), 'src/renderer/layout/index.html');

/**
 * Creates the single toolbar window for this prototype (multi-window/tab
 * support is future work — see src/core/tabs/README.md). The window's
 * webPreferences use the shared hardened policy; see docs/SECURITY.md.
 */
export function createMainWindow(): BrowserWindow {
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

  new BrowserWindowController(window, new ChromiumEngine());

  void window.loadFile(RENDERER_ENTRY);

  return window;
}
