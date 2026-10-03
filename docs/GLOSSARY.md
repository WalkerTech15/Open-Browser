# Glossary and Plain-Language Rules

This page explains the words and short codes used in Open Browser documents and reports, so the project owner does not need a technical background to follow them. It defines terms only. It does not change product scope, technical behavior, or any rule in `AI_WORKFLOW.md` or `docs/COLLABORATION.md`.

## Plain-language rules for reports

- When shorthand is used in reports, always explain it the first time in plain English.
- Prefer plain English first, identifier second.
- Avoid unexplained internal shorthand in user-facing reports.
- If a term could confuse the user, define it immediately.

Example:

- Avoid: "ND-01 — V1 feature set"
- Write: "ND-01 — Decide which features belong in Version 1 (the first stable browser release)."

## Versions and maturity

| Term | Plain meaning |
| --- | --- |
| **V1** | Version 1, the first stable public version of the browser. |
| **V1.1** | A smaller update after Version 1. |
| **V2** | A later major version. |
| **Prototype** | The current early implementation, used to prove the architecture and behavior. |
| **MVP** | Minimum Viable Product: the earliest version that is genuinely usable for its intended purpose. |

Open: the project documents do not say whether the MVP and V1 are the same thing. This is deliberately left undecided, and it needs the user's decision before the two terms are used interchangeably.

## Tracking codes

| Code | Name | Plain meaning |
| --- | --- | --- |
| **ND-##** | Needs Decision | A product or technical decision that the user must make. |
| **OQ-##** | Open Question | A question that is not yet answered but may not need an immediate decision. |
| **QV-##** | QA Verification task | Something Codex or QA should inspect or test. It is not a product-design decision. |
| **QA-##** | Quality Assurance issue | A tracked problem found during review. Per `docs/COLLABORATION.md` §11, an ID is created only for issues that are Critical or High, block acceptance, survive more than one review round, affect several modules, or need durable tracking. |
| **ADR** | Architecture Decision Record | A documented high-impact architecture decision. See `docs/COLLABORATION.md` §12. |

## Review results

| Result | Plain meaning |
| --- | --- |
| **PASS** | QA found no blocking issue. |
| **PASS WITH ISSUES** | QA found issues, but none currently block the next decision or task unless the report says so. |
| **FAIL** | QA found blocking problems. |
| **BLOCKED** | Work cannot continue safely until something is resolved. |

## Work states

| State | Plain meaning |
| --- | --- |
| **BUILDING** | Claude Code is implementing the feature. |
| **DONE** | The builder's work is complete and the feature is ready for QA: it is implemented, the required tests were written and run, the documentation is updated, and known limitations are recorded. It does **not** mean QA passed. |
| **IN_QA** | Codex is reviewing it. |
| **FIXING** | Claude Code is addressing verified QA issues. |
| **RETESTING** | Codex is verifying the fixes. |
| **ACCEPTED** | Codex QA has reviewed and retested the feature and it passed. This does **not** mean committed, pushed, merged, or released. Only the user authorizes those actions (`AI_WORKFLOW.md`, `docs/COLLABORATION.md`). |

Normal order: BUILDING → DONE (ready for QA) → IN_QA → FIXING if needed → RETESTING → ACCEPTED. `docs/COLLABORATION.md` §6 and §20 define the rules.

## Terms used in `docs/SPECIFICATION.md`

| Term | Plain meaning |
| --- | --- |
| **Confirmed V1 requirement** | Something the user has confirmed must be in Version 1. None exist yet. |
| **Conditional V1 candidate** | Something that might be in Version 1 but depends on a decision the user has not made yet. |
| **Standing project constraint** | A rule that already applies to all development work today (for example, security and privacy rules). Whether it also becomes a Version 1 release requirement is a separate decision. |
