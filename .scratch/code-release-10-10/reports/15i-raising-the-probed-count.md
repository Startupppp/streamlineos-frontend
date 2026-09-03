# 15i — raising the probed count, and the defects that only became visible once it rose

Owner: BOLA harness + build / hr / payroll / directory. Repos: `streamlineos-backend` (code,
harness), `streamlineos-frontend` (this report).

Everything below was measured on this machine on 2026-09-03 against a **local** Postgres 18.4.
`DATABASE_URL` (the shared Neon instance) was never used; every database named here begins
`scratch_`. `AUTH_SIGNING_KEYS` was a locally generated Ed25519 placeholder written only to a
session scratchpad — never a real credential, never written to `.env`.

---

## 0. What this pass was handed, and what it corrects in its own brief

The brief said: *"The 40 probed-and-defective routes are real findings — fix them."*

**Verified before acting, and the framing was one pass out of date.** At the tree this pass started
from, **10 of the 40 were already repaired** by 15h's own commits (`165cdd0e`, `ada26b47`,
`bc496709`, `4a299fa3`, `1b791a68`, `df25fdc1`, `d30a1c52`, `f919ad7b`) — every one verified present
in `git log` and with its regression spec on disk. The 30 that remained were pinned by name in
`test/security/bola/live/known-no-404.json`, each with a written reason, and split
**11 build · 15 crm/inventory · 3 `@Public()` org-selector · 1 public intake**.

So the actionable set on arrival was **30, not 40**, and only 12 of those 30 were reachable without
either a scope decision (CRM and inventory are excluded from this release) or a product decision
(the public intake form's address).

**And one more correction to the brief.** It said the 4 LEAKs were the most serious remaining work.
Two of the four were already fixed; the two pinned leaks are `POST /crm/consent/contacts/:contactId`
(excluded scope) and `POST /public/intake/:projectId` (a deliberately public form — the finding is
platform-wide project-id enumeration, and the fix is an unguessable token, which is a product
change). Neither is a cross-tenant read that served an object.

---

## 1. The binding constraint was reach, and it was three separate harness defects

15h recorded the cause as R-4c — "the sweep consumes what it measures" — and proposed a per-route
database restore. That diagnosis is **partly right and mostly incomplete**. Re-derived from
`bola-head-full.json` before that artifact was lost (see §6), the 1,208 unprobed routes bucket as:

| routes | why | verb split |
|---:|---|---|
| 355 | own-tenant control **404** | GET 72 · POST 111 · PATCH 94 · DELETE 78 |
| 242 | the source tenant holds no row of that type | GET 51 · POST 64 · PATCH 64 · DELETE 63 |
| 195 | own-tenant control **400** | GET 37 · POST 94 · PATCH 50 · DELETE 14 |
| 107 | the path segment is not an object | — |
| 93 | the pool for that table ran out | **DELETE 93** |
| 51 / 43 / 41 / 30 / 30 / 12 / 2 | control 500 / 403 / no table / 409 / 402 / 401 / 503 | — |

**Consumption cannot be the story.** GETs run first, before any mutation, and 72 of the control-404s
are GETs. Three measurements found the real causes:

**(a) 252 of the 355 control-404s addressed a table holding exactly ONE row for the tenant.** That
is the signature of a table chosen because it *had* a row, not because it was the right one. The
ranking function scored `populated` at 10,000 and a path hint at 100, so one unrelated row beat the
table the route's own path names: `GET /csat/:surveyId` bound `public.pulse_surveys` because
`public.csat_surveys` was empty; `/hr/recruitment/jobs/:jobId` bound `public.ai_jobs`;
`/tasks/:taskId` bound `public.lead_tasks`; `/crm/automations/:ruleId` bound
`build.project_automations`. And the sweep took ONE answer, so a wrong one was unrecoverable — the
control 404'd and the route was filed unreachable with nothing in the artifact saying the table was
the problem.

**(b) All 64 tables behind the 242 "no object of that type" are empty across ALL EIGHT seeded
organisations** — measured, not assumed: `SELECT count(*)` over every one returned 0, and
`count(DISTINCT org_id)` returned 0. `public.candidates` blocks 45 routes on its own,
`public.sign_envelopes` 21, `build.project_teams` 16. There was nothing to borrow and nothing to
clone. The object has to be created or the question is never asked.

**(c) The 93 pool-exhausted routes are every one a DELETE**, and the pool was a snapshot of 200 ids
taken before the first request. That one IS the consumption story, and it is the smallest of the
three.

### What was built

| change | file | what it fixes |
|---|---|---|
| **Live borrow pool** | `test/security/bola/live/borrow-pool.ts` | re-reads the table at the moment of the borrow, so a row an earlier route deleted is never offered and a row an earlier route created is available at once; excludes soft-deleted rows (invisible to every handler, so borrowing one guarantees a control 404); offers rows whose owner column names the calling USER first, which is the 43 control-403s of the "Not your timer" / "You can only submit your own period" shape |
| **Ranked table candidates + fallback** | `param-tables.ts` `resolveTables`, `probe-plan.ts`, the spec's attempt schedule | the path hint now outranks `populated`; a parameter carries up to four candidate tables and the sweep tries the next one **only while the refusal says the object was not resolved** (404, or a 400 rejecting the id's shape) — a 403/409/500 means the handler did resolve it, so another table cannot help |
| **Key-type filter** | `body-synthesis.ts` `pathParamShape`, `probe-plan.ts` `keyFitsParam` | `openapi.json` declares 1,685 of the 2,245 path parameters `integer`/`number` and 44 `format: uuid`; a candidate whose primary key is the other kind can only ever answer 400 in the validation interceptor, so it is dropped before a request is spent |
| **Path-scoped aliases** | `param-tables.ts` `PATH_PARAM_ALIASES` | `:jobId` means `job_postings` under `/hr/recruitment`, `sign_bulk_send_jobs` under `/sign/bulk-send`, `inv_export_jobs` under `/inventory/export`, `payroll_jobs` under `/payroll/jobs` — one parameter, seven tables, and neither structural signal can tell them apart. Each read out of the handler's own service |
| **Fixture seeding** | `test/security/bola/live/fixture-seeder.ts` | writes one real row of a type the tenant does not hold, filling NOT NULL columns by type, resolving foreign keys (recursing into empty parents), reading the allowed set out of a `CHECK … = ANY (ARRAY[…])` constraint, respecting `varchar(n)`, and naming the caller for a `users` reference because several tables carry a trigger that refuses a non-member |

