# Open Browser Workflow

Public project guidance for AI agents and contributors. Never place passwords, API keys, tokens, private URLs, or confidential information in this file.

## Roles

### Claude Code — implementation

- Inspect the repository before changing it.
- If the request is ambiguous, ask the user one focused clarification question before changing files.
- State a short plan, scope, and non-goals.
- Implement the smallest coherent change.
- Add or update focused tests and documentation.
- Do not commit or push unless the user authorizes it.

### Codex — QA and review

- Inspect the real worktree and rendered behavior where possible.
- Review architecture, security, privacy, performance, and accessibility.
- Run relevant tests and distinguish verified, partial, stubbed, broken, missing, and untested work.
- Give a clear commit or no-commit verdict.

### User — product authority

The user decides product direction, scope, commits, pushes, releases, and deployments.

### Communication standard

Explain results simply and quickly while preserving the technical detail needed by experienced developers and IT/security reviewers.

## Standard workflow

```text
Idea → impact analysis → plan → implementation → tests and documentation
→ Codex QA → manual verification → commit authorization → push or release authorization
```

Do not treat every new idea as an immediate implementation request. Classify it as current milestone, later milestone, experiment, or rejected scope.

## Required checklist

Claude Code must update this checklist and mark items complete only after verification:

- [ ] Inspect repository and relevant documentation
- [ ] State plan, scope, and non-goals
- [ ] Check architecture, security, privacy, and performance impact
- [ ] Perform a lightweight security review for every change and a deeper review for security-sensitive areas
- [ ] Implement the smallest coherent change
- [ ] Add or update focused tests
- [ ] Update documentation when needed
- [ ] Run build and tests
- [ ] Run `git diff --check`
- [ ] Perform manual or rendered verification where relevant
- [ ] Test the packaged `.exe` when Electron, packaging, preload, entry-point, or renderer-path files change
- [ ] Review the final diff for unrelated changes
- [ ] Report changed files, commands, results, and limitations

## Token-efficient execution

- Read only files relevant to the task.
- Prefer targeted search such as `rg`.
- Avoid dumping large files or logs.
- Prefer small patches and typed interfaces.
- Do not repeat unchanged explanations.
- Run relevant verification once, then investigate failures directly.
- Stop when the requested scope is complete.
- Never expand scope silently.

Recommended model selection:

- **Sonnet:** routine implementation, documentation, tests, and refinement.
- **Opus:** complex architecture, difficult debugging, security-sensitive design, or large migrations.

Use the lowest reliable effort level: medium, high, extra high, max, or ultracode.

## Architecture rules

- Keep Electron main-process code separate from renderer code.
- Keep browser core logic separate from UI code.
- Keep engine interfaces separate from Chromium and future Gecko adapters.
- Keep profiles separate from workspaces.
- Keep security-sensitive services isolated and documented.
- Avoid giant god objects, hidden global state, duplicated engine logic, and silent fallbacks.
- Do not create meaningless placeholder modules.

## Security rules

- Preserve `contextIsolation: true`.
- Preserve `nodeIntegration: false`.
- Preserve `sandbox: true` where compatible.
- Validate renderer-to-main IPC messages.
- Never expose unrestricted IPC.
- Never use `eval` or arbitrary website JavaScript execution.
- Treat websites, extensions, themes, downloads, sync servers, and AI output as untrusted.
- Do not run the full browser as administrator.
- Never log passwords, tokens, cookies, private keys, or sensitive browsing data.
- Document security limitations honestly.

## Privacy rules

- Local-first by default.
- No hidden telemetry.
- No browsing-history upload without explicit consent.
- AI and cloud services remain optional.
- Disclose data sent to third-party providers.
- Do not claim end-to-end encryption unless verified.
- Provide clear deletion and export behavior.

## Testing gates

Run the relevant checks for every change. Baseline commands:

```powershell
npm run build
npm test
git diff --check
```

Add security, accessibility, startup, crash-recovery, performance, and manual UI checks when relevant. Do not claim a test passed if it was not run. A hanging test is unresolved, not passing.

## Commit and release rules

- Do not commit automatically.
- The user alone decides when to commit; clear authorization is required.
- Do not push automatically.
- Do not publish releases without authorization.
- Do not commit `node_modules/`, `dist/`, or `release/`.
- Always provide a suggested commit message when a change set is ready.
- A user message saying `commit` authorizes committing the current verified change set.
- A commit does not authorize pushing or releasing.

Suggested format:

```text
type: concise description
```

## Final report

Every implementation or review report must include status, changed files, commands and tests run, verification results, security/privacy observations, remaining limitations, and a suggested commit message.

Never mark work ready while critical or high-risk issues remain unresolved.
