# Companion Pet — verification ledger and competitive baseline

**Checked:** 2026-10-08 against repository HEAD `9d9651c11` for the source paths named below. Earlier planning checks ran at `0cd316204`. **Purpose:** Separate current source and focused-test evidence from browser, database, deployment, and market claims. This ledger does not certify release readiness.

## Evidence vocabulary

`SOURCE-VERIFIED` = current code path inspected. `FOCUSED-TEST` = named local test passed. `RUNTIME-HEALTH` = anonymous service health only. `PUBLIC-REPORTED` = vendor's dated public claim, not signed-in verification. `UNVERIFIED` = behavior still needs a real journey, database, role/tenant, or operational check. `PROPOSED` = product requirement or hypothesis; no current implementation is claimed.

## Current StreamlineOS audit

| Claim or dependency | Finding and source | Evidence | What remains |
| --- | --- | --- | --- |
| Ask OS is present in the authenticated shell | `frontend/components/layout/dashboard-shell.tsx` mounts `AskOsProvider`; `frontend/components/assistant/ask-os-launcher.tsx` renders the desktop button and `global-ask-os.tsx` renders the panel. | SOURCE-VERIFIED; frontend launcher/panel suites passed. | No browser pixel, placement, focus, or real conversation verified this turn. |
| Mobile entry already exists | `frontend/components/layout/mobile/mobile-shell-fab-panel.tsx` labels a quick-action item “Ask OS” and toggles the same context. | SOURCE-VERIFIED; mobile FAB suite passed. | Real narrow viewport and keyboard behavior unverified. |
| Conversation history has an existing owner | `backend/src/modules/ai/core/controllers/chat-assistant.controller.ts` exposes scoped conversation list/create/rename/delete/message routes. | SOURCE-VERIFIED. | Migration through a new pet UI and persisted browser history unverified. |
| Organization-member AI access has an existing RBAC foundation | `role-defaults.ts` includes `ai:chat:use` for default `MEMBER` and all permissions for `OWNER`/`ORG_ADMIN`; `chat-assistant.controller.ts` requires it. The platform has three organization standings plus module standings; `role-seed.service.ts` can materialize fixed-template role records. The Ask OS registry filters the actor's effective snapshot. | SOURCE-VERIFIED for defaults, route gate, standing model, and template path; focused role-mutation tests passed. | The default role list is not proof that all template-derived assignments have effective AI access. Resolve actual grants, feature flags, and module access for every pilot role. External portal guests are outside release one. |
| Ask OS reads and proposes writes | `backend/src/modules/ai/core/registry/ask-os-tool-registry.ts` filters tools by module and permission; `chat-assistant.controller.ts` has `POST /chat/confirm` with feature, module, and permission checks. | SOURCE-VERIFIED; focused confirm test passed. | Live proposal/card/redemption, idempotency, audit, and cross-tenant execution not established here. |
| Ask OS already spans multiple work domains | The registered Tool-provider source files include `projects-copilot-tools.ts`, `crm-copilot-tools.ts`, `mail-copilot-tools.ts`, `comms-copilot-tools.ts`, `comms-actions-tools.ts`, `work-actions-tools.ts`, `workspace-copilot-tools.ts`, `hr-copilot-tools.ts`, `ops-copilot-tools.ts`, and self-work/HR/payroll/growth/comms/actions/digest providers. Keys inspected include `readTicket`, `searchTickets`, `searchLeads`, `getInventoryStock`, `getOrgPayrollSummary`, `getMyCalendarEvents`, `listRecentEmails`, `getMyAttendanceStatus`, `sendMailFromAccount`, `scheduleEvent`, `updateLeadStatus`, and `applyForLeave`. | SOURCE-VERIFIED inventory sample, 2026-10-08. | Per-tool owner, grants, connected account, side effects, data classification, latency, and real outcome remain to be inventoried and verified; registration is not end-to-end proof. |
| Tool Outcomes distinguish clarification and failure | `ask-os-tool.types.ts` declares `data`, `empty`, `denied`, `needs-connection`, `needs-confirmation`, `ambiguous`, and `failed`; the registry filters the current Toolset and renders those results. | SOURCE-VERIFIED. | Pet UI, synthesis, and multi-module planning must preserve each distinction; test ambiguous entity, partial result, disabled module, and stale connection. |
| Immediate writes match the proposed confirmation contract | `self-actions-tools.ts` registers `clockIn`, `clockOut`, and `toggleBreak` without `confirms`; `crm-copilot-tools.ts` directly inserts a task in `createTask` without `confirms`. Leave, expense, timesheet, referral, job-application, and lead-status tools use confirmable actions. | SOURCE-VERIFIED distinction. | **Gap:** inventory all immediate writes, decide their pet confirmation treatment before exposure, and prove no model-selected Tool silently violates the user-control rule. |
| Ambiguous lead target is safely resolved | `crm-copilot-tools.ts` `updateLeadStatus` selects the first partial-name result with `.limit(1)` before making a proposal. | SOURCE-VERIFIED gap. | Return a typed ambiguity choice when several visible leads match; prove no wrong-target proposal or inaccessible-candidate leak. |
| Exact self-ticket counts have a source path | `self-work-tools.ts` uses `ProjectsWorkCountService.countTicketsByStatus(scope: "mine")`; `projects-work-count.service.ts` filters deleted tickets and archived projects and applies project reach before aggregation. | SOURCE-VERIFIED; self-work and count-scope tests passed. | Actual count against a non-owner database and a visible Build view unverified. |
| Exact open-BUG counts are already a tool | **False.** The self-ticket tool groups all types by status; `BugsService.listBugs` is capped at 100 rows. `BLD-00` D04 declares `BUG` tickets canonical. | SOURCE-VERIFIED. | A dedicated scoped aggregate, state-group mapping, true filtered link, and target-DB proof are new work. |
| Build has an existing open-state convention | `db/schema/common/enums.ts` declares `backlog`, `unstarted`, `started`, `completed`, `cancelled`; `portfolio-project-counts.ts` counts the first three as open. | SOURCE-VERIFIED for enum and portfolio path. | Apply and verify the convention for canonical BUG queries, custom statuses, fixed/ready-for-QA cases, and invalid mappings. |
| Ask OS can search Documents by title | `self-digest-tools.ts` searches onboarding filenames and Document titles; `kb-document-query.service.ts` returns titles, article excerpts, and metadata under access predicates. | SOURCE-VERIFIED; earlier KB search/isolation focused tests passed. | This Ask OS tool alone does not support arbitrary content claims. |
| Documents already supports grounded Ask | `kb/retrieval/kb-ask.service.ts` privately gathers Retrieve/passages, uses `KbAskCitationService`, and then generates an answer; `kb-ask.controller.ts` exposes metered Ask routes with separate Documents chat history and citation replay checks. | SOURCE-VERIFIED; 2026-10-08 citation-restriction focused tests passed. | ADR 0007 selects extraction of a Documents-owned bounded citable-context read for one Ask OS generation. Prove no copied ACL/citation logic, no pooled tenant transaction across provider latency, one credit charge/transcript, and real revocation behavior. |
| Meeting reminders have a durable source | `calendar-reminder-sweep.service.ts` emits attendee-specific `calendar.reminder` outbox rows with dedupe keys. | SOURCE-VERIFIED; tenant-isolation test passed. | Pet presentation, cancellation at delivery, cross-device display, and actual delivery unverified. |
| Notification preferences can support suppression | `notification-preference-resolution.ts`, `quiet-hours.util.ts`, and preference schemas cover channels/categories/quiet hours. | SOURCE-VERIFIED; consent-routing test passed. | Pet-specific category policy and end-to-end quiet-hours delivery unverified. |
| DND and absence context exist | `chat-presence-status.ts` defines `DO_NOT_DISTURB`; HR calendar source has missed-attendance/holiday/leave logic. | SOURCE-VERIFIED. | A unified pet suppression/shift eligibility API is not established. Do not equate chat DND or HR calendar display with a ready pet trigger. |
| Pet, pet settings, prompt activity, and coarse activity opt-in exist | No corresponding implementation was found in the relevant assistant, notification, and settings paths inspected. | SOURCE-VERIFIED bounded search; not an exhaustive absence proof. | Entire pet experience, preference persistence, trigger policy, dedupe, and audit are PROPOSED. |
| Local service is healthy | On 2026-10-08 `GET http://127.0.0.1:1500/health` returned `{success:true,data:{status:"ok"}}`; only port 1500 listened among checked ports 1500/1000/3000/3001. | RUNTIME-HEALTH only. | The service's dataset, revision, and purpose were not established; no authenticated or mutating request was made. No frontend journey was possible on those checked ports. |

