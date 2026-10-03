# AI Tooling Policy

How Claude Code uses skills, subagents, councils, and token-efficient context management on Open Browser.

This document covers **tooling usage only**. It does not override:

- [`AI_WORKFLOW.md`](../AI_WORKFLOW.md), which stays authoritative for repository operations, permissions, commits, pushes, merges, releases, and the final report.
- [`docs/COLLABORATION.md`](COLLABORATION.md), which stays authoritative for Claude Code ↔ Codex collaboration, QA handoff, conflict disclosure, and agent roles.

If this file ever disagrees with either, they win. Terms and codes are defined in [`docs/GLOSSARY.md`](GLOSSARY.md).

## 1. Skills to use now

Installed globally. Use them proactively on the work they fit.

| Skill | Use it for | Trigger |
| --- | --- | --- |
| `security-review` | Security review of a change | Any change touching Electron main, preload, IPC, navigation, permissions, downloads, the updater, or other security-sensitive code, before the QA handoff |
| `code-review` | A builder-side self-check of the diff | Before handing a meaningful change to Codex |
| `simplify` | Cleanup of changed code | After a change works, before handoff |
| `a11y-debugging` | Accessibility checks | UI changes, and the toolbar accessibility check (QV-01 in `docs/SPECIFICATION.md`) |

## 2. Skills kept on-demand

Use only when the task needs them.

| Skill | Use it when |
| --- | --- |
| `ui-ux-pro-max`, `impeccable` | Building real UI beyond the current single toolbar (tabs, layouts, personalization UI) |
| `design-system` | Work on design tokens or the personalization system |
| `memory-leak-debugging` | Tab lifecycle, resource management, or any suspected memory growth |
| `caveman` | **Internal agent chatter only.** Never for reports to the user, which must stay in plain English (see `docs/GLOSSARY.md`) |

## 3. Skills not needed yet

- `chrome-devtools`, `chrome-devtools-cli`, `debug-optimize-lcp`, `troubleshooting`: built for web pages and Chrome, not for this Electron app.
- Marketing and design-asset skills (for example `banner-design`, `brand`, `slides`, `ui-styling`, `design`): off-topic for browser development.

Revisit this list if the work changes.

## 4. Skill-copying rule

- Do not copy globally installed skills into `.claude/skills/`.
- Create or copy a project-specific skill only when there is a real need (for example, a skill that encodes a project-only template). Ask the user first.

## 5. Subagent policy

Use a subagent only when the work is one of these:

- independent (can be investigated separately);
- specialist (specialist analysis would improve quality);
- parallelizable;
- context-heavy (it would use a lot of main-context tokens).

Do not use subagents for trivial work.

Every subagent must:

- receive only the minimum context needed (the exact question, file paths, relevant headings);
- return concise conclusions with evidence, citing files and sections, and not large dumps;
- avoid duplicating work done by another agent.

Specialist focus areas, where useful: architecture, security, performance, UI/UX, accessibility, testing, documentation, Electron, Chromium/engine, sync/crypto, AI security, network. These are prompts to a built-in subagent, not separate tools.

**Governance rule:** Claude Code and all Claude subagents are on the **builder** side. A subagent review never replaces Codex QA (`docs/COLLABORATION.md` §1, §6, §9).

## 6. Token-efficiency policy

- Read only the files relevant to the task.
- Inspect headings or indexes before reading a whole file.
- Prefer `git diff` over rereading unchanged files.
- Do not repeatedly reread canonical documents.
- Give subagents narrow context, and require concise, evidence-based returns.
- Summarize long findings into a compact working note.
- Keep user-facing reports in clear plain English, with shorthand explained at first use.
- `caveman` may be used only internally.

These add to the token-efficiency rules already in `AI_WORKFLOW.md` and `Browser Workflow.md`.

## 7. Council policy

A council is several independent subagent analyses of one question, followed by a synthesis. Use one **only** for high-impact decisions:

- Chromium/Gecko engine boundary
- profile and workspace isolation
- sync and E2EE
- updater security
- sandbox architecture
- AI permission model
- extension trust model
- a privileged network service

Do not use a council for small UI tweaks, naming, simple bugs, or ordinary refactors.

**Perspectives:** architecture, security, privacy, performance, and UX. Each member analyzes the question independently.

**If members materially disagree:**

- follow `docs/COLLABORATION.md` §34;
- surface `## CONFLICT DETECTED` and do not hide the disagreement;
- when the user resolves an architecture-level conflict, record the decision as an ADR where required (`docs/COLLABORATION.md` §12).

A council's result is builder-side advice. It is not QA and does not replace Codex review or the user's decision.

## 7a. Code-graph and council plugins

Do not install any of the following unless the user explicitly approves them later:

- `graph-indexer`
- `GrapeRoot`
- `code-map`
- `cartographer`
- community council plugins

For now, prefer built-in subagents and normal repository inspection. Installing a plugin is a dependency-style decision that belongs to the user (`AI_WORKFLOW.md`).

## 8. Governance

- `AI_WORKFLOW.md` is authoritative for repository operations.
- `docs/COLLABORATION.md` is authoritative for Claude Code ↔ Codex collaboration.
- This file defines tooling usage only.
- Using a skill, subagent, or council never authorizes a commit, push, merge, release, or new dependency. Only the user does.
