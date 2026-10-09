# StreamlineOS Companion Pet — product program

**Status:** Product decisions settled 2026-10-08. First-release engineering is present on `main` in the frontend and nested backend repositories as of 2026-10-09. It is **partially verified**, not release-ready: focused tests and named scratch/RDS database checks exist; browser, provider, all-role, delivery, performance, and pilot gates remain open. See the [current review and TODOs](review-2026-10-09.md).
**Decision owner:** Product owner. **Audience:** Product, design, engineering, security, QA, support.
**Product boundary:** Replace the Ask OS entry experience with one original, optional companion for natural-language questions and requests across StreamlineOS and approved connected tools. Keep Ask OS conversations, permission-scoped tools, confirmations, and the owning modules' business rules.

## Read in order

1. [CP-00 — Pet experience and personalization](00-experience-prd.md): presence, interaction, settings, accessibility, and user journeys.
2. [CP-01 — Context, answers, and actions](01-intelligence-actions-prd.md): cross-module request handling, grounded answers, action proposals, authorization, and result receipts; Build and Documents are detailed examples.
3. [CP-02 — Timely prompts and governance](02-proactive-governance-prd.md): meeting, clock-in, break, and friendly prompts; policy, deduplication, and audit.
4. [CP-03 — Implementation architecture](03-implementation-architecture-prd.md): owner seams, request paths, performance, reliability, and reuse of current modules.
5. [Verification and competitive baseline](verification-and-competition.md): current-source audit, acceptance-by-acceptance trace, focused tests, proof boundaries, and dated official sources.
6. [200 opportunity candidates](wow-opportunity-catalog.md): research-informed idea pool, evidence rules, and a short list for validation. Candidates are not a shipping commitment or a uniqueness claim.
7. [Sequenced delivery and validation plan](delivery-plan.md): decisions, design, backend, frontend, accessibility, and release evidence.
8. [ADR 0007 — Companion uses the Ask OS Toolset](0007-companion-uses-ask-os-toolset.md): the accepted first-release architecture decision and its proof gates.
9. [Architecture report reconciliation](architecture-review.md) and [corrected HTML copy](architecture-review.html): claim-by-claim check of the supplied report against source and these requirements. The Markdown contract is authoritative.
10. [Implementation contract](implementation-contract.md): build sequence, state and data contracts, failure rules, and release handoff.
11. [Registered capability inventory](capability-inventory.md): all 79 source-registered Tool keys, launch treatment, and owner validation checklist.
12. [Current implementation review and TODOs](review-2026-10-09.md): code, migration, test, UX, and acceptance findings from the latest audit.

The current [Chat OS PRD](../specs/2026-09-18-chat-os-prd.md), [Ask OS hardening PRD](../specs/2026-09-19-ask-os-hardening-prd.md), and [Build acceptance catalog](../specs/build/module/README.md) remain authoritative for their own underlying systems. This program defines the new user experience and its added capabilities. A conflict with a current security or Build contract is resolved in favor of that contract until the product owner explicitly changes it. Historical PRD progress is not proof of current production behavior.

## Product decision record

