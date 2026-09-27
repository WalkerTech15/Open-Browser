# Core

Engine-agnostic browsing logic — the concepts that would stay the same even
if the underlying engine (Chromium/Gecko) changed.

- `browser/` — `BrowserWindowController`, which wires one `BrowserEngine` to
  one Electron window and forwards state to the renderer. Implemented.
- `navigation/` — pure, Electron-free logic for turning address-bar input
  into a safe URL or a search query. Implemented; see `docs/SECURITY.md` for
  why this file is the main navigation-safety control.
- `tabs/` — reserved for multi-tab state. Not implemented.
- `sessions/` — reserved for profile/session persistence. Not implemented.

See `docs/ARCHITECTURE.md` for the full picture.
