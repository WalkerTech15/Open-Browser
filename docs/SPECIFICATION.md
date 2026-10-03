# Open Browser Specification (first draft)

> **Status: DRAFT for Codex review and user decision.** This document records only requirements already established in the repository documents listed under "Sources". Where those documents are silent or ambiguous, this draft says so instead of guessing.

## How to read this document

Each requirement belongs to exactly one of these classes:

- **Current prototype** — what the repository documents as implemented today.
- **Confirmed V1 requirement** — a requirement the user has confirmed for V1. **None exist yet**, because V1 is not defined (ND-01, ND-02). This draft will not label anything "confirmed V1" until the user decides.
- **Conditional V1 candidate** — an item that may be V1 but depends on an unresolved decision (mainly ND-01 and ND-12). Anything labelled "candidate" does not bind V1 until the user confirms it.
- **Future / deferred** — directions the documents name but do not schedule.

**Standing project constraint** is a separate label. It marks a rule that `AI_WORKFLOW.md`, `docs/COLLABORATION.md`, or `VISION.md` already applies to all development work today (for example, security and privacy rules for contributors). Whether a standing constraint also becomes a V1 release requirement depends on ND-01 and ND-12.

Markers:

- **OPEN QUESTION (OQ-nn)** — the existing documents do not answer it; the answer may come from research or review.
- **QA VERIFICATION TASK (QV-nn)** — a factual question about the current implementation that QA can answer by testing. It is not a product-design question.
- **NEEDS USER DECISION (ND-nn)** — a product, scope, or trade-off decision that belongs to the user (`docs/COLLABORATION.md` §2).

Sources: `VISION.md`, `README.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/SECURITY.md`, `AI_WORKFLOW.md`, `docs/COLLABORATION.md`. If this draft conflicts with any of them, that conflict is listed in "Conflicts found" and must be resolved before this file is treated as canonical (`docs/COLLABORATION.md` §3).

---

## 1. Product scope

**Current prototype.** An Electron, Chromium-only, single-window, single-tab desktop browser with address-bar navigation (URL or search), back/forward/reload/stop, loading and error states, hardened renderer settings, a narrow validated IPC boundary, and a Windows CI build that produces an unsigned installer artifact (`docs/ROADMAP.md` → Implemented; `README.md` → Project status).

**Product intent.** An open-source, privacy-first adaptive browser: simple by default, powerful when needed, privacy-first, local-first, secure by architecture, fast on low-end hardware, comfortable with many tabs, highly customizable, workspace-oriented, open-source and transparent (`VISION.md` → Purpose, Product philosophy).

**Normal browsing must not require** an account, AI, a cloud service, telemetry, or a specific search engine (`VISION.md` → User control).

**Intended audience.** Everyday users, students, developers, creators, gamers, IT professionals, and privacy-focused users (`VISION.md` → Purpose).

- OQ-01: No priority order or personas exist for these audiences.

## 2. V1 scope

**Current prototype.** None defined. `docs/ROADMAP.md` lists "Planned (next milestones, roughly in order)": Tabs, Sessions, Profiles, Workspaces, Privacy controls, Signed updates. It does not call any of them V1, and it defines no release criteria (although `VISION.md` says release criteria belong in the roadmap).

**Confirmed V1 requirements.** None yet.

- ND-01: Which features make up V1? The roadmap-planned list above is the only candidate set; this draft treats it as "conditional V1 candidates" and writes conditional acceptance criteria for it in §32 without asserting that any of it is V1.
- ND-02: What are V1's release criteria?

## 3. V1 non-goals

**Established non-goals for the *current milestone*** (`docs/ROADMAP.md`): multi-tab UI, profiles/workspaces UI, Gecko, auto-updates, telemetry, AI features, code signing, publishing credentials, macOS/Linux packaging, website deployment.

**V1 non-goals.** Not defined. Several items above are also "Planned", so the current-milestone list cannot simply be reused as the V1 list.

- ND-03: Which items are V1 non-goals versus later-milestone work?

## 4. Profiles

**Current prototype.** None. No persistence, no profiles (`docs/ROADMAP.md` → Current status).

