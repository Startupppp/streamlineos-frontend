# Calendar release evidence

## Core projection migration

Evidence recorded on 2026-10-13 for tickets 01 through 12.

| Evidence layer | Status | Evidence | Limit |
| --- | --- | --- | --- |
| Source and service contracts | Passed | Backend Calendar acceptance run: 14 suites and 136 tests passed. It covers typed projections, registry isolation, registered-source completeness, undeclared modules, source-owner access, dense-series truncation, tenant isolation, event capabilities, lifecycle coverage, Build, Tasks, and HR sources. | This proves application contracts with test doubles and fixtures. |
| Frontend contracts and behavior | Passed | Frontend Calendar run: 55 suites and 356 tests passed. Production, spec, and browser-test TypeScript configurations also passed. | This proves component, hook, schema, cache, and interaction contracts in the test environment. |
| Authenticated browser behavior | Passed with intercepted services | Playwright ran six authenticated journeys for two organization identities at 375x812, 768x1024, and 1280x800. Each journey rendered only its organization projection, opened Calendar accounts, showed Google and Outlook account fixtures, and had no document-level horizontal overflow. | The browser used deterministic intercepted API responses. It proves responsive UI, session scoping, and multi-account presentation without proving a live provider or database. |
| Provider sandbox behavior | Not run | No Google Calendar or Microsoft Outlook sandbox credentials were used in this pass. | Pagination and normalization are contract-tested; provider token refresh, remote write propagation, throttling, and provider-specific failures still need sandbox evidence before a provider-backed release. |
| Deployment status | Not deployed | The changes remain in the local workspace. | No staging or production deployment, migration execution, observability review, or live-provider smoke test is claimed. |

## Commands

- `pnpm exec jest --runInBand --silent` with the 14 focused backend acceptance suites: 136 tests passed.
- `pnpm exec jest --runInBand --silent features/calendar ...`: 55 suites and 356 tests passed.
- `pnpm run typecheck` in `backend`: passed.
- `pnpm run type-check`, `pnpm run type-check:specs`, and `pnpm run type-check:e2e` in `frontend`: passed.
- `pnpm exec playwright test --config playwright-intercepted.config.ts e2e-intercepted/calendar-core.spec.ts --reporter=line`: 6 tests passed.

## Release gate

The core typed projection migration is complete and locally verified. A release that enables real Google Calendar or Outlook accounts still requires provider sandbox evidence followed by staging deployment evidence.

## Availability and booking foundation

Evidence recorded on 2026-10-13 for tickets 13 through 15.

| Evidence layer | Status | Evidence | Limit |
| --- | --- | --- | --- |
| Privacy-safe availability | Passed | Availability engine and service suites cover free, busy, tentative, unknown, timezone, DST, working hours, leave, buffers, permission limits, disconnected providers, truncation, and audience-safe diagnostics. | Provider freshness is exercised through source fixtures rather than live provider accounts. |
| Booking rules | Passed | Immutable rule versions, lifecycle transitions, public token hashing, secure public projection, slot policy, daily limits, buffers, and rule-bound availability passed focused tests and backend production/test typechecks. | Migration 2000 has source-gate evidence but has not been applied to a disposable or staging database in this workspace. |
| Durable holds | Passed locally; database execution blocked | The hold coordinator and validation suites pass. Migration 2001 defines durable hold and claim ledgers, tenant RLS, an active-claim exclusion constraint, idempotency identity, ordered target locks, fencing, atomic release, lazy expiry, and a batched expiry path. The real-database suite covers simultaneous last-unit claims, duplicate submission, expiry during confirmation, and worker rollback recovery. | The database runner refused to start because no explicitly approved disposable `DATABASE_URL` and `ALLOW_DESTRUCTIVE_DB_TESTS=1` were present. The race suite is test-typechecked but has not executed here. |
| Migration gates | New migrations clean | The discipline and rollback gates reported no violation for migrations 2000 or 2001. | Repository-wide gates still fail on pre-existing discipline findings in 1956, 1958, and 1993 and missing rollback files for 1981 and 1982. |

### Booking foundation commands

- Focused availability acceptance: 4 suites and 32 tests passed.
- Focused booking-rule acceptance: 4 suites and 13 tests passed.
- `pnpm test -- --runInBand ...calendar-booking-hold...`: 2 suites and 4 tests passed; the database suite is intentionally outside ordinary Jest.
- `pnpm run typecheck` and `pnpm run typecheck:test` in `backend`: passed after the hold implementation.
- `pnpm exec jest --config ./jest-db.json --runInBand --forceExit --testPathPattern=calendar-booking-hold.db.spec.ts`: refused before tests because no approved disposable database was configured.

## Idempotent booking commit

Evidence recorded on 2026-10-13 for ticket 16.

