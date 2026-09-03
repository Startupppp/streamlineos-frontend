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

## 4. The result — and the three numbers, kept apart

**The whole surface was attempted: 1,929 of 1,929 object-addressable routes.** Artifact:
`scratchpad/t15j/bola-head-full.json`, 1,929 outcomes, commit `d30a1c52`, generated
2026-09-03T07:54:21Z, 3,649 s of wall clock against a booted API.

```
BOLA_DB=scratch_t15r2 BOLA_LIVE_ARTIFACT=.../bola-head-full.json BOLA_LIVE_MIN_SCORED=400 \
  node ./node_modules/jest/bin/jest.js --config ./jest-e2e-seeded.json --forceExit --runInBand \
  --testPathPattern=bola-live-cross-tenant --testPathIgnorePatterns "/.claude/worktrees/"
```

| verdict | as measured | after the non-object-segment correction (§3, `b05f3387`) |
|---|---:|---:|
| PASS — cross-tenant id answered 404 | 682 | **681** |
| NO-404 | 35 | 29 |
| SERVER-ERROR | 6 | 6 |
| LEAK | 4 | 4 |
| INCONCLUSIVE | 1 | 1 |
| UNPROBEABLE | 1,201 | **1,208** |
| **total** | **1,929** | **1,929** |

The correction is not a re-run: `planRoutes` decides "is this segment an object" from the parameter
NAME alone, so the artifact was re-scored offline against the new rule. Seven outcomes move, six of
them findings — the two `/crm/options/:optionType` verbs, the three `POST /onboarding/tours/:tourKey/*`
and `PUT /calendar/sources/:sourceKey`. Read in source, every one of those parameters names a
per-user preference key or an enum discriminator, not a tenant object, and the handler answers the
caller's own data whatever is in the segment. Counting them as defects would have been six false
findings; counting them as passes would have been six false greens. They are unprobeable.

### The three numbers the ticket asks for, and they are never folded together

| | routes | share of 1,929 |
|---|---:|---:|
| **probed and correct** — an id from the other organisation was sent and the answer was 404 | **681** | **35.3%** |
| **probed and defective** — the question was asked and the answer was wrong | **40** | 2.1% |
| **could not be probed** — the question was never asked | **1,208** | 62.6% |

**A route is counted as probed only if its OWN-TENANT control answered 2xx.** Without that control a
404 proves nothing: an unrouteable path, a rejected id format, a missing permission, a module the
org has not enabled and a correctly bound tenant all answer 404 identically. `score()` refuses to
grade an ungraded control, and the 1,208 are named individually in the artifact with the reason each
could not be asked.

**What was actually sent, for the 721 that were scored.** 698 were handed a real primary key
belonging to the other organisation, read out of the table the parameter names. The other 23 have no
object parameter at all — their only path segments are the tenant selector (5) or the actor (18) —
so the sweep sent the SOURCE organisation's own org/user id from a token belonging to the prober.
For an authenticated route that is still a genuine cross-tenant probe. For the **3** that are
`@Public()` it is not: the `:orgId` in the path IS the authorization decision, the sweep binds it to
the source org for the control, the probe and the absent-id request alike, so all three answers are
identical by construction and nothing was asked. Those three are pinned as not-a-probe, not as
passes; the surface they belong to is asserted by `bola-public-org-selector.spec.ts`.

### Why 1,208 could not be probed

Bucketed from each outcome's own `detail` field (raw run; the correction above moves 24 routes into
the fourth row):

| routes | why |
|---:|---|
| 355 | own-tenant control **404** — the borrowed id did not resolve for its own owner |
| 334 | the seed holds no object of that type, or the pool for it ran out |
| 195 | own-tenant control **400** — the request could not be made valid |
| 108 | the path segment is not an object (`:moduleKey`, `:token`, `:providerKey`, …) |
| 51 | own-tenant control **500** |
| 43 | own-tenant control **403** |
| 41 | no table resolves the parameter |
| 30 | own-tenant control **409** — the object is in a state the handler refuses |
| 30 | own-tenant control **402** — a plan gate still refused, even on ENTERPRISE |
| 12 | own-tenant control **401** — `/agent/v1/*` and `/portal/v1/*` take a different credential, not a user JWT |
| 2 | own-tenant control **503** — AI is not configured |

**The most important line in this report is the first one, and it is a regression against the
previous run.** Control-404 went 135 → 355 and "no object of that type" 168 → 334, while control-400
fell 468 → 195. The direction is not noise and the cause is the sweep itself: with a body derived
per route, ~270 POST/PATCH routes that used to bounce off the validation interceptor now **execute**,
and a sweep of 1,929 real mutations against one database consumes and re-states the very objects its
later routes borrow. The borrow pool is snapshotted once, before the first request, so an id deleted
or transitioned at route 400 is still offered at route 1,600 and its control answers 404 or 409.

