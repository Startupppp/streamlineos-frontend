# 15h — the last open box: every object-addressable route, probed live with another organisation's id

Owner: BOLA harness + the modules named below. Repos: `streamlineos-backend` (code, harness),
`streamlineos-frontend` (this report).
Territory held: `test/security/bola/**`, `src/modules/finance/banking/**`,
`src/modules/payroll/runs/**`.

Everything below was measured on this machine on 2026-09-03 against a **local** Postgres 18.4.
`DATABASE_URL` (the shared Neon instance) was never used; every database named here begins
`scratch_`. `AUTH_SIGNING_KEYS` was a locally generated Ed25519 placeholder written only to the
session scratchpad — never a real credential, never written to `.env`.

---

## 0. What this box asked, and what was true before this pass

> Every object-addressable route is probed with an id belonging to another organization and
> returns 404.

The state on arrival, from the ticket and `reports/residual-risk-register.md`: one full live run
existed (`bola-live-offline.json`, commit `ca4ec171`, 1,921 outcomes,
`PASS 666 · UNPROBEABLE 1138 · NO-404 113 · SERVER-ERROR 2 · LEAK 1 · INCONCLUSIVE 1`). **1,138
routes had never been asked the question at all**, and every later pass (15e's body synthesis, 15f's
500 triage, 15g's e-sign and body-id sweep) fixed the *reasons* the sweep could not ask without ever
re-running it end to end. The report that built the body synthesiser even carries a literal
`RESULT_PLACEHOLDER` where its full re-run's numbers should be: only a 468-route subset was
re-probed.

So the one thing missing was the thing the box is written about: **a full live run, at head, with
every repair in place.** That is what this pass did.

---

## 1. The denominator, and exactly how it is produced

**Object-addressable = a controller handler whose route path contains at least one `:param`.**
That is one predicate, in one place: `isObjectAddressable` in
`backend/test/security/bola/route-surface.ts:358` — `route.pathParams.length > 0` — applied to every
handler parsed out of `src/**/*.controller.ts` by `loadRouteSurface()`.

Reproduce it:

```
cd streamlineos-backend
node -r ts-node/register/transpile-only <<'TS'
const rs = require("./test/security/bola/route-surface.ts");
const pt = require("./test/security/bola/live/param-tables.ts");
console.log("all handlers:", rs.loadRouteSurface().length);
console.log("object-addressable:", pt.objectAddressableRoutes().length);
TS
```

| tree | all handlers | object-addressable |
|---|---|---|
| head (`bc044673` … `775b8f3a`, unchanged across the pass) | **3,632** | **1,929** |
| `ca4ec171` — the commit the previous artifact names | 3,619 | **1,919** |

**Reconciling with the 1,138 figure.** The previous artifact holds 1,921 outcomes at a tree that
measures 1,919. The two extra are not a parser disagreement: that run took ~40 minutes and the
working tree moved under it — its own sibling artifacts record three different commits
(`615db13b`, `1cc7ded8`, `ca4ec171`), and `planRoutes` is evaluated once per jest *test*, not once
per run. The 1,138 is therefore `1,138 / 1,921` at a tree of about 1,919 routes. At head the
surface has grown by 10 routes to **1,929**, which is the denominator every number in this report
is over.

---

## 2. The database, and why it is this one

`scratch_t15r2` — `CREATE DATABASE scratch_t15r2 TEMPLATE scratch_t15`, then the **8 journalled
migrations `scratch_t15` was missing** applied one at a time and verified:

```
1041_t22c_attendance_membership_history_index   1045_t44b_storage_pending_purge_bucket
1042_t29_kb_page_attachments                    1046_t15f_support_ticket_watchers_actor_contract
1043_t08_nullable_tenant_composite_fk_guards    1047_t33_backfill_public_object_urls
1044_t41_kb_page_attachments_rls                1048_hr_people_org_person_link_unique
```

After: journal 672 entries, **0 unapplied** (hash-compared against
`drizzle.__drizzle_migrations`). 8 organisations. Source tenant
`aaaaaaaa-…0001`, prober `aaaaaaaa-…0003` — the pair 15e established as the only two with every
module enabled. The app ran as the non-owner `streamline_app` role
(`rolbypassrls = f`), so **RLS was live** for every request.

**`scratch_t15` and not `scratch_perf_seed`, deliberately.** 15f measured the cost of getting this
wrong: replayed against a copy of `scratch_perf_seed`, only 43 of 88 known defects reproduced,
because the objects the sweep borrows do not exist there — 45 routes would have been closed as
"did not reproduce" while every one still carried its defect.

**One deliberate change to the seed, stated so it cannot be mistaken for the stock database.** Both
tenants were moved to `plan = ENTERPRISE, status = ACTIVE`. On the stock seed org …0001 is
`STARTER/TRIAL` with an expired trial, which `PlanLimitsService.queryTier` resolves to **FREE**, and
32 routes answered `402 FEATURE_NOT_AVAILABLE` to their own owner — filed unprobeable for a reason
that is a billing state, not a security property. A paying tenant is the state this box is about.

---

## 3. What was repaired in the harness before the run

Both are in `test/security/bola/**` and both were measured, not guessed.

**(a) The borrow pool could not survive its own DELETEs** — `d5d8699c`.
A control DELETE consumes its object, so each DELETE route takes a fresh id from the back of its
table's pool. The pool held **24** ids per table and 311 of the object-addressable routes are
DELETEs, so every table addressed by more than 24 of them ran dry: **83 routes** in the previous run
were filed `UNPROBEABLE — the source tenant has no remaining object of this type`, a message that
reads as a seed gap and was a constant. The pool is now 200.

**(b) The first id in the pool is not always one the route can serve its own owner** — `d5d8699c`.
The pool is "the first N primary keys this tenant owns in the table the parameter names", which is
weaker than "an object this route accepts": the row may be soft-deleted, in a status the handler
refuses (`Only pending or rejected entries can be edited`), or missing a sibling row the handler
joins. The control then answered 404 or 409 and the route was filed unprobeable — **135 control-404s
and 24 control-409s** in the previous run, indistinguishable in the artifact from a route that
genuinely cannot be reached. The id is now a **candidate**: up to four of the tenant's own ids are
tried and the first whose control answers 2xx is the one scored. The probe is re-sent on the **same**
url every time — control and probe must never differ by anything except which organisation the
caller belongs to — and every outcome records `idAttempts`, so a route that needed the third id
cannot be confused with one that needed the first.

**(c) `:organizationPersonId` was bound to the wrong table** — `775b8f3a`.
Found by re-probing a route this pass had just fixed. `candidateTableNames` offers the preceding path
segment first, so `/payroll/people/:organizationPersonId` and `/directory/people/:organizationPersonId`
both offered `people`, which the prefix pass resolved to the populated **`hr_people`** — while every
handler resolves that parameter through `organization_people.organization_person_id`. Three of the
four routes answered their **own** tenant 404 and were filed unprobeable; the fourth answered **200
for every id** and so read as a probed route while nothing had been probed. That is the one shape of
mis-binding that is not merely lost coverage but a false reading, and it is why (c) matters more than
its four routes suggest.

Measured after the alias, on `scratch_t15j`:

```
PASS  GET    /directory/people/:organizationPersonId          ctl=200 probe=404
PASS  PATCH  /directory/people/:organizationPersonId          ctl=200 probe=404
PASS  DELETE /directory/people/:organizationPersonId          ctl=204 probe=404
PASS  GET    /payroll/people/:organizationPersonId/eligibility ctl=200 probe=404
PASS  GET    /finance/reconciliation/:bankAccountId/rules      ctl=200 probe=404
exit 0, 9/9
```

**A mis-binding costs coverage, not correctness — except when the handler answers 200 regardless.**
The sweep refuses to score any route whose own-tenant control did not answer 2xx, so a wrong table
normally shows up as an honest `UNPROBEABLE`. A static scan of all **271** distinct
`param -> table` bindings at head flags **32** where the table name does not contain the parameter's
stem; most are correct (`:entryId` under `/hr/leave/ledger/` really is `hr_leave_ledger`, and the
preceding-segment signal is the right one there), and the rest cost coverage that the control gate
already reports. They are listed in §7 as named residual harness reach, not as passes.

---

## 4. RESULTS_PLACEHOLDER

---

## 5. BITE_PLACEHOLDER

---

## 6. FIXES_PLACEHOLDER

---

## 7. RESIDUAL_PLACEHOLDER
