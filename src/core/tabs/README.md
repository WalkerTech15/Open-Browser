# Tabs

`TabManager` owns the tabs for one browser window. It creates one engine per
tab, tracks which tab is active, and switches pages by hiding the inactive
view. Hidden views stay alive, so switching tabs preserves page state.

`BrowserWindowController` connects tab actions to the toolbar IPC API. This
module owns only in-memory tab state; persistence, sleeping/discarding,
profiles, and workspaces are separate future work. The architectural choice
is recorded in [`docs/decisions/ADR-001-tab-engine-visibility.md`](../../../docs/decisions/ADR-001-tab-engine-visibility.md).
