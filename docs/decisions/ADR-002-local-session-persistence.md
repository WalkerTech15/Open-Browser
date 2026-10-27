# ADR-002 — Local history and automatic tab restoration

## Status
Accepted — the user selected automatic restore and history retention until
cleared on 2026-10-26, and confirmed that clearing history also clears saved
tabs.

## Context
The Sessions milestone needed a defined meaning, retention rule, restore
behavior, and storage boundary. OQ-04, OQ-05, and ND-05 in
`docs/SPECIFICATION.md` left these decisions open. The current prototype has
one browser window and no profile isolation.

## Decision
- A session for this milestone means the open tab URL snapshot and browser
  history for the current app installation. It does not implement profiles,
  cookies/storage partitioning, or cross-device sync.
- Persist versioned JSON in `app.getPath('userData')`; store HTTP(S) URLs and
  visit timestamps only. Remove embedded URL usernames and passwords before
  persistence. The file is local and is not encrypted by this feature.
- Restore the previous tab set automatically. Load the previously active tab
  first, and defer other restored pages until selected.
- Keep history until the user clears it; there is no time-based expiry.
- One confirmed Clear history action removes history and the saved tab
  snapshot together. Pages already open remain open, but are not restored
  again unless a later tab/navigation change saves a new snapshot.
- Use atomic temporary-file replacement. Ignore malformed or unsupported
  stored records rather than passing them to navigation.

## Alternatives considered
- Ask at every startup: not selected; automatic restoration was selected.
- Store history in Chromium's built-in profile history: not chosen because
  the prototype currently has a single application-owned, testable store and
  needs the history UI to share the same clear action as tab restoration.
- Keep saved tabs when history is cleared: not selected; the user chose to
  clear both together.

## Consequences
- Startup restores the user's prior tab URLs without loading every background
  page at once.
- History can grow until explicitly cleared. The UI must explain the combined
  deletion behavior before applying it.
- URL paths and query parameters can still contain sensitive information;
  this feature does not inspect query strings or encrypt the local JSON file.
- At the time this ADR was accepted, session data was app-wide. Profile
  isolation for the current prototype is defined by
  [`ADR-003`](ADR-003-profile-isolation.md). Export or sync still requires a
  separately reviewed design and migration plan.

## Security impact
Only the trusted main process reads/writes the file. The sandboxed toolbar has
narrow history IPC; untrusted content views have no preload. Every restored
URL is revalidated as HTTP(S), and URL-embedded credentials are stripped.

## Privacy impact
The user explicitly enabled local history. Data is not sent off-device by
this feature. Clearing removes both history and saved tab URLs. The local file
is not encrypted; operating-system account access controls apply.

## Performance impact
Inactive restored tabs are not loaded until selected. Writes are serialized
and use temporary-file replacement; no battery or performance improvement is
claimed.

## Migration impact
The JSON schema includes version `1`. Future schema changes must validate and
migrate existing data or safely explain when it cannot be read.
