# ADR-004 — Profile-scoped saved workspaces

## Status
Accepted — the user selected the first workspace increment on 2026-10-27.

## Context
The specification left open whether workspaces could span profiles and what
they contained. Profiles already isolate cookies, site storage, history, and
restorable tabs. A workspace that crossed profiles could blur that boundary.

## Decision
- Each workspace belongs to exactly one profile and is stored in that
  profile's local user-data directory.
- A workspace stores a generated name and an ordered list of HTTP(S) tab URLs.
  URL credentials are stripped before storage.
- The toolbar Workspaces menu saves the current tabs as a new generated-name
  workspace and lets the user reopen a saved workspace.
- Reopening a workspace replaces the current tab set only after a confirmation.
  Only its first tab loads immediately; other tabs load when selected.
- Clearing history also clears saved session-restore tabs and workspace groups
  for the active profile, following the existing user decision in ADR-002.
- Workspace names cannot currently be edited, and workspace deletion has no
  separate UI. This increment does not define V1 membership.
- Layouts, themes, permissions, templates, automatic workspace selection at
  startup, and cross-device sync are outside this increment. Their product
  scope remains undecided or deferred.

## Alternatives considered
- Allow workspaces to span profiles: rejected for this increment because it
  would weaken the existing profile boundary and needs a separate user decision.
- Save layout, themes, or permissions: deferred because their behavior is
  undefined and they are not needed to save and reopen tab URL groups.
- Replace open tabs without confirmation: rejected to avoid silently losing
  the current open tab set.

## Consequences
- Workspace URLs are persisted locally in a separate JSON file per profile.
- Selecting a workspace explicitly replaces the window's current tabs after
  confirmation. Users should save the current tabs first if they want to keep
  them as another workspace.
- The active workspace is not remembered or automatically restored at startup;
  the user reopens a saved workspace from the menu.
- Workspace storage is separate from the profile session file. Clearing history
  removes both files' saved browsing URL data for the active profile.

## Security and privacy impact
Only the main process reads and writes workspace files. Renderer access uses a
fixed IPC command that does not accept a profile ID, filesystem path, name, or
URL from the renderer. Persisted URLs must be navigable HTTP(S) URLs and have
embedded credentials removed. Workspace data stays local and is not encrypted.

## Performance impact
Opening a workspace creates metadata for its tabs and loads the selected page
first. Other tabs remain unloaded until selected. No memory or battery claim is
made.