| ID | Decision |
| --- | --- |
| CP-D01 | One pet with many permitted skills, rather than a separate pet per module. |
| CP-D02 | Small, quiet desktop corner presence; compact mobile entry opens the existing assistant workspace. |
| CP-D03 | Suggestions and previews precede every pet-initiated write. The user explicitly confirms each write; existing immediate-write Tools are unavailable through the pet until adapted. |
| CP-D04 | Text, animation, explicit voice input, and user-triggered spoken replies ship together. Voice is progressive enhancement: microphone access starts only from a user action, recognized text remains editable and is never auto-sent, replies never speak automatically, and typed interaction remains complete when browser speech support is unavailable. |
| CP-D05 | Individual appearance and nudge preferences operate within organization policy. |
| CP-D06 | Useful reminders may be configured separately. Friendly non-task check-ins are off by default and require individual opt-in. |
| CP-D07 | “Find bugs” in this release means find and count canonical Build `BUG` tickets. Repository/CI diagnosis is later. |
| CP-D08 | Existing Ask OS conversation history is retained and accessible through the companion. |
| CP-D09 | All signed-in **organization member roles** get the universal core at launch, plus permissioned starter journeys for their enabled modules; external client-portal guests follow later. Deep new actions in every module are not a first-release promise. |
| CP-D10 | Coarse in-app activity may inform break and friendly prompts only after individual opt-in. No keystroke, screen, or other-tab monitoring. |
| CP-D11 | Maintain 200 researched opportunity candidates; select a strong first release by user value and proof readiness. “Unique” requires direct dated competitor evidence. |
| CP-D12 | For an ambiguous issue/bug count, ask the user to choose the scope before querying; page context may be offered as an option, never silently applied. |
| CP-D13 | “Open” BUGs include fixed and ready-for-QA until the project's state group becomes `completed`; `cancelled` is excluded. |
| CP-D14 | One original, recognizable StreamlineOS character with curated appearance presets in the first release; users do not choose among separate pet characters. |
| CP-D15 | Accept any natural-language question or action request. Resolve and execute it only when an approved, currently available capability can satisfy it for this actor. Clarify missing scope or target, distinguish unsupported/denied/disconnected requests, and never imply an action succeeded without an owning-module receipt. The first-release execution boundary is StreamlineOS and approved connected tools, not arbitrary websites or computer control. |

## Original request coverage

| Requested behavior | First-release decision and detailed location |
| --- | --- |
| Replace Ask OS with an animated Codex-like pet | One original StreamlineOS character with presets, small desktop presence, mobile quick entry, accessible static/motion states; keep Ask OS engine/history. [CP-00](00-experience-prd.md). The supplied pet image is inspiration only; do not copy its pixels or identity. |
| Talk, understand any question, offer options, do requested work | Text and explicit voice intake accept natural-language requests across every reviewed available capability; options and clarification precede consequential work. Voice transcripts remain editable before send, and completed visible replies can be read aloud only after the user asks. [CP-00](00-experience-prd.md), [CP-01](01-intelligence-actions-prd.md), [implementation contract](implementation-contract.md). |
| Update tickets, find bugs, count issues | Confirmed Build actions, canonical `BUG` search and exact counts, explicit scope on ambiguous questions, owner-filtered links. Repository bug diagnosis follows later. [CP-01](01-intelligence-actions-prd.md). |
| Answer with knowledge base context | Documents-owned content retrieval with access-checked citations, one Ask OS generation/credit/transcript. [CP-01](01-intelligence-actions-prd.md), [ADR 0007](0007-companion-uses-ask-os-toolset.md). |
| Speak up while a user is busy, with an off switch | Useful prompts respect focus, quiet hours, consent, controls, source eligibility and dedupe. Friendly check-ins default off; coarse in-app timing is separately opt-in. [CP-02](02-proactive-governance-prd.md). |
| Break, missed clock-in, and meeting notices | Four separately controlled classes with calendar/HR/notification ownership and truthful wording; no inferred health or productivity surveillance. [CP-02](02-proactive-governance-prd.md). |
| All roles and many wow features | All signed-in organization member roles have the universal core where AI is permitted; role-specific starters use effective grants. [200 candidates](wow-opportunity-catalog.md) are researched opportunities, not 200 launch promises or unverified uniqueness claims. |
| Reliable, efficient, clean and scalable implementation | Existing deep Toolset and owner seams, no generic write path, measured bounded work, layered verification and rollback. [CP-03](03-implementation-architecture-prd.md), [architecture reconciliation](architecture-review.md), [implementation contract](implementation-contract.md). |

## Verification snapshot