**Focused tests:** Earlier in this planning audit, backend self-work, count-scope, Calendar tenant isolation/recurrence, canonical BUG visibility, KB search/isolation, ticket confirm, and notification consent passed **9 suites / 108 tests**; frontend Ask OS provider, mobile FAB, and chat view passed **3 suites / 11 tests**. A subsequent recheck passed backend Documents citation restriction, RBAC role-mutation gates, Ask OS Build tools, Calendar tenant isolation, and notification consent routing **5 suites / 35 tests**; the three frontend suites passed again **3 suites / 11 tests**. At current HEAD `9d9651c11`, the backend Tool registry, Tool confirmation derivation, and confirmable action suites passed **3 suites / 84 tests**, and frontend lazy provider and confirmation card passed **2 suites / 11 tests**. These runs overlap; do not add the totals. They are local focused tests, not live database, browser, deployment, or customer proof.

**Planning artifact recheck:** All Markdown links in `docs/pet` resolve locally as of 2026-10-08. The four PRDs, program README, delivery plan, 200-candidate catalog, this ledger, ADR 0007, [HTML reconciliation](architecture-review.md), [implementation contract](implementation-contract.md), and [73-key inventory](capability-inventory.md) were checked for decision and ownership consistency. The supplied HTML was read and reconciled claim by claim; an earlier planning run rendered it in Chromium at desktop and 390 px widths. Its temporary original points to the old ADR location; the [copy here](architecture-review.html) has the corrected path. This checks documents and report, not a pet implementation.

