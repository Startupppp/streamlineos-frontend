# StreamlineOS Calendar — Implementation PRD

**Status:** Canonical execution tracker  
**Updated:** 2026-10-20  
**Product:** [product-prd.md](./product-prd.md)  
**Technical contract:** [technical-prd.md](./technical-prd.md)

This is the only Calendar implementation checklist. Agents mark a top-level item complete only after every acceptance bullet under it passes end to end.

## 1. Completion protocol

Each task must include:

- Production implementation with no mock/stub data.
- API and schema contract parity.
- Tenant, permission, failure, and concurrency behavior where applicable.
- Focused unit/component tests and real-database tests where persistence matters.
- Authenticated browser proof at required viewport sizes.
- Removal of replaced or orphaned code.
- Updated checkbox and a short evidence note beneath the task.

Do not check a task for partial implementation. Add `Blocked:` beneath it when external sandbox, deployment, or user action prevents completion.

### Deletion guard

Nothing may be deleted merely because it is unfinished, inconvenient, hidden, or currently unused by one surface. Deletion is allowed only when:

1. The behavior is complete and a newer canonical implementation or document supersedes it; or
2. Product explicitly classifies the behavior as no longer needed.

Before deletion, the implementing agent must:

- Trace importers, callers, routes, jobs, schemas, migrations, tests, and persisted-data dependencies.
- Transfer every active requirement and regression constraint to the replacement.
- Preserve compatibility or provide a reviewed migration for existing data and consumers.
- Verify the replacement end to end before removing the old path.

Deferred Calendar capabilities keep their backend APIs, schemas, migrations, tests, and persisted data unless a later product decision explicitly authorizes removal. The documentation files removed by CAL-IMP-001 were deleted only after their complete, active, and deferred requirements were transferred into the four canonical documents and mapped below.

## 2. Completed trustworthy baseline

The following consolidated baselines replace accepted tickets 01–12, 15, and 17. They remain regression gates, not open work.

- [x] **CAL-BASE-001 — Recurrence and occurrence safety**
  - Effective overlap is shared by display, export, conflicts, and availability.
  - Moved-in, moved-out, overnight, multi-day, cancelled, DST, dense-series, and stable occurrence identity are covered.
  - Invalid occurrence mutations write nothing and trigger no reminder/provider side effect.

- [x] **CAL-BASE-002 — Typed authorized projection**
  - Stable source/record/occurrence identity, timed/date semantics, status, availability, actions, freshness, coverage, and continuation are present.
  - Linked Build/CRM content and external replicas are permission and connection scoped.
  - Dense native/Build/Tasks windows and exports are deterministic and explicitly partial when bounded.

- [x] **CAL-BASE-003 — Unified views, URL, and refresh**
  - Existing applicable views consume one authorized set, use interval overlap, and preserve safe URL/deep-link state.
  - Source toggles and owner mutations refresh projection windows; focus/reconnect and data-free cross-tab hints are covered.
  - History paging remains a backend/audit capability even though the primary History tab is now removed by product decision.

- [x] **CAL-BASE-004 — Holds and lifecycle foundation**
  - Durable fenced/idempotent holds release on expiry/cancel/crash and prevent double reservation.
  - Versioned tenant-minimized lifecycle events publish transactionally and tolerate duplicate/out-of-order/replay delivery.

## 3. Active end-to-end tasks

- [x] **CAL-IMP-001 — Consolidate Calendar documentation**
  - Files: `docs/specs/calendar/README.md`, `product-prd.md`, `technical-prd.md`, `implementation-prd.md`.
  - Merge every still-relevant constraint from the former product, architecture, competitor, developer API, audit, release-evidence, and tickets 01–36.
  - Delete superseded markdown and the tickets directory after the coverage map in §5 is complete.
  - Acceptance: only the four canonical files remain under `docs/specs/calendar`.
  - Evidence (2026-10-20): all 93 unchecked criteria from former tickets 13–36 and all incomplete root-document findings were re-audited. Two missing active ticket details were restored below; 27 under-specified deferred details were preserved in §4 and Technical PRD §12. Chronological evidence gaps moved to CAL-IMP-012 rather than being treated as completed implementation.