| Evidence layer | Status | Evidence | Limit |
| --- | --- | --- | --- |
| Commit coordinator | Passed | The confirmation coordinator re-resolves the live public rule, loads the owned hold, validates rule version and dynamic intake, rechecks policy, daily capacity, host availability, freshness and coverage, and returns safe alternatives for non-confirmation outcomes. | Provider and cross-module source reads are fixture-backed in this pass. |
| Transactional commit | Passed locally | The transaction rechecks the live rule token and expiry, current version, active host, hold state and fence, active constrained claims, fresh availability evidence, daily limit, existing booking, and host overlap. Idempotency and rule-day locks serialize competing requests. | The source evidence fingerprint records the exact freshness snapshot used by the decision; no claim is made that external providers share the local database transaction. |
| Durable receipts | Passed | Receipts support confirmed, rejected, expired, cancelled, pending, and uncertain outcomes and keep local, provider sync, and external effects states separate. Terminal failures release matching fenced claims; uncertain outcomes retain capacity for reconciliation. | Provider synchronization and downstream effects are implemented by later tickets. |
| Focused verification | Passed | Five suites and 15 tests passed. Backend production and test TypeScript configurations passed. No new code comments or diff whitespace errors were found. | The guarded real-database race suite did not execute because the environment has no explicitly approved disposable database. |
| Real persistence suite | Defined; execution blocked | The suite covers two confirmation keys racing one hold, timeout replay, rule or host drift, and independent local/provider/external states using PostgreSQL transactions and row locks. | The database guard refused execution before tests without `DATABASE_URL` and `ALLOW_DESTRUCTIVE_DB_TESTS=1`. |

## Versioned lifecycle events

Evidence recorded on 2026-10-13 for ticket 17.

| Evidence layer | Status | Evidence | Limit |
| --- | --- | --- | --- |
| Lifecycle contract | Passed | Confirmed, changed, rescheduled, cancelled, no-show, started, ended, failed, and repaired transitions emit versioned `calendar.booking.*` or `calendar.event.*` envelopes with stable effect identities. Native event creation, update, deletion, recurrence exceptions, and booking confirmation publish in their mutation transaction. | Later tickets own provider, invitation, workflow, webhook, and analytics consumers. |
| Consumer safety | Passed | Version classification distinguishes next, duplicate, stale, and gap delivery. Gap events remain replayable after reconciliation; applied event IDs and aggregate cursors provide duplicate and ordering control. | The reusable version decision is unit-tested; the persistence workflow is defined in a guarded PostgreSQL specification. |
| Privacy and deletion | Passed | Payloads carry tenant, aggregate identity, version, lifecycle state, occurrence identity, and time bounds without titles, descriptions, guest addresses, join data, or restricted record content. Deleted and restricted record cases use minimized tombstone-compatible payloads. | Downstream consumers must still reauthorize against current source ownership before reading record details. |
| Regression verification | Passed | The complete Calendar backend run passed 86 suites and 751 tests. Backend production and test TypeScript configurations passed. Focused stale-fixture regressions passed, diff whitespace passed, and no code comments were added in the ticket implementation files. | Expected warning and error logs come from provider failure-path tests. |
| Real persistence suite | Defined; execution blocked | The lifecycle database suite covers aggregate/outbox rollback, duplicate replay, out-of-order gap recovery, stale delivery, and same-aggregate tenant isolation. | The database guard refused execution before tests because no explicitly approved disposable `DATABASE_URL` and `ALLOW_DESTRUCTIVE_DB_TESTS=1` were configured. |
| Migration gates | New migration clean | Migration 2003 adds lifecycle state and monotonic version fields with backfill, checks, journal registration, and rollback. | Repository-wide checks still report older unrelated discipline findings in 1956, 1958, and 1993 and missing rollback files for 1981 and 1982. |

### Lifecycle commands

- `pnpm exec jest --runInBand --silent src/modules/calendar`: 86 suites and 751 tests passed.
- `pnpm run typecheck` and `pnpm run typecheck:test` in `backend`: passed.
- `pnpm test:db-specs --runTestsByPath src/modules/calendar/calendar-lifecycle-events.db.spec.ts`: refused before tests because no approved disposable database was configured.
- `pnpm run check:migration-discipline`: ticket migration clean; failed only on older migrations 1956, 1958, and 1993.
- `pnpm run check:migration-rollback`: ticket rollback clean; failed only on older migrations 1981 and 1982.

## Invitations, guest lifecycle, and reminders

Evidence recorded on 2026-10-13 for ticket 18.

