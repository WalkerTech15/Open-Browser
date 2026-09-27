# Tests

- `unit/` — fast, dependency-free tests using Node's built-in test runner
  (`node:test`). Currently covers `src/core/navigation/navigation.ts`, the
  pure address-resolution logic.
- `integration/` — reserved for tests that exercise more than one module
  together (e.g. IPC handler + controller). None yet.

Run with `npm test` (builds, then runs `node --test dist/tests`, which
recurses through both folders automatically).
