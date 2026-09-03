# 20b — The `with:` block ticket 20's own gate cannot see, and the four bearer tokens it was shipping

**Date:** 2026-09-03 · **Repo:** `streamlineos-backend` · **Ticket:** 20, box 1
(the one open box) · **Verdict: the box stays OPEN and BLOCKED, and it is still the
right verdict — but a decision-free clause inside it was open and is now closed.**

Every number below comes from an AST scanner written in this pass and bite-proved
in both directions. Nothing is inherited from `check:query-projections`, whose
green I was told not to trust, and which turned out to be structurally blind to
the dimension this report is about.

---

## 1. The gap: `check:query-projections` measures the row and never the join

`check-query-projections.mjs` reads the **top-level** keys of a relational query
and asks whether `columns:` is among them. That is deliberate — its own comment
says a `columns:` nested inside a `with:` "projects the RELATION, not the row",
and it tracks brace depth precisely so a nested one does **not** count.

Correct for the population it ratchets. It also means the relation itself has
never been measured by anything.

That is not academic. Read against the installed driver
(`node_modules/drizzle-orm/pg-core/dialect.js`, `buildRelationalQueryWithoutPK`):

```js
if (config === true) {                       // with: { rel: true }
  selection = Object.entries(tableConfig.columns).map(...)   // EVERY column
} else {
  ...
  if (config.columns) { /* include or exclude mode */ }
  else selectedColumns = Object.keys(tableConfig.columns);   // EVERY column
}
```

So **two** shapes ship a whole related row, not one: `with: { rel: true }`, and
any `with: { rel: { … } }` whose config has no `columns:` key — `{ where: … }`,
`{ orderBy: …, limit: 1 }`, `{ with: { … } }`. The second shape is the majority
of the population here (102 of 198 at the start of this pass) and reads, to a
human skimming, exactly like a projected query.

**Measured at HEAD before I changed anything: 198 relation hydrations carry no
`columns:` at all**, across 1,735 `db.query.*.find{Many,First}` call sites and 562
relation entries. `check:query-projections` was **exit 0** over all of it.

The same run also confirms, by an independent implementation, the two clauses the
ticket says are closed: **0** unprojected relations to global `users` (the
existing `users-relation-projection.spec.ts` is a regex implementation; this is an
AST one; both say 0), and **0** vector/embedding columns on any unprojected read.

---

## 2. Ranked by what it costs — and they are not one number

The ticket's box names three harms. They are different problems and I report them
separately.

### 2.1 DATA EXPOSURE — 4 sites, two of them live on the wire. FIXED.

Sweeping every hydrated relation target for a credential-shaped column found four,
all in recruitment, all reachable:

| endpoint | what went out | permission needed |
|---|---|---|
| `GET /hr/recruitment/jobs/:jobId` | every application's `tracking_token` | `hr:employees:view` |
| `GET /hr/recruitment/candidates/:candidateId` | every application's `tracking_token` **and** every interview's `calendar_sync_token` | `hr:employees:view` |
| `recruitment-pipeline.pipeline()` | `tracking_token` for up to 6 × 50 candidates | heap only — the DTO is mapped |

Both endpoints `return` the ORM row unmapped, and the only global interceptor
(`ResponseTransformInterceptor`) **wraps** rather than strips — checked, not assumed.

`tracking_token` is not an internal id. `public-careers.service.ts:126` mints it as
`randomBytes(32).toString("hex")`, and `GET /public/application-status/:token`
(`public.controller.ts:130`, unauthenticated, rate-limited only) resolves the
application **and the candidate's first name, last name, email and job** from that
token alone. So the leak handed any holder of a recruitment read key a working
credential for an external party's data. `calendar_sync_token` has **no reader
anywhere in `src`** outside the schema declaration.

**Fixed by exclusion, not by an allowlist** — `columns: { trackingToken: false }`,
which Drizzle's else-branch turns into "every column except this one". That keeps
the rest of the response shape byte-identical, so it is a security narrowing and
not a product decision. Contract-safety was proved rather than assumed: grepping
the frontend, the **only** `trackingToken` consumer is
`app/(public)/careers/[orgSlug]/jobs/[jobId]/apply/page.tsx`, which reads it from
its own `POST` response.

Commit `18506718`.

