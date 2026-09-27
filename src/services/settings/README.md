# Settings service (reserved, not implemented)

Planned home for reading/writing user preferences (default search engine,
startup behavior, privacy controls) and persisting them to disk.

**Current state:** there are no user-configurable settings; the default
search URL and start page are hardcoded constants in
`src/core/navigation/navigation.ts` and `src/core/browser/BrowserWindowController.ts`.
See `docs/ROADMAP.md`.
