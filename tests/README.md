# Tests

- `unit/` — fast, dependency-free tests using Node's built-in test runner
  (`node:test`). Currently covers `src/core/navigation/navigation.ts`, the
  pure address-resolution logic.
- `integration/` — tests that exercise more than one module together. The
  browser-window controller test uses a fake engine and window to verify
  controller lifecycle behavior without launching Electron.

Run with `npm test` (builds, then runs the compiled unit and integration
tests with Node's built-in test runner).