### 2.2 MEMORY / LATENCY — 3 sites where the hydrated row was never read at all. FIXED.

Not "large payload" — **dead**:

- `timesheets.updateEntry` hydrated a whole 38-column `tickets` row and, through
  it, a whole 21-column `projects` row including its `settings` jsonb, and read
  **zero fields off either**. The method returns the row `db.update().returning()`
  gives back. The join is deleted; the read is now the five own-row columns it
  consumes.
- `workflows.triggerWorkflow` read the latest `workflow_versions` row — whose
  `definitionJson` is the entire workflow graph — to use its `id`.
- `feedbucket-ai.loadSubmission` (private, never returned) hydrated the whole
  widget and the whole project to read `widget.projectId` and `project.orgId`.

Commit `bc044673`. 191 → 186.

### 2.3 PAYLOAD — the remaining 109 in-scope sites, and they are the BLOCKED clause.

After the fixes: **186 unprojected relation hydrations. 77 are in excluded
inventory/CRM; 109 are in scope, 52 of them on list paths.**

By module: hr 27 · build 26 · blog 8 · chat 8 · surveys 8 · feedbucket 5 ·
dashboard 4 · expenses 4 · finance 3 · invoices 3 · tasks 3 · billing 2 ·
branches 2 · quotes 2 · support 2 · csat 1 · workflows 1.

Thirteen of the heaviest were opened and read one by one (four by a parallel
reader, each opening the enclosing method and listing every field consumed).
**Ten of thirteen are DTO-bound** — the relation is spread into the returned
object, so narrowing it changes the response:

- `feedbucket-submissions.list` returns `{ data: rows, … }` with the whole widget
- `feedbucket-widgets.list` returns `widgets.map((w) => ({ ...w, … }))`
- `compliance.listAcknowledgments` returns the `findMany` promise directly
- `survey-response.getResponse` returns `answers[].question` whole
- `sprints.getSprint` returns full 38-column ticket rows under `.tickets`
- `billing.getSubscription` returns `subscription.payments` whole
- `chat-message-timeline.enrich` **spreads** `...liftSenderId(msg.replyTo)`
- `expenses.list` returns `expenses: expenseList` with `project: true` per row

This is an independent confirmation of the ticket's existing BLOCKED verdict
rather than a repetition of it: I arrived at it from a different axis (`with:`
rather than top-level `columns:`) and landed on the same wall. **What is missing
is still a product owner deciding which list endpoints may return less.**

---

## 3. The new gate — `pnpm check:relation-hydration`

`src/scripts/check-relation-hydration.mjs`, wired in `package.json` and as a
BLOCKING step in `.github/workflows/ci.yml` beside `check:db-call-count`.

Two hard-fail clauses at an allowance of **0**, chosen because neither needs a
product decision — the same argument that closed the count-path clause:

1. **an unprojected relation onto a table carrying a credential column.** Nobody
   joins in a related row in order to read its bearer token.
2. **an unprojected relation onto the global `users` row.**

Plus a hard fail on an **unresolvable relation name**: a `with:` key that matches
no `relations()` declaration is a query that raises `Cannot read properties of
undefined (reading 'referencedTable')` at build time, which is the exact defect an
earlier pass found live in `projects-tickets-detail.service.ts`.

And a **ratchet at 186** for the population, because a blocked clause deserves a
ceiling and not a pass.

### What is deliberately NOT enforced, and why

The same credential-name pattern applied to the **base** table of an unprojected
read matches **77 sites**, and reading them shows most are correct:
`webhooks-dispatch` must load the signing secret in order to sign with it;
a `survey_collectors.token` **is** the shareable link the endpoint exists to
return; `webhooks.service.ts:39` already strips its secret in the response map
(`page.data.map(({ secret: _, ...rest }) => rest)`) — it hydrates the secret but
never emits it. A gate that fires on 77 sites of which most are right does not get
fixed; it gets an allowance. They are printed under `--list` as a **candidate
list, not a defect list**.

### Coverage is ratcheted alongside findings

A findings-only ratchet cannot catch a detector that quietly stops looking, so
files parsed, tables resolved, relation blocks resolved, query call sites and
relation entries walked all carry floors. **Proved:** restricting the scan to
`findMany` drops findings 191 → **69** — comfortably under the ratchet, so it
would read as a large improvement — and reds on coverage instead (394 query calls
against a floor of 1,650).

