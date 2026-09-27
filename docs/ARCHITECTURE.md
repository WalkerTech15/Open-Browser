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
│              glues one BrowserEngine to one window; pushes NavigationState over IPC          │
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
src/services/                      — reserved for permissions/downloads/settings (not built yet)
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
engine is running: `browser/` (wiring a window to an engine),
`navigation/` (interpreting address-bar input), and the reserved `tabs/` and
`sessions/` folders for future work. Nothing here imports Electron's UI
APIs directly except where it legitimately needs a `BrowserWindow` handle
(`BrowserWindowController`); `navigation/` is pure and engine-free by
design, which is also why it's unit-tested directly.

**Engine abstraction (`src/engines/`)** exists so the rendering engine is
swappable. `interface/BrowserEngine.ts` is the contract (navigate,
back/forward, reload/stop, state, attach-to-window). `chromium/` is the only
implementation today, built on Electron's `WebContentsView`. **Future
Gecko work belongs in `src/engines/gecko/`**, implementing the same
interface — nothing in `core/` or `main/` should need to change for that to
work, since they only depend on `BrowserEngine`, never on `ChromiumEngine`
directly.

**Services (`src/services/`)** are reserved for cross-cutting concerns that
aren't browsing logic or UI: permissions, downloads, settings. None are
implemented yet — see each folder's README and `docs/ROADMAP.md`.

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
   search-engine query URL, then calls `engine.navigate(url)`.
5. `ChromiumEngine` loads it in its `WebContentsView` and reports state
   changes back through the controller, which pushes `NavigationState` back
   to the renderer over the `nav:state` channel.