**So 681 is a floor, not a ceiling, and the honest reading of this box is that reach is now limited
by the sweep's own destructiveness rather than by its request shape.** The fix is structural — a
database restored per route family, or a dependency-ordered run that creates its own fixture
immediately before borrowing it — and it is recorded as residual R-4c below rather than claimed.

### The run's own anti-vacuity proofs, from the artifact

| proof | measured |
|---|---|
| `sameTenantLeakDetection` | the same request made by the object's OWN tenant is scored LEAK on **12 of 12** routes checked — the classifier can see a served object |
| `mutationTest` | `ProjectsQueryService.getProject` replaced with a read by id alone: bound **404/PASS**, unbound **200/LEAK**, restored **404/PASS** |
| `synthesizedBodies` | **619** routes carried a contract-derived body; **0** schemas were unsatisfiable |
| `bodyUnlocksControl` | 8 controls that reject `{}`; 4 unlocked outright, the rest moved from a validation 400 to a semantic answer |
| `tokenRetries` | 96 re-mints fired; **12** controls still 401 — the `/agent/v1` and `/portal/v1` credential surface, not an expiry |

---

## 5. Bite proof — the probe fails against a route deliberately broken in a temp tree

**Never in the shared working tree.** `git archive HEAD src test … | tar -x -C <scratchpad>/bite`,
`node_modules` and `.env` symlinked, run against `scratch_t15j`.

Target `GET /accounting/journal/:entryId`, chosen because it PASSes at head. The planted defect is
the exact one this box exists to forbid — `AccountingLedgerService.getJournalEntry` throws
`ForbiddenException` instead of `NotFoundException` when the tenant-bound lookup finds nothing:

```
before   exit 0    1 route scored, PASS,   9/9 tests green
after    exit 1    1 route scored, NO-404, "GET /accounting/journal/:entryId -> 403"
                   1 failed / 8 passed
```

RLS is live in both runs, so the 403 is the only thing that changed. Two things this proves that the
in-process `mutationTest` does not: the failure survives a real process boundary, and the sweep
detects the *status-class* defect (403 where 404 belongs) and not only a served body.

---

## 6. The 40 defects, and the 10 repaired here

Every fix follows the same three steps: the object the route ADDRESSES is resolved under the
caller's organisation, the refusal is `NotFoundException` and never `ForbiddenException`, and a
regression spec is mutation-tested by removing the guard and watching it go red.

| route | was | commit |
|---|---|---|
| `GET /finance/reconciliation/:bankAccountId/rules` | 200 for any bank account id; `fin_reconciliation_rules` has no `bank_account_id`, so the path parameter was passed into the query object and never read, while `createRule`/`deleteRule` on the same controller already asserted it | `165cdd0e` |
| `GET /payroll/people/:organizationPersonId/eligibility` | 200 `{"reason":"unknown-person"}` — the seam resolved correctly and the boundary returned the soft answer backend/CLAUDE.md §1 forbids | `ada26b47` |
| `PATCH /hr/analytics-plus/workforce/plans/:planId` | 200 with an empty body: a tenant-bound UPDATE that matched nothing, returned unchecked | `bc496709` |
| `GET` + `POST /chat/channels/:channelId/typing` | **403** for another organisation's channel — the existence oracle §4 forbids. `ChatTypingService` went straight to `chat_channel_members` while two sibling services in the same module already resolved the channel first | `4a299fa3` |
| `POST` + `DELETE /organization/:orgId/purge…` | 200: both declared `:orgId`, ignored it and acted on `u.orgId`. Dangerous in the other direction — the caller believes they addressed the organisation in the URL and the server purges a different one | `1b791a68` |
| `POST /payroll/runs/:runId/approvals/:approvalId/reject` | **500**: the controller opens a command receipt before the service runs, and the composite tenant FK `(org_id, run_id)` refuses the insert with an uncaught 23503. Fixed in `begin()`, which all **fourteen** payroll commands funnel through | `df25fdc1` |
| `POST /kb/pages/:pageId/reindex` | 200 `{"reindexed":true}` for any page id — `indexPage` treats a missing page as nothing to index, which is right internally and wrong at the boundary | `d30a1c52` |
| `POST /surveys/:surveyId/collectors` | **500**: `create` inserted with the survey id from the path while `list` on the same service already called `assertSurveyInOrg` | `f919ad7b` |

**Two of the ten are proved live, end to end.** Re-probed against a booted app built from the fixed
tree: `GET /finance/reconciliation/:bankAccountId/rules` and
`GET /payroll/people/:organizationPersonId/eligibility` both move NO-404 → **PASS** (control 200 /
cross-tenant 404), together with the three `/directory/people/:organizationPersonId` routes the
harness alias fix unlocked. Exit 0, 9/9. The other eight are proved by mutation-tested unit specs;
the full live re-run that would prove all ten in one artifact is another hour of wall clock and is
named as residual R-4d rather than claimed.

