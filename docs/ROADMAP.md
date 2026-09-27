# Roadmap

## Current status: prototype

A single window, single tab, Chromium-only browser. You can type a URL or a
search term, navigate, go back/forward, reload, and stop loading. No
persistence, no profiles, no extensions.

## Implemented

- Single-window Chromium browsing via `src/engines/chromium/ChromiumEngine.ts`
- Address-bar input resolution (URL vs. search) — `src/core/navigation/`
- Back / forward / reload / stop
- Loading and error states surfaced in the toolbar
- Hardened renderer settings (context isolation, no Node integration,
  sandboxing) shared across every webContents
- Validated, narrow IPC boundary between renderer and main
- Windows CI build producing a downloadable (unsigned) installer artifact

## Planned (next milestones, roughly in order)

- **Tabs** — multiple `BrowserWindowController`-style instances per window;
  design home is `src/core/tabs/` (currently just a placeholder README)
- **Sessions** — persisted browsing session/profile data (history, per-profile
  storage partitioning); design home is `src/core/sessions/`
- **Profiles** — multiple isolated user identities in one install
- **Workspaces** — grouping tabs/sessions for different contexts
- **Privacy controls** — tracker/ad blocking, a real Content-Security-Policy,
  permission-request handling (`src/services/permissions/`)
- **Signed updates** — code-signing the Windows installer and building a
  real auto-update feed (e.g. `electron-updater` against a trusted host);
  see `docs/SECURITY.md`'s "Supply chain / update integrity" section for why
  this doesn't exist yet

## Experimental / unscheduled

Nothing currently in active experimentation. Ideas that would need their own
design pass before starting: extension support, a settings UI
(`src/services/settings/`), download management UI
(`src/services/downloads/`).

## Explicitly future / not being designed yet

- Gecko engine support (`src/engines/gecko/` is a placeholder only)
- macOS/Linux builds (CI currently targets Windows only)
- Telemetry of any kind
- AI features of any kind

## Non-goals for the current milestone

These are deliberately out of scope right now, not forgotten:
multi-tab UI, profiles/workspaces UI, Gecko, auto-updates, telemetry, AI
features, code signing, publishing credentials, macOS/Linux packaging,
website deployment.