| Evidence layer | Status | Evidence | Limit |
| --- | --- | --- | --- |
| Invitation identity and authorization | Passed | Required and optional internal attendees and external guests receive one current invitation per event occurrence and principal. Internal RSVP requires active organization identity; signed RSVP and join tokens are purpose scoped, expiring, hashed at rest, version bound, and rejected after recipient removal, organizer departure, email replacement, occurrence cancellation, or invitation supersession. | Token behavior is contract tested without delivering through a live email provider. |
| Reminder and delivery lifecycle | Passed | Reminder defaults, channel preferences, quiet-hour delay or skip, snooze, missed-delivery recovery, per-occurrence deduplication, retry, cancellation suppression, and final pre-dispatch version checks are implemented with durable delivery receipts. Concurrent preference, reschedule, cancellation, and delivery paths use conditional version updates and ordered locks. | Worker effects use notification and email outbox contracts; no deployed worker or live email delivery is claimed. |
| Event, booking, recurrence, and provider integration | Passed | Native event changes, recurrence exceptions, booking confirmation and lifecycle transitions, provider conference-link writeback, and legacy member RSVP all synchronize invitation state and lifecycle outbox records in the owning transaction. No-show is limited to an active organizer or booking host after the subject end time. | Real provider reconciliation is owned by ticket 19. |
| Public invitation experience | Passed | Public RSVP and join routes expose minimized invitation data. RSVP pages require an explicit response, join data is available only through a join-purpose token, invalid links hide subject details, and dynamic invitation routes do not request a user session or attach an authorization header. | Browser interaction is covered with component and transport tests rather than a deployed signed-link journey. |
| Regression verification | Passed | The complete backend Calendar run passed 91 suites and 766 tests. Backend production and test TypeScript configurations passed. The public page suite passed 3 tests; the transport suite passed 3 tests; the frontend specification TypeScript configuration passed. Diff whitespace passed and no code comments were added. | Expected warning and error logs originate from exercised provider failure paths. |
| Migration gates | New migration clean | Migration 2004 creates tenant-scoped invitation, signed-token, and delivery ledgers with RLS, uniqueness, checks, grants, journal registration, and rollback. | Repository-wide checks still report older unrelated migration discipline findings in 1956, 1958, and 1993, rollback omissions for 1981 and 1982, and six older timestamp regressions. |

### Invitation commands

- `pnpm test -- --runInBand src/modules/calendar`: 91 suites and 766 tests passed.
- `pnpm run typecheck` and `pnpm run typecheck:test` in `backend`: passed.
- `pnpm -C frontend test -- --runInBand lib/api-client-request.test.ts`: 1 suite and 3 tests passed.
- Public invitation page acceptance: 1 suite and 3 tests passed.
- `pnpm -C frontend run type-check:specs`: passed.
- Migration discipline, rollback, and chain gates found no issue in migration 2004; only the older repository findings listed above remain.

## Google and Outlook write reconciliation

Evidence recorded on 2026-10-13 for ticket 19.

| Evidence layer | Status | Evidence | Limit |
| --- | --- | --- | --- |
| Provider write contract | Passed | Google creates use a deterministic provider event ID; Outlook creates use a deterministic Graph transaction ID. Accepted-timeout retries converge on the same external identity. Updates and deletes carry provider version preconditions where a version exists. Unsupported recurrence or occurrence behavior fails visibly. | Provider calls are exercised through protocol-shaped test doubles rather than live accounts. |
| Reconciliation and repair | Passed | Duplicate deliveries use stable operation identities; provider versions and timestamps discard duplicate or older notifications; authentication failures require reconnect; provider conflicts require reload and review; conference creation remains pending until a link is returned; expired Google or Outlook continuation state restarts once from a clean first page. Personal and organization reconnects preserve or migrate local connection identity and resume authentication-blocked work. | The normalized webhook ingress assumes the configured upstream provider adapter supplies verified connection and delivery metadata. |
| Regression verification | Passed | The complete backend Calendar run passed 92 suites and 786 tests. The focused provider run passed 9 suites and 102 tests. Focused frontend provider status and contract tests passed 2 suites and 18 tests. Backend production and test TypeScript configurations, frontend production TypeScript, and frontend specification TypeScript passed. | Expected warning and error logs are assertions of failure and repair paths. |
| Migration gates | New migration clean | Migration 2005 adds provider version markers, semantic operation identity, typed failure reasons, uniqueness, indexes, journal registration, and rollback. | Repository-wide discipline, rollback, and chain gates still report only the older findings already listed for tickets 17 and 18. |
| Provider sandbox | Blocked | A complete journey matrix is defined by the ticket and implementation tests. | No authorized Google Calendar or Microsoft Outlook sandbox accounts or tokens are available in this workspace, so create, update, occurrence, cancellation, reconnect, timeout, and duplicate-delivery behavior has not been executed against either live provider. |

### Provider reconciliation commands

- `pnpm -C backend test -- --runInBand src/modules/calendar`: 92 suites and 786 tests passed.
- Focused provider and reconnect tests: 9 suites and 102 tests passed.
- Focused frontend provider status and contract tests: 2 suites and 18 tests passed.
- `pnpm -C backend typecheck` and `pnpm -C backend typecheck:test`: passed.
- `pnpm -C frontend type-check` and `pnpm -C frontend type-check:specs`: passed.
- Migration discipline, rollback, and chain gates found no issue in migration 2005; only the older repository findings listed above remain.

