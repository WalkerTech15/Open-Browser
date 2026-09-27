# Engines

The rendering-engine abstraction. Nothing outside this folder should import a
concrete engine class directly — depend on the interface instead.

- `interface/` — `BrowserEngine`, the contract every engine implements
  (navigate, back/forward, reload/stop, state, attach to a window).
- `chromium/` — the only implementation today, built on Electron's
  `WebContentsView`.
- `gecko/` — reserved for future Gecko support (not implemented).

See `docs/ARCHITECTURE.md` for how this fits into the rest of the app.