## Acceptance-by-acceptance trace

Every scenario below remains **PROPOSED / NOT SIGNED OFF** for the pet. “Foundation” records reusable source or focused-test evidence, not completion of the new behavior.

| CP-00 scenario | Foundation checked | Missing pet proof |
| --- | --- | --- |
| A01 desktop open/focus/draft | Current Ask OS launcher, lazy panel, and provider tests. | Pet focus return, draft persistence, and browser interaction. |
| A02 mobile open | Existing mobile quick action and focused test. | Pet panel at narrow width, virtual keyboard, and real device behavior. |
| A03 reduced motion | Current launcher uses reduced-motion support; pet asset not built. | First paint, live preference changes, every animation state. |
| A04 preferences across devices | No pet preference store found in bounded search. | Persist name/preset/tone/anchor under user and organization. |
| A05 hide/switch/access loss | Existing Ask OS access gates and conversation scope. | Hidden re-entry, organization switch, role/AI revocation with pet UI. |
| A06 asset failure | Existing static Ask OS launcher only. | Static pet fallback while chat and actions still operate. |
| A07 overlays and controls | No pet placement implementation. | Dialog, editor, page action, zoom, keyboard, and prompt collision checks. |

| CP-01 scenario | Foundation checked | Missing pet proof |
| --- | --- | --- |
| A01 my Ticket count | Build self-work count path and focused tests. | Target database, primary/co-assignee dedupe, project/tenant reach against UI. |
| A02 custom statuses/open BUG | Canonical state-group enum and portfolio convention. | New exact BUG aggregate with fixed/QA cases and filtered Build parity. |
| A03 total versus preview | Existing BUG list capped at 100; no exact BUG total tool. | Separate exact aggregate and visibly capped preview. |
| A04 inaccessible Project/Document | Build access and Documents ACL source paths. | Real denied/nonexistence and citation-link checks as a lower role. |
| A05 conflicting/degraded Documents | Existing Documents Retrieve/Ask reports citations and degradation. | Pet presentation of conflict, partial failure, and no supported source. |
| A06 stale/revoked proposal | Ask OS confirm path rechecks feature/module/permission; owning Ticket writes exist. | Race, version conflict, membership revocation, and zero-write proof. |
| A07 duplicate/switch confirm | Proposal/token and action paths exist. | At-most-once write and cross-organization replay in target database/browser. |
| A08 preserved history | Ask OS conversation routes and frontend conversation hooks exist. | Open pre-existing transcript through pet after reload with no duplicate. |
| A09 provider/credit/module failure | AI feature, permission, and credit paths exist. | Distinct pet states in real provider/credit/disabled-module failures. |
| A10 ambiguous scope | No structured pet scope picker. | Ask before query on project page, then exact chosen-scope answer/link. |
| A11 explicit Project | Build Project reach checks exist. | Direct scoped query without repeated question or widened reach. |
| A12 Documents integration/credits | Existing Documents Ask, citation revalidation, and focused citation test. | One paid turn, one Ask OS transcript, revoked-source and degraded-path browser proof. |
| A13 cross-module answer | Multi-domain Tool providers and typed `data`/`failed` outcomes exist. | Real mixed CRM/Build or equivalent answer with per-claim source, scope, freshness, and partial-failure disclosure. |
| A14 ambiguous target | `ambiguous` ToolOutcome exists and is used in people/attendee resolution. | Pet choice UI; no inaccessible candidate leak or premature proposal. |
| A15 partial multi-step action | Separate confirmable actions exist in mail/calendar and other domains. | Distinct confirmation/receipt per step, stopped execution on failure/decline, no false atomic-success claim. |
| A16 unsupported/denied/disconnected | Registry gates tools and has `denied`/`needs-connection`/`failed` outcomes. | Honest user-facing distinction and safe alternative in browser and audit trace. |
| A17 general versus organization fact | Ask OS turn and Documents source paths exist. | General guidance labeling and no invented organization-specific claim without accessible source. |
| A18 immediate write | `clockIn`, `clockOut`, `toggleBreak`, and CRM `createTask` lack `confirms`; other writes have it. | Agreed preview/confirmation policy and owning-module result proof before pet exposure. |

