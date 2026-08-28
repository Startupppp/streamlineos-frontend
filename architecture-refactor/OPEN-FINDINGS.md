# Open findings — carried out of the lane and session request files

Those files were coordination scratch for sessions that have all finished, so they are deleted. What
survived deletion is below.

**Every item was re-verified against the code and the migrated database on 2026-08-28** (c28 Session 4,
ticket 15). Nothing here is carried on trust and nothing here has an unknown status. Three items that the
2026-08-27 pass recorded as open had in fact already been fixed, and one of its stated facts was wrong;
both corrections are recorded in place rather than quietly dropped.

Status vocabulary: **FIXED** · **RESOLVED BY DECISION** · **OPERATOR ACTION** · **OPEN — DEFERRED**.

---

## 1. `provider_webhook_events` uniqueness is global, so one tenant can swallow another's webhook

**FIXED 2026-08-27.** Migration `0605_provider_webhook_events_tenant_scoped_unique.sql` drops the
global `(provider, provider_event_id)` index and replaces it with a composite
`(org_id, provider, provider_event_id)` index. The Drizzle schema in
`db/schema/billing/provider-webhook-events.ts` is updated to match. The `claim()` conflict target
in `ProviderEventLedger` now includes `orgId` as the leading column. The `FOREIGN` branch in
`claim()` is retained as dead code (with a comment) because removing it would break the existing
`billing-webhook.spec.ts` test that asserts handler behaviour under that code path; in production
the new composite index makes it unreachable. A new `provider-event-ledger.spec.ts` proves the four
`claim()` outcomes and verifies that two different orgs can each claim the same `(provider, event_id)`
without blocking each other.

## 2. `verifyPaymentSchema` carries no billing cycle

**FIXED 2026-08-27, backend `0a10ae3e`.**

**Commit-history note:** this fix landed inside `0a10ae3e`, whose message describes only the
`provider_webhook_events` change. Two agents were editing `modules/billing` concurrently and a
`git add -A src` swept both into one commit — the shared-index hazard. The content is correct and
tested; the message is incomplete, and this is the pointer.

**One number in the original report was wrong and the tests were not.** The report gave the STARTER
annual figure as 958,464 paise / `"9584.64"`. The correct value is
`Math.round(99900 × 12 × 0.8)` = **959,040 paise / `"9590.40"`**. The specs derive it from
`PLAN_PRICES_PAISE` and `ANNUAL_DISCOUNT_PCT` rather than hard-coding a literal, so they were right
throughout — the slip was in prose.

`billing.schemas.ts` now carries `billingCycle: billingCycleSchema.optional()`.
`verifyAndActivate` uses `planBaseAmountPaise(plan, cycle, ANNUAL_DISCOUNT_PCT)` for the recorded
amount, advances `currentPeriodEnd` by 12 months for `annual` and 1 month for `monthly`, and
populates `coupon_redemptions.amount` from the server-computed discount. Absent cycle defaults to
`"monthly"`, preserving existing client behaviour.

## 3. `vault_access_logs` cannot record a deletion, and has no tenant column

**FIXED 2026-08-28.** Migration `0607_vault_access_logs_survive_document_deletion.sql`, journalled at
`idx` 328 and applied.

**One third of the 2026-08-27 diagnosis was already stale.** It said the table has "no `org_id` column,
so it is outside the RLS sweep entirely". Checked against `pg_catalog` before any code was written:
`org_id` was already there, NOT NULL, with an `organizations` FK, a composite `(org_id, id)` unique key,
a `tenant_isolation` policy (`org_id = current_org_id()`) and a `trg_set_org_id` BEFORE INSERT trigger —
all added by `0591_tenant_isolation_for_unprotected_tables.sql`. The table was inside the RLS sweep the
whole time. What was genuinely broken was the other two thirds, plus schema drift nobody had recorded:
the Drizzle model did not declare `org_id` at all, so `db:generate` would have proposed dropping it.

What changed, as one migration because none of it works alone:

- `vault_document_id` is nullable with `ON DELETE SET NULL` on **both** foreign keys. The composite
  tenant FK uses the PostgreSQL 15+ column-list form `ON DELETE SET NULL ("vault_document_id")`, because
  the plain form would null `org_id` too and the delete would fail instead of preserving the audit row.
- `candidate_id` (NOT NULL, cascade FK plus a composite tenant FK) is the reader's new anchor. The reader
  used to reach the candidate by inner-joining the document — exactly the row that disappears.
- `filename` and `document_type` are denormalised onto the log, so a line still says what was deleted.
- `chk_vault_access_logs_action` restricts the vocabulary to `VIEW` / `DOWNLOAD` / `DELETE`.
- `idx_vault_access_logs_org_candidate_accessed` on `(org_id, candidate_id, accessed_at DESC)` — the
  reader's new predicate, with `org_id` leading because RLS adds it.