| Area | Current conclusion |
| --- | --- |
| Product discussions | CP-D01–D15 settled for this planning round, including broad natural-language intake, approved-tool execution scope, audience, scope prompts, open-BUG definition, activity consent, and one character with presets. Final name and art are design outputs. |
| Repository architecture | [ADR 0007](0007-companion-uses-ask-os-toolset.md) selects the existing Ask OS Toolset as the capability seam. `countTickets`, `searchDocumentContext`, companion preferences, and prompt services now exist. Owner behavior and launch readiness remain capability-specific. Details are in the [current review](review-2026-10-09.md) and [ledger](verification-and-competition.md). |
| Focused checks | At HEAD `9d9651c11`, the backend registry/confirmation suites passed 3 suites / 84 tests and the frontend lazy-provider/confirmation-card suites passed 2 suites / 11 tests. Earlier planning runs passed 5 backend suites / 35 tests, 9 backend suites / 108 tests, and 3 frontend suites / 11 tests. Runs overlap and prove only their named local assertions. |
| Runtime and release | Earlier disposable PostgreSQL tests covered named preference, RLS, confirmation, and Build count cases. On 2026-10-09 the authorized RDS target received migrations `1974` and `1975`; ledger, four tables with RLS, and the outbox index were verified. No authenticated browser pet journey, provider-driven chat, all-role matrix, notification delivery, deployment, or customer outcome is signed off. |
| Competitors and 200 ideas | Official public sources show significant existing overlap; the 200 catalog entries remain hypotheses. No universal exclusivity or customer validation claim is made. |

## Outcome and success measures

The companion should let an authorized person ask for work in natural language without first locating the right module. A request may span several modules, but each answer and change must remain grounded in an available owner capability. It should also reduce missed meetings and timekeeping reminders without interrupting focused work. The pet's visual appeal is an engagement hypothesis, not a substitute for correct answers or completed actions.

Measure, by organization and role without exposing message content in aggregate analytics: companion activation; weekly users who complete a query or confirmed action; answer-to-source click-through; count-answer corrections; proposal-to-confirm and confirm-to-success rates; prompt action, snooze, and disable rates; interruption complaints; first input latency; and accessibility failures. Set numeric targets from a prelaunch baseline and pilot cohort before claiming improvement. No target or competitor advantage is asserted by this document.

## Competitor evidence and product response

Public documentation checked 2026-10-08; these are vendor-described capabilities, not signed-in UI verification or independent quality measurements.

