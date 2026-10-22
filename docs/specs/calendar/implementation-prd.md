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

Deferred Calendar capabilities keep deployed compatibility, required schemas/migrations/tests, and lawful data unless a later product decision plus dependency proof authorizes removal. This does not override retention expiry, privacy erasure, legal hold, or security repair. The documentation files removed by CAL-IMP-001 were deleted only after their complete, active, and deferred requirements were transferred into the four canonical documents and mapped below.

## 2. Completed regression baselines

These baselines preserve accepted regression slices from former tickets 01–06, 08–12, 15, and 17. Ticket 07 remains open under CAL-IMP-003; live/provider/browser proof and overlapping product changes remain open under their mapped CAL-IMP items. A checked baseline is not release completion.

- [x] **CAL-BASE-001 — Recurrence and occurrence safety**
  - Effective overlap is shared by display, export, conflicts, and availability.
  - Moved-in, moved-out, overnight, multi-day, cancelled, DST, dense-series, and stable occurrence identity are covered.
  - Invalid occurrence mutations write nothing and trigger no reminder/provider side effect.
  - Evidence: backend recurrence/isolation suites including `calendar-native-source-recurrence.spec.ts`, `calendar-recurrence-end.spec.ts`, and `calendar-recurrence.isolation.spec.ts`; final temporal/UI regression remains in CAL-IMP-011/012.

- [x] **CAL-BASE-002 — Typed authorized projection**
  - Backend contracts expose stable source/record/occurrence identity, timed/date semantics, status, availability, actions, freshness, coverage, and continuation fields.
  - Linked Build/CRM content and external replicas are permission and connection scoped.
  - Dense native/Build/Tasks windows and exports are deterministic and explicitly partial when bounded.
  - Evidence: backend aggregate/source isolation and dense-window suites plus frontend `range-projection-contract.test.ts`; primary continuation and live authorization proof remain in CAL-IMP-002/012.

- [x] **CAL-BASE-003 — Unified views, URL, and refresh**
  - Existing applicable views consume one authorized set, use interval overlap, and preserve safe URL/deep-link state.
  - Source toggles and owner mutations refresh projection windows; focus/reconnect and data-free cross-tab hints are covered.
  - History paging remains a backend/audit capability; Product removes the primary History tab and CAL-IMP-002 implements that surface change.
  - Evidence: frontend projection mutation, URL-state, and view-state suites including `mutate-event-projection-contract.test.ts`, `calendar-url-state.test.ts`, and `use-calendar-view-state-url.test.ts`; UI simplification remains CAL-IMP-002.

- [x] **CAL-BASE-004 — Holds and lifecycle foundation**
  - Durable fenced/idempotent holds release on expiry/cancel/crash and prevent double reservation.
  - Versioned tenant-minimized lifecycle events publish transactionally and tolerate duplicate/out-of-order/replay delivery.
  - Evidence: booking hold service/coordinator/real-database suites including `calendar-booking-hold.service.spec.ts`, `calendar-booking-hold.coordinator.spec.ts`, and `calendar-booking-hold-actual.db.spec.ts`; full booking/provider journeys remain CAL-IMP-005/006/012.

## 3. Active end-to-end tasks

