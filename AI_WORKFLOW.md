# Open Browser AI Workflow

Public project instructions for Claude Code, Codex, OpenAI models, and future coding agents. Never put secrets, credentials, private URLs, or confidential information in this file.

## Project context

Open Browser is an open-source, privacy-first adaptive desktop browser built with Electron and TypeScript. The current prototype is Chromium-only, with separated main, preload/security, renderer, core, engine, services, shared, tests, and documentation layers. Read `README.md`, `Browser Workflow.md`, `docs/COLLABORATION.md`, and relevant `docs/` files before editing.

## Document authority

- This file is authoritative for repository operations, agent permissions, commits, pushes, merges, releases, and the required final report.
- [`docs/COLLABORATION.md`](docs/COLLABORATION.md) is authoritative for Claude Code ↔ Codex collaboration, QA handoff, conflict disclosure, disagreement handling, and agent roles. It defines the four governance responses: `AGREED`, `AGREED WITH NON-BLOCKING NOTE`, `CONFLICT DETECTED`, and `OBJECTION`.
- [`Browser Workflow.md`](Browser%20Workflow.md) is the short contributor-facing development process. It does not override either document above.
- [`docs/AI_TOOLING.md`](docs/AI_TOOLING.md) defines how Claude Code uses skills, subagents, councils, and token-efficient context. It covers tooling usage only and does not override this file or `docs/COLLABORATION.md`.
- If they ever conflict on repository operations, this file wins.

## Roles

### Implementation agent

- Inspect the repository, status, commits, and relevant docs before editing.
- If the request is ambiguous, ask the user one focused clarification question before changing files.
- State model, effort, current behavior, desired behavior, scope, non-goals, acceptance criteria, and stop conditions.
- Identify architecture, security, privacy, performance, and compatibility impact.
- Implement the smallest safe change, add focused tests, and update relevant docs.
- Fix in-scope failures; report unrelated or pre-existing failures separately.
- Never commit, push, release, deploy, or publish without authorization.

### QA/review agent

- Independently review the complete diff, including intended untracked files.
- Test the real Electron app, not only pure unit functions.
- Review main, preload, renderer, IPC, navigation, permissions, downloads, profiles, extensions, AI/cloud flows, and release configuration when relevant.
- Check security, privacy, accessibility, performance, maintainability, and regression risk.
- Distinguish verified, not verified, blocked, partial, stubbed, simulated, broken, missing, and pre-existing behavior.
- Answer commit and release readiness with `Yes` or `No` first and name the exact blocker when `No`.

### Communication standard

- Explain every result in simple, fast language while preserving the technical details needed by experienced developers and IT/security reviewers.
- Use clear labels such as `Verified`, `Not verified`, `Blocked`, and `Recommended next step`.
- Explain shorthand in plain English the first time it appears in a report. Terms and codes are defined in [`docs/GLOSSARY.md`](docs/GLOSSARY.md).

## Required task checklist

Copy and update this checklist for each task. Tick items only after verification.

- [ ] Read this workflow and relevant project documentation
- [ ] Inspect Git status and recent commits
- [ ] Inspect relevant architecture and reproduce the starting behavior
- [ ] Define scope, allowed files, non-goals, acceptance criteria, and stop conditions
- [ ] Identify security and privacy impact
- [ ] Perform a lightweight security review for every change; perform a deeper review for security-sensitive areas
- [ ] State the plan, model, and effort
- [ ] Implement the smallest safe change
- [ ] Add or update focused tests
- [ ] Run focused tests, lint, typecheck, build, and security checks when available
- [ ] Test the real Electron runtime
- [ ] Test the packaged `.exe` when Electron, packaging, preload, entry-point, or renderer-path files change
- [ ] Review the final diff and intended file list
- [ ] Report commit, push, release, and deployment status

## Scope and architecture rules

- Do not add unrelated features, broad refactors, dependencies, or engine changes without approval.
- Do not delete files without proving they are unused and safe to remove.
- Keep privileged Electron main code separate from renderer code.
- Keep browser core separate from UI code.
- Keep engine interfaces separate from Chromium and future Gecko adapters.
- Keep profiles separate from workspaces.
- Keep security-sensitive services isolated and documented.
- Keep shared types and constants free of UI-specific logic.
- Prefer small typed modules and explicit interfaces; avoid god objects, hidden global state, silent fallbacks, and unbounded caches.