- [ ] **CAL-IMP-002 — Simplify the primary Calendar experience**
  - Primary files: `frontend/features/calendar/calendar-view.tsx`, `calendar-toolbar.tsx`, `event-detail-sheet.tsx`, `event-detail-actions.tsx`, `calendar-booking-rules-sheet.tsx`, `calendar-admin-settings.tsx`.
  - Expose only Calendar, Agenda, and My Day modes.
  - Keep Today/date navigation, Day/Week/Month, search where relevant, and one Calendars control for canonical sources and accounts.
  - Use the global Create action; remove the duplicate page Add action.
  - Remove primary History and saved-view authoring controls.
  - Remove Capacity, Insights, What-if, protected work, Radar/chain, payment, poll/routing/distribution, workflow, developer, and advanced analytics controls.
  - Keep booking-page CRUD/preview/link/managed bookings; keep resource approvals only at `/calendar/resource-approvals`.
  - Keep event actions: RSVP/join, edit/cancel, export, open source, and meeting workspace.
  - Remove Share, toolbar, overflow, or command actions that have no complete authorized handler.
  - Delete unreachable frontend components/tests; retain backend capability and persistence.
  - Split the current oversized orchestrator into focused modules without introducing a new state library.
  - Acceptance: no removed feature is reachable by mouse, keyboard, direct visible link, command palette, or mobile overflow; loading/empty/denied/disabled/partial/error states remain distinct at 375/768/1280.

- [ ] **CAL-IMP-003 — Use one canonical HR and attendance projection**
  - Primary files: `frontend/features/calendar/use-attendance-calendar-events.ts`, `use-hr-calendar-events.ts`, `use-calendar-computed.ts`, `frontend/hooks/api/calendar.ts`, registered HR Calendar sources in `backend/src/modules/hr`.
  - Make `/calendar/events` authoritative for leave, holidays, interviews, WFH, attendance, and supplemental HR dates.
  - Remove the client monthly-attendance merge and unused `/hr/calendar` production hook.
  - Preserve complete daily aggregation for multiple sessions and more than 35 monthly sessions.
  - Surface failed month, failed WFH, partial supplemental data, denial, org switch, and restored permission.
  - Preserve date-only local-day semantics and visible-range filtering.
  - Remove duplicate client/server list filtering; all active modes use canonical source-family filtering.
  - Acceptance: event identities/source counts match across Calendar, Agenda, My Day, search, and export for a controlled fixture; no successful empty state masks a failed HR source.

- [ ] **CAL-IMP-004 — Add explainable Find a time**
  - Backend files: `backend/src/modules/calendar/calendar-availability.service.ts`, `calendar.controller.ts`, availability DTO/response schemas, availability tests.
  - Frontend files: a domain hook/schema under `frontend/hooks/api`, event form files under `frontend/features/calendar`.
  - Add a bounded suggestion endpoint using the existing availability engine; do not duplicate availability logic in the client.
  - Inputs: required/optional internal participants, duration, bounded range, buffers, timezone.
  - Evaluate hours, approved leave, native/source commitments, connected calendars, provider freshness, and permission-limited coverage.
  - Return ranked complete/free choices, safe reasons, as-of time, and alternatives; stale/failed/disconnected/truncated never becomes free.
  - Guests/private blockers remain generic; authorized diagnostics disclose only safe policy/source reasons.
  - Deadlines do not block time unless their type declares it.
  - Selecting a slot updates the event draft; save rechecks conflicts/current versions.
  - Tests: timezone, DST, hours, leave, buffers, optional attendee, no result, stale source, disconnected provider, permission-limited input, and changed availability before save.