- [x] **CAL-IMP-001 — Consolidate Calendar documentation**
  - Files: `docs/specs/calendar/README.md`, `product-prd.md`, `technical-prd.md`, `implementation-prd.md`.
  - Merge every still-relevant constraint from the former product, architecture, competitor, developer API, audit, release-evidence, and tickets 01–36.
  - Delete superseded markdown and the tickets directory after the coverage map in §5 is complete.
  - Acceptance: only the four canonical files remain under `docs/specs/calendar`.
  - Evidence (2026-10-20): all 93 unchecked criteria from former tickets 13–36 and all incomplete root-document findings were re-audited. Former ticket 16 receipt alternatives and ticket 18 obsolete join information were restored; former-ticket deferred contracts were transferred to Technical PRD §12, while Product-only §3.3 deferrals remain index-only until promotion defines their contract. A final market/code/edge-case pass assigned remaining active gaps to CAL-IMP-002–012. Chronological evidence gaps moved to CAL-IMP-012 rather than being treated as completed implementation.

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
  - Consume external events and attendance only through the canonical projection feed; remove the second production merge/fetch paths.
  - When a primary range is partial or capped, provide stable continuation or an explicit narrower-window path; Retry alone is not reachability.
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
  - Inputs: required/optional internal participants, optional rooms/resources, duration, bounded range, buffers, timezone.
  - Persist versioned personal working hours/location with organization-default fallback, explicit timezone, and split/overnight windows; location is informational unless an explicit resource-location policy applies.
  - Find a time and booking consume the same effective working-hours/location version.
  - Evaluate hours, approved leave, native/source commitments, requested resources, connected calendars, provider freshness, and permission-limited coverage.
  - Return ranked complete/free choices, safe reasons, as-of time, and alternatives; stale/failed/disconnected/truncated never becomes free.
  - Coverage identifies required blocking sources, per-source freshness/watermark, and permitted skew; unrelated nonblocking-source failure does not make a slot unavailable.
  - Guests/private blockers remain generic; authorized diagnostics disclose only safe policy/source reasons.
  - Deadlines do not block time unless their type declares it.
  - Selecting a slot updates the event draft; save rechecks conflicts/current versions.
  - Tests: timezone, DST, hours, leave, buffers, optional attendee, no result, stale source, disconnected provider, permission-limited input, and changed availability before save.

- [ ] **CAL-IMP-005 — Finish basic booking rules and idempotent commit**
  - Primary frontend: `calendar-booking-rules-sheet.tsx`, booking rule cards/hooks, `frontend/features/calendar-booking`.
  - Primary backend: booking rule, availability, hold, resource, commit, and receipt services/controllers.
  - Hosts create, preview, activate, pause, revoke, and version basic rules.
  - Basic-release UI cannot publish or activate payment-enabled rules; any pre-existing active payment policy fails closed with a safe operator/guest message.
  - Visitors see only valid slots and configured minimal intake.
  - Slot generation and commit check every configured host Google/Outlook calendar; stale/disconnected required coverage blocks confirmation.
  - Rule changes affect new bookings without rewriting existing bookings.
  - Public confirmation blocks when required blocking-source coverage is stale/unavailable and offers safe alternatives; unrelated nonblocking-source failure does not reject booking.
  - Commit atomically revalidates rule/access/source versions/availability/hold/host/resources/capacity.
  - Concurrent attempts yield at most one constrained booking.
  - Same idempotency key returns one durable outcome after retries/timeouts.
  - Receipts distinguish confirmed, rejected, expired, cancelled, pending, and uncertain; local/provider/delivery states remain separate; every non-confirmation provides safe alternatives or an explicit recovery path.
  - Public links are expiring, revocable, non-enumerable, rate/spam protected, and expose minimized operator abuse evidence.
  - Returning guests retrieve receipts through verified identity or a short-lived secure completed-session credential; a consumed booking link alone cannot reveal a receipt.
  - Guest verification is expiring, single-use, attempt-limited, enumeration-safe, session-rotating, and protected by identity/resend/intake/link/IP/tenant limits.
  - Tests: timezone, notice, buffers, daily limits, disabled host, revoked rule, no slots, duplicate submit, changed-input idempotency, in-flight replay, timeout, hold expiry during confirmation, booking race, last-unit capacity, abusive traffic, link revocation, and returning-receipt access.

