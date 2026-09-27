# Security-sensitive main-process code

Start here when auditing this app. Everything in this folder is on the trust
boundary between the untrusted/sandboxed renderer processes and the
privileged main process.

- `preload.ts` — the *only* bridge a renderer has into the main process.
  Exposes a fixed, narrow API (`window.openBrowser`) via `contextBridge`; no
  Node APIs, no generic IPC passthrough.
- `ipcHandlers.ts` — the *only* `ipcMain` listeners in the app. Validates
  every message and always resolves the acting window from `event.sender`,
  never from renderer-supplied data.

The shared hardened `webPreferences` policy (`contextIsolation`,
`nodeIntegration`, `sandbox`) lives in
`src/shared/constants/secureWebPreferences.ts`, not here, because both the
main window (`src/main/windows`) and the Chromium engine's content view
(`src/engines/chromium`) apply it. Check that file too.

Full write-up: `docs/SECURITY.md`.