**Established constraints.**
- Profiles are "multiple isolated user identities in one install" (`docs/ROADMAP.md` → Planned).
- Profiles must stay separate from workspaces (`AI_WORKFLOW.md` → Scope and architecture rules).
- Users control tabs, profiles, and workspaces (`VISION.md` → User control).
- Profile and workspace isolation must be preserved (`AI_WORKFLOW.md` → Privacy rules).
- Per-profile storage partitioning is the design intent for sessions (`docs/ROADMAP.md` → Sessions).
- Schema changes must never silently break old profiles (`docs/COLLABORATION.md` §23).
- Profile isolation is an ADR-level topic (`docs/COLLABORATION.md` §12).

**Not defined.**
- OQ-02: What data a profile contains and what "isolated" means concretely (cookies, history, settings, permissions, extensions).
- OQ-03: Whether the user must create or choose a profile on first run.
- ND-04: Profile limits, naming, and deletion behavior.

## 5. Sessions

**Current prototype.** None; `src/core/sessions/` is a placeholder.

**Established constraints.**
- Sessions are "persisted browsing session/profile data (history, per-profile storage partitioning)" (`docs/ROADMAP.md` → Planned).
- Startup should restore tab metadata first and load only what is necessary (`VISION.md` → Performance direction).
- Users must be able to delete and export their data (`VISION.md`; `AI_WORKFLOW.md` → Privacy rules).

**Not defined.**
- OQ-04: Storage format and location.
- OQ-05: Whether "session" means a profile's persisted state, a restorable set of tabs, or both.
- ND-05: Retention period for history and the default for restoring tabs after restart.

## 6. Workspaces

**Current prototype.** None.

**Established constraints.**
- "Grouping tabs/sessions for different contexts" (`docs/ROADMAP.md` → Planned).
- The browser is workspace-oriented (`VISION.md` → Product philosophy).
- Workspace templates are a customization mechanism (`VISION.md` → Customization direction).
- Workspaces are separate from profiles (`AI_WORKFLOW.md`).

**Not defined.**
- OQ-06: Whether a workspace belongs to one profile or can span profiles.
- OQ-07: What a workspace stores (tabs, layout, theme, permissions).
- OQ-08: How workspaces relate to the experience presets in §22–24.

## 7. Tabs and tab lifecycle

**Current prototype.** Single tab only. Multi-tab design home is `src/core/tabs/` (placeholder). Multiple window/engine instances per window is the roadmap's stated approach (`docs/ROADMAP.md` → Planned).

**Established constraints.**
- The browser must stay responsive with many tabs by adapting to memory, CPU, GPU, battery, and thermal capacity.
- Background tabs "should use lifecycle states such as active, warm, sleeping, and discarded" (`VISION.md` → Performance direction).
- The engine boundary covers tabs (`VISION.md` → Engine direction).
- Performance claims need measurement (`VISION.md`; `docs/COLLABORATION.md` §18, which lists tab counts of 10, 30, 50, and 100 and session/discarded-tab restore as things to measure "where relevant").

**Not defined.**
- OQ-09: Exact meaning of Active, Warm, Sleeping, and Discarded, and what each retains in memory.
- OQ-10: Transition triggers and thresholds between states.
- OQ-11: Whether the list of four states is final (the source says "such as").
- ND-06: Required tab-count targets and memory budgets, if any.
- OQ-12: How the `BrowserEngine` contract grows to support multiple tabs. This may be an ADR-level decision (engine abstraction, `docs/COLLABORATION.md` §12).

## 8. Classic / Vertical / Hybrid layouts

**Current prototype.** One fixed toolbar layout (`src/renderer/`). No layout choice exists.

**Established.** Users should control "layout and navigation" and customize layouts (`VISION.md`). The words "classic", "vertical", and "hybrid" do not appear in any repository document.

- ND-07: Define Classic, Vertical, and Hybrid layouts, or confirm they are intended layouts for this specification.
- OQ-13: Which layout is the default.
- OQ-14: Whether layouts are in V1.

## 9. Search engine behavior

**Current prototype.** Anything that is not a valid `http:` or `https:` URL is sent to a default search engine as a query (`docs/SECURITY.md` → Navigation validation; `docs/ARCHITECTURE.md` → Data flow). A user typing `javascript:alert(1)` gets a search for that text.