## Rooms and source-owned resources

Evidence recorded on 2026-10-13 for ticket 20.

| Evidence layer | Status | Evidence | Limit |
| --- | --- | --- | --- |
| Resource model and availability | Passed | Calendar-managed rooms, equipment, and generic resources have tenant-scoped identity, capacity, divisible units, location, accessibility, maintenance, approval, status, and optimistic versions. Immutable booking-rule versions bind their resource requirements. Public slot evaluation exposes only free, busy, or unknown state and safe reason codes. | Source ownership currently uses the HR asset adapter. Additional source modules must provide an owner adapter before their records can be registered. |
| Hold and commit safety | Passed | Resource units are claimed by the durable hold ledger beside the host claim. Commit revalidates live resource state while excluding its own claims from competing capacity. A rejected or uncertain resource cannot create a confirmed booking. Pending approval creates a pending booking and durable per-resource allocation receipt. | External resource owners do not share the local transaction; their decision is represented explicitly as pending until resolved. |
| Approval and failure lifecycle | Passed | An authenticated organization administrator can resolve a versioned allocation with an owner receipt. Approval rechecks maintenance, current source eligibility, claims, capacity, and the frozen rule requirement. The booking confirms only after every resource is committed and any separate rule approval is cleared. Rejection fails the booking, updates the commit receipt, releases other allocations and every hold claim, and emits the versioned lifecycle event. | The organization administrator is the current local approval authority for calendar rooms and HR assets. Delegated source-owner roles can be added through the same receipt contract. |
| Race and edge coverage | Passed locally; database execution blocked | Unit coverage verifies maintenance drift, location, accessibility, divisible capacity, own-claim handling, approval delay, source-owner versions, and partial multi-resource failure. The PostgreSQL suite defines simultaneous room and last-divisible-unit races using exclusion constraints. | The database runner refused execution because no explicitly approved disposable `DATABASE_URL` and `ALLOW_DESTRUCTIVE_DB_TESTS=1` were present. The suite is test-typechecked but no database race result is claimed. |
| Regression verification | Passed | Five focused suites passed 23 tests. The complete Calendar backend run passed 93 suites and 795 tests. Backend production and test TypeScript configurations and focused ESLint passed. Diff whitespace passed. | Prettier is not installed in the backend package, so formatting was enforced by the existing ESLint and TypeScript gates. |
| Migration and route gates | New work clean | Migration 2006 adds resource, maintenance, frozen requirement, and allocation tables with checks, tenant RLS, grants, indexes, journal registration, and rollback. The new route schemas resolve successfully. | Repository-wide gates still report older discipline findings in 1956, 1958, and 1993, missing rollback files for 1981 and 1982, six older journal timestamp regressions, and four unresolved Build approval schemas outside Calendar. |

### Resource commands

- `pnpm -C backend test -- --runInBand ...`: 5 focused suites and 23 tests passed.
- `pnpm -C backend test -- --runInBand src/modules/calendar`: 93 suites and 795 tests passed.
- `pnpm -C backend typecheck` and `pnpm -C backend typecheck:test`: passed.
- Focused Calendar resource ESLint: passed.
- `pnpm -C backend test:db-specs -- --runTestsByPath src/modules/calendar/calendar-booking-hold.db.spec.ts`: refused before tests because no approved disposable database was configured.
- Migration discipline, rollback, and chain gates found no issue in migration 2006; only the older repository findings listed above remain.

## Scheduling polls with expiring holds

Evidence recorded on 2026-10-13 for ticket 21.

