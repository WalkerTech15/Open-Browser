# Roadmap

## Current status: prototype

A single-window, Chromium-only browser with a classic horizontal tab strip.
Tabs can be created, switched, and closed. Pages stay alive while their tabs
are inactive. Local history and automatic tab restoration are implemented.
Basic profiles can be created and switched; each keeps separate site storage,
history, and restored tabs. Profile deletion and custom names are not yet
implemented. Extensions are not implemented.

## Implemented

- Single-window Chromium browsing via `src/engines/chromium/ChromiumEngine.ts`
- Classic horizontal tabs with one Chromium view per tab; switching hides the
  inactive view without destroying its page (`src/core/tabs/TabManager.ts`)
- Address-bar input resolution (URL vs. search) — `src/core/navigation/`
- Back / forward / reload / stop
- Local browsing history with no time-based expiry and automatic tab restore
- Inactive restored tabs load only when selected
- The native History menu offers a confirmed action to clear history and saved
  restore tabs; current pages stay open
- Basic local profiles: Personal is created by default, additional profiles
  can be created and switched, and each uses a separate Chromium storage
  partition plus a separate history/session file
- Loading and error states surfaced in the toolbar
- Hardened renderer settings (context isolation, no Node integration,
  sandboxing) shared across every webContents
- Validated, narrow IPC boundary between renderer and main
- Windows CI build producing a downloadable (unsigned) installer artifact

## Planned (next milestones, roughly in order)

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
profile deletion/custom naming, workspaces UI, Gecko, auto-updates, telemetry, AI
features, code signing, publishing credentials, macOS/Linux packaging,
website deployment.
