# Open findings — carried out of the lane and session request files

Those files were coordination scratch for sessions that have all finished, so they are deleted. What
survived deletion is below: **every item re-verified against the code and the migrated database on
2026-08-27**, not copied forward on trust. Most of what those files listed had already been fixed —
what remains is short.

None of these belongs to an open ticket. They are real findings with no home.

---

## 1. `provider_webhook_events` uniqueness is global, so one tenant can swallow another's webhook

**Verified open.** `pg_indexes` shows:

```
UNIQUE INDEX uq_provider_webhook_events_provider_event
  ON public.provider_webhook_events USING btree (provider, provider_event_id)
```

No `org_id`. A unique index enforces regardless of RLS, so an organisation posting a validly-signed
webhook against its own endpoint can pre-insert another organisation's `provider_event_id` and have
that organisation's genuine event silently rejected as a duplicate. `backend/CLAUDE.md` §3 requires
tenant-scoped uniqueness to be composite for exactly this reason.

**The cheap fix has expired.** The original note said to edit `0490_provider_webhook_events.sql` in
place because it was unapplied. `0490` is now applied, so this needs a new migration:

```sql
DROP INDEX IF EXISTS "uq_provider_webhook_events_provider_event";
CREATE UNIQUE INDEX IF NOT EXISTS "uq_provider_webhook_events_provider_event"
  ON "provider_webhook_events" ("org_id", "provider", "provider_event_id");
```

**Counter-argument worth weighing first:** a provider event id is the *provider's* global identifier,
and two organisations should never legitimately receive the same one — which is an argument for the
global constraint being correct. It stops being true the moment one organisation runs more than one
provider account, or a shared sandbox account is used. Current mitigation is application-level:
`ProviderEventLedger.claim` returns `FOREIGN` when the insert conflicts but no row is visible to the
tenant, and the endpoint answers 409 with an error log.

## 2. `verifyPaymentSchema` carries no billing cycle, so annual purchases are recorded as monthly

**Verified open.** `backend/src/modules/billing/core/dto/billing.schemas.ts:22-28` — the schema has
`razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`, `plan`, `couponId`, and no cycle.

`createOrder` prices an annual purchase at twelve months less the annual discount, but
`verifyAndActivate` has no cycle to work from, so it records `subscription_payments.amount` at the
**monthly** price and sets `currentPeriodEnd` one month out. `coupon_redemptions.amount` is left null
for the same reason — the discount cannot be computed without the cycle.

Suggested shape: add `billingCycle: billingCycleSchema.optional()`, then use
`planBaseAmountPaise(plan, cycle, ANNUAL_DISCOUNT_PCT)` for the recorded amount and add twelve months
to `currentPeriodEnd` for `annual`. **Not applied here** — it changes what a customer is billed and
what the books say, which is a product decision, not a cleanup.

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