| Evidence layer | Status | Evidence | Limit |
| --- | --- | --- | --- |
| Poll lifecycle and voting | Passed | Organizers can create versioned polls with required or optional internal members and signed external guests, vote until expiry, replace a guest identity, close early, cancel, or finalize. Guest tokens bind tenant, poll, voter, identity, version, purpose, and expiry; only hashes are stored. Vote upserts keep one current response per voter and option while preserving aggregate results after closure. | External voters use email identity and signed links; no live email delivery was exercised in this pass. |
| Holds and finalization | Passed | Optional capacity holds use the durable hold and resource-claim ledger and release on expiry, cancellation, or finalization. Finalization uses an optimistic claim, re-resolves the current rule, rechecks host and resource availability, enforces the daily limit, acquires a fresh hold, and commits one booking, invitation set, receipt, resource allocation set, option selection, and lifecycle event in one transaction. | Provider writes and downstream invitation delivery remain asynchronous effects owned by tickets 18 and 19. |
| Changed-state recovery | Passed | A stale finalizing lease reopens safely. Rule or availability lookup failures reopen the poll without discarding votes. A genuinely busy selected option is marked unavailable, votes stay visible, and current alternatives are returned. Departed required members stop finalization; departed optional members are omitted from the committed invitation. | Fresh alternatives are bounded to ten and inherit the current booking rule window. |
| Public experience | Passed | The signed public poll page shows minimized poll details, response controls, aggregate totals, and terminal status at responsive sizes. Invalid tokens reveal no subject details, and public poll routes neither request a session nor attach an authorization header. | This is component and transport proof rather than a deployed signed-link browser journey. |
| Regression verification | Passed | Three focused backend suites passed 10 tests; two focused frontend suites passed 7 tests. The complete backend Calendar run passed 96 suites and 805 tests. Backend production and test TypeScript, frontend production and specification TypeScript, and focused backend ESLint passed. | Expected warning and error logs originate from exercised provider failure paths. |
| Real persistence race suite | Defined; execution blocked | The PostgreSQL suite covers two simultaneous finalization claims, expired and cancelled claim refusal, and repeated vote upserts. | The database guard refused execution before tests because `ALLOW_DESTRUCTIVE_DB_TESTS=1` was absent. No database race result is claimed. |
| Migration and route gates | New work clean | Migration 2007 adds tenant-scoped poll, option, voter, and vote tables with uniqueness, checks, RLS, grants, indexes, journal registration, lock timeout, deferred foreign-key validation, and rollback. New Calendar route schemas resolve successfully. | Repository-wide gates still report older discipline findings in 1956, 1958, and 1993, rollback omissions for 1981 and 1982, six older timestamp regressions, and four unresolved Build approval schemas outside Calendar. |

### Scheduling poll commands

- `pnpm -C backend test -- --runInBand src/modules/calendar`: 96 suites and 805 tests passed.
- Focused scheduling poll backend acceptance: 3 suites and 10 tests passed.
- Focused public poll page and transport acceptance: 2 suites and 7 tests passed.
- `pnpm -C backend typecheck` and `pnpm -C backend typecheck:test`: passed.
- `pnpm -C frontend type-check` and `pnpm -C frontend type-check:specs`: passed.
- Focused scheduling poll backend ESLint: passed.
- `pnpm -C backend test:db-specs -- src/modules/calendar/calendar-scheduling-poll.db.spec.ts`: refused before tests because destructive database opt in was absent.
- Migration discipline, rollback, chain, and route schema gates found no Ticket 21 issue; only the older repository findings listed above remain.

## Deterministic team routing

Evidence recorded on 2026-10-13 for ticket 22.

| Evidence layer | Status | Evidence | Limit |
| --- | --- | --- | --- |
| Versioned rule and explanation contract | Passed | Tenant-scoped immutable versions freeze mode, fallback, collective size, CRM-owner preference, and host weights, priorities, territory, language, skill, and daily capacity. Authorized administrators, rule owners, and selected hosts can read private assignment evidence; other members receive a not-found response. Public booking receipts expose no private routing reasons. | Routing context is supplied through the booking contract. A later form-builder feature may map branded intake answers into this typed context. |
| Eligibility and deterministic selection | Passed | Routing excludes inactive, offboarded, archived, on-leave, busy, stale, permission-limited, disconnected, and over-limit hosts. It supports CRM-owner continuity, territory, skill, language, fair rotation, weighted rotation, least loaded, collective selection, primary-host fallback, next-eligible fallback, and safe no-match outcomes. Stable context and decision hashes bind the selected order and reasons to the hold. | Provider state is verified through normalized source fixtures rather than live Google or Outlook accounts. |
| Hold, commit, and fairness integrity | Passed | Every routed host receives a durable claim. Confirmation revalidates the exact routing version, normalized context, current host state, availability, daily limits, and decision hash under an organization, rule, and day advisory lock. The booking, assignment receipt, and fairness counters commit in one transaction. Idempotent retries reuse the original booking and do not increment fairness again. | External provider calendars do not share the local database transaction; provider synchronization remains asynchronous. |
| Race and edge coverage | Passed locally; database execution blocked | Unit coverage verifies fairness ordering, CRM owner, territory, skill, language, collective minimums, fallbacks, ineligible-host filters, context identity, decision ordering, and private evidence authorization. The PostgreSQL suite defines concurrent fair assignment and duplicate replay checks. | The database runner refused execution because no explicitly approved disposable `DATABASE_URL` and `ALLOW_DESTRUCTIVE_DB_TESTS=1` were present. No real-database race result is claimed. |
| Regression verification | Passed | Eight focused suites passed 31 tests. The complete Calendar backend run passed 99 suites and 821 tests. Backend production and test TypeScript configurations, focused ESLint, and diff whitespace passed. | Expected warning and error logs originate from exercised provider failure and repair paths. |
| Migration and route gates | New work clean | Migration 2008 adds routing rules, immutable versions, host constraints, fairness state, assignment receipts, hold decision metadata, tenant RLS, grants, indexes, lock timeout, deferred foreign-key validation, journal registration, and rollback. | Repository-wide gates still report older discipline findings in 1956, 1958, and 1993, rollback omissions for 1981 and 1982, six older timestamp regressions, and four unresolved Build approval schemas outside Calendar. |