- `RecruitmentCandidateVaultService.deleteVaultDocument` now writes the `DELETE` row inside the same
  transaction as the delete, and `listVaultAccessLogs` filters on the log's own columns.

Evidence: a `pg_catalog` diff confirms every statement landed, and a rolled-back probe inserted a
document plus its audit row, deleted the document, and observed the audit row surviving with
`vault_document_id = NULL` and its filename intact. `recruitment-candidate-vault.spec.ts` covers it,
12 tests.

**Left to another owner:** the controller still calls `deleteVaultDocument(orgId, candidateId,
documentId)` without the actor. `modules/hr/recruitment/recruitment-candidate-records.{controller,service}.ts`
belong to c28 Session 2, so the actor is currently resolved from the ambient
`ObservabilityContext.actorId` (set by the first global `APP_INTERCEPTOR`, so it is always present on an
authenticated request) and the delete refuses outright if no actor can be identified. Passing it
explicitly is a two-line change recorded in `c28-cell-based-platform-at-20m/sessions/CROSS-SESSION.md`.

## 4. `streamline_app`'s password is repaired in `.env`, not in Neon

**OPERATOR ACTION — not attempted, deliberately. Confirmed still outstanding 2026-08-28.**

`APP_DATABASE_URL` was fixed with `ALTER ROLE … WITH PASSWORD`. **Neon's control plane restores the
previous password when the branch suspends**, so this repair is temporary and no code change can hold it.

- **Why not attempted:** `ALTER ROLE` does not stick; re-running it would recreate the same illusion.
- **What would close it:** an operator setting the `streamline_app` password in the Neon console, then
  updating `APP_DATABASE_URL` in every deployment environment.
- **How to tell it has regressed:** `APP_DATABASE_URL` connections fail authentication after a branch
  suspend. As of 2026-08-28 the credential still works — verified by connecting and reading
  `current_user`, which returned `streamline_app` with `rolbypassrls = false`.

## 5. `db:verify-rls` and the constitution contradict each other

**RESOLVED BY DECISION 2026-08-28 —** [`adr/0001-force-row-level-security-is-advisory.md`](adr/0001-force-row-level-security-is-advisory.md).

Missing policies were at 0 while the verifier reported 907 failures, all
`FORCE ROW LEVEL SECURITY … RLS is enabled but not forced`, against a `backend/CLAUDE.md` §4 rule that
says never blanket-force.

**A stated fact in the previous entry was wrong.** It claimed "the application connects as
`neondb_owner`, whose `BYPASSRLS` overrides `FORCE`". It does not: `APP_DATABASE_URL` connects as
`streamline_app` with `rolbypassrls = false`, verified against the live database. Only the migration
role is `neondb_owner`. The conclusion survives the correction and is strengthened by it — FORCE binds
only the table owner, and the request path is already policy-bound.

The verifier's check #3 is now an advisory that enumerates the affected tables but never increments the
failure count or changes the exit code; §4 is unchanged. `pnpm db:verify-rls` against the live database
now prints `RESULT: RLS VERIFIED` with 907 advisories. The escalation condition is written into the ADR:
if a table-owner connection ever enters the request path, this returns to a hard failure.

## 6a. `DashboardLeaveService.getPendingApprovals` counts resignations org-wide regardless of scope

**FIXED 2026-08-28.**

`getPendingApprovals` resolved a DataScope and applied it to the leave-request count via
`leaveApprovalScope`, but the resignation count beside it filtered only on `orgId` and `status`. An
approver scoped to `own` or `team` received the organization-wide pending-resignation count. The leak was
silent because the cache key already varied by scope, so only the number inside was wrong.

The 2026-08-27 entry called this "not a trivial predicate swap" because `resignations` has no
pre-assignment approver column. That is true, but the platform already answers the question elsewhere:
`LeaveApproverService.resolve` derives the approver as the subject's `users.reportingTo` first, falling
back to permission holders, and that is what populates `leaveRequests.approverId` in the common case. So
the semantics were discoverable rather than guessable.

`modules/dashboard/resignation-approval-scope.ts` mirrors `leaveApprovalScope` exactly: `all` → `true`;
`own` → the subject reports to the actor; `team` → that, and the subject is the actor or a teammate via
`applyScope`; `none` → `false`. `resignation-approval-scope.spec.ts` asserts each arm's generated SQL
through `PgDialect.sqlToQuery` and asserts the predicate actually reaches the count query, 9 tests.

**Known limitation, inherited not introduced:** `users.reportingTo` is a column on the global user, which
is c28's mistake #1. An approver who holds `hr:leaves:approve` at `team` scope but is not the subject's
reporting manager now counts 0 rather than the whole organization. That is the correct direction — it
under-reports instead of leaking — and it moves with the rest when c28 tickets 09–14 migrate employment
truth onto `hr_reporting_lines`.

