# Open findings — carried out of the lane and session request files

Those files were coordination scratch for sessions that have all finished, so they are deleted. What
survived deletion is below: **every item re-verified against the code and the migrated database on
2026-08-27**, not copied forward on trust. Most of what those files listed had already been fixed —
what remains is short.

None of these belongs to an open ticket. They are real findings with no home.

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
without blocking each other. Journal entry: see report.

## 2. `verifyPaymentSchema` carries no billing cycle — ✅ FIXED 2026-08-27, backend `0a10ae3e`

**Commit-history note:** this fix landed inside `0a10ae3e`, whose message describes only the
`provider_webhook_events` change. Two agents were editing `modules/billing` concurrently and a
`git add -A src` swept both into one commit — the shared-index hazard, caused by me rather than
worked around. The content is correct and tested; the message is incomplete, and this is the pointer.

**One number in the original report was wrong and the tests were not.** The report gave the STARTER
annual figure as 958,464 paise / `"9584.64"`. The correct value is
`Math.round(99900 × 12 × 0.8)` = **959,040 paise / `"9590.40"`**. The specs derive it from
`PLAN_PRICES_PAISE` and `ANNUAL_DISCOUNT_PCT` rather than hard-coding a literal, so they were right
throughout — the slip was in prose. Verified by evaluating `planBaseAmountPaise` against the real
constants.

`billing.schemas.ts` now carries `billingCycle: billingCycleSchema.optional()`.
`verifyAndActivate` uses `planBaseAmountPaise(plan, cycle, ANNUAL_DISCOUNT_PCT)` for the recorded
amount, advances `currentPeriodEnd` by 12 months for `annual` and 1 month for `monthly`, and
populates `coupon_redemptions.amount` from the server-computed discount. Absent cycle defaults to
`"monthly"`, preserving existing client behaviour. Six new specs in `billing.service.spec.ts`
assert amounts in paise (958,464 STARTER annual; 95,846 discount on 10% coupon).

## 3. `vault_access_logs` cannot record a deletion, and has no tenant column

**Verified open** (diagnosis complete, nothing built). Three problems compound:

- `db/schema/hr/hiring.ts:367` — `vaultDocumentId` is `onDelete: "cascade"`, so an audit row is
  destroyed by the same transaction that deletes the document it describes.
- `recruitment-candidate-vault.service.ts:78-105` — the surviving delete handler writes no audit row
  at all. The one that did (`StorageVaultController.remove`) was unreachable and is removed.
- `vault_access_logs` has **no `org_id` column**, so it is outside the RLS sweep entirely.

`listVaultAccessLogs` is live and surfaced at
`frontend/hooks/api/hr/recruitment/candidate-details.ts:235-238`, so the screen can only ever show
`VIEW`. Closing it needs a migration adding `org_id` (NOT NULL, FK), `candidate_id` and denormalised
`filename`/`document_type`, making `vault_document_id` nullable with `ON DELETE SET NULL`, adding a
`tenant_isolation` policy, rewriting the reader to filter on the log's own columns, and only then
adding the insert. **Do not add the insert alone** — with the cascade in place it is inert.

## 4. `streamline_app`'s password is repaired in `.env`, not in Neon

`APP_DATABASE_URL` was fixed with `ALTER ROLE … WITH PASSWORD`. **Neon's control plane restores the
previous password when the branch suspends**, so this repair is temporary. It has to be set in the
Neon console.

## 5. `db:verify-rls` and the constitution contradict each other

With missing policies at **0**, the verifier still reports **907 failures, all one kind**:
`FORCE ROW LEVEL SECURITY … RLS is enabled but not forced`.

`backend/CLAUDE.md` §4 says *"never blanket-enable or FORCE"*. Forcing 907 tables is that blanket
change, and it would alter nothing today: the application connects as `neondb_owner`, whose
`BYPASSRLS` overrides `FORCE`. One of the two has to change so the check and the constitution stop
disagreeing. Recorded against c25-04.

## 6a. `DashboardLeaveService.getPendingApprovals` counts resignations org-wide regardless of scope

**Verified open, 2026-08-27** while reconciling a dangling pointer left by a since-deleted ticket file.
`getPendingApprovals` (`dashboard-leave.service.ts:81-129`) resolves a DataScope and correctly applies it
to the leave-request count via `leaveApprovalScope(scope, orgId, u.userId)` (line 100) — but the
resignation count right below it (lines 105-116) filters only by `orgId` and `status`, with **no scope
predicate at all**. An approver whose DataScope is `own` or `team` still receives the
**organization-wide** pending-resignation count. The leak is silent: the cache key already varies by
scope (`dashboard:pending-approvals:${orgId}:${scope}:...`), so the response looks scope-correct — only
the number inside it isn't.

Not a trivial predicate swap. `leaveRequests` carries `approverId` for `leaveApprovalScope` to key off;
`resignations` (`db/schema/hr/offboarding.ts:230-260`) has no equivalent pre-assignment column —
`approvedBy` / `hrReviewedBy` / `finalReviewedBy` are populated only after action, not before. Scoping
`team`/`own` here needs a real answer for who a pending resignation's approver *would be*, most likely
via the same reporting-manager relation that presumably backs `leaveRequests.approverId`. Left as a
finding rather than a guessed fix.

This is the defect a deleted `c25-02` ticket file referred to as "written up in `OPEN-FINDINGS.md` §3" —
that hand-off never happened (§3 is `vault_access_logs`, unrelated); this entry is the correction, found
by verifying the pointer rather than trusting it forward.

## 6. Smaller, and genuinely optional

- **`verify-permission-catalog.mjs` is redundant.** `backend/src/common/auth/verify-permission-catalog.mjs`
  duplicates `src/scripts/check-permission-keys.mjs`, which is the canonical one wired at
  `backend/.github/workflows/ci.yml:61`. Two implementations of one security predicate is the defect
  c15-06 exists to prevent. Delete it and repoint or drop `verify:permissions` in `package.json`.
- **`unregistered-injectables.mjs` can be promoted to a spec.** It now reports
  `unreferencedOutsideOwnFile=0`, so the guard beside `app-route-uniqueness.spec.ts` would pass.
- **`recurring-journals.controller.ts` holds its list schema inline**, which `CLAUDE.md` §6 forbids;
  it belongs in `dto/`.
- **29 hand-rolled page fields remain** of the original 411. Nine of them deliberately exceed the
  100/page platform cap (`csat` 500, `party` 500, `issues` 400, `data-quality` 400, `hr/interviews`
  200, `tasks` 200) and need a product ruling before migrating, not a mechanical swap.
- **`INVITE_EXPIRED` is never written to the seat ledger.** Expiry is evaluated by predicate
  (`expires_at > NOW()` inside `seatCount()`) rather than by a sweep, so the seat maths is correct
  and no event is recorded. A future expiry sweep should emit one.

---

## Already fixed — recorded so nobody re-raises them

Every one of these was open in the request files and is now closed, verified on 2026-08-27:

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
- the 178 local pagination-schema copies across 119 files (c13-06 — the 29 that remain are in §6,
  with the grep that regenerates the full list)

Both are recoverable in full: `git show 896c4b847:architecture-refactor/lane-requests/s4.md`.
