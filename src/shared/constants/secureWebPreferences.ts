/**
 * The hardened Electron `webPreferences` applied to every renderer-facing
 * webContents in this app: the main toolbar window (src/main/windows) and
 * the Chromium engine's content view (src/engines/chromium). One shared
 * constant means there is exactly one place to audit for these settings.
 *
 * Do not weaken these values — see docs/SECURITY.md.
 */
export const SECURE_WEB_PREFERENCES = {
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true
} as const;