| CP-02 scenario | Foundation checked | Missing pet proof |
| --- | --- | --- |
| A01 one meeting prompt | Calendar occurrence/attendee outbox dedupe and focused tenant test. | One actionable pet prompt across tabs/devices, no duplicate notification. |
| A02 changed event/access | Calendar event and reminder source paths. | Cancellation, reschedule, recurrence, and access revocation at delivery. |
| A03 clock-in eligibility | HR attendance, leave, holiday, and workday data paths. | One owner-approved eligibility query with unconfigured/flexible shift cases. |
| A04 break threshold | No pet coarse foreground signal or timing preference. | Consent, duration/cap/reset, truthful wording, and browser timing. |
| A05 friendly default/disable | No pet category preference. | Off by default, per-user opt-in and cross-device disable. |
| A06 suppression | Notification quiet hours and chat DND exist separately. | Combined focus/meeting/full-screen/modal rule and real presentation. |
| A07 admin change | Existing organization feature and permission checks. | New prompt policy recheck on queued event and no private-content leak. |
| A08 retry/reconnect | Calendar outbox and Notifications machinery exist. | Pet-specific retry, freshness, device reconciliation, and operational traces. |
| A09 why-prompt | Existing notification metadata is a possible source. | Pet reason/source/time UI with destination access check. |
| A10 revoke timing | No pet coarse activity consent or retained signal found. | Visibility-only duration, hidden-tab exclusion, deletion and cross-device revocation. |

