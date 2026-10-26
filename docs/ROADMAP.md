# Roadmap

## Current status: prototype

A single-window, Chromium-only browser with a classic horizontal tab strip.
Tabs can be created, switched, and closed. Pages stay alive while their tabs
are inactive. There is no persistence, profiles, or extensions.

## Implemented

- Single-window Chromium browsing via `src/engines/chromium/ChromiumEngine.ts`
- Classic horizontal tabs with one Chromium view per tab; switching hides the
  inactive view without destroying its page (`src/core/tabs/TabManager.ts`)
- Address-bar input resolution (URL vs. search) — `src/core/navigation/`
- Back / forward / reload / stop
- Loading and error states surfaced in the toolbar
- Hardened renderer settings (context isolation, no Node integration,
  sandboxing) shared across every webContents
- Validated, narrow IPC boundary between renderer and main
- Windows CI build producing a downloadable (unsigned) installer artifact

## Planned (next milestones, roughly in order)

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
profiles/workspaces UI, Gecko, auto-updates, telemetry, AI
features, code signing, publishing credentials, macOS/Linux packaging,
website deployment.