### Team routing commands

- `pnpm -C backend test -- --runInBand src/modules/calendar`: 99 suites and 821 tests passed.
- Focused routing, authorization, DTO, availability, hold, and commit acceptance: 8 suites and 31 tests passed.
- `pnpm -C backend typecheck` and `pnpm -C backend typecheck:test`: passed.
- Focused Ticket 22 backend ESLint: passed.
- `pnpm -C backend test:db-specs -- src/modules/calendar/calendar-team-routing.db.spec.ts`: refused before tests because destructive database opt in was absent.
- Migration discipline, rollback, chain, parameterization, and route schema gates found no Ticket 22 issue; only the older repository findings listed above remain.

## Secure branded and embedded booking

Evidence recorded on 2026-10-13 for ticket 23.

| Evidence layer | Status | Evidence | Limit |
| --- | --- | --- | --- |
| Branded public journey | Passed | The public route renders versioned branding, locale copy, configured intake fields, consent, available slots, terminal receipts, and a safe unavailable state. The focused journey passed four tests, including an automated accessibility scan and an end-to-end mocked hold, confirm, and callback flow. | Provider writes and email delivery remain asynchronous responsibilities of earlier Calendar tickets. |
| Embed and callback security | Passed | Embed access links bind one exact approved origin. Embed sessions require caller state, hash it, and receive a signed token bound to session hash, origin, state hash, and a 24-hour expiry. The callback verifies that signature and returns only the facts approved by the frozen distribution version. | A deployed third-party embedding site was not available in this workspace. |
| Link, session, and abuse lifecycle | Passed | Access tokens and session tokens are stored only as hashes. Expiry, revocation, single-use consumption, 24-hour session expiry, completion-time limits, attempt limits, consent, honeypot persistence, and public read/write/session rate limits are enforced server side. Public failures use non-enumerating responses. | Operational counts are available to authorized rule managers; alert routing is owned by later observability work. |
| Idempotency and attribution | Passed locally; database execution blocked | Conversion rows are unique per booking and per session. Booking conversion, session completion, and single-use link consumption share the booking transaction, so refresh, retry, embed callback, and reschedule do not create a second conversion for the same booking. The PostgreSQL suite defines simultaneous single-use consumption, duplicate retry, and expired-link cases. | The database runner refused execution because no explicitly approved disposable `DATABASE_URL` and `ALLOW_DESTRUCTIVE_DB_TESTS=1` were present. No real-database race result is claimed. |
| Regression verification | Passed | Six focused backend suites passed 22 tests, the frontend public journey passed 4 tests, and the complete backend Calendar run passed 103 suites and 838 tests. Backend and frontend production TypeScript, frontend specification TypeScript, backend test TypeScript, focused ESLint, and diff whitespace passed during the ticket pass. | The final repeated spec-compilation run was stopped after extended no-output memory contention; focused Jest compilation and the earlier successful spec compilers cover the unchanged contracts. |
| Migration and architecture gates | New work clean | Migration 2009 adds identity keys, tenant RLS, grants, exact origin checks, expiry and foreign-key indexes, journal registration, lock timeout, rollback, and conversion uniqueness. Ticket 23 services and frontend components remain below 300 lines. Tenant-index, retention, and OpenAPI path gates passed. | Repository-wide gates still report older migration findings in 1956, 1958, and 1993, rollback omissions for 1981 and 1982, six older timestamp regressions, and unrelated Build/module baseline debt. |

### Secure booking commands

- `pnpm -C backend test -- --runInBand src/modules/calendar`: 103 suites and 838 tests passed.
- Focused secure distribution, embed, DTO, hold, and commit acceptance: 6 suites and 22 tests passed.
- Focused public booking journey and automated accessibility acceptance: 1 suite and 4 tests passed.
- `pnpm -C backend typecheck`, `pnpm -C backend typecheck:test`, `pnpm -C frontend type-check`, and `pnpm -C frontend type-check:specs`: passed during the ticket pass.
- Focused Ticket 23 backend and frontend ESLint: passed.
- `pnpm -C backend test:db-specs -- src/modules/calendar/calendar-booking-public-access.db.spec.ts`: refused before tests because destructive database opt in was absent.
- Migration discipline, rollback, chain, route, retention, and tenant gates found no Ticket 23 issue; only the older repository findings listed above remain.

## Paid appointment reconciliation

Evidence recorded on 2026-10-13 for ticket 24.

