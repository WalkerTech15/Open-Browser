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

All renderer↔main communication goes through thirteen named channels in
`src/shared/constants/ipcChannels.ts`: navigation and tab commands, state
updates, and fixed commands to show the native history, profile, and workspace menus. There is no
generic IPC passthrough and no dynamic channel names.

- `src/main/security/preload.ts` exposes only fixed typed operations via
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

Profile metadata, history, session data, and saved workspace URL groups are written only by the trusted main process
to the app's local `userData` directory. Each profile has its own HTTP(S)-only
history/session file; URL-embedded usernames and passwords are stripped.
Additional profiles use separate persistent Chromium partitions for cookies
and site storage. Personal retains Electron's original default Chromium
session and `browser-data.json` path. The files are not encrypted. History has
no time-based expiry; the user can clear it along with the saved tab set and
workspace URL groups for the active profile from the toolbar. Workspace URLs
are HTTP(S)-validated and URL credentials are stripped. Atomic replacement protects
against a partial JSON write. Malformed session data is ignored with a warning;
malformed workspace data is reported and left untouched.

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

## Content Security Policy — Implemented for the toolbar

The toolbar document (`src/renderer/layout/index.html`) sets a restrictive
Content Security Policy through a document meta tag. It allows only local
scripts and styles, blocks network connections and embedded objects, and
restricts forms, frames, and base URLs. `tests/unit/rendererSecurity.test.ts`
checks that the policy remains present and includes its restrictive directives.

This policy applies only to the browser's toolbar UI. It does not set a policy
for websites opened in content views; those remain untrusted and need separate
privacy/security controls. Whether toolbar CSP is a V1 release gate remains
undecided under ND-12 in `docs/SPECIFICATION.md`.

## Permission requests (camera/mic/geolocation/notifications) — Denied by default

Every Chromium session installs permission-request, permission-check, and
device-permission handlers that deny access. This avoids granting access while
there is no user-facing permission manager. Camera, microphone, geolocation,
notifications, screen capture, and device access are unavailable in the
current prototype.
User-configurable prompts and per-site grants remain planned work; see
`src/services/permissions/README.md` and `docs/ROADMAP.md`.

## Downloads — Native save prompt configured

Each Chromium session configures Electron's native download save prompt with a
suggested filename in the user's Downloads directory. The website-provided
filename is reduced to its basename using either path separator. Invalid
Windows characters and reserved names are handled; empty or dot-only names
fall back to `download`. The user selects the final location.
Download progress/history management is not implemented. See
`src/services/downloads/README.md`.

## TLS/certificate errors — Chromium validation retained

No custom `certificate-error` handler is installed, so Chromium validates
certificates and presents its normal error behavior. This is intentional:
custom overrides could let invalid certificates through. The prototype does
not add a bypass or exception flow.

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