- [ ] **CAL-IMP-005 — Finish basic booking rules and idempotent commit**
  - Primary frontend: `calendar-booking-rules-sheet.tsx`, booking rule cards/hooks, `frontend/features/calendar-booking`.
  - Primary backend: booking rule, availability, hold, resource, commit, and receipt services/controllers.
  - Hosts create, preview, activate, pause, revoke, and version basic rules.
  - Visitors see only valid slots and configured minimal intake.
  - Rule changes affect new bookings without rewriting existing bookings.
  - Public confirmation blocks when source coverage is stale/unavailable and offers safe alternatives.
  - Commit atomically revalidates rule/access/source versions/availability/hold/host/resources/capacity.
  - Concurrent attempts yield at most one constrained booking.
  - Same idempotency key returns one durable outcome after retries/timeouts.
  - Receipts distinguish confirmed, rejected, expired, cancelled, pending, and uncertain; local/provider/delivery states remain separate; every non-confirmation provides safe alternatives or an explicit recovery path.
  - Public links are expiring, revocable, non-enumerable, rate/spam protected, and expose minimized operator abuse evidence.
  - Returning guests retrieve receipts through verified identity or a short-lived secure completed-session credential; a consumed booking link alone cannot reveal a receipt.
  - Tests: timezone, notice, buffers, daily limits, disabled host, revoked rule, no slots, duplicate submit, timeout, hold expiry during confirmation, booking race, last-unit capacity, abusive traffic, link revocation, and returning-receipt access.

- [ ] **CAL-IMP-006 — Complete invitations, reminders, and provider reconciliation**
  - Primary frontend: public invitation page/hooks, event RSVP/detail, account/sync status UI.
  - Primary backend: invitation, reminder, provider sync, webhook, conference, and reconciliation services.
  - Required/optional attendees receive one current invitation and RSVP through identity or expiring signed purpose link.
  - Removed guests/cancelled occurrences cannot use old RSVP/join links, conference metadata, dial-in details, or stale provider join identifiers.
  - Reschedule/cancel updates all current attendees and suppresses obsolete reminders.
  - Enforce defaults, channels, quiet hours, snooze, missed-delivery repair, and per-occurrence/recipient dedupe.
  - Google/Outlook create, update, occurrence change, cancellation, conference creation, and reconnect expose honest states.
  - Unsupported capabilities fail visibly.
  - Accept-then-timeout reconciles by stable external identity; duplicate/out-of-order webhooks are version checked and replayable.
  - OAuth expiry, divergence, and conference failure provide repair; invalid incremental tokens clear unsafe continuation state and trigger an authorized bounded full resync without duplicates.
  - Tests: organizer departure, email change, late RSVP, duplicate delivery, cancellation during send, no-show, plus real Google and Outlook sandbox matrices.

- [ ] **CAL-IMP-007 — Complete rooms and source-owned resource booking**
  - Primary frontend: booking resource selection, `calendar-resource-approval-queue.tsx`, dedicated approval route, resource admin.
  - Primary backend: Calendar resource, maintenance, allocation, source-owner adapters, availability and commit.
  - Calendar rooms and source-owned equipment expose safe availability and capacity.
  - Maintenance, location, accessibility, divisible capacity, approval, and tentative claims affect offered slots.
  - Owners revalidate eligibility at commit and return committed, rejected, or pending receipts.
  - Failed/pending required allocation cannot appear fully confirmed.
  - Tentative holds/proposals are visually distinct from confirmed allocations.
  - Rescheduling or assignment changes revalidate through the owning resource and return a new owner receipt.
  - Tests: last unit, simultaneous room booking, maintenance change, approval delay, partial multi-resource failure, hidden HR input, stale Inventory state, tentative display, and reschedule rejection.

- [ ] **CAL-IMP-008 — Deliver focused role-aware My Day**
  - Primary files: `calendar-my-day-panel.tsx`, Calendar search hooks/service, Calendar view/surface modules.
  - Distinguish actionable work, informational dates, preparation, and incomplete source coverage.
  - Search/filter authorized server results rather than one rendered page.
  - Each item shows source, freshness, status, next permitted action, and source deep link.
  - Disabled/denied modules expose no text, counts, hits, or aggregate inference.
  - Keep server cursor pagination/infinite scroll; remove saved-view authoring and team-view UI.
  - My Day includes meetings, Build/Tasks due work, approvals, and preparation; it does not expose protected-work, Radar, capacity, coach, or scenario entry points.
  - Tests: mixed role fixture, denied source, disabled module, partial source, duplicate linked commitment, mobile interaction, and cursor restart/snapshot behavior when access, membership, source preferences, filters, or rows change mid-pagination without skips or duplicates.