- [ ] **CAL-IMP-006 — Complete invitations, reminders, and provider reconciliation**
  - Primary frontend: public invitation page/hooks, event RSVP/detail, account/sync status UI.
  - Primary backend: invitation, reminder, provider sync, webhook, conference, and reconciliation services.
  - Required/optional attendees receive one current invitation and RSVP through identity or expiring signed purpose link.
  - Removed guests/cancelled occurrences cannot use old RSVP/join links, conference metadata, dial-in details, or stale provider join identifiers.
  - Reschedule/cancel updates all current attendees and suppresses obsolete reminders.
  - Enforce defaults, channels, quiet hours, snooze, missed-delivery repair, and per-occurrence/recipient dedupe.
  - Render in recipient locale/timezone; handle quiet-hour DST boundaries, bounce/complaint/unsubscribe, minimized content, and pre-send attendee/permission recheck.
  - Google/Outlook create, update, occurrence change, cancellation, conference creation, and reconnect expose honest states.
  - Unsupported capabilities fail visibly.
  - Provider push/webhook notifications are change hints only; authorized fetch/reconciliation establishes projection, availability, and sync truth.
  - Accept-then-timeout reconciles by stable external identity; duplicate/out-of-order webhooks are version checked and replayable.
  - OAuth expiry, divergence, and conference failure provide repair; invalid incremental tokens clear unsafe continuation state and trigger an authorized bounded full resync without duplicates.
  - Resolve simultaneous local/provider edits, remote deletion/tombstones, organizer changes, recurring-instance remapping, subscription expiry, quotas, and backoff without overwriting newer intent or resurrecting deleted events.
  - Production module wiring requires invitations for recurrence mutations; no active guest lifecycle may silently skip because the service is optional.
  - Tests: organizer departure, email change, late RSVP, duplicate delivery, cancellation during send, no-show, superseded jobs, bounce/complaint/unsubscribe, plus real Google and Outlook sandbox matrices.

- [ ] **CAL-IMP-007 — Complete rooms and source-owned resource booking**
  - Primary frontend: booking resource selection, `calendar-resource-approval-queue.tsx`, dedicated approval route, resource admin.
  - Primary backend: Calendar resource, maintenance, allocation, source-owner adapters, availability and commit.
  - Calendar rooms and source-owned equipment expose safe availability and capacity.
  - Maintenance, location, accessibility, integer room/equipment quantity or capacity, approval, and tentative claims affect offered slots; fractional/divisible equipment stays deferred with the Capacity map.
  - Owners revalidate eligibility at commit and return committed, rejected, or pending receipts.
  - Failed/pending required allocation cannot appear fully confirmed.
  - Tentative holds/proposals are visually distinct from confirmed allocations.
  - Rescheduling or assignment changes revalidate through the owning resource and return a new owner receipt.
  - Fence expired holds, compensate completed claims after partial multi-resource failure, reconcile uncertain owner outcomes before retry, release orphan claims, and recheck approval/maintenance before commit.
  - Baseline booking does not require deferred routing. Promoted rules that explicitly require routing/resources must wire those dependencies; unavailable services yield honest non-confirmation, never reduced enforcement.
  - Tests: last unit, simultaneous room booking, maintenance change, approval withdrawal, hold expiry, orphan claim, compensation failure, approval delay, hidden HR input, stale Inventory state, tentative display, and reschedule rejection.

- [ ] **CAL-IMP-008 — Deliver focused role-aware My Day**
  - Primary files: `calendar-my-day-panel.tsx`, Calendar search hooks/service, Calendar view/surface modules.
  - Distinguish actionable work, informational dates, preparation, and incomplete source coverage.
  - Search/filter authorized server results rather than one rendered page.
  - Each item shows source, freshness, status, next permitted action, and a validated source deep link; `javascript:`, protocol-relative, and other unsafe destinations are refused.
  - Disabled/denied modules expose no text, counts, hits, or aggregate inference.
  - Keep server cursor pagination/infinite scroll; remove saved-view authoring and team-view UI.
  - My Day includes meetings, Build/Tasks due work, approvals, and preparation; it does not expose protected-work, Radar, capacity, coach, or scenario entry points.
  - Command palette and every My Day/search consumer paginate authorized server results rather than slicing only the first page.
  - Search cursors bind normalized query, authorization version, index watermark, filters, and stable rank tie-breakers; permission filtering happens at query time.
  - Tests: mixed role fixture, denied source, disabled module, stale search index, partial source, duplicate linked commitment, mobile interaction, and cursor restart/snapshot behavior when access, membership, source preferences, filters, or rows change mid-pagination without skips or duplicates.

