# Tabs (reserved, not implemented)

This folder is reserved for multi-tab support. The current prototype is
single-window, single-tab: `src/core/browser/BrowserWindowController.ts`
manages exactly one engine per window.

When tabs are implemented, this is where tab-collection state (which tabs
are open, their order, the active tab) should live, separate from
`core/browser` (one controller per surface) and `core/sessions` (persisted
profile/session data). See `docs/ROADMAP.md`.
