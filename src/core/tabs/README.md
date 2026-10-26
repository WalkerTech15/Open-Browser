# Tabs

`TabManager` owns the tabs for one browser window. It creates an engine when a
tab is first opened or selected from a restored session. It tracks the active
tab and switches pages by hiding the inactive view. Once created, hidden views
stay alive, so switching tabs preserves page state.

`BrowserWindowController` connects tab actions to the toolbar IPC API. The
tab manager owns live tab state; `SessionStore` separately persists tab URLs
and restores inactive tabs without creating their native views until selected.
Sleeping/discarding, profiles, and
workspaces are separate future work. The architectural choice
is recorded in [`docs/decisions/ADR-001-tab-engine-visibility.md`](../../../docs/decisions/ADR-001-tab-engine-visibility.md).