- [ ] **CAL-IMP-009 — Finish meeting-to-outcome with owner receipts**
  - Primary frontend: `meeting-workspace-panel.tsx`, prep/follow-up panels, source action review/receipt UI.
  - Primary backend: meeting workspace/context, source action proposal, owner adapters, consent/retention.
  - Context from CRM, Build, documents, mail, chat, recordings, or transcripts requires current permission and consent.
  - External guests receive only explicit shares.
  - Generated decisions/follow-ups remain drafts until each action is reviewed.
  - Proposal stores actor, source identity, expected version, effect, safe preview, and expiry without writing.
  - Build, CRM, Tasks, and HR owner adapters reauthorize permission, lifecycle, and expected version before apply; Inventory and Finance adapters remain dormant until Product PRD §3.3 promotion.
  - Owner reauthorizes on apply; per-source result is committed, failed, declined, or uncertain.
  - Applied-action UI shows the source link, current owner, and per-source receipt.
  - Dragging or editing a projected Build, Task, or HR date creates a reviewable owner proposal; Calendar never mutates that date directly.
  - Partial application provides repair/compensation without claiming cross-module atomicity.
  - Uncertain owner results reconcile by durable owner receipt before retry; duplicate confirmation returns the same receipt without repeating the source mutation.
  - Surface retention, recording consent, revocation, stale context, and partial-source failure.
  - Tests: stale version, permission loss, deleted source, owner rejection, timeout/retry, duplicate confirm, guest overshare, retention-policy expiry, recording-consent denial/withdrawal, stale context, partial-source failure, and partial application.

- [ ] **CAL-IMP-010 — Make Calendar authoritative for new CRM deal and lead meetings**
  - Frontend files: `frontend/features/crm/deals/detail/deal-detail-view.tsx`, `use-deal-detail-actions.ts`, `deal-dialogs.tsx`, meetings card, Calendar event form/state/validators/mutations.
  - Backend files: `backend/src/modules/deals/deals-meetings.service.ts`, response schemas/controller as needed, Calendar event contracts.
  - Replace “Log Meeting” with “Schedule in Calendar” and prefill a deal- or lead-linked draft.
  - Add frontend `linkedDealId`/`linkedLeadId` request and response parity with existing backend fields.
  - Resolve and display the CRM record through CRM authorization.
  - Deal/lead meeting reads combine Calendar-linked events and applicable legacy meetings with a source discriminator.
  - Stop new frontend writes to `deal_meetings`; preserve existing rows and legacy management.
  - Calendar event opens its CRM source; CRM meeting opens Calendar event.
  - Tests: permitted deal/lead link, denied or deleted source, foreign tenant, deep-link reload, legacy row, linked Calendar event, and no duplicate write.

- [ ] **CAL-IMP-011 — Close accessibility, locality, and interoperability gaps**
  - Timed mutations require valid resolved instants, IANA timezone, positive duration, explicit wall-time/instant preservation, expected version, and idempotent retry behavior.
  - Define and test the supported RFC 5545 recurrence subset plus this-occurrence, this-and-following, and whole-series edits without lost/duplicated exceptions.
  - Date-only filtering and rendered placement use the selected display timezone consistently.
  - Nonexistent/ambiguous wall times produce typed correction/fold choices; test 23/25-hour days, half-hour offsets, year boundaries, host/guest zones, and timezone-database changes.
  - Before save, show privacy-safe busy/tentative/unknown/partial conflict feedback; save rechecks current facts and applies a documented override policy without exposing blocker details.
  - Define versioned occurrence/series cancel, user-visible delete, tombstone suppression, provider cancellation, minimal audit/dedup retention, and physical erasure as distinct operations.
  - Keyboard and screen-reader alternatives for date navigation, grid selection, event move/resize, forms, sheets, booking, and RSVP.
  - Focus restoration and accessible status announcements.
  - Locale, first day of week, 12/24-hour clock, display timezone, and working location do not alter stored time.
  - ICS export preserves recurrence/timezone identity and excludes restricted data.
  - Verify RFC 5545 recurrence, timezone, and stable identity semantics, plus iTIP behavior where export/provider delivery uses it.
  - ICS import, subscribe-only feeds, delegation/shared calendars, waitlist, and host substitution remain deferred and are not exposed as incomplete controls.
  - WCAG 2.2 AA browser proof at 375, 768, 1280 plus keyboard-only operation, screen-reader grid semantics, virtualization focus, 200%/400% zoom/reflow, forced colors, reduced motion, error recovery, and no pointer-only action.

