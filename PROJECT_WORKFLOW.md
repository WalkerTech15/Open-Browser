# Open Browser Workflow

This document defines how AI agents and contributors work on Open Browser.

> This file is public. Never add passwords, API keys, tokens, private URLs, or confidential information.

## 1. Roles

### Claude Code — implementation agent

Claude Code is responsible for inspecting the repository, implementing requested features, writing tests, updating documentation, and reporting changed files and verification results.

Claude Code must not commit or push unless the user explicitly authorizes it.

### Codex — QA and review agent

Codex is responsible for independently reviewing implementation, checking architecture/security/privacy/performance/accessibility, running tests, inspecting the real worktree and rendered behavior where possible, and giving a clear commit or no-commit verdict.

### User — product authority

The user decides product direction, scope, commits, pushes, releases, and deployments.

## 2. Standard workflow

```text
Idea → impact analysis → implementation plan → Claude Code implementation
→ tests and documentation → Codex QA → manual verification
→ commit authorization → push or release authorization
```

Do not treat every new idea as an immediate implementation request. Classify it as current milestone, later milestone, experiment, or rejected scope.

## 3. Required implementation checklist

Claude Code must update this checklist during each task and mark items complete only after verification:

- [ ] Inspect the repository and relevant documentation
- [ ] State the implementation plan
- [ ] Define scope and non-goals
- [ ] Check architecture, security, privacy, and performance impact
- [ ] Implement the smallest coherent change
- [ ] Add or update focused tests
- [ ] Update documentation when behavior or architecture changes
- [ ] Run build and tests
- [ ] Run `git diff --check`
- [ ] Perform manual or rendered verification where relevant
- [ ] Review the final diff for unrelated changes
- [ ] Report changed files, commands, results, and limitations

## 4. Token-efficient execution

Agents should read only relevant files, use targeted search such as `rg`, avoid dumping large files or logs, prefer small patches, avoid repeating unchanged explanations, run relevant verification once, and stop when the requested scope is complete.

Recommended model selection:

- Sonnet: routine implementation, documentation, tests, and refinement
- Opus: complex architecture, difficult debugging, security-sensitive design, or large migrations

Use the lowest reliable effort level: medium, high, extra high, max, or ultracode as appropriate.

## 5. Architecture rules

- Keep Electron main-process code separate from renderer code.
- Keep browser core logic separate from UI code.
- Keep engine interfaces separate from Chromium and future Gecko adapters.
- Keep profiles separate from workspaces.
- Keep security-sensitive services isolated and documented.
- Prefer small modules and explicit interfaces.
- Avoid giant god objects, hidden global state, and silent fallbacks.
- Do not duplicate product logic for each engine.
- Do not create empty placeholder modules without a documented reason.

## 6. Security rules

- Preserve `contextIsolation: true`.
- Preserve `nodeIntegration: false`.
- Preserve `sandbox: true` where compatible.
- Validate all renderer-to-main IPC messages.
- Never expose unrestricted IPC.
- Never use `eval` or arbitrary website JavaScript execution.
- Treat websites, extensions, themes, downloads, sync servers, and AI output as untrusted.
- Do not run the full browser with administrator privileges.
- Do not log passwords, tokens, cookies, private keys, or sensitive browsing data.
- Document security limitations honestly.

## 7. Privacy rules

- Local-first by default.
- No hidden telemetry.
- No browsing-history upload without explicit consent.
- AI and cloud services remain optional.
- Disclose data sent to third-party providers.
- Do not claim end-to-end encryption unless verified.
- Provide clear deletion and export behavior.

## 8. Testing gates

Relevant tasks should include build, unit, integration, security, accessibility, startup, crash-recovery, performance, and manual rendered checks as applicable.

Baseline commands:

```powershell
npm run build
npm test
git diff --check
```

Do not claim a test passed if it was not run. A hanging test is unresolved, not passing.

## 9. Commit and release rules

- Do not commit automatically.
- Do not push automatically.
- Do not publish releases automatically without authorization.
- Do not include `node_modules/`, `dist/`, or `release/` in commits.
- Always provide a suggested commit message when a change set is ready.
- A user message saying `commit` authorizes committing the current verified change set.
- A commit does not authorize pushing or releasing.

Suggested format:

```text
type: concise description
```

## 10. Final report format

Every implementation or review report should include status, changed or reviewed files, commands and tests run, verification results, security and privacy observations, remaining limitations, and a suggested commit message.

Never mark work ready when critical or high-risk issues remain unresolved.