## Security rules

Treat websites, renderer content, downloads, extensions, themes, external APIs, sync servers, and AI responses as untrusted.

- Preserve `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true` where compatible.
- Keep privileged operations out of renderer code.
- Expose only narrow, validated preload APIs.
- Validate every IPC channel, sender, origin, argument, and response.
- Never expose unrestricted IPC, Node.js, shell, filesystem, native, or process APIs.
- Never use `eval`, `new Function`, unsafe dynamic imports, or arbitrary website script injection.
- Use navigation, protocol, permission, download, external-link, and file-path validation where relevant.
- Prevent path traversal and arbitrary writes.
- Review extensions, custom protocols, dependencies, lockfiles, and supply-chain changes.
- Run secret scanning and redact sensitive logs.
- Never weaken security controls to make tests pass or run the browser as administrator.

## Privacy rules

- Prefer local-first processing and storage.
- Keep AI, cloud, accounts, sync, and telemetry optional.
- Require explicit opt-in before sending page content, browsing history, cookies, passwords, prompts, or diagnostics off-device.
- Document every third-party data flow.
- Preserve profile and workspace isolation.
- Define offline and degraded-network behavior.
- Provide honest retention, deletion, export, reset, and revocation behavior.
- Do not claim end-to-end encryption unless the implementation and server trust model verify it.
- Never silently collect browsing history, page contents, credentials, or behavioral data.

## Testing gates

When relevant, check:

- TypeScript, lint, formatting, unit, integration, and security tests
- Development and packaged Electron launch
- Main, preload, renderer startup and IPC success/failure paths
- Navigation, permissions, downloads, file paths, extensions, windows, profiles, resizing, high-DPI, and multiple monitors
- Keyboard navigation, accessible names, focus, loading/empty/error/offline/timeout states, reduced motion, and contrast
- Installer build, artifact integrity, upgrade/rollback behavior, and release notes

Document pre-existing failures separately. A hanging test is unresolved, not passing.

Baseline commands when available:

```powershell
npm ci
npm run build
npm test
git diff --check
```

## Documentation and secrets

Use simple English first, then technical detail. Update setup, architecture, IPC/security, permissions/data flows, configuration, migrations, and release notes when affected. Never put secrets in source, renderer bundles, screenshots, tests, logs, issues, reports, or workflows. Use ignored local environment files or approved CI secret storage, never print full credentials, never use real credentials in tests, and rotate exposed credentials.

## Commit, push, and release boundaries

- The user alone decides when to commit. Do not commit unless the user clearly authorizes it.
- Before committing, verify intended files only, no secrets, completed tests, and no unrelated changes.
- Do not push, package, publish, release, or deploy without explicit authorization.
- Verify the exact branch and commit before release and provide rollback instructions.
- Do not commit `node_modules/`, `dist/`, or `release/`.
- Always provide a suggested commit message when a verified change set is ready.
- A user message saying `commit` authorizes committing the current verified change set; it does not authorize pushing or releasing.

## Token-efficient execution

Read only relevant files, use targeted `rg` searches, run focused tests before the full suite, avoid repeated scans and large logs, reuse helpers and fixtures, avoid unnecessary abstractions/dependencies, keep plans short, stop when acceptance criteria pass, summarize logs, do not expose chain-of-thought, ask one focused question when blocked, and give direct Yes/No verdicts with evidence.

Model guidance: use Claude Sonnet with medium effort for routine implementation, docs, tests, and refactoring. Use Claude Opus with high or extra-high effort only for complex Electron security, IPC, preload, permissions, downloads, extensions, sync, AI/cloud flows, engine abstraction, or release debugging. Use max or ultracode only when genuinely necessary.

## Required final report

Every task must report:

1. Objective and scope
2. Model and effort
3. Files changed
4. Architecture impact
5. Security and privacy impact
6. Exact tests and results
7. Electron runtime and packaged-app results
8. Accessibility and performance results
9. Limitations and pre-existing failures
10. Commit verdict and suggested commit message
11. Push verdict
12. Release/deployment status
13. Confirmation that secrets were handled safely

Separate `Verified`, `Not verified`, `Blocked`, and `Recommended next step`. Do not implement unrelated product features or inspect other projects during an Open Browser task.