**Standing project constraint (V1 applicability pending ND-01).** Users choose the search engine; the browser must not require a specific one (`VISION.md` → User control).

- OQ-15: Which engine is the current default (not named in the documents reviewed).
- ND-08: Whether the first-run experience asks the user to choose.
- OQ-16: Where the setting lives (`src/services/settings/` is a placeholder; a settings UI is "experimental / unscheduled" in the roadmap).
- OQ-17: Whether custom search engines can be added.

## 10. Personalization boundaries

**Established.**
- Users may customize browser UI and ordinary websites through "stable design tokens, layouts, themes, scoped CSS, workspace templates, and visual tools" (`VISION.md` → Customization direction).
- Customization must not become a path to arbitrary code execution (`VISION.md`).
- Themes and layouts must remain less privileged than extensions and must not gain arbitrary JavaScript, system access, browsing-history access, credentials, hidden network access, or arbitrary code execution (`docs/COLLABORATION.md` §29).
- Themes are untrusted (`VISION.md`; `AI_WORKFLOW.md` → Security rules).
- Sensitive contexts (banking, payments, password managers, authentication) need a protected mode that restricts risky personalization (`VISION.md`; `docs/COLLABORATION.md` §30).
- No arbitrary website script injection (`AI_WORKFLOW.md` → Security rules).

**Not defined.**
- OQ-18: The design-token set and how tokens are versioned.
- OQ-19: Which presentation properties are in or out of bounds.
- OQ-20: Whether a personalization package format exists (public package formats are ADR-level, `docs/COLLABORATION.md` §12).

## 11. Custom CSS

**Established.** "Scoped CSS" is a customization mechanism (`VISION.md`). It must not enable arbitrary code execution, and must be restricted in protected contexts.

**Not defined.**
- OQ-21: What "scoped" means (per site, per workspace, per profile).
- OQ-22: Whether CSS applies to browser UI, websites, or both.
- OQ-23: How CSS is validated, and how restrictions such as blocking external requests or UI overlays are enforced.
- ND-09: Whether Custom CSS is in V1 or deferred.

## 12. Website personalization

**Established.** Users should control "themes and website appearance" (`VISION.md` → User control). It is bounded by §10 and must not obscure security-sensitive UI (`docs/COLLABORATION.md` §30).

**Not defined.**
- OQ-24: The mechanism (CSS only, or something else) and its storage.
- OQ-25: The protected-site list and how protected status is decided.
- ND-10: V1 or deferred.

## 13. Privacy model

**Current prototype.** No telemetry, accounts, sync, or AI. Roadmap lists telemetry and AI as "explicitly future" (`docs/ROADMAP.md`). No browsing data is persisted (`docs/ROADMAP.md` → Current status).

**Standing project constraints** (`VISION.md` → Privacy and trust; `AI_WORKFLOW.md` → Privacy rules). These govern all development work today. They are **not yet confirmed V1 release requirements**: which of them are V1 gates depends on ND-01 (V1 scope) and ND-12 (V1 security scope), and several concern features that do not exist (accounts, sync, AI, telemetry), so they apply when those features are built.
- User data belongs to the user. Prefer local processing and storage.
- No hidden telemetry, silent browsing-history collection, undisclosed AI context sharing, or misleading encryption claims.
- AI, cloud, accounts, sync, and telemetry are optional. Page content, history, cookies, passwords, prompts, or diagnostics leave the device only with explicit opt-in.
- Every third-party data flow is documented.
- Offline and degraded-network behavior is defined.
- Retention, deletion, export, reset, and revocation behavior is honest and documented.
- The browser distinguishes access by the browser itself, websites, extensions, AI services, and optional privileged services.
- Do not log passwords, tokens, cookies, private keys, or sensitive browsing data.

**Not defined.**
- OQ-26: A consolidated data inventory. No `docs/PRIVACY.md` exists (`docs/COLLABORATION.md` §4 lists it as a future file to create when needed).
- OQ-27: Legal and compliance principles. No repository document states any.
- ND-11: Whether to create `docs/PRIVACY.md` now.

## 14. Security boundaries