| Evidence layer | Status | Evidence | Limit |
| --- | --- | --- | --- |
| Durable payment and booking identity | Passed | A tenant-scoped saga binds the public session, hold, immutable booking rule, frozen payment policy, idempotency identity, provider order and payment identities, booking identity, and optimistic version. Payment, booking, refund, chargeback, and repair states remain independently visible through public and managed response schemas. | Provider effects cannot share the local database transaction, so uncertain remote outcomes remain explicitly queued for reconciliation. |
| Duplicate and uncertain-effect safety | Passed locally; database execution blocked | A durable operation ledger claims order creation, capture, and refund effects once. Lost order responses enter `order_unknown`; capture timeouts enter `reconcile_payment`; neither path repeats an uncertain provider effect. The guarded PostgreSQL suite defines concurrent duplicate submit and booking-race cases. | The database runner refused execution because no explicitly approved disposable `DATABASE_URL` and `ALLOW_DESTRUCTIVE_DB_TESTS=1` were present. No real-database race result is claimed. |
| Booking failure, cancellation, and refund | Passed | Booking commit occurs only after authoritative capture. A booking race or commit failure preserves the captured amount and enters `refund_required`. Cancellation uses the frozen notice and late-refund policy, supports partial and full refunds, keeps provider refund identity, and exposes repair failures for retry. | Refund completion remains subject to the configured payment provider and its external settlement lifecycle. |
| Provider reconciliation and chargeback | Passed | A bounded tenant sweep retries due reconciliation and refund work. Verified, deduplicated provider webhooks update matching sagas in the webhook transaction, validate order, amount, and currency before capture, quarantine mismatches, record authoritative refunds and failures, and keep bounded chargebacks separate from booking state. | Live provider sandbox credentials and webhook delivery were unavailable, so provider validation is based on adapter contracts and deterministic tests. |
| Public paid-booking journey | Passed | The booking session exposes the configured amount and currency, the page creates the provider order, invokes the existing secure Razorpay checkout helper, confirms through the saga endpoint, and renders payment, booking, and repair state separately. A refunded booking race is never rendered as confirmed. | This is component and transport proof rather than a deployed third-party checkout journey. |
| Regression verification | Passed | Four focused backend suites passed 16 tests, the focused frontend page suite passed 6 tests, and the complete backend Calendar run passed 106 suites and 852 tests. Backend production and test TypeScript, frontend production and specification TypeScript, focused backend and frontend ESLint, diff whitespace, tenant-index, route, migration, and file-size checks passed for Ticket 24. | Repository-wide gates retain older unrelated migration, module, route-schema, and file-size debt recorded in earlier evidence. |

### Paid appointment commands

- `pnpm -C backend test -- --runInBand src/modules/calendar`: 106 suites and 852 tests passed.
- Focused provider, coordinator, webhook, and Razorpay acceptance: 4 suites and 16 tests passed.
- Focused public paid-booking journey: 1 suite and 6 tests passed.
- `pnpm -C backend typecheck`, `pnpm -C backend typecheck:test`, `pnpm -C frontend type-check`, and `pnpm -C frontend type-check:specs`: passed during the ticket pass.
- Focused Ticket 24 backend and frontend ESLint: passed.
- `pnpm -C backend test:db-specs -- src/modules/calendar/calendar-booking-payment.db.spec.ts`: refused before tests because no approved disposable database and destructive opt in were configured.
- Ticket 24 migration discipline, rollback, chain, tenant-index, sweep-budget, route, and architecture checks passed; only the older repository findings recorded above remain.

## Calendar workflow automation

Implementation recorded on 2026-10-13 for ticket 25. Validation is intentionally deferred while the local server and toolchain are being repaired.

| Evidence layer | Status | Evidence | Limit |
| --- | --- | --- | --- |
| Lifecycle trigger planning | Implemented; validation deferred | The shared outbox consumer maps booking and event creation, change, reschedule, cancellation, no-show, start, end, failure, repair, and source-state changes into versioned rule plans. Stable effect identity prevents duplicate creation while allowing different aggregate versions to be processed out of order. | The new focused suites have not been run in this pass. |
| Execution policy and consent | Implemented; validation deferred | Every pending effect rechecks the current tenant policy, exact policy and rule versions, active recipients, allowed channels, daily limits, notification preferences, quiet hours, and SMS or WhatsApp consent before the notification pipeline delivers it. Dry-run effects remain terminal and send nothing. | Delivery-provider and live channel evidence remains deferred. |
| Retry and repair | Implemented; validation deferred | Effects use optimistic versions, leases, bounded exponential retry, dead-letter state, stable downstream dedupe, version-fenced replay, and explicit suppression reasons. A bounded tenant sweep is exposed through the leased Calendar cron route. | Cron execution and persistence races have not been run in this pass. |
| Operator surface | Implemented; validation deferred | Calendar Settings now manages enablement, dry run, channel and volume limits, rule creation and activation, event-payload previews, recent effect status, error context, and replay. Runtime response contracts reject unknown states and channels. | Browser and responsive layout checks are deferred. |
| Persistence architecture | Implemented; validation deferred | Migration 2011 defines tenant-leading indexes, uniqueness, checks, RLS, grants, journal registration, and rollback for workflow policy, rules, and effects. A guarded database suite covers duplicate producer events, out-of-order aggregate versions, and replay fencing. | Migration and database suites have not been executed in this pass. |