- [ ] **CAL-IMP-012 — End-to-end release verification**
  - Run focused frontend/backend Calendar and CRM tests, real-database race suites, contract parity, type checks, lint, route/access gates, and production builds.
  - Verify the production module graph/source census: every registered source declares its owning module and response envelope; disabled HR cannot execute or leak; source/account preferences remain actor- and organization-scoped.
  - Prove the 120-day range, 2,000-event aggregate, and 400-candidate per-source bounds report truncation honestly and provide stable continuation/narrower-window reachability for every authorized dense-tenant item.
  - Prove Build project viewers, locked projects, and denied standings never receive an edit capability on due-date or milestone projections.
  - Require tenant/actor/operation/request-bound idempotency and expected-version conflicts across externally retryable native, RSVP, provider, notification, booking, and proposal commands; changed input never replays.
  - Retain idempotency records/request hashes beyond the maximum client-retry and queue-replay horizon; expired-key reuse has explicit non-ambiguous semantics.
  - Authenticated two-organization browser journeys cover native scheduling, linked CRM scheduling, My Day, booking, resources, revocation, and responsive state handling.
  - Real Google and Outlook sandboxes cover read/write/reconnect/failure/replay.
  - Real notification channel proves recipient-visible invitation/reminder and deduplication.
  - Post-provider membership revocation denies direct external-event and History reads plus attachments, conference secrets, booking intake/receipts, provider mappings, queued payloads, search indexes, caches, range/detail/export/notification, and AI context without confirming existence.
  - Any retained offline path partitions protected cache by actor/organization, clears it on sign-out or organization/account switch, bounds retention, shows age/coverage/staleness, hides sensitive detail after known revocation, claims no offline booking/provider/source write success, and rechecks access/version/availability/policy before reconnect confirmation; changed/disabled policy forces intent review.
  - Evidence covers each applicable capability class: native/provider/source projection, booking/concurrency, guest delivery, resources, authorization/revocation, accessibility/responsiveness, and operational recovery.
  - HR canonicalization and CRM convergence use expand/contract schemas, resumable idempotent backfills, mixed-version compatibility, reconciliation counts, and rollback preserving post-deploy writes.
  - Approve and verify a class-by-class retention matrix for events, attendees, intake, notes, attachments, tokens, provider mappings, outbox/audit, indexes, caches, analytics, and backups: trigger, duration/configuration bounds, legal-hold precedence, erasure authority, provider propagation, backup expiry, and completion SLA.
  - Record p95 window and suggestion latency with dataset/concurrency/environment/boundary/error rate; initial release gates are under 1% Calendar 5xx over 15 minutes, provider reconciliation p95 within 5 minutes/alert at 15 minutes, oldest ready queue item under 5 minutes/alert at 10 minutes, alert on any new dead letter within 5 minutes, RTO at most 60 minutes, and RPO at most 5 minutes.
  - Product and technical requirements are declared satisfied only from this evidence.

## 4. Deferred capability registry

These are intentionally not active tasks. Technical PRD §12 is the single deferred acceptance owner; this section is only the status/traceability index.