**Current prototype (`docs/SECURITY.md`).**
- Three trust levels: main process (trusted), toolbar renderer (sandboxed, no Node, one narrow preload API), content view (untrusted, no preload).
- Implemented: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` from one shared constant; six named IPC channels with sender-scoped handlers; navigation validation (only `http:` and `https:` load); no dynamic code execution.
- **Missing** today: Content-Security-Policy, permission-request handling, download handling, custom TLS handling, signed updates. Payload validation at IPC is **Partial** (type-only).

**Standing project constraint (which items are V1 gates depends on ND-12).** Preserve the controls above (`AI_WORKFLOW.md` → Security rules) and "least privilege, process isolation, site isolation, strict IPC, secure defaults, signed updates, dependency review, and honest security documentation" (`VISION.md` → Security direction). Treat websites, renderer content, downloads, extensions, themes, external APIs, sync servers, and AI responses as untrusted. Never run the browser as administrator. Do not weaken security to pass tests.

- ND-12: Which of the "Missing" items in `docs/SECURITY.md` (CSP, permissions, downloads, TLS) are required for V1.
- OQ-28: What "site isolation" requires in this Electron-based architecture. No document states it.

## 15. Sandbox profile

**Established.** A renderer sandbox (`sandbox: true`) exists. "Sandbox profile" as a user-facing concept appears in no document. The nearest concepts are protected mode (`VISION.md` → Customization direction) and "Sensitive actions and protected sites must receive stronger safeguards" (`VISION.md` → Security direction).

- ND-13: Does "sandbox profile" mean a restricted, isolated browsing profile, a stricter protected-site mode, or something else? Which is it, and is it V1?

## 16. Ad / tracker / redirect protection

**Current prototype.** None.

**Established.** "Privacy controls — tracker/ad blocking, a real Content-Security-Policy, permission-request handling" is a planned roadmap item (`docs/ROADMAP.md`). Redirect protection is not mentioned in any document.

- OQ-29: The blocking mechanism and filter-list source.
- OQ-30: What "redirect protection" covers.
- ND-14: Default on or off, and per-site override behavior.
- OQ-31: How blocking relates to site compatibility.

## 17. Sync and E2EE scope

**Current prototype.** None. Not designed yet (`docs/ROADMAP.md`).

**Established constraints.**
- Cloud services and synchronization are user-controlled and optional (`VISION.md`; `AI_WORKFLOW.md`).
- Do not claim end-to-end encryption unless the implementation and server trust model verify it (`AI_WORKFLOW.md`; `VISION.md`).
- Sync servers are untrusted (`VISION.md`).
- Sync changes must consider old and new clients, conflicts, partial sync, offline use, rollback, E2EE compatibility, device removal, and migration (`docs/COLLABORATION.md` §24). These apply "once those features enter development" (`docs/COLLABORATION.md` §14).

**Classification.** Future / deferred unless the user decides otherwise.

- ND-15: Is sync in V1?
- OQ-32: What data syncs, the server trust model, the key model, and the account model (`VISION.md` says accounts are optional).
- OQ-33: Whether sync is self-hostable.

## 18. Sidebar / workspace restore

**Current prototype.** None.

**Established.** Startup restores tab metadata first (`VISION.md` → Performance direction). Cross-device restore appears in no document.

- OQ-34: Whether "sidebar" refers to the Vertical layout (§8) or to a workspace panel.
- ND-16: Is restoring workspaces across restarts in V1? Across devices (which depends on §17)?

## 19. AI permissions and action boundaries

**Current prototype.** None. AI features of any kind are "explicitly future" (`docs/ROADMAP.md`).

**Established constraints.**
- AI is optional and not required for core browsing (`VISION.md`; `docs/COLLABORATION.md` §28).
- Users control AI providers and AI permissions (`VISION.md` → User control).
- No implicit AI access to files or the system; AI cannot bypass permission checks; webpage instructions are not authority (`docs/COLLABORATION.md` §28).
- AI output is untrusted (`VISION.md`).
- Page content, history, prompts, and so on leave the device only with explicit opt-in (`AI_WORKFLOW.md` → Privacy rules).
- Reviewers check AI workflows for prompt injection, permission bypass, hidden context exposure, and unsafe actions (`docs/COLLABORATION.md` §28).
- An AI permission model is ADR-level (`docs/COLLABORATION.md` §12).

**Classification.** Future / deferred.

- ND-17: Is any AI feature in V1?
- OQ-35: Which actions an AI may take, how permissions are granted and revoked, and which providers are supported.

## 20. Performance and resource management

**Current prototype.** No measurements documented.

**Established.**
- Adapt to memory, CPU, GPU, battery, and thermal capacity; restore tab metadata first (`VISION.md`).
- Performance claims such as "fast", "optimized", "lightweight", and "low memory" require evidence (`VISION.md`; `docs/COLLABORATION.md` §18).
- Metrics to measure where relevant: startup time, idle and active RAM, idle and background CPU, tab-switch latency, 10/30/50/100 tabs, session restore, discarded-tab restore, low-memory behavior, battery impact (`docs/COLLABORATION.md` §18).
- Every major feature considers 4 GB and 8 GB RAM, integrated graphics, slower storage, and battery-constrained laptops (`docs/COLLABORATION.md` §26).

**Not defined.**
- ND-18: Numeric targets. No document states any.
- OQ-36: Benchmark method and baseline hardware.
- OQ-37: Whether a user-facing resource manager exists.

## 21. Low-End mode

**Established.** The browser should be fast on low-end hardware (`VISION.md`). Heavy optional modules should be lazy-loaded, optional, and separately installable where practical (`docs/COLLABORATION.md` §26). A selectable "Low-End mode" is not defined in any document.

- ND-19: Is Low-End mode a distinct user-selectable mode, an automatic adaptation, or only a design constraint?
- OQ-38: What does the mode change?

## 22. Gaming mode

**Established.** "Gaming" is one of the experience presets (`VISION.md` → Adaptive experience). Presets "configure defaults only"; users can change settings later. Nothing says what Gaming changes.

- ND-20: Define Gaming mode's behavior or defer it.

## 23. Developer / IT features

**Established.** Developers and IT professionals are target users, and "Developer" is a preset (`VISION.md`). The engine boundary includes "developer tooling hooks where appropriate" (`VISION.md` → Engine direction). Extensions are untrusted (`VISION.md`). No feature list exists.

- ND-21: Which developer and IT capabilities are wanted, and are any in V1?
- OQ-39: Extension support is "experimental / unscheduled" and needs its own design pass (`docs/ROADMAP.md`). Does V1 include extensions?

## 24. Creator features

**Established.** "Creator" is a preset and creators are an audience (`VISION.md`). No feature list exists.

- ND-22: Define Creator features or defer.

## 25. Network Center

**Established.** Mentioned only as an example of a future feature (`docs/COLLABORATION.md` §14, "system-wide Network Center"). No definition exists elsewhere.

- ND-23: Define it, or confirm it is deferred.

## 26. System Monitor

**Established.** Not mentioned in any repository document.

- ND-24: Is a System Monitor wanted? Is it related to the resource manager in §20?

## 27. Import / export

**Established.** Users control data retention, export, and deletion, and "should be able to export their data and migrate away from the browser" (`VISION.md`). `AI_WORKFLOW.md` requires honest export and reset behavior. Public file formats are ADR-level (`docs/COLLABORATION.md` §12).

**Not defined.**
- OQ-40: Export formats.
- OQ-41: Whether import from other browsers is wanted (the sources mention export and migrating away, not import).
- ND-25: V1 scope for import and export.

## 28. Accessibility

**Current prototype.** Accessibility testing is a review gate: keyboard navigation, accessible names, focus, loading/empty/error/offline/timeout states, reduced motion, and contrast (`AI_WORKFLOW.md` → Testing gates). `docs/ARCHITECTURE.md` documents no accessibility behavior for the toolbar.

**Standing project constraint (V1 applicability pending ND-01).** Feature reviews consider accessibility (`docs/COLLABORATION.md` §20 and `AI_WORKFLOW.md`).

- OQ-42: Which accessibility standard or level is the target (none is named).
- QV-01 (reclassified from OQ-43): What is the toolbar's actual accessibility status today (keyboard navigation, accessible names, focus, contrast, reduced motion, per the gates in `AI_WORKFLOW.md` → Testing gates)? This is a QA verification task against the running app. It is not a product-design question, and it has not been performed.

## 29. Localization

**Established.** Not mentioned in any repository document.

- ND-26: Which languages, and is right-to-left support wanted? Is it V1?

## 30. Installer and optional components

**Current prototype.** `npm run dist` builds a Windows NSIS installer into `release/`. GitHub Actions uploads it as a workflow artifact retained for 14 days. It is unsigned, is not a GitHub Release, and nothing installs automatically (`README.md` → Continuous integration).

**Established.** Windows 11 is primary. Heavy optional modules should be optional, lazy-loaded, and separately installable where practical (`docs/COLLABORATION.md` §26–27). Do not commit `node_modules/`, `dist/`, or `release/`.

- ND-27: Whether a portable build is wanted.
- OQ-44: Which components are optional.
- OQ-45: How packaging works for them. Packaging, signing, and distribution decisions are the user's (`docs/COLLABORATION.md` §2).

## 31. Update behavior

**Current prototype.** None. There is no in-app update check (`docs/SECURITY.md` → Supply chain).

**Established.** "Signed updates" is a planned item: code-sign the installer and build a real update feed, for example `electron-updater` against a trusted host (`docs/ROADMAP.md`; `docs/SECURITY.md`). Updater verification must not be weakened (`docs/COLLABORATION.md` §16). Updater security is ADR-level (§12).

- ND-28: Is signed update in V1?
- OQ-46: Signing certificate, update host, and update channel.
- OQ-47: Whether updates can be disabled, and what rollback means.

## 32. Acceptance criteria

V1 membership is undecided (ND-01), so there are **no confirmed V1 acceptance criteria yet**. Everything below is a **conditional V1 candidate**. Each feature's criteria apply only if the user confirms that feature for V1, and they stay conditional until then. They are derived from rules the documents already impose, not from new behavior. Items that also depend on ND-12 (V1 security scope) or ND-28 (signed updates) say so.

**Standing process criteria for any feature that is built** (`AI_WORKFLOW.md`; `docs/COLLABORATION.md` §20). These apply to all work whether or not it is V1:
- `npm run build`, `npm test`, and `git diff --check` pass; relevant new tests exist.
- Real Electron runtime is tested; the packaged `.exe` is tested when Electron, packaging, preload, entry-point, or renderer-path files change.
- `contextIsolation`, `nodeIntegration: false`, and `sandbox: true` are preserved; new IPC is validated and narrow.
- Security, privacy, and performance impact are reviewed; no Critical or High QA issues remain; Codex retest passes.
- Documentation is updated and known limitations are recorded.

**Tabs.** (Conditional V1 candidate; pending ND-01)
- More than one tab can be opened, switched, and closed. *The exact UI is OQ-12 and unspecified.*
- Each tab's content view keeps the hardened settings and has no preload.
- Navigation validation still applies to every tab.
- Tab lifecycle states, if included, follow definitions that resolve OQ-09 and OQ-10.
- Where the user decides performance matters, measurements are recorded instead of claims (§20).

**Sessions.** (Conditional V1 candidate; pending ND-01)
- Data is persisted per the storage design resolved in OQ-04.
- The user can delete and export it.
- Persistence follows the privacy rules in §13, and schema changes are versioned and tested (`docs/COLLABORATION.md` §23).

**Profiles.** (Conditional V1 candidate; pending ND-01)
- Profile data is isolated per OQ-02.
- Isolation is tested.
- Profiles stay separate from workspaces.
- An ADR for profile isolation exists first (`docs/COLLABORATION.md` §12).

**Workspaces.** (Conditional V1 candidate; pending ND-01)
- Behavior matches the definitions that resolve OQ-06 and OQ-07.
- Workspaces remain separate from profiles.

**Privacy controls.** (Conditional V1 candidate; pending ND-01, and the security items pending ND-12)
- Tracker/ad blocking behaves per ND-14.
- If CSP is in V1 scope (ND-12): a real Content-Security-Policy is set and tested for the toolbar HTML.
- If permission handling is in V1 scope (ND-12): permission requests (camera, microphone, geolocation, notifications) have explicit handling and tests.
- If downloads are in V1 scope (ND-12): download behavior is documented and tested.
- `docs/SECURITY.md` is updated so "Missing" entries become accurate.

**Signed updates.** (Conditional V1 candidate; pending ND-01 and ND-28)
- The installer is signed.
- Updates are verified before install.
- A trusted feed exists, and `docs/SECURITY.md` is updated. Release actions remain user-authorized.

## 33. Deferred / future features

Named in the documents but not scheduled:
- Gecko engine support (`src/engines/gecko/` is a placeholder; `docs/ROADMAP.md`; `VISION.md`).
- macOS and Linux builds (`docs/ROADMAP.md`); mobile touch interfaces (`VISION.md`). Platform-specific code belongs behind adapters.
- Telemetry of any kind, and AI features of any kind (`docs/ROADMAP.md`). Both are optional and opt-in when they arrive.
- Extension support, a settings UI, and a download-management UI ("experimental / unscheduled", `docs/ROADMAP.md`).
- E2EE sync and a Personalization Store (`docs/COLLABORATION.md` §14, §29). Neither is described anywhere else.
- Network Center, protected financial-site handling, age-adaptive behavior, and large-scale benchmarks (`docs/COLLABORATION.md` §14). Age-adaptive behavior is not described anywhere else.
- Experience presets (Everyday, Student, Work, Gaming, Developer, Creator, Privacy, Custom; `VISION.md`). Presets set defaults only, and users can change them later.

These requirements apply once the feature enters development; do not create empty placeholders for them (`docs/COLLABORATION.md` §14).

## 34. Open questions and decisions

### NEEDS USER DECISION
- ND-01 V1 feature set
- ND-02 V1 release criteria
- ND-03 V1 non-goals
- ND-04 Profile limits, naming, and deletion
- ND-05 History retention and restore default
- ND-06 Tab-count targets and memory budgets
- ND-07 Definitions of Classic, Vertical, and Hybrid layouts
- ND-08 Search-engine choice at first run
- ND-09 Custom CSS in V1 or deferred
- ND-10 Website personalization in V1 or deferred
- ND-11 Create `docs/PRIVACY.md` now
- ND-12 Which "Missing" security items are required for V1
- ND-13 Meaning and scope of "sandbox profile"
- ND-14 Ad/tracker blocking defaults and overrides
- ND-15 Sync in V1
- ND-16 Workspace restore scope (restart and cross-device)
- ND-17 AI in V1
- ND-18 Performance numeric targets
- ND-19 Low-End mode meaning
- ND-20 Gaming mode behavior
- ND-21 Developer and IT features
- ND-22 Creator features
- ND-23 Network Center
- ND-24 System Monitor
- ND-25 Import and export V1 scope
- ND-26 Localization languages and RTL
- ND-27 Portable build
- ND-28 Signed update in V1

### QA VERIFICATION TASK
- QV-01 Toolbar accessibility status (§28). Reclassified from OQ-43.

### OPEN QUESTION
- OQ-01 to OQ-47 are listed inline in the sections above, except OQ-43, which was reclassified as QV-01. Section numbers: audiences (§1), profiles (§4), sessions (§5), workspaces (§6), tabs (§7), layouts (§8), search (§9), personalization (§10–12), privacy (§13), security (§14), ad/tracker (§16), sync (§17), restore (§18), AI (§19), performance (§20–21), developer (§23), import/export (§27), accessibility (§28), installer (§30), updates (§31).

## Conflicts found with existing documents

1. `VISION.md` says detailed behavior belongs in `SPECIFICATION.md`, and this file now exists as a draft. It also says release criteria belong in `docs/ROADMAP.md`, which currently has none (ND-02).
2. `README.md` ("Project status") claims integration coverage while its "Project structure" says `tests/integration/` is "reserved, not implemented", and `tests/README.md` says "None yet". The file `tests/integration/browserWindowController.test.ts` exists. This is documentation drift and not a requirement.
3. `docs/ROADMAP.md` lists "Privacy controls", including CSP and permission handling, as a planned item, while `docs/SECURITY.md` labels those same items "Missing". These are consistent (both mean not built), but the roadmap does not say which are required for V1 (ND-12).
4. `VISION.md` says the engine boundary should cover history, permissions, downloads, storage, extensions, and more. The current `BrowserEngine` contract (`docs/ARCHITECTURE.md`) covers only navigation, state, and attach. This is a gap, not a conflict (OQ-12).