**Why a synthesised fixture cannot become a false pass.** `score()` refuses to grade any route whose
own-tenant control did not answer 2xx. A placeholder row that makes the handler 500 produces an
`UNPROBEABLE` outcome — never a pass and never a finding. The row itself is a real row of that type,
owned by the source tenant, subject to every constraint the table declares.

Plan-time reach, both harnesses run against the SAME clean at-head database (`scratch_t15r1`), so
the comparison is not confounded by the seed or by `b05f3387`'s non-object rule:

```
old harness (b05f3387)   probeable 1,523   table-empty 241   no-table 33   non-object 132
new harness              probeable 1,628   table-empty 148   no-table 21   non-object 132
```

+105 routes gain a bindable id from the binding work alone, before a single fixture is written. The
run's own `harnessProofs.fixtureSeeding` then records what the seeder added on the run database:
**84 tables wanted by 281 routes, 82 created**, the two refusals named in the artifact.

---

## 2. The run

RESULT_SECTION_PLACEHOLDER

---

## 3. The twelve defects repaired here, and all twelve proved live

RESULT_FIXES_PLACEHOLDER

---

## 4. Gates

RESULT_GATES_PLACEHOLDER

---

## 5. What is still open, precisely

RESULT_RESIDUAL_PLACEHOLDER

---

## 6. Two things this pass has to report against itself

**(a) 15h's raw artifact no longer exists.** `scratchpad/t15j/bola-head-full.json` — the 1.5 MB,
1,929-outcome file every number in `reports/15h-…` is derived from — was deleted from the session
scratchpad part-way through this pass, along with the whole working directory. 15h's own §7 warned
that it was in neither repository; the warning was correct and the loss then happened. The
derived numbers in that report and the pin file survive, and this pass re-derived the bucket table
in §1 from the artifact *before* it vanished. **This pass's own artifact is committed into the
repository** rather than left in a scratchpad.

**(b) A red gate this pass did not cause, and did not paper over.** `c7e4628a`
("split fourteen files by responsibility") moved `ActivitiesService.timeline`'s query into a free
function, and the id-binding analyser could not follow a carrier forwarded whole out of a service
method. Three sites on `ActivitiesController_timeline` went `filter-in-org-query` -> `never-read` on
that commit alone and turned the `resolved >= 386` floor red. Measured across the boundary: 387 at
`8bf782c1`, 384 at `c7e4628a`. The floor was **not** lowered. The analyser learned to follow the
forward instead (`forwardedCalls` in `body-id-binding.ts`), and the whole surface moved:
`never-read` **272 -> 179**, resolved **384 -> 465**, `written-unresolved` **211 -> 223**. The 14
newly-VISIBLE writes are pinned by name in the spec — none is new code, and the net is +12 because
two resolved on the way. The file-size programme will keep producing that shape, which is why the
fix belongs in the analyser.