### Bite-proof — hermetic, nothing planted in the shared tree

`git archive HEAD src package.json tsconfig.json` into a temp dir with a
symlinked `node_modules`; every defect planted **there**, never in the working
tree that ~10 agents are editing.

| # | planted | rc | what it said |
|---|---|---|---|
| 0 | nothing (clean archive) | **0** | 191 / users 0 / credentials 0 |
| 1 | revert the `trackingToken` exclusion | **1** | `CREDENTIAL-HYDRATION … recruitment-jobs.service.ts:137 jobPostings.applications -> candidate_applications [trackingToken]` |
| 2 | `interviewer: true` (a real users relation) | **1** | `USERS-HYDRATION … candidates.interviews.interviewer` |
| 3 | a `with:` key naming no declared relation | **1** | `UNRESOLVED-RELATION …` |
| 4 | un-project one plain relation | **1** | `RATCHET REGRESSION … 191 -> 192` |
| 5 | project one more | **0** | 190 — the ratchet allows falling |
| 6 | narrow the detector to `findMany` only | **1** | `COVERAGE REGRESSION` (findings would have read 69) |
| 7 | re-run at the lowered ratchet, defect planted | **1** | `186 -> 187` |

`--self-test` → **14 checks, exit 0**.

### Two false-positive classes the gate found in itself before it reported a number

Both are the shape report 21c warned about, and both moved the number:

1. **`columns: USER_COLS as const` read as unprojected.** An `as const`
   initializer is an `AsExpression`, not an object literal, so a per-file constant
   map missed it — and the scanner reported **14 phantom global-`users`
   hydrations** against a spec that correctly says there are none. A `columns:`
   **key** is a projection even when its value cannot be enumerated. 217 → 198.
2. **A projection shared across files was invisible.** `SENDER_MEMBERSHIP_WITH_USER`
   in `chat-message-sender-shape.ts` left six chat sites "unresolved config" until an
   all-files constant map existed; all six were correctly projected. Names that
   collide across files (**80** do) are deliberately *not* resolved, so a collision
   degrades to "unresolved" rather than to a wrong answer — re-running with and
   without that guard gives the same 198, so no colliding name was load-bearing.

---

## 4. What my method MISSES — and one finding that makes it worse

### 4.1 The compiler is a safety net — except on exactly three tables

I assumed a green `pnpm typecheck` proved my narrowings were safe. That assumption
is **half wrong**, and I proved which half, with a scoped `ts.createProgram` over
the archive tree.

On a normal table it holds. Narrowing `candidates.interviews` with
`columns: { calendarSyncToken: false }` and then reading that field gives
`TS2339 Property 'calendarSyncToken' does not exist on type '{ … 14 more …;
scorecards: { … }[]; }'` — the nested relation is typed too — while reading a kept
field (`type`) is clean.

On `jobPostings` it does **not**. `job.applications` is a type error under
`with: { applications: true }`, under `columns: { trackingToken: false }`, and
under `columns: { id: true }` — **all three identical**. The `with:` key itself
draws no error and contributes nothing to the result type.

The mechanism, traced: **three tables carry two `relations()` blocks**, and only
three of 583 —

| table | blocks |
|---|---|
| `users` | `common/auth.ts:274` + `cross-module-relations.ts:5` |
| `jobPostings` | `hr/hiring-core.ts:142` + `hr/hiring-candidates.ts:198` |
| `scorecardTemplates` | `hr/hiring-core.ts:137` + `hr/hiring-interviews.ts:284` |

At **runtime** Drizzle merges them — `extractTablesRelationalConfig` assigns
`tableConfig.relations[relationName] = relation` per name, so both blocks' relations
coexist and the query works. At **type** level only one block reaches
`ExtractTablesWithRelations`, so the other block's relations are runtime-live and
type-invisible.

**Consequence for this pass, stated plainly:** my `recruitment-jobs.service.ts`
fix was **not** protected by the compiler. It rests on the frontend grep and on
reading the method, not on `tsc`. Anyone narrowing a `with:` on `users`,
`jobPostings` or `scorecardTemplates` is flying blind.

**ROUTED, not fixed** — merging two `relations()` blocks into one is schema
territory and would change inferred types across the codebase mid-release.

### 4.2 Other honest gaps

