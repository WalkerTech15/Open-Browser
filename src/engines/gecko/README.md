# Gecko engine (reserved, not implemented)

This folder is reserved for a future Gecko/Firefox-based `BrowserEngine`
implementation. Not started — Gecko support is explicitly out of scope for
the current prototype (see `docs/ROADMAP.md`).

When it is built, it must implement the same `BrowserEngine` interface from
`src/engines/interface/BrowserEngine.ts` that `src/engines/chromium/` does,
so the rest of the app (`src/core/browser`, `src/main`) does not need to
change to support it.