## 6. Smaller items

- **`verify-permission-catalog.mjs` is redundant** — **STRUCK 2026-08-28. It does not exist.** Verified
  by a repository-wide filename search: the file is absent, and `backend/package.json:43` already points
  `verify:permissions` at the canonical `src/scripts/check-permission-keys.mjs`. Do not go looking for it.
- **`recurring-journals.controller.ts` holds its list schema inline** — **STRUCK 2026-08-28. Already
  resolved.** `modules/accounting/gl/recurring-journals.controller.ts` imports
  `createRecurringJournalSchema`, `listRecurringJournalsQuerySchema` and `updateRecurringJournalSchema`
  from `./dto/recurring-journals.schemas`. No inline schema remains.
- **`unregistered-injectables.mjs` can be promoted to a spec** — **FIXED 2026-08-28.**
  `backend/src/unregistered-injectables.spec.ts` now runs the same detection in the default jest suite,
  beside `app-route-uniqueness.spec.ts`. Three tests: an anti-vacuous guard asserting the walk finds more
  than 200 injectables (a broken walk that maps nothing would otherwise pass), the zero-orphans
  assertion, and a synthetic-fixture case proving the detector reports an orphan when one exists. The
  `.mjs` script is retained. 3 passed.
- **29 hand-rolled page fields remain** — **FIXED 2026-08-28, and the count was stale.** A re-scan found
  **11**, not 29: 20 had already migrated. Nine exceeded the 100/page platform cap (`csat` 500,
  `party` 500, `issues` 400 ×2, `data-quality` 400 and 200, `hr/interviews` 200 ×2, `tasks` 200) and two
  were hand-rolled discrete-value lists (`delegations`, `rbac`). **Product ruling: all nine come down to
  the platform cap.** All 11 now use `pageSizeField` / `optionalPageSizeField`, which clamps rather than
  rejects, so a caller that asks for 500 still gets a page — of 100. Four spec files asserted the old
  reject-over-cap behaviour and were updated to assert the clamp instead, not deleted. `MAX_BULK`
  (data-quality) and `MAX_PAGE` (issues) survive as **bulk-operation** bounds, which are not page sizes.
  The four AI copilot tool-argument limits and `e-sign`'s `pageNumber` are not page fields and were left
  alone.
- **`INVITE_EXPIRED` is never written to the seat ledger** — **OPEN — DEFERRED 2026-08-28.** Re-verified:
  `SEAT_EVENT_DELTAS.INVITE_EXPIRED` is declared in `modules/billing/core/seat-definition.ts` and
  asserted by `seat-ledger.service.spec.ts`, but nothing emits it. Expiry is evaluated by predicate
  (`expires_at > NOW()` inside `seatCount()`), so **the seat maths is correct and no customer is
  over- or under-charged** — the only loss is a missing audit event.
  - **Why deferred:** closing it means introducing a scheduled expiry sweep, which is a new background
    job with its own tenant-context, idempotency and partitioning obligations. That is a ticket, not a
    finding, and inventing one here would be scope this session does not own.
  - **What would close it:** an expiry sweep that iterates orgs with `forEachOrg`, transitions expired
    `PENDING` invitations to a terminal state, and emits one `INVITE_EXPIRED` seat event per transition,
    idempotently.

---

## Already fixed — recorded so nobody re-raises them

Every one of these was open in the request files and is now closed, verified 2026-08-27:

| Was | Now |
|---|---|
| `VersionedCatalogService` in no module | registered; `unregistered-injectables` reports 0 |
| 107 routes undeclared | **0** — `check:route-classification` says ALL ROUTES CLASSIFIED |
| `LeavesService.analytics` ignores DataScope | `queryAnalytics(orgId, userId, scope, year)` takes it |
| `0478`, `0482`, `0488`, `0543`, `0544`, `0575` un-journalled | all journalled and applied |
| `0490`, `0474` unapplied, paths 500ing | applied |
| CRM and accounting core tables missing | 47 recreated from the baseline |
| 5 suites failing on `CacheService` doubles | green |
| 3 suites failing on the 100/page cap | green |
| `audit_logs` CHECK absent from the schema | declared during the c23-05 split |

---

## Where the deleted detail went

`lane-requests/` (9 files), `sessions/` (6) and `BATCHES.md` were deleted after this consolidation.
They were coordination scratch for sessions that have all finished, and `BATCHES.md` had become
actively misleading — it still said *"Nothing has touched the database"*.

Two of them carried long inventories that are **not** reproduced above because their tickets are
closed and the lists are regenerable:

- the 123 files calling `.offset()` outside Lane 3's territory (c13-03, closed)
- the 178 local pagination-schema copies across 119 files (c13-06 — closed by ticket 15; see §6)

Both are recoverable in full: `git show 896c4b847:architecture-refactor/lane-requests/s4.md`.
