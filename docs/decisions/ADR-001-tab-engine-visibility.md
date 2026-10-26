# ADR-001 — On-demand tab engines with explicit visibility

## Status
Accepted — decided by the user on 2026-10-26.

## Context
The first Tabs milestone needs multiple pages to remain alive while the user
switches between them. The existing `BrowserEngine` contract mounted a view
but had no operation for hiding an inactive tab without destroying it. The
specification left that contract detail open as OQ-12.

## Decision
- A browser window owns a `TabManager` with one `BrowserEngine` instance per
  active or previously activated tab. A background tab restored from the
  saved session keeps its URL and tab metadata without creating an engine
  until selected.
- `BrowserEngine` provides `setVisible(boolean)` so the active tab's view is
  shown and other tabs' views are hidden while their pages remain alive.
- Tabs opened during the current run keep their engines and pages alive when
  switched away from. This amendment changes startup behavior only for
  inactive tabs restored from a saved session.
- The prototype's initial tab strip is classic horizontal, as selected by the
  user for this milestone. This does not decide V1 scope or the general
  product-wide default layout.

## Alternatives considered
- Reuse one engine and reload a tab when selected: rejected because it loses
  the page's in-memory state.
- Eagerly create every restored tab's engine at startup: rejected because it
  allocates native views before those tabs are needed.
- Destroy a tab's engine after it has been activated: rejected because it
  discards live page state and adds reload behavior to this milestone.

## Consequences
- Tab selection preserves each page's current in-memory state.
- A restored background tab uses only its saved metadata until selected;
  selecting it creates its engine and loads its saved URL.
- After a tab has been activated, it retains its live engine and page while
  open. Sleeping/discarding and numeric performance targets remain unresolved.
- Live page state is in-memory only. Saved URLs and automatic restore are
  defined separately in [`ADR-002`](ADR-002-local-session-persistence.md).
- The `BrowserEngine` interface now includes view visibility. Future engines
  must implement the same behavior before they can support this tab manager.

## Security impact
Each engine-created content view must retain the existing hardened web
preferences, without a preload bridge. Tab selection only changes view
visibility and does not widen renderer IPC permissions.

## Privacy impact
This tab-lifecycle decision adds no telemetry, account, or network behavior.
Session persistence is defined separately in ADR-002. Tabs continue to
navigate under the existing URL validation and site isolation boundaries.

## Performance impact
Only the selected view is visible. Unselected restored tabs have no engine or
page until selected; pages that have already been activated remain loaded and
may continue using memory, CPU, or network resources. This reduces eager
startup view creation, but no measured battery or resource savings are
claimed.

## Migration impact
This ADR adds no persisted data format; session data and its versioned format
are defined in ADR-002. Engine implementations and fakes must add
`setVisible(boolean)`.
