# ADR-001 — One browser engine per tab with explicit visibility

## Status
Accepted — decided by the user on 2026-10-26.

## Context
The first Tabs milestone needs multiple pages to remain alive while the user
switches between them. The existing `BrowserEngine` contract mounted a view
but had no operation for hiding an inactive tab without destroying it. The
specification left that contract detail open as OQ-12.

## Decision
- A browser window owns a `TabManager` with one `BrowserEngine` instance per
  open tab.
- `BrowserEngine` provides `setVisible(boolean)` so the active tab's view is
  shown and other tabs' views are hidden while their pages remain alive.
- The prototype's initial tab strip is classic horizontal, as selected by the
  user for this milestone. This does not decide V1 scope or the general
  product-wide default layout.

## Alternatives considered
- Reuse one engine and reload a tab when selected: rejected because it loses
  the page's in-memory state.
- Destroy inactive engines: rejected because it likewise discards live page
  state and adds reload behavior to this milestone.

## Consequences
- Tab selection preserves each page's current in-memory state.
- Each open tab retains a live engine and page. This can consume resources as
  tab count grows; sleeping/discarding, persistence, and performance targets
  are outside this decision and remain unresolved.
- Tab state is in-memory only. Closing a window or app does not restore tabs.
- The `BrowserEngine` interface now includes view visibility. Future engines
  must implement the same behavior before they can support this tab manager.

## Security impact
Each engine-created content view must retain the existing hardened web
preferences, without a preload bridge. Tab selection only changes view
visibility and does not widen renderer IPC permissions.

## Privacy impact
This decision adds no persistence, telemetry, account, or network behavior.
Tabs continue to navigate under the existing URL validation and site
isolation boundaries.

## Performance impact
Only the selected view is visible, but inactive pages remain loaded and may
continue using memory, CPU, or network resources. No battery or resource
savings are claimed.

## Migration impact
No persisted data or public file format exists to migrate. Engine
implementations and fakes must add `setVisible(boolean)`.
