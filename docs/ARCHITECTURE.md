# Architecture

Open Browser is an Electron app. This document explains how the pieces fit
together; for security-specific detail see `docs/SECURITY.md`, and for
what's implemented vs. planned see `docs/ROADMAP.md`.

## Diagram

```
┌─────────────────────────────── Main process (Node, trusted) ───────────────────────────────┐
│                                                                                              │
│  src/main/main.ts  ── app lifecycle only (whenReady / activate / window-all-closed)          │
│       │                                                                                      │
│       ├─ src/main/windows/createMainWindow.ts                                                │
│       │      creates the BrowserWindow (hardened webPreferences + preload)                   │
│       │      creates a ChromiumEngine + BrowserWindowController for it                       │
│       │                                                                                      │
│       ├─ src/main/security/ipcHandlers.ts                                                    │
│       │      the ONLY ipcMain listeners — validated, sender-scoped                            │
│       │                                                                                      │
│       └─ src/core/browser/BrowserWindowController.ts                                         │
│              owns one window's active profile and TabManager; routes profile switching        │
│                     │                                                                        │
│                     ├─ src/core/profiles/ProfileStore.ts (registry + isolated data paths)     │
│                     ├─ src/core/workspaces/WorkspaceStore.ts (profile-scoped saved URL groups)│
│                     ├─ src/core/tabs/TabManager.ts (engines created on demand; one visible)   │
│                     └─ src/core/sessions/SessionStore.ts (local profile JSON data)             │
│                     │                                                                        │
│                     ▼                                                                        │
│              src/engines/interface/BrowserEngine.ts  (the contract)                          │
│                     │                                                                        │
│                     ▼                                                                        │
│              src/engines/chromium/ChromiumEngine.ts  (WebContentsView, loads real sites)     │
│                                                                                                │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
            │ contextBridge (preload.ts)                    │ Electron's own webContents API
            ▼                                                (no bridge at all — see below)
┌── Renderer: toolbar window (sandboxed, no Node) ──┐   ┌── Content view: whatever site loaded ──┐
│  src/renderer/layout/index.html                   │   │  Arbitrary third-party HTML/JS.        │
│  src/renderer/components/toolbar.ts               │   │  Same hardened webPreferences, but NO   │
│  window.openBrowser.navigate() / goBack() / ...   │   │  preload script — it cannot reach the   │
└────────────────────────────────────────────────────┘   │  main process at all.                  │
                                                           └──────────────────────────────────────┘

src/core/navigation/navigation.ts  — pure, Electron-free: turns address-bar
                                      input into a safe URL or a search query
src/shared/                        — types/constants used by both main and renderer
src/services/                      — permission deny-by-default and download save-dialog policies; settings remain future work
```

## The pieces

**Main process (`src/main/`)** is the only privileged code — full Node and
OS access. It is deliberately thin: `main.ts` only handles app lifecycle,
`windows/` only creates windows, `security/` only handles the
renderer-facing trust boundary (preload + IPC). Business logic does not live
here; it lives in `core/` and `engines/`.

**Renderer (`src/renderer/`)** is our own toolbar UI — the address bar and
back/forward/reload/stop controls. It runs as a sandboxed Chromium renderer
process with no Node integration, so it can only affect the app through the
narrow `window.openBrowser` API the preload script exposes. See
`src/renderer/README.md` for a constraint that matters if you touch it: no
bundler, so no runtime `import`/`export` in these files.

**Core (`src/core/`)** holds browsing concepts that don't depend on which
engine is running: `browser/` (window-level wiring), `profiles/` (local
profile registry and data paths), `workspaces/` (saved URL groups scoped to a
profile), `tabs/` (tab collection and active selection), `sessions/` (local
tab/history persistence), and
`navigation/` (interpreting address-bar input). `SessionStore` uses Node's
filesystem APIs in the trusted main process; it stores versioned JSON under
Electron's per-install `userData` directory. The Personal profile reuses the
legacy `browser-data.json` path and Chromium's default session to preserve
existing data. Additional profiles use a UUID-derived persistent Chromium
partition and their own `profiles/<id>/browser-data.json`. Profile data stores
URLs and visit times, not page contents or URL-embedded credentials. The user
can clear history, the saved restore snapshot, and saved workspace URLs together
for the active profile. Saved workspace URLs live in `workspaces.json` for Personal and
`profiles/<id>/workspaces.json` for other profiles; layout, theme, permissions,
and cross-device sync are not included. Reopening a saved workspace replaces
the current tab set after user confirmation. `navigation/` remains pure and
engine-free, which is why it is unit-tested directly.

**Engine abstraction (`src/engines/`)** exists so the rendering engine is
swappable. `interface/BrowserEngine.ts` is the contract (attach, visibility,
navigation, history controls, and state). A tab gets an engine when first
opened or selected from a restored session. Switching hides the previous view
with `setVisible(false)` and shows the selected view; created pages remain
alive while their tabs remain open. Inactive restored tabs keep metadata only,
avoiding native view creation until first selection. `chromium/` is the only
implementation today, built on Electron's `WebContentsView`. **Future
Gecko work belongs in `src/engines/gecko/`**, implementing the same
interface — nothing in `core/` or `main/` should need to change for that to
work, since they only depend on `BrowserEngine`, never on `ChromiumEngine`
directly.

**Services (`src/services/`)** hold cross-cutting concerns that aren't
browsing logic or UI. Permission requests are denied by default, and downloads
use Electron's native save prompt with a safe suggested filename. User-facing
permission controls, download management, and settings remain future work — see
each folder's README and `docs/ROADMAP.md`.

**Shared (`src/shared/`)** holds plain types (`types/`) and constants
(`constants/`) used by more than one layer — e.g. `NavigationState` (used by
the engine interface, main process, and renderer) and the IPC channel names.
Nothing here is UI-specific or Electron-API-specific beyond what's strictly
necessary (`secureWebPreferences.ts` is the one exception, since both the
main window and the Chromium engine need the identical policy object).

## Data flow: typing a URL

1. User types in `src/renderer/components/toolbar.ts`'s address input,
   presses Enter → `window.openBrowser.navigate(input)`.
2. Preload (`src/main/security/preload.ts`) sends it over the `nav:navigate`
   IPC channel — the only channel that can trigger navigation.
3. `src/main/security/ipcHandlers.ts` validates it's a string, looks up the
   `BrowserWindowController` for the sending window, calls
   `handleNavigate(input)`.
4. The controller resolves it via `core/navigation/navigation.ts`
   (`resolveAddressInput`) into either a validated `http(s)://` URL or a
   search-engine query URL, then routes it to the active engine through
   `TabManager`.
5. `ChromiumEngine` loads it in that tab's `WebContentsView` and reports state
   through `TabManager` and the controller. The controller pushes active
   navigation state and the tab list over `nav:state` and `tabs:state`.

## Session persistence

At startup, the main process reads the active profile from `profiles.json`.
Personal continues to use `browser-data.json`; other profiles use
`profiles/<id>/browser-data.json`. The selected tab is loaded; other restored
tabs keep their URL metadata and load when first selected. The main process
records top-level navigations and writes history plus the open-tab snapshot
atomically through a temporary file and rename. The preload exposes only
fixed, sender-scoped history and profile-menu commands; website content views
have no preload. Details and trade-offs are recorded in
[`decisions/ADR-002-local-session-persistence.md`](decisions/ADR-002-local-session-persistence.md)
and [`decisions/ADR-003-profile-isolation.md`](decisions/ADR-003-profile-isolation.md).