- [ ] **CAL-IMP-009 — Finish meeting-to-outcome with owner receipts**
  - Primary frontend: `meeting-workspace-panel.tsx`, prep/follow-up panels, source action review/receipt UI.
  - Primary backend: meeting workspace/context, source action proposal, owner adapters, consent/retention.
  - Context from CRM, Build, documents, mail, chat, recordings, or transcripts requires current permission and consent.
  - External guests receive only explicit shares.
  - Generated decisions/follow-ups remain drafts until each action is reviewed.
  - Proposal stores actor, source identity, expected version, effect, safe preview, and expiry without writing.
  - Build, CRM, Tasks, HR, Inventory, and Finance owner adapters reauthorize permission, lifecycle, and expected version before apply.
  - Owner reauthorizes on apply; per-source result is committed, failed, declined, or uncertain.
  - Partial application provides repair/compensation without claiming cross-module atomicity.
  - Surface retention, recording consent, revocation, stale context, and partial-source failure.
  - Tests: stale version, permission loss, deleted source, owner rejection, timeout/retry, duplicate confirm, guest overshare, retention-policy expiry, recording-consent denial/withdrawal, stale context, partial-source failure, and partial application.

- [ ] **CAL-IMP-010 — Make Calendar authoritative for new CRM deal meetings**
  - Frontend files: `frontend/features/crm/deals/detail/deal-detail-view.tsx`, `use-deal-detail-actions.ts`, `deal-dialogs.tsx`, meetings card, Calendar event form/state/validators/mutations.
  - Backend files: `backend/src/modules/deals/deals-meetings.service.ts`, response schemas/controller as needed, Calendar event contracts.
  - Replace “Log Meeting” with “Schedule in Calendar” and prefill a deal-linked draft.
  - Add frontend `linkedDealId`/`linkedLeadId` request and response parity with existing backend fields.
  - Resolve and display the CRM record through CRM authorization.
  - Deal meeting reads combine Calendar-linked events and legacy meetings with a source discriminator.
  - Stop new frontend writes to `deal_meetings`; preserve existing rows and legacy management.
  - Calendar event opens CRM source; CRM meeting opens Calendar event.
  - Tests: permitted link, denied deal, foreign tenant, deleted deal, deep-link reload, legacy row, linked Calendar event, and no duplicate write.

- [ ] **CAL-IMP-011 — Close accessibility, locality, and interoperability gaps**
  - Keyboard and screen-reader alternatives for date navigation, grid selection, event move/resize, forms, sheets, booking, and RSVP.
  - Focus restoration and accessible status announcements.
  - Locale, first day of week, 12/24-hour clock, display timezone, and working location do not alter stored time.
  - ICS export preserves recurrence/timezone identity and excludes restricted data.
  - Verify RFC 5545 recurrence, timezone, and stable identity semantics, plus iTIP behavior where export/provider delivery uses it.
  - ICS import, subscribe-only feeds, delegation/shared calendars, waitlist, and host substitution remain deferred and are not exposed as incomplete controls.
  - Tests/browser proof at 375, 768, 1280; no overflow, unreachable controls, or pointer-only action.

- [ ] **CAL-IMP-012 — End-to-end release verification**
  - Run focused frontend/backend Calendar and CRM tests, real-database race suites, contract parity, type checks, lint, route/access gates, and production builds.
  - Verify the production module graph/source census: every registered source declares its owning module and response envelope; disabled HR cannot execute or leak; source/account preferences remain actor- and organization-scoped.
  - Authenticated two-organization browser journeys cover native scheduling, linked CRM scheduling, My Day, booking, resources, revocation, and responsive state handling.
  - Real Google and Outlook sandboxes cover read/write/reconnect/failure/replay.
  - Real notification channel proves recipient-visible invitation/reminder and deduplication.
  - Post-provider membership revocation denies direct external-event and History reads as well as range, detail, search, export, notification, and AI context.
  - Any retained offline path shows cache age/coverage/staleness, hides sensitive detail after known revocation, claims no offline booking/provider/source write success, and rechecks access/version/availability/policy before reconnect confirmation.
  - Evidence covers each applicable capability class: native/provider/source projection, booking/concurrency, guest delivery, resources, authorization/revocation, accessibility/responsiveness, and operational recovery.
  - Record p95 window and suggestion latency, source/provider freshness, queue/dead-letter health, and rollback/repair procedures.
  - Product and technical requirements are declared satisfied only from this evidence.