## Public competitor baseline

Official product/help sources reviewed 2026-10-08. Features, availability, plans, and quality may differ by tenant and can change. `PUBLIC-REPORTED` is not a claim that the feature worked in a signed-in account or that every competitor has it.

| Competitor | Publicly described overlap | Product implication |
| --- | --- | --- |
| [Atlassian Rovo](https://support.atlassian.com/rovo/docs/agents/) | Configurable agents, knowledge, Jira/Confluence work, and automation. | “Cross-module Q&A and actions” alone is not distinctive. |
| [ClickUp Brain and Super Agents](https://help.clickup.com/hc/en-us/articles/37092796379927-Super-Agent-instructions-Skills-triggers-knowledge-and-memory) | Configurable skills, triggers, knowledge, and memory. | Customization and agent memory are already marketed elsewhere. |
| [Notion Custom Agents](https://www.notion.com/help/custom-agents) | Scheduled/event-triggered workflows, explicit resource access, activity logs. | Background work and governance are established comparison points. |
| [Linear Triage Intelligence](https://linear.app/docs/triage-intelligence) | Issue classification and relationship suggestions with human review/auto-apply settings. | Bug and issue intelligence needs a more specific user outcome. |
| [monday Sidekick](https://support.monday.com/hc/en-us/articles/26701503726610-Get-started-with-monday-sidekick) | Account/board/item context, connected apps, chat, and work updates. | In-place context and cross-app actions are not novel by themselves. |
| [Slackbot](https://slack.com/blog/news/slackbot-context-aware-ai-agent-for-work) | Personal contextual agent over permitted work data, with meeting preparation and actions. | “Personal AI coworker” is a crowded category. |
| [Microsoft 365 Copilot agents](https://support.microsoft.com/en-us/microsoft-365-copilot/get-started-with-agents-in-the-microsoft-365-copilot-app) | Personalized domain agents over organization data and processes. | Role-based agent discovery and business-process help are parity territory. |
| [Asana AI Teammates](https://investors.asana.com/node/11441/pdf) | Collaborative agents using work graph context and transparent workflows. | Team-aware multi-step work requires strong execution proof, not a novelty claim. |

**No universal exclusivity finding.** This review sampled primary public sources; absence of a feature from those pages does not prove no competitor offers it. The [200-candidate catalog](wow-opportunity-catalog.md) labels concepts as opportunities. Promotion to a “unique” claim requires named competitors, signed-in or equivalent direct evidence, date, plan/tier, and a repeatable comparison. The existing Build [100 Wow Reasons](../build-module/streamlineos-analysis-pack/01-ci/competitor-deep/100-WOW-REASONS.md) follows a similar evidence bar and remains separate from this companion program.

## Decision and verification gates before build

1. Signed-in organization members receive the universal core, subject to effective `ai:chat:use`, feature flags, module grants, and organization policy. Cover structural standings and template-derived role records through the actor's resolved access snapshot; do not branch on a role label. Product/design must map a starter journey for each enabled module and role cluster. Inventory and validate registered Tools as the first-release execution scope across StreamlineOS and approved connected tools; unsupported actions get an honest alternative. External client-portal guests and arbitrary web/computer control are later. The first release does not require deep new actions in every module.
2. Confirm the exact pilot organizations, roles, enabled modules, and named nonproduction environment. No production credentials or disposable writes on production are required to draft the PRD.
3. Prove count semantics against the canonical Build service and a non-owner database role, including multi-assignment, custom statuses, deleted/archived records, and project reach. An ambiguous count must ask for scope before a query; fixed/ready-for-QA BUGs remain open until `completed`.
4. Integrate a Documents-owned bounded citable-context read with Ask OS generation and prove content and citation ACLs with real Documents; the current Ask OS title search alone cannot close this criterion. Prove one credit reservation/settlement, one visible transcript, and no pooled tenant transaction across a provider call.
5. Prove representative real reads and actions across every launch module cluster, an ambiguous target, a missing/denied/disconnected capability, a mixed-module answer, partial multi-step completion, and the immediate-self-action policy. Also prove persisted history, each prompt category, multi-tab/device dedupe, opt-in activity signal, admin policy, and accessibility in browser and operational traces.
6. Establish baseline and target metrics in a pilot before claiming reduced interruption or a competitor advantage.

## Real-database evidence (2026-10-09)

**Environment.** Backend `feat/companion-pet` at `c61d0ad46`, `nest build`, `dist/main.js` booted on `localhost:1597` from a scratch working directory with throwaway secrets and an EdDSA `AUTH_SIGNING_KEYS` pair. Database `scratch_pet_e2e` on local Postgres, created from `a2z_smoke` (1055 ledger rows) and brought forward 70 journal entries with `run-pending-migrations.mjs --tag=X`, including `1974_companion_pet`. The three tags that fail on every lineage (1174, 1226, 1396; kb and build only) were left pending. `APP_DATABASE_URL` was a login role `pet_e2e_app` granted `streamline_app` (`rolsuper=false`, `rolbypassrls=false`), after `db-bootstrap-app-role.mjs` re-granted 1063/1063 tables. Two seeded organisations: A (`Asia/Kolkata`) and B (`America/New_York`). Each has an `ORG_ADMIN` owner and two `MEMBER`s, plus placement, `org_modules` and live `user_sessions` rows. Every token was signed per actor and checked by the real `JwtAuthGuard`. The API log ended with **0 occurrences of `42501`** and no error-level entries. The scratch database and role were dropped afterwards. Result: **109 PASS lines, 0 product failures.** The count includes one re-run of the `countTickets` block. The single FAIL line was a fixture gap, fixed during the run (see 2.18).

### 1. Companion API (HTTP, `RUNTIME-VERIFIED`)

| # | Actor | Request | Status | Key body / DB check |
|---|---|---|---|---|
| 1 | A.member | GET /companion/preferences | 200 | v0 defaults: meeting on, clockIn/break/friendly off, consent false |
| 2 | A.member | PATCH /companion/preferences `{version:0,name:"Pip",preset:"dusk",tone:"warm"}` | 200 | v1 |
| 3 | A.member | PATCH /companion/preferences `{version:0,...}` (stale) | 409 | "changed elsewhere"; DB row still v1 `Pip` |
| 4-5 | A.member | PATCH and GET /companion/policy | 403 | Permission denied (`ai:companion:manage`) |
| 6 | A.owner | PATCH /companion/policy `{version:0,allowedPresets:[default,mono],prompts:{friendly:false}}` | 200 | policy v1 |
| 7 | A.owner | PATCH /companion/policy `{version:0}` (stale) | 409 | policy unchanged |
| 8-9 | A.member | PATCH prefs `{version:1,prompts:{friendly:true}}`, then GET | 200 | Effective preset `default`, friendly `false`, `locks` = `preset`, `prompts.friendly`. The DB keeps the member's own `dusk` and `prompt_friendly=true` |
| 10 | A.member | POST /companion/activity/heartbeat (no consent) | 409 | "Activity timing is off"; 0 activity rows |
| 11-12 | A.member | PATCH consent on, then heartbeat `{foregroundSeconds:60}` | 200 / 204 | one `companion_activity_sessions` row, 60 s |
| 13-14 | A.owner, A.member | Admin lifts the lock (policy v2); member GET | 200 | preset back to `dusk`, friendly on, `locks` = {} |
| 15 | A.member | GET /companion/prompts/next | 200 | `null` at 60 s foreground |
| 16 | A.member | GET /companion/prompts/next (accrual set to 5400 s in DB) | 200 | `break:eligible`; **0 rows written by the GET** |
| 17-18 | A.member | claim, claim again | 200 / 409 | one row, `claimed`, break accrual reset to 0. The second claim's message is "no longer eligible", because the claim reset accrual |
| 19 | A.member | snooze `{minutes:10}` | 200 | `break:snoozed` |
| 20-22 | A.member | next → dismiss → dismiss | 200 / 200 / 409 | `friendly:eligible` → `dismissed` → "no longer open" |
| 23-24 | A.member | next, history | 200 | `null`; history = friendly:dismissed, break:snoozed |
| 33-35 | A.co | consent+friendly, heartbeat, next (foreground 700 s) | 200/204/200 | `friendly:eligible` |
| 36-37 | A.co | **two concurrent claims** (two tabs) | 200 + 409 | "already taken by another tab or device"; DB holds 1 row |
| 38-39 | A.co | third claim, next | 409 / 200 | next returns the same prompt as `claimed` |
| 40-41 | A.co | snooze `{minutes:7}`, snooze `{minutes:30}` | 400 / 200 | `snoozed` |
| 30 | A.member | DELETE /companion/activity | 204 | 0 activity rows for A.member |
| 25-29 | B.member, B.owner | history; claim/dismiss A's prompt ids; GET policy/prefs | 200 / 404 / 404 / 200 / 200 | B sees 0 items, `Prompt not found`, policy v0 (A is v2), prefs v0. A's prompt is still `snoozed` |
| 31 | anon | POST /cron/companion-retention-sweep, wrong bearer | 401 | — |
| 32 | anon | POST /cron/companion-retention-sweep, `Bearer $CRON_SECRET` | 200 | `organizationsScanned:5, activitySessionsDeleted:1, promptEventsDeleted:1`. Deleted: the 2-day-old activity row in org A and the 31-day-old prompt in org B. Kept: the fresh activity row, the 1-day-old prompt and A's 2 live prompts |

**RLS checked directly as `pet_e2e_app` (member of `streamline_app`).** With `app.organization_id` = B, all four companion tables return 0 of A's rows and 0 rows in total. With A, they return 1 / 1 / 2 / 1. An insert of an org-A policy under B's tenant setting failed with `42501 new row violates row-level security policy`.

### 2. Ask OS confirm path and `countTickets`

**Confirm path (HTTP `POST /chat/confirm`).** Proposals were minted by the real `AiConfirmationService.propose`, run on the app role. No model provider was used.

| # | Actor | Proposal | Status | Receipt / DB |
|---|---|---|---|---|
| 2.2 | A.owner | `crm.createLead` "Ada Lovelace" | 201 | `committed`, leadId 2; `lead_party_map` +1, `party_roles` PROSPECT +1, proposal `EXECUTED` |
| 2.3 | A.owner | same token again | 201 | `already-completed`, same resultId 2; 0 new rows |
| 2.4 | A.owner | fresh proposal, two concurrent redemptions | 201 + 409 | one `committed` and one 409 "Proposal already confirmed or executed"; exactly 1 new row |
| 2.5 | B.owner | A's token | 404 | "Proposal not found"; 0 rows; A's proposal still `PROPOSED` |
| 2.6-2.7 | A.member | `crm.createTask`, `crm.createLead` | 403 | receipt `denied` (no `tasks:write` / `crm:leads:create`) |
| 2.8 | A.owner | `self.clockIn` `{expectedStatus:OFFLINE}` | 201 | `committed`; one `attendance` row `PRESENT` |
| 2.8c | A.owner | second `self.clockIn` expecting OFFLINE | 409 | receipt `conflicted` ("attendance changed to PRESENT"); still 1 row |
| 2.9 | A.owner | `crm.createTask`, then the same token again | 201 / 201 | `committed`, then `already-completed`; exactly 1 `tasks` row |

All of these DB-only actions committed under RLS with no `42501`.

**`countTickets`.** HTTP cannot reach this Tool without a model, so it ran through the real toolset. `NestFactory.createApplicationContext(AppModule)` booted against the same database and app role. The real `JwtAuthGuard` resolved each caller from a signed token. Then `fetchChatContext`, `AccessService.getAccessSnapshot` and `buildAskOsToolset` ran, and `toolset.countTickets.execute` was called. That is the same path `POST /chat` uses, with `runInNewTenantTransaction`.

Fixture for org A:
- Project APL has a custom state set: Backlog, TODO, IN_PROGRESS, FIXED, READY_FOR_QA (started), DONE, CANCELLED.
- APL holds 7 live BUGs, one soft-deleted BUG, 2 TASKs and 1 STORY.
- Project BOR holds 2 BUGs and 2 TASKs.
- Project OLD is archived and holds 1 BUG.
- The owner is primary assignee on some tickets and co-assignee on others. On READY_FOR_QA the owner is both.

| Case (A.owner unless noted) | Tool total | Direct SQL |
|---|---|---|
| BUG, open, allAccessible | 7 | 7 |
| all types, open, allAccessible | 11 | 11 |
| BUG, every state group | 9 | 9 |
| all types, every state group | 15 | 15 |
| mine, open (primary ∪ co-assignee) | 5 | 5 (a naive UNION ALL gives 6: the co-assignee counted once) |
| mine, BUG, open | 4 | 4 |
| mine, every group | 8 | 8 |
| project APL, BUG, open | 5 | 5 |
| B.owner, BUG, open | 4 | 4 (org B only) |
| A.member (BUILD_MODULE_MEMBER, APL member only), BUG, open | 5 | 5 (the whole org would be 7) |

FIXED and READY_FOR_QA count as open, CANCELLED and DONE are excluded, and soft-deleted and archived tickets are excluded. Without a scope the Tool returns `ambiguous` with the `allAccessible` and `mine` options. An archived project, org B's project id asked for by A.owner, and BOR asked for by A.member all return `denied` "not found or you cannot access it".

**2.18 fixture gap.** On the first run A.member had no `countTickets`. Members seeded straight into the DB hold no Build module standing. A.owner then called `POST /roles/seed-defaults` (200) and `POST /roles/153/members` `{principalType:"user"}` (201) to grant BUILD_MODULE_MEMBER. `GET /me/access` then showed `build:tickets:view: all`, and the re-run passed. This is not a product defect.

### 3. `/me/org-display`

| Actor | Status | Body |
|---|---|---|
| A.member | 200 | `{currency:"INR", locale:"en-IN", timezone:"Asia/Kolkata"}` |
| B.owner | 200 | `timezone:"America/New_York"` |
| anon | 401 | — |

### Findings and limits

- **Contract deviation, no extra write.** A redemption that races an in-flight one gets 409 "Proposal already confirmed or executed" with no receipt. Only a redemption after commit gets `already-completed`. CONTRACT.md promises `already-completed` for every duplicate, so the frontend should treat that 409 as a pending duplicate.
- **Minor.** A snooze longer than the prompt's remaining TTL is accepted. `snoozedUntil` then falls after `expiresAt`, so the prompt expires and never comes back.
- **Not exercised here.** Meeting and clock-in prompt categories were not run, because they need calendar events and HR shifts. Quiet hours, leave and holiday suppression were not run. Neither was a real model-driven `POST /chat` turn with CLARIFY/EVIDENCE directives, because no provider key is available. Foreground time was advanced by setting `foreground_seconds`/`break_accrued_seconds` in SQL, because heartbeat credit is capped at the wall-clock time elapsed.