- **Product §3.3 deferrals without a former ticket:** organization service catalogs, multi-staff pages, co-hosts/pooled availability, CRM-attributed public booking, customer-portal booking, ICS import/subscribe, delegation/shared calendars/offboarding, waitlists/host substitution, and native focus-time/auto rearrangement. No active CAL-IMP task or Technical §12 contract exists until Product promotion.
- **Polls (former 21):** Product §3.3; Technical §12 “Polls”.
- **Team routing (former 22):** Product §3.3; Technical §12 “Team routing”.
- **Advanced distribution/embed (former 23):** Product §3.3; Technical §12 “Advanced distribution/embed”. Advanced only; basic public-booking security remains CAL-IMP-005.
- **Payments (former 24):** Product §3.5; Technical §12 “Payments”.
- **Workflow builder (former 25):** Product §3.3/3.5; Technical §12 “Workflow builder”.
- **Developer UI/API expansion (former 26):** Product §3.5; Technical §12 “Dormant developer API contract”.
- **Advanced analytics/admin (former 27):** Product §3.3/3.5; Technical §12 “Advanced analytics/admin”.
- **Saved views (former 30):** Product §3.3/3.5; Technical §12 “Saved views”.
- **Protected work (former 31):** Product §3.5; Technical §12 “Protected work”.
- **Radar/chain (former 32):** Product §3.5; Technical §12 “Radar/chain”.
- **What-if scenarios (former 33):** Product §3.5; Technical §12 “What-if scenarios”.
- **Capacity map (former 34):** Product §3.5; Technical §12 “Capacity map”. Active resource booking remains CAL-IMP-007.
- **Time coach (former 35):** Product §3.5; Technical §12 “Time coach”.
- **Offline expansion (former 36):** Product §3.3; Technical §12 “Offline cache”. No new offline UI; reachable existing paths remain a CAL-IMP-012 security regression.
- **Additional module projections:** Product §3.3; Technical §12 “Additional module projections”.

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
- **31–35 → §4 and Technical PRD §12:** deferred contracts with no primary UI; corresponding product surfaces are removed under Product §3.5.
- **36 → §4 and CAL-IMP-012:** existing safe offline behavior retained, advanced scope deferred.
- **Former competitor research → Product PRD §2–3.**
- **Former architecture design and developer API → Technical PRD.**
- **Former acceptance audit and release evidence → CAL-BASE and CAL-IMP-012; chronological logs deleted.**

## 6. Canonical requirement-to-task map

Every active Product and Technical PRD requirement has one status owner here:

- **CAL-PROD-001 → CAL-IMP-002.**
- **CAL-PROD-002 → CAL-BASE-001 and CAL-IMP-006/011/012.**
- **CAL-PROD-003 → CAL-BASE-002/003 and CAL-IMP-002/003/006/008/010/012.**
- **CAL-PROD-004 → CAL-BASE-002 and CAL-IMP-003/004/005/006/007/008/009/010/012.**
- **CAL-PROD-005 → CAL-IMP-004.**
- **CAL-PROD-006 → CAL-BASE-004 and CAL-IMP-005.**
- **CAL-PROD-007 → CAL-IMP-006.**
- **CAL-PROD-008 → CAL-IMP-007.**
- **CAL-PROD-009 → CAL-IMP-008.**
- **CAL-PROD-010 → CAL-IMP-009.**
- **CAL-PROD-011 → CAL-BASE-002 and CAL-IMP-010/012.**
- **CAL-PROD-012 → CAL-IMP-011/012.**
- **CAL-TECH-001 → CAL-BASE-001/002/003 and CAL-IMP-002/003/011/012.**
- **CAL-TECH-002 → CAL-BASE-002 and CAL-IMP-003/004/005/006/007/008/009/010/012.**
- **CAL-TECH-003 → CAL-IMP-003.**
- **CAL-TECH-004 → CAL-IMP-004.**
- **CAL-TECH-005 → CAL-BASE-004 and CAL-IMP-005.**
- **CAL-TECH-006 and CAL-TECH-007 → CAL-IMP-006.**
- **CAL-TECH-008 → CAL-IMP-007.**
- **CAL-TECH-009 → CAL-IMP-009.**
- **CAL-TECH-010 → CAL-IMP-010.**
- **CAL-TECH-011 → CAL-IMP-002/003/008/012.**
- **CAL-TECH-012 → CAL-IMP-011/012.**
