# Open-Browser
An open-source, privacy-first, adaptive browser focused on performance, customization, and user control.

This is an early prototype: a single window, single tab, Chromium-only
browser built on Electron. See `docs/ROADMAP.md` for what's implemented vs.
planned.

## Project status

The current prototype provides:

- A Windows-focused Electron desktop shell
- A Chromium web-content view
- Address-bar navigation with search fallback
- Back, forward, reload, and stop controls
- Hardened renderer settings and a narrow preload API
- Unit and integration coverage for navigation and window lifecycle behavior
- A GitHub Actions workflow that builds a Windows installer artifact

Profiles, multiple tabs, workspaces, Gecko support, downloads, permissions,
automatic updates, and advanced privacy controls are not implemented yet.

## Getting started

Requires Node.js 20+ and npm.

```sh
npm ci          # install dependencies (use this, not `npm install`, for a clean/reproducible install)
npm run build   # compile TypeScript to dist/
npm test        # build, then run the unit tests
npm start       # build, then launch the app
npm run dist    # build a Windows installer into release/
```

Use `npm ci` for reproducible installs. Use `npm install` only when
intentionally updating dependencies and the lockfile.

## Project structure

```
src/
├── main/        Electron main process (trusted, full Node access)
│   ├── main.ts       app lifecycle entry point
│   ├── windows/       window creation
│   └── security/      preload script + IPC handlers — the trust boundary
├── core/        Engine-agnostic browsing logic
│   ├── browser/       wires one engine to one window
│   ├── navigation/     address-bar input → safe URL or search
│   ├── tabs/           reserved, not implemented
│   └── sessions/        reserved, not implemented
├── engines/      The swappable rendering-engine abstraction
│   ├── interface/      the BrowserEngine contract
│   ├── chromium/        the only implementation today
│   └── gecko/           reserved, not implemented
├── renderer/     The toolbar UI (sandboxed, no Node access)
│   ├── layout/, styles/, components/, state/
├── services/     Reserved for permissions/downloads/settings (not built yet)
└── shared/       Types and constants used by more than one layer

tests/
├── unit/         node:test tests with no Electron runtime needed
└── integration/  reserved, not implemented

docs/
├── ARCHITECTURE.md   how the pieces fit together, with a diagram
├── SECURITY.md       what's actually implemented, what isn't
└── ROADMAP.md        implemented / planned / experimental / future
```

**New contributor? Start here:**

1. `docs/ARCHITECTURE.md` — the big picture, with a diagram.
2. `src/core/navigation/navigation.ts` — the smallest, most self-contained
   file in the app (pure logic, no Electron), a good first read.
3. `docs/SECURITY.md` — read this *before* touching anything under
   `src/main/security/`, `src/engines/`, or `src/shared/constants/secureWebPreferences.ts`.
4. `src/renderer/README.md` — a non-obvious constraint (no bundler) you'll
   hit immediately if you try to add a second renderer file.

## Development workflow

Read `Browser Workflow.md` and `AI_WORKFLOW.md` before asking an AI agent to
change the project. The expected flow is:

```text
Plan → implement → test → review → manually verify → commit → push
```

Keep changes focused. Do not commit `node_modules/`, `dist/`, or `release/`.
Every change should include relevant tests or explain why testing is not
applicable.

## Security and privacy

The main process is trusted code. Websites run in a separate, untrusted
content view. The renderer uses context isolation, disabled Node integration,
and sandboxing where supported. Renderer communication uses a small validated
preload API rather than exposing Electron or Node APIs directly.

This is a prototype, not a security-certified browser. Permission handling,
download quarantine, signed updates, telemetry controls, and several advanced
privacy protections are still incomplete. Read [`docs/SECURITY.md`](docs/SECURITY.md)
before changing main-process, preload, engine, or IPC code.

## Contributing

Before opening a pull request:

1. Read the relevant documentation.
2. Keep the change scoped and explain security or privacy impact.
3. Run `npm run build`, `npm test`, and `git diff --check`.
4. Test the Electron runtime when the change affects the app window.
5. Report changed files, verification results, and remaining limitations.

Do not include secrets, credentials, private URLs, or personal browsing data
in source code, tests, logs, screenshots, issues, or pull requests.

## Documentation map

- [`Browser Workflow.md`](Browser%20Workflow.md) — contributor and AI workflow
- [`AI_WORKFLOW.md`](AI_WORKFLOW.md) — detailed agent instructions
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system structure and data flow
- [`docs/SECURITY.md`](docs/SECURITY.md) — implemented controls and gaps
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — current, planned, experimental, and future work

## Continuous integration

Every push to `main` and every pull request targeting `main` runs [`.github/workflows/build-windows.yml`](.github/workflows/build-windows.yml) on a Windows runner. The workflow installs dependencies with `npm ci`, runs `npm test`, then runs `npm run dist` to produce the Windows NSIS installer. The build fails the workflow if either tests or the build step fail.

The resulting installer (`release/*.exe`) is uploaded as a downloadable **workflow artifact** named `open-browser-windows-installer`, retained for 14 days. It is **not** published as a GitHub Release, and nothing is installed or updated automatically on any machine — download and run the installer yourself to try a build.

The workflow can also be run manually from the Actions tab (`workflow_dispatch`).

Automatic in-app updates are out of scope for this workflow. Shipping real auto-updates later requires a separate signed-update system (e.g. code-signing the installer and wiring up `electron-updater` against a trusted update feed) — this CI pipeline only produces an unsigned build artifact for manual testing. See `docs/SECURITY.md` for more detail.
