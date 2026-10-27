# ADR-003 — Local profile isolation

## Status
Accepted — the user confirmed the prototype scope on 2026-10-27.

## Context
The roadmap's next milestone was Profiles, but the specification did not say
what data a profile isolated or how the existing app-wide history, saved tabs,
and Chromium site data should be preserved. Profiles are local identities;
they are separate from workspaces and are not V1 scope decisions.

## Decision
- Create a `Personal` profile automatically on first run and keep the existing
  app data as that profile.
- Isolate Chromium cookies/site storage, browser history, and restorable tabs
  by profile. Profile-specific permission settings and future extension data
  remain undecided because those features are not implemented.
- The Personal profile continues using Electron's default Chromium session and
  the existing `browser-data.json` path. Additional profiles use persistent
  Chromium partitions derived from generated UUIDs and separate
  `profiles/<id>/browser-data.json` files.
- The native Profiles menu creates generated names (`Profile 2`, `Profile 3`,
  and so on), switches between profiles, and remembers the active profile.
- Profile deletion and custom profile names are deferred. The prototype has no
  enforced profile count limit; the product limit remains undecided.
- App-wide settings remain shared. No settings UI currently exists.

## Alternatives considered
- Move the existing Personal profile to a new data directory: rejected for this
  milestone because it would require moving Chromium's existing user data and
  history/session data, increasing migration and data-loss risk.
- Share the default Chromium session between profiles: rejected because it
  would not isolate cookies and site storage.
- Add profile deletion now: deferred because removal needs a separate user
  decision about confirmation, active-profile handling, and permanent data
  erasure.

## Consequences
- Existing users keep their current cookies, site storage, history, and saved
  tabs in Personal.
- New profiles begin with separate browser storage and no inherited history or
  saved tabs.
- Switching profiles replaces the current window's tabs with the selected
  profile's restored tabs; the prior profile's restorable state is saved first.
- Profiles share the app-wide settings scope. Permissions and extensions do
  not yet have profile-specific behavior.
- Generated names and the absence of a count limit describe this prototype;
  whether users can rename profiles or a product-level limit is needed remain
  open decisions.
- Profile registry corruption prevents automatic recovery rather than silently
  replacing the registry and orphaning user data.

## Security impact
Untrusted site content remains in a sandboxed `WebContentsView` without a
preload bridge. Chromium's `partition` is selected by the trusted main process
from a validated profile registry ID; the renderer cannot select a storage
partition or filesystem path.

## Privacy impact
Profile history/session files and Chromium site storage stay local. They are
not encrypted by this feature. Clearing history and saved tabs affects only
the active profile; profile data is not sent off-device.

## Performance impact
Each profile's site storage is opened only for that profile's active tabs.
This decision makes no battery, memory, or speed claims.

## Migration impact
The `Personal` profile reuses existing app data paths and the default Chromium
partition, so this milestone performs no data move. New profiles have their
own JSON session schema version and persistent Chromium partition. Future
profile storage migrations must preserve old data or explain any failure.
