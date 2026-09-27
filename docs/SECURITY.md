# Security

This document describes what is actually implemented today, honestly. It
does not claim protections that aren't there. Status labels used below:

- **Implemented** — in place and exercised by the current prototype.
- **Partial** — something exists but has known gaps.
- **Placeholder** — a folder/doc exists for it; no code yet.
- **Missing** — not addressed at all; Electron/Chromium defaults apply.

## Trust boundaries

There are three distinct trust levels in this app:

1. **Main process** — fully trusted, full Node/OS access. Only code under
   `src/main/`, `src/core/`, `src/engines/`, `src/shared/` runs here.
2. **Toolbar renderer** (`src/renderer/`) — our own code, but still runs as
   a sandboxed Chromium renderer with no Node access, on the assumption that
   renderer processes are the most exposed part of any Electron app (defense
   in depth, not because we distrust our own UI code). It can reach the main
   process *only* through `window.openBrowser`
   (`src/main/security/preload.ts`).
3. **Content view** (whatever site the user navigated to, via
   `src/engines/chromium/ChromiumEngine.ts`) — fully untrusted. It runs with
   the same hardened `webPreferences` as the toolbar, but has **no preload
   script at all**, so it has zero bridge to the main process. The only way
   it affects the app is through Electron's own `webContents` events
   (`did-navigate`, `did-fail-load`, etc.), observed from the main process.

## Renderer hardening — Implemented

Defined once in `src/shared/constants/secureWebPreferences.ts` and applied
to both the toolbar window and the Chromium content view:

- `contextIsolation: true` — the page's JS and Electron's injected APIs run
  in separate JS contexts; a page cannot reach `contextBridge`-exposed
  objects' internals or prototype-pollute them.
- `nodeIntegration: false` — no `require`, no Node globals, in any
  renderer-facing webContents.
- `sandbox: true` — the OS-level Chromium sandbox is active for every
  renderer-facing webContents, including the content view showing arbitrary
  websites.

Auditing note: since this is one shared constant, confirming these three
settings are correct everywhere means checking one file, not grepping for
duplicated `webPreferences` object literals.

## IPC boundary — Implemented

All renderer↔main communication goes through exactly six named channels
(`src/shared/constants/ipcChannels.ts`): `navigate`, `back`, `forward`,
`reload`, `stop` (renderer→main), `state` (main→renderer). There is no
generic `ipcRenderer.invoke` passthrough and no dynamic channel names.

- `src/main/security/preload.ts` exposes only these six operations via
  `contextBridge.exposeInMainWorld`. It does not expose `ipcRenderer`
  itself, Node APIs, or anything else.
- `src/main/security/ipcHandlers.ts` is the only place `ipcMain.on` is
  called. Every handler resolves the acting window via Electron's
  `event.sender.id`, looked up against controllers registered by
  `src/core/browser/BrowserWindowController.ts` — a window can only ever
  control itself, even if a compromised renderer sent a forged payload.
- The `navigate` handler validates `typeof input === 'string'` before doing
  anything with it. It is otherwise unbounded free text (no length limit) —
  this is intentional, since address-bar input is meant to be free text, but
  is worth knowing if you're auditing input validation specifically.

**Partial:** payload validation at the IPC layer is minimal (type-only) —
the real safety net is the navigation-target validation described next.

## Navigation validation — Implemented

`src/core/navigation/navigation.ts` (`resolveAddressInput` /
`isNavigableUrl`) is the single choke point every navigation goes through
before `ChromiumEngine.navigate()` is called:

- Only `http:` and `https:` URLs are ever loaded directly.
- Anything else — `javascript:`, `file:`, `data:`, malformed input, or plain
  text — is **not** loaded; it's sent to the default search engine as a
  query string instead. A user typing `javascript:alert(1)` gets a search
  for that literal text, never execution.
- `ChromiumEngine.navigate()` independently re-checks `isNavigableUrl()`
  before calling `loadURL`, so this isn't relying on a single call site.

This is pure, Electron-free logic (`tests/unit/navigation.test.ts` covers
it directly without needing an Electron runtime).

## Dynamic code execution — Implemented (verified by inspection)

No `eval`, `new Function(...)`, `child_process`, or unsafe dynamic
`require`/`import` exists anywhere in this codebase as of this reorganization.
The renderer only ever assigns `textContent`, `.value`, and toggles
`classList` — it never assigns `innerHTML` with data that isn't a fixed
literal string, so there's no DOM-XSS sink from `NavigationState` fields
(e.g. the error message) reaching the page as markup.

## Content Security Policy — Missing

No explicit `Content-Security-Policy` is set for the toolbar HTML or via
session headers. Electron prints its own default-security-warnings dev
console notice about this. This is a real gap, not yet addressed.

## Permission requests (camera/mic/geolocation/notifications) — Missing

No `session.setPermissionRequestHandler` is installed. Electron's built-in
default behavior applies (which, in current Electron versions, denies most
permission requests for non-trusted contexts by default — but this app does
not customize or explicitly harden that). Planned home:
`src/services/permissions/` — see `docs/ROADMAP.md`.

## Downloads — Missing

No `will-download` handling exists; Electron's default download behavior
applies unmodified. Planned home: `src/services/downloads/`.

## TLS/certificate errors — Missing (uses Chromium defaults)

No custom `certificate-error` handling is installed. Chromium's normal
certificate validation and warning pages apply as-is.

## Supply chain / update integrity — Missing

The CI-built Windows installer (`.github/workflows/build-windows.yml`) is
**unsigned** and is not auto-installed or auto-updated anywhere. There is no
in-app update check. Shipping real auto-updates safely requires a separate
signed-update system (code-signing the installer + a trusted update feed,
e.g. via `electron-updater`) — this does not exist yet. See
`docs/ROADMAP.md` and the CI section of the root `README.md`.

## If you're auditing this app

Read, in this order: `src/main/security/` (both files, they're short),
`src/shared/constants/secureWebPreferences.ts`,
`src/core/navigation/navigation.ts`, then
`src/core/browser/BrowserWindowController.ts`. That's the entire trust
boundary plus the two things that cross it (window creation and
navigation). Everything else in `src/core/`, `src/engines/`, and
`src/renderer/` operates strictly inside the boundaries those files set.