## 4. Deferred capability registry

These are intentionally not active tasks. Existing backend code/data remains dormant; corresponding frontend controls are removed. Technical PRD §12 is the acceptance contract if Product later promotes one of these capabilities.

- **Polls (former 21):** required/optional voters, expiring holds, signed voting, busy-option recovery, finalize-time availability recheck, and exactly one committed invitation.
- **Team routing (former 22):** versioned explainable rules; private reasons stay hidden from guests; inactive/offboarded/on-leave/over-limit/disconnected hosts are ineligible; fairness commits with booking and retries retain assignment; CRM ownership, territory, skill, language, collective mode, and safe fallback remain covered.
- **Advanced distribution/embed (former 23):** approved branding, localization, accessibility, minimal intake, allowed origins, signed state/callbacks with permitted facts only, non-enumerable single-use expiring links, rate/spam/revocation/operator visibility, and one conversion outcome across retries/reschedules.
- **Payments (former 24):** one idempotency identity with separate payment/booking states, no duplicate charge/booking, repair/refund, uncertainty, chargeback, and reconciliation.
- **Workflow builder (former 25):** create/reschedule/cancel/no-show/start/end/source-state triggers; execution-time conditions, recipients, channels, consent, quiet hours, dry run, limits, and tenant policy; once-per-version effects, retry, dead-letter, replay, and operator repair.
- **Developer UI/API expansion (former 26):** least-privilege tenant credentials and user grants, paginated/rate-limited reads, idempotent/versioned writes, signed minimized webhooks, fail-closed tenant/token/version/signature/replay/rate checks, compatibility, deprecation, deletion, replay, and failed-delivery behavior; the full dormant HTTP contract remains in Technical PRD §12.
- **Advanced analytics/admin (former 27):** lifecycle-derived metrics with visible definition, denominator, timezone, deduplication, corrections, and partial coverage; retention-aware aggregate-version watermark; small-cohort/restricted-input suppression; booking-domain/link/provider/export/automation/abuse governance.
- **Saved views (former 30):** personal/team views preserve date logic, source, owner, project, location, status, and view mode without widening source access.
- **Protected work (former 31):** only Calendar-managed movable blocks; locked/break/leave/nonworking/load/priority/estimate/deadline constraints; move budgets, hysteresis, evidence, prior slot, and version-checked undo; source-owned dates stay proposals.
- **Radar/chain (former 32):** explicit typed/versioned/owner-attributed evidence-backed edges; safe cycle/missing/deleted/stale/hidden diagnostics; healthy/at-risk/unknown with freshness/coverage; unauthorized nodes use non-revealing placeholders and cannot be inferred through scores/counts; authorized source links identify who can act before slip.
- **What-if scenarios (former 33):** one write-free versioned permission-scoped graph snapshot; explicit before/after people/commitment/resource/customer impact and confidence; expiry on version/access/policy/availability change; owner-by-owner reauthorization and per-step outcomes.
- **Capacity map (former 34):** partial-day shifts, skills, divisible equipment, location, maintenance, approvals, and tentative claims; inspectable explanations, visually distinct tentative state, and owner receipts for reschedule/assignment. Active resource booking remains in CAL-IMP-007.
- **Time coach (former 35):** documented meeting/protected-time/missed-commitment/reschedule/coverage definitions; evidence-backed proposals; private HR/Finance/title protection; opt-in only; no employee scoring; explicit small-cohort/outage/duplicate/late-event/consent behavior.
- **Offline expansion (former 36):** cache age, last coverage, source staleness, policy/revocation redaction, no false offline write success, and full access/version/availability/policy recheck on reconnect. Reachable existing paths remain a CAL-IMP-012 security regression.
- **Additional module projections:** Inventory and Finance commitments beyond active source-owned equipment remain deferred and must preserve owner authority, safe summaries/actions, deep links, freshness, typed availability behavior, and non-revealing denial.

Promotion requires an explicit Product PRD update and a new consolidated implementation task. Do not recreate one ticket per capability.

## 5. Former-document coverage map