| Product | Documented capability | StreamlineOS response to test |
| --- | --- | --- |
| [Atlassian Rovo](https://support.atlassian.com/rovo/docs/agents/) | Configurable agents with knowledge and actions across Atlassian tools. | A single companion that appears at the point of work, with clear permission and confirmation boundaries. |
| [ClickUp Brain](https://help.clickup.com/hc/en-us/articles/12578085238039-What-is-ClickUp-Brain-AI) | Workspace context, answers, workflow help, and customizable agents. | Exact, linked operational answers and a restrained companion surface. |
| [Linear Triage Intelligence](https://linear.app/docs/triage-intelligence) | Suggested issue properties and relationships for triage. | Build questions grounded in canonical tickets and understandable scope; deeper triage can follow. |
| [Notion Custom Agents](https://www.notion.com/help/custom-agents) | Triggered workflows, configured access, and activity logs. | User and admin controls plus inspectable prompt reasons and outcomes. |

**Differentiation hypothesis:** a trustworthy, user-controlled companion that can work across StreamlineOS modules while staying visually small and contextually useful. The broader [competitive audit](verification-and-competition.md) found substantial overlap with monday Sidekick, Slackbot, Microsoft Copilot agents, and Asana AI Teammates too. Validate differentiation with customer task completion and interruption research; do not claim competitors lack generic assistant behavior.

## Delivery and release boundary

1. Complete design research and the asset/interaction specification from CP-00; review high-fidelity desktop, mobile, reduced-motion, and disabled states with users.
2. Implement the CP-01 answer and action contracts using owning-module services, then prove permission, tenant, and persistence behavior.
3. Implement CP-02 preferences, trigger evaluation, and prompt delivery; pilot with category-level controls and observe suppression/deduplication.
4. Release only after cross-role, cross-tenant, browser, persistence, accessibility, notification-delivery, and operational evidence. Keep feature flags and a rollback path to the current Ask OS launcher.

**Later release:** provider-backed cross-browser transcription, voice/persona selection, deeper automation, and repository/CI bug diagnosis. Browser voice in this release does not imply background listening, stored audio, or automatic spoken replies.

## Current evidence and remaining execution gates

The current repository contains the companion launcher and Ask OS panel (`frontend/components/assistant/`), reviewed tool registry and confirmation layer (`backend/src/modules/ai/core/`), permission-scoped Build count tool, and Documents `searchDocumentContext` tool backed by `KbAskService.citableContext`. Build `BUG` is the canonical actionable defect (`build/module/00-product-decisions-prd.md` D04), and Calendar/Notifications provide reminder infrastructure. The [ledger](verification-and-competition.md) records historical and current evidence. The authorized RDS target has the companion schema and index; authenticated pet browser journeys, real provider output, notification delivery, and deployment proof remain open.

| Item | State | Closure |
| --- | --- | --- |
| Final pet name, asset, and licensing | DESIGN DELIVERABLE | One character with presets is decided. Brand/design will choose its name, make the original assets, and record ownership before release; the supplied Codex image is a behavioral reference, not an asset to copy. |
| Baseline and numeric outcome targets | PILOT EVIDENCE | Instrument the named pilot, record the baseline, then set targets and evaluation window before claiming improvement. |
| Existing Ask OS defects and release gates | CURRENT UNVERIFIED | Recheck the linked Ask OS/open-items PRDs against the implementation branch and run target-environment evidence. |
| Notification and attendance source availability for every tenant | CURRENT UNVERIFIED | Verify enabled modules, shifts, leave, holidays, calendar connections, and event delivery in the pilot environment. |

## Implementation record (reviewed 2026-10-09 on `main`)

| Build map order | Delivered | Evidence | Still open |
| --- | --- | --- | --- |
| 0, 4 Toolset review and write gating | `registry/ask-os-tool-exposure.ts` review map filters every turn's Toolset; `clockIn`/`clockOut`/`toggleBreak`/`createTask` converted to confirmable actions; ambiguous lead match returns a choice; four inline paid-generation or unscoped tools blocked; every confirm action runs in a tenant transaction | Focused jest; exposure, catalog and tenant-context specs | Real-database confirm journeys per module cluster |
| 1 Turn presentation | `CLARIFY`, `EVIDENCE`, `ACTION_PLAN`, `CAPABILITY_LIMIT` directives; removable route/record context with server access recheck; clarification resume; per-turn bounds; typed confirm receipts with `already-completed` replay; secure proposal recovery issues a fresh short-lived token only for a still-pending authorized proposal | Focused Jest | Browser reload, navigation, inaccessible-record and duplicate-redemption journeys remain open; recovery tokens are never stored in transcript history |
| 2 Build aggregate | `countTickets` over one scoped owner query, scope clarification, preview cap, and an explicit no-link reason because no existing Build view reproduces the predicate | SQL-shape and mocked Jest | Non-owner `EXPLAIN (ANALYZE, BUFFERS)` not measured |
| 3 Documents context | `KbAskService.citableContext` shared with Documents Ask; `searchDocumentContext` Tool; citation recheck on evidence and history replay | Focused jest | Real-database revocation race |
| 5 Preferences and prompts | `companion` module, migrations `1974_companion_pet` and `1975_companion_meeting_lookup_index`, deterministic meeting/clock-in/break/friendly eligibility, active timed-meeting suppression, atomic claim, retention sweep, rate limits | Focused Jest and scratch-DB cases; both migrations applied to the authorized RDS target and their ledger hashes, four RLS-enabled tables and outbox index verified | Authoritative focus/DND, exact stored suppression reason, worker delivery, policy matrix and multi-device proof |
| 6 Frontend | Original pet launcher with presets and rollback to the Ask OS launcher, effective permission/module-derived starter prompts, structured cards, recoverable confirmation cards, removable context chip, live preference preview, filtered activity, foreground-only timing, prompt presentation deferral, organisation-day pause and 44 px launcher target | Focused Jest; route type generation; production TypeScript check; focused ESLint | Browser, mobile, safe-area, zoom, reduced-motion and screen-reader journeys |
| 7 Release gates | Backend `typecheck` and `typecheck:test` clean; contract vendored | Gate runs | All release gates in the delivery plan remain open |

The settled product scope and implementation contracts are in this folder. The current implementation review and ordered work list are in [review-2026-10-09.md](review-2026-10-09.md). Focused source and schema checks do not close the browser, actor/tenant, provider, worker, accessibility, performance or release gates; `CURRENT UNVERIFIED` cannot be treated as a shipped capability.