**Two mutation tests worth recording because they nearly did not bite.**
`command-receipts.service.spec.ts` took the run row as an optional third argument, and a default
parameter is applied to `undefined` — so the cross-tenant case would have been handed a run it owns
and passed vacuously. The sentinel is `null`. And `chat-typing.isolation.spec.ts`, three tests
titled "cross-org isolation", made the caller a NON-MEMBER of the organisation in their own token —
an auth-state failure, not a cross-tenant probe. A real prober is active in their own organisation,
the membership lookup SUCCEEDS, and the old code fell through to the 403. The tests asserted the
refusal class on a path the attacker never takes, and the path the attacker does take was
unasserted. Both specs are rewritten.

### The 30 not repaired, pinned by name with a reason each

`test/security/bola/live/known-no-404.json` now carries `no404` (23), `serverErrors` (4), `leaks`
(2) and `inconclusive` (1), **and a `_reasons` entry for every one**. The spec asserts that a pinned
route without a reason of at least 20 characters fails the suite, so the cheapest way to make this
gate green — appending a route — is visible in the diff and cannot be done silently. An unpinned
finding of any class still turns the suite red.

- **11 build** — 5 GETs and 2 POSTs that never assert `:projectId`, and 4 POSTs that answer a
  cross-tenant `:projectId` with a **500**. Owner: build module owner.
- **17 crm / leads / deals / contacts / inventory** — excluded from this release. 4 are DELETEs
  answering 204 whether the object existed or not.
- **1 LEAK, `POST /crm/consent/contacts/:contactId`** — reproduced exactly as 15e described it.
  No cross-tenant row is read; the consent row that lands carries the prober's own org. It stays a
  leak rather than a NO-404 because the answer is a cross-**platform** existence oracle: a contact
  id that exists somewhere answers 200 and one that exists nowhere answers **500**, because
  `crm_contact_channel_consent.contact_id` carries a BARE foreign key where its sibling
  `contact_party_id` is correctly composite. Excluded scope; the fix is two lines.
- **1 LEAK, `POST /public/intake/:projectId`** — a deliberately public intake form, so "cross-tenant"
  is not the finding. What is: a project id that exists answers **201** and one that does not
  answers **400**, so the endpoint enumerates project ids across the whole platform, unauthenticated,
  behind one rate limit. The fix is to address the form by an unguessable token instead of a
  sequential integer project id. **Cross-territory — public-surface owner.**
- **3 `@Public()` org-selector routes** — not a cross-tenant probe at all (§4). `GET /public/org/:orgId`
  was read in source and does 404 an organisation that does not exist.

---

## 7. Residual, and what this box still cannot say

- **R-4c — the sweep consumes what it measures. NEW, and it is now the binding constraint.**
  With bodies derived per route the run performs ~1,900 real requests including hundreds of
  successful mutations against a single database, and the borrow pool is snapshotted once before
  the first of them. Control-404 rose 135 → 355 and "no object of that type" 168 → 334 between the
  previous run and this one for that reason. Fix is structural: restore per route family, or create
  the fixture immediately before borrowing it. **Owner: security/BOLA harness owner.**
- **R-4d — eight of the ten repairs are proved by mutation-tested unit specs, not by a live
  re-probe.** Two are proved live. A full re-run is ~1 hour of wall clock.
- **R-4 — 17 excluded-scope defects (crm/leads/deals/contacts/inventory), 4 of them write verbs
  answering 204 on nothing.** Blocker: SCOPE. Owner: CRM/inventory release owner.
- **R-4e — 11 build defects, 4 of them 500s.** Blocker: territory. Owner: build module owner.
- **R-4f — the public intake enumeration oracle.** Owner: public-surface owner.
- **Permanently unprobeable by this method:** the 132 routes with a non-object path segment, and the
  12 `/agent/v1` + `/portal/v1` routes, which take an API-key credential rather than a user JWT and
  need a second harness identity.
- **The 30 control-402s did not clear even on ENTERPRISE**, so the plan is not the only gate on
  them; not investigated further.
- **A mis-binding costs coverage, not correctness — except when the handler answers 200 regardless.**
  A static scan of all 271 distinct `param -> table` bindings flags 32 whose table name does not
  contain the parameter stem. Most are correct. They are named residual harness reach.

**What this box may honestly claim today: 681 of 1,929 object-addressable routes (35.3%) were probed
with an id belonging to another organisation and answered 404; 40 were probed and did not; 1,208
were never asked.** It is not ticked.