## Scheduling APIs and webhooks

Implementation recorded on 2026-10-13 for ticket 26. Validation is intentionally deferred while the local server and toolchain are being repaired.

| Evidence layer | Status | Evidence | Limit |
| --- | --- | --- | --- |
| Authentication and least privilege | Implemented; validation deferred | Administrators mint one-time, expiring Calendar credentials with documented scopes. The versioned controller is public only to the global JWT guard, then requires API key authentication, exact route scopes, Calendar entitlement, and a per-credential rate budget. Unknown route scope configurations fail closed. | Guard and metadata suites are present but have not been run in this pass. |
| Tenant and write safety | Implemented; validation deferred | Booking reads and lifecycle writes carry credential-derived tenant filters. Creation binds the booking token to the same tenant and checks the requested rule version before acquiring capacity. API key writes use credential-specific idempotency principals, and lifecycle changes require current versions. | Database and concurrent request behavior remains unexecuted in this pass. |
| Webhook delivery contract | Implemented; validation deferred | Calendar lifecycle outbox events fan out through a durable effect ledger into minimized payloads. Each delivery reuses one UUID, dated API version, timestamp, raw body, and HMAC across automatic retries; logs retain the identity and dead-letter state, while operator replay creates a new delivery. | No live subscriber or network retry was exercised. |
| Replay and failure refusal | Implemented; validation deferred | Receiver helpers enforce strict envelopes, header and body agreement, constant-time signatures, bounded clock skew, and an atomic delivery claim. Source cases cover malformed JSON, invalid signature, tampering, stale or future timestamps, duplicate claims, revoked credentials, missing scopes, tenant mismatch, stale versions, and rate refusal. | The focused suites have not been executed during the server outage. |
| Developer and operator surfaces | Implemented; validation deferred | Calendar Settings exposes paginated credential management with one-time secret handling, and webhook setup now lists every published Calendar lifecycle and source event. The developer document covers pagination, scopes, idempotency, errors, retry, replay, deletion, compatibility, and deprecation. | Browser, responsive, accessibility, and generated OpenAPI inspection remain deferred. |
| Persistence architecture | Implemented; validation deferred | Migration 2012 backfills delivery identities and legacy versions, makes both mandatory, adds tenant-scoped replay uniqueness, includes post-checks, is registered in the migration journal, and has a rollback. | Migration apply and rollback have not been run in this pass. |

## Booking analytics and administrative controls

Implementation recorded on 2026-10-13 for ticket 27. Validation is intentionally deferred while the local server and toolchain are being repaired.

| Evidence layer | Status | Evidence | Limit |
| --- | --- | --- | --- |
| Authoritative metric facts | Implemented; validation deferred | A fan-out consumer records minimized lifecycle facts with tenant-scoped producer-event and aggregate-version uniqueness. Booking cohorts start at version 1, latest versions determine period-end state, and late or corrective versions remain visible without consulting mutable projection rows. | The consumer, SQL rollup, and migration have not been executed in this pass. |
| Definitions and source coverage | Implemented; validation deferred | The report exposes organization timezone, effective retention boundary, numerator, denominator, deduplication, correction, deleted-record, and late-event definitions. Source reads publish coverage only on change or a bounded heartbeat; reports separate missing, partial, and failed sources. | Live multi-source failure and recovery have not been exercised. |
| Privacy | Implemented; validation deferred | Facts omit titles, descriptions, attendees, guests, intake, host identities, HR fields, and Finance values. Cohorts below the configurable threshold suppress every numeric metric and the latest booking-event timestamp. | Inference resistance has source tests but no browser or deployed access test in this pass. |
| Enforced governance | Implemented; validation deferred | Tenant policy controls booking availability, domains, link expiry and volume, abuse limits, provider writes, exports, retention, timezone, and privacy. Link revocation and policy changes write transactional audit records; provider workers and public confirmation paths recheck current policy at execution time. Existing workflow policy continues to own automation ceilings. | Provider, export, and public booking runtime paths have not been executed while the server is unavailable. |
| Retention and operator surface | Implemented; validation deferred | Ingestion rejects facts outside retention, reports truncate requested periods visibly, policy reduction deletes expired facts immediately, and a leased tenant sweep performs ongoing deletion. Calendar Settings presents governance, emergency access-link revocation, metric cards, coverage, freshness, privacy state, and methodology. | Scheduled execution, responsive layout, and accessibility validation are deferred. |
| Edge coverage | Implemented; validation deferred | Focused source cases cover late events, stable duplicate identities, out-of-order versions, failed sources, changed routing, deleted-record minimization, and small-cohort suppression. Migration 2013 adds RLS, grants, tenant-leading indexes, policy checks, source-coverage state, rollback, and post-checks. | No test or migration command was run after the user requested that validation pause. |
