# Tests

- `unit/` — fast tests using Node's built-in test runner (`node:test`). Covers
  address resolution, profile registry persistence/isolation paths, and local
  session persistence.
- `integration/` — tests that exercise more than one module together. The
  browser-window controller test uses a fake engine and window to verify
  controller lifecycle and profile switching without launching Electron.

Run with `npm test` (builds, then runs the compiled unit and integration
tests with Node's built-in test runner).