- **01 → CAL-BASE-001:** recurrence overlap/conflict.
- **02 → CAL-BASE-001:** invalid occurrence mutations.
- **03 → CAL-BASE-002:** typed projection.
- **04 → CAL-BASE-002, CAL-IMP-009/010/012:** source-owner access and live denial proof.
- **05 → CAL-BASE-002:** dense native/export.
- **06 → CAL-BASE-002:** Build/Tasks bounds.
- **07 → CAL-IMP-003:** HR/attendance completeness and canonicalization.
- **08 → CAL-BASE-002, CAL-IMP-006/012:** external paging plus live provider proof.
- **09 → CAL-BASE-003:** projection refresh.
- **10 → CAL-BASE-003, CAL-IMP-002/003:** unified active surfaces.
- **11 → CAL-BASE-003, CAL-IMP-002:** URL/deep links retained; primary History UI superseded.
- **12 → CAL-BASE-002/003, CAL-IMP-012:** migration/release evidence.
- **13 → CAL-IMP-004/005:** privacy-safe availability.
- **14 → CAL-IMP-005:** basic booking rules/public slots.
- **15 → CAL-BASE-004, CAL-IMP-005/007:** durable holds.
- **16 → CAL-IMP-005:** idempotent commit/receipts.
- **17 → CAL-BASE-004:** lifecycle outbox.
- **18 → CAL-IMP-006:** invitations/RSVP/reminders.
- **19 → CAL-IMP-006:** provider writes.
- **20 → CAL-IMP-007:** rooms/resources.
- **21–27 → §4 and Technical PRD §12:** deferred, except basic public-link/booking security and active resources covered by CAL-IMP-005/007.
- **28 → CAL-IMP-009:** source proposals/receipts.
- **29 → CAL-IMP-009:** meeting workspace.
- **30 → CAL-IMP-008 and §4:** My Day/search active; saved-view authoring deferred with its contract preserved.
- **31–35 → §4:** removed frontend/dormant backend.
- **36 → §4 and CAL-IMP-012:** existing safe offline behavior retained, advanced scope deferred.
- **Former competitor research → Product PRD §2–3.**
- **Former architecture design and developer API → Technical PRD.**
- **Former acceptance audit and release evidence → CAL-BASE and CAL-IMP-012; chronological logs deleted.**

## 6. Canonical requirement-to-task map

Every active Product and Technical PRD requirement has one status owner here:

- **CAL-PROD-001 → CAL-IMP-002.**
- **CAL-PROD-002 → CAL-BASE-001 and CAL-IMP-006/011/012.**
- **CAL-PROD-003 → CAL-BASE-002/003 and CAL-IMP-003/006/010.**
- **CAL-PROD-004 → CAL-BASE-002 and CAL-IMP-003/004/006/008/009/010/012.**
- **CAL-PROD-005 → CAL-IMP-004.**
- **CAL-PROD-006 → CAL-BASE-004 and CAL-IMP-005.**
- **CAL-PROD-007 → CAL-IMP-006.**
- **CAL-PROD-008 → CAL-IMP-007.**
- **CAL-PROD-009 → CAL-IMP-008.**
- **CAL-PROD-010 → CAL-IMP-009.**
- **CAL-PROD-011 → CAL-BASE-002 and CAL-IMP-010/012.**
- **CAL-PROD-012 → CAL-IMP-011/012.**
- **CAL-TECH-001 → CAL-BASE-001/002/003 and CAL-IMP-003/012.**
- **CAL-TECH-002 → CAL-BASE-002 and CAL-IMP-008/009/010/012.**
- **CAL-TECH-003 → CAL-IMP-003.**
- **CAL-TECH-004 → CAL-IMP-004.**
- **CAL-TECH-005 → CAL-BASE-004 and CAL-IMP-005.**
- **CAL-TECH-006 and CAL-TECH-007 → CAL-IMP-006.**
- **CAL-TECH-008 → CAL-IMP-007.**
- **CAL-TECH-009 → CAL-IMP-009.**
- **CAL-TECH-010 → CAL-IMP-010.**
- **CAL-TECH-011 → CAL-IMP-002/003/008/012.**
- **CAL-TECH-012 → CAL-IMP-011/012.**
