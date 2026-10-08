# StreamlineOS Companion Pet — product program

**Status:** Product decisions settled; proposed requirements, 2026-10-08. Not implemented or release-verified.
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
8. [ADR 0007 — Companion uses the Ask OS Toolset](../docs/adr/0007-companion-uses-ask-os-toolset.md): the accepted first-release architecture decision and its proof gates.

The current [Chat OS PRD](../specs/2026-09-18-chat-os-prd.md), [Ask OS hardening PRD](../specs/2026-09-19-ask-os-hardening-prd.md), and [Build acceptance catalog](../specs/build/module/README.md) remain authoritative for their own underlying systems. This program defines the new user experience and its added capabilities. A conflict with a current security or Build contract is resolved in favor of that contract until the product owner explicitly changes it. Historical PRD progress is not proof of current production behavior.

## Product decision record

| ID | Decision |
| --- | --- |
| CP-D01 | One pet with many permitted skills, rather than a separate pet per module. |
| CP-D02 | Small, quiet desktop corner presence; compact mobile entry opens the existing assistant workspace. |
| CP-D03 | Suggestions and previews precede every pet-initiated write. The user explicitly confirms each write; existing immediate-write Tools are unavailable through the pet until adapted. |
| CP-D04 | Text and animation first. Speech input and output follow in a separate release and are opt-in. |
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

## Verification snapshot

| Area | Current conclusion |
| --- | --- |
| Product discussions | CP-D01–D15 settled for this planning round, including broad natural-language intake, approved-tool execution scope, audience, scope prompts, open-BUG definition, activity consent, and one character with presets. Final name and art are design outputs. |
| Repository architecture | [ADR 0007](../docs/adr/0007-companion-uses-ask-os-toolset.md) selects the existing Ask OS Toolset as the capability seam. Ask OS has the turn, history, and confirmation owners. Existing Tool providers span Build, CRM, HR/self-service, mail, communications, calendar, payroll, operations, and workspace; their presence does not prove every task works end to end. Documents already has content Retrieve and Citation; Build lacks an exact scoped BUG aggregate tool; Calendar/Notifications have reminder and preference foundations. Details and source paths are in the [ledger](verification-and-competition.md). |
| Focused checks | At HEAD `0cd316204`, this architecture recheck passed 3 backend registry/confirmation suites / 84 tests and 2 frontend lazy-provider/confirmation-card suites / 11 tests. Earlier planning runs passed 5 backend suites / 35 tests, 9 backend suites / 108 tests, and 3 frontend suites / 11 tests. Runs overlap and prove only their named local assertions. |
| Runtime and release | Anonymous backend `/health` responded on port 1500; no frontend listener was found on checked ports 1000/3000/3001. No authenticated pet journey, target database, cross-role/tenant, notification delivery, deployment, or customer outcome is verified. |
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

**Later release:** opt-in voice, deeper automation, and repository/CI bug diagnosis. None is implied by first-release acceptance.

## Current evidence and remaining execution gates

The current repository contains an Ask OS launcher/panel (`frontend/components/assistant/`), tool registry and confirmation layer (`backend/src/modules/ai/core/`), self-ticket count tools (`self-work-tools.ts`), and a scoped **title/filename** document-search tool (`self-digest-tools.ts`). The separate Documents Ask path already retrieves content and revalidates citations; Companion integration with that path remains new work. Build `BUG` is the canonical actionable defect (`build/module/00-product-decisions-prd.md` D04), and Calendar/Notifications provide reminder infrastructure. The [ledger](verification-and-competition.md) records source, focused tests, and the status of every acceptance scenario. An anonymous backend health response was observed, but no authenticated pet browser, target database, or deployment proof exists.

| Item | State | Closure |
| --- | --- | --- |
| Final pet name, asset, and licensing | DESIGN DELIVERABLE | One character with presets is decided. Brand/design will choose its name, make the original assets, and record ownership before release; the supplied Codex image is a behavioral reference, not an asset to copy. |
| Baseline and numeric outcome targets | PILOT EVIDENCE | Instrument the named pilot, record the baseline, then set targets and evaluation window before claiming improvement. |
| Existing Ask OS defects and release gates | CURRENT UNVERIFIED | Recheck the linked Ask OS/open-items PRDs against the implementation branch and run target-environment evidence. |
| Notification and attendance source availability for every tenant | CURRENT UNVERIFIED | Verify enabled modules, shifts, leave, holidays, calendar connections, and event delivery in the pilot environment. |

No blocking product-scope discussion remains from this planning round. Requirements are ready for design and ticket breakdown. Design deliverables and evidence gates are tracked work, and `CURRENT UNVERIFIED` cannot be treated as a shipped capability.