- **No performance measurement.** The machine carries ~8 concurrent agents;
  buffer and timing numbers would be worthless, and I was told not to benchmark.
  Every claim here is about **what the generated SELECT lists**, derived from the
  driver's own column-selection code, not from an observed plan.
- **The credential classifier is a name pattern.** It cannot know that
  `candidate_sources.oauthToken` is a secret and `certifications.credentialId` is
  a professional licence number; the latter is exempted by name, and any new
  false-positive name will have to be exempted the same way.
- **I read 13 of the 109 in-scope sites, not all 109.** The other 96 are counted
  and ratcheted, not adjudicated.
- **Cross-file resolution is by name, not by import.** A `with:`/`columns:` value
  imported under an alias resolves only if the name is unique repo-wide.
- **Nothing here proves the wire shape at runtime.** Per the brief's rule 11 the
  strong form would drive the real service with a double and assert on what the
  read path returns; I asserted on the generated selection instead, which is
  weaker.

---

## 5. Gates

| command | exit | number |
|---|---|---|
| `pnpm typecheck` | **0** | 0 errors (run twice, after each batch of fixes) |
| `pnpm check:spec-typecheck` | **0** | passed |
| `pnpm check:relation-hydration` | **0** | 186 / ratchet 186 · users 0 · credentials 0 · 562 relation entries |
| `pnpm check:relation-hydration:self-test` | **0** | 14 checks |
| `pnpm check:query-projections` | **0** | 1,436 against a ceiling of 1,441 (was 1,441); count/existence 0 |
| `pnpm check:db-call-count` | **0** | ACTIONABLE 35 files / 57 sites |
| `jest --testPathPattern="recruitment\|hr/recruitment"` | **0** | 9 suites / 71 tests |
| `jest --testPathPattern="timesheets\|feedbucket\|workflows"` | **0** | 70 suites / 640 tests |
| `jest --testPathPattern="users-relation-projection\|…-membership-projection\|chat-huddle-wire-shape"` | **0** | 3 suites / 19 tests |

Not run: lint, e2e, any benchmark.

---

## 6. Cross-territory findings (not fixed here)

| id | what | blocker | owner |
|---|---|---|---|
| **CI-UNWIRED** | `check:query-projections` and `check:n1-growing-loops` — ticket 20's and ticket 21's own gates, both landed today — appear in `package.json` and in **no** workflow file. They can never run. `check:relation-hydration` was wired into `ci.yml` in this pass; those two were left alone because turning on enforcement for another lane's ratchet mid-release is a decision, not a fix. | decision | gate-wiring owner (report 35b) |
| **REL-DUP** | Three tables carry two `relations()` blocks; the second block is runtime-live and **type-invisible**, so `with:` narrowing on `users`, `jobPostings` and `scorecardTemplates` is unchecked by `tsc`. §4.1 has the mechanism and the reproduction. | schema territory; merging blocks shifts inferred types repo-wide | schema owner |
| **UNBOUNDED-REL** | `engagement.listAssessments` (`with: { attempts: true }`) and `engagement.listSurveys` (`with: { responses: true }`) put a hard `limit: 100` on the outer list and **none** on the relation, so one page can carry an unbounded number of `assessment_attempts` / `survey_responses` rows, each with an `answers` jsonb. That is a bound problem, not a projection one. | belongs to ticket 22 / `check:unbounded-reads` | HR performance owner |
| **REVIEW-WIDTH** | `performance-reviews` list projects `cycle` to `{ id, name, status }`; the **detail** at `:228` takes the whole 16-column row including `ratingScale` jsonb. The detail payload is wider than the list payload for the same relation, which suggests the narrow one is the intended contract. | DTO decision | HR performance owner |
| **B1-109** | 109 in-scope unprojected relation hydrations remain, ratcheted; 52 on list paths. 13 read, 10 of them DTO-bound. | the same product decision as R-5 | release owner (R-5) |

---

## 7. Disposition

Box 1 stays **OPEN and BLOCKED — R-5, unchanged.** What changed is that a
decision-free clause *inside* it was open and nobody knew, because the gate that
covers the box cannot see inside a `with:`. Four bearer tokens were leaving the
building, two of them on the wire. Those are fixed, both directions are now
enforced at an allowance of zero, and the rest is a ratcheted number instead of an
unmeasured one.
