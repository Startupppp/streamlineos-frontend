# 35b — Wiring the gates ticket 35 proved

Session S9b. Measured 2026-09-02 on this machine (macOS, sibling-repo layout).
BE = `streamlineos-backend`, FE = `streamlineos-frontend/frontend`.

This closes the four findings in §4 of `35-gate-bite-proofs.md` — the ones that
sat outside gate-script territory. It does not touch a single `check-*.mjs`.

---

## 0. The finding that reframes the other three

Ticket 35 measured that **44 of 89 gates are never invoked by any CI workflow**.
That number is right and it is not the whole defect. Three measurements on top of
it, all from GitHub's own run history rather than from reading YAML:

**(i) Two of the five workflow files have never executed a step.**
`streamlineos-frontend/.github/workflows/backend.yml` and `seeded-e2e.yml` both
set `working-directory: backend` and `package_json_file: backend/package.json`.
The frontend repository has no `backend/` directory — `git ls-files | grep -c
'^backend/'` returns **0**. Every run dies at step 3:

```
FE run 33601538287  "Backend CI"  52s  ##[error]Error: No pnpm version is specified.
FE run 33601538365  "Seeded E2E"  35s  same
```

`gh run view 33601538287` shows `X Setup pnpm` and then `-` for all 40 following
steps. Eleven backend gates were named only there — `check:unbounded-reads`,
`check:tenant-relationships`, `check:migration-discipline`,
`check:openapi-coverage`, `check:bodyless-conflicts`, `check:hr-table-freeze`,
`check:placement-bypass`, `check:owner-authority`, `check:migration-ledger`,
`check:operation-ids`, `check:bulk-id-limits` — so they counted as "wired" in a
text scan and had never run. These two workflows are also the permanent red
"Backend CI" / "Seeded E2E" checks on the frontend repo's main branch.

**(ii) In BOTH live workflows, every gate is sequenced after `Lint`, and Lint is
red.** This is the larger half.

```
BE run 33622305895  "Backend CI"  ✓Typecheck  X Lint  → 26 gate steps all `-`
FE run 33622293615  "Frontend CI/CD"  X Lint  → Type Check and 10 gate steps all `-`
```

So the honest count is not "44 of 89 gates do not run". It is **no gate in either
repository has executed in CI since lint went red** — the 44 were never wired,
and the other 45 were wired behind a step that fails first. A gate sequenced
after a red step is not a gate.

**(iii) The fix is structural, and it is the main change in this report.** Both
workflows now have a `gates` job that carries no `needs:`, so build health and
enforcement fail independently.

---

## 1. Finding 1 — 44 uninvoked gates, wired

### Population

My own sweep counts a slightly larger population than ticket 35's 44, for three
reasons, all stated so the numbers can be reconciled: I include `verify:*` gates
(6 more), `check:public-object-urls` was registered after that report, and I
count `check:route-budgets`. Measured population:

| | Count |
|---|---|
| Gate scripts registered in `package.json` (BE 70 · FE 25), excluding `:self-test`/`:emit`/`:baseline` | **95** |
| Never named by any workflow file (BE 36 · FE 15) | **51** |
| Named only by the two dead FE workflows | **11** |
| Gate script files on disk with no package script at all (BE 4 · FE 1) | **5** |
| **Total gates addressed** | **68** |

(51 + 11 + 5 = 67; `BE check:over-300` appears in both the never-invoked and the
new-script arithmetic once corrected for the cross-repo name collision noted
below, giving 68.)

### Three-way classification — 51 / 8 / 9

Every gate below was run individually and its exit code read. Full per-gate
listing at the end of this section.

**(a) Wired as BLOCKING — 51.** All measured rc=0 (self-test and gate) at the
time of wiring. 47 in `BE/ci.yml`'s and `FE/frontend.yml`'s new `gates` jobs,
4 in `BE/db-gates.yml` (schedule/dispatch, because they need a database that CI
can bootstrap: `check:audit-log-privileges`, `check:retention-coverage` live,
`check:set-null-column-lists` catalog half, `check:migration-ledger` live).

**(b) Wired but ALLOW-FAILURE, each with a named reason — 8.**

| Gate | Measured reason (recorded in the step's comment) |
|---|---|
| BE `check:file-sizes` | rc=1. The reason moved twice inside one hour while ticket 37 worked the tree; it is now "a file at or below 500 lines must lose its row" — stale bookkeeping in `file-size-exceptions.md`, not a file over the ceiling. |
| BE `check:over-300` | rc=1, 400 files over 300 lines, 6 above the baseline of 394. Ticket 37. |
| BE `check:lifecycle-predicates` | rc=1, 76 vs baseline 75. See §5 — genuine regression, ticket 06. |
| BE `check:tenant-relationships` | rc=1, 486 single-column tenant FKs remain actionable. Carried over from the dead workflow, which already had `continue-on-error` for this reason. |
| FE `check:routes` | rc=1, 1 business route handler: `app/api/media/image/route.ts`. Root CLAUDE.md §5 permits only the NextAuth route. Real finding. |
| FE `check:file-sizes` | rc=1, 1 file over 500 lines: `hooks/api/notifications-inbox.ts` (507). |
| FE `check:web-vitals-budget` (live) | rc=1, 5 measured breaches — mobile FCP p75 2646ms > 1800, mobile TTFB p95 3727ms > 600, desktop TTFB p95 1430ms > 400, +2. Ticket 26. Its self-test stays blocking. |
| FE `check:import-direction` | rc=1, 222/210 and 20/19. See §3. |

(`check:tenant-relationships` came from the dead-workflow group rather than the
never-invoked group. `check:db-call-count` was wired allow-failure at rc=1 and
was promoted to blocking before commit — see §2.)

Three FE gates that were nominally blocking but had never executed also had to
be softened once the `gates` job made them real: `check:over-300` (520 files,
1 above the baseline of 519), `check:dead-code` (3 unclassified exports —
`project-charts.tsx:CHART_COLORS`, `mail-compose-sheet.tsx:MailComposeMode`,
`media-image-schema.ts:MediaImageQuery`), and `check:route-bundle-budget`
(6 routes declare a budget and were never measured). Each carries its number in
the step comment.

**(c) Genuinely cannot run in CI — 9, prerequisite named for each.**

| Gate | Prerequisite it cannot get |
|---|---|
| BE `check:alert-ack` | `ALERT_WEBHOOK_URL` **and a human** acknowledging a drill alert inside the TTL. Its self-test is already run, inside `check:alert-system`. |
| BE `check:replay-ledger` | `COLD_DATABASE_URL`. Its *self-test* also exits 2 without one, so even the hermetic half cannot run. |
| BE `verify:chat-mentions` | A booted API, a live `ABLY_API_KEY` and a database — it observes a real subscriber. |
| BE `verify:multi-org-employment` | A database with a real multi-org user, plus a Nest bootstrap. |
| BE `verify:membership-revocation` | Same. |
| BE `verify:rbac-integrity` (live) | A database. Its self-test is blocking in `gates`. |
| BE `verify:permissions` | Nothing — it is a duplicate alias of `check:permission-keys` (same script, same args), which is blocking in `gates`. Wiring it twice would be noise. |
| FE `check:properties` | Nothing — it is a composite alias for four gates now wired individually, plus `madge`, which `check:cycles` already runs. |
| FE `verify:server-data-seam` | **The gate is broken.** It asserts the literal `cache(async <T>(token: string, path: string)` in `lib/server-fetch.ts`. The seam is intact — `const serverFetch = cache(async <T>(\n token: string,\n path: string,` at line 35 — but Prettier wrapped it, so a formatting-sensitive `includes()` fails. Not wired; one-line needle change, reported below. |

### After

Re-running the same sweep against the new workflows:

```
gates registered:            100  (BE 74 · FE 26 — 5 new package scripts)
never named by any workflow:   9  (BE 7 · FE 2 — exactly the (c) list)
named only by a dead workflow: 0
```

Caveat on the "before" number: my first sweep matched each repo's gate names
against *both* repos' workflow files, so `check:over-300` and `check:file-sizes`
(which exist in both) cross-matched. The final classification in this report
scopes each repo's gates to its own workflows.

### What changed in the workflow files

**`BE/.github/workflows/ci.yml`** — split into `verify` (typecheck, lint, test,
build, knip) and a new `gates` job with **70 steps** and no `needs:`. Every
`check:*` step moved out of `verify`. `check:audit-log-privileges` added to the
existing `tenant-isolation` job, which already carries `APP_DATABASE_URL`.

**`BE/.github/workflows/db-gates.yml`** — new. The database-bearing jobs from the
two dead FE workflows, ported to the repository where `pnpm/action-setup` can
find a `package.json`: `bootstrapped` (db:bootstrap → migration-ledger →
set-null catalog half → retention-coverage → e2e:ci), `migration-proof`, and
`tenant-relationships` (db:bootstrap-role → tenant-relationships → e2e:seeded).
**`on:` is `schedule` + `workflow_dispatch` only, deliberately.** These jobs have
never executed anywhere, so I cannot claim they are green, and wiring an unproven
job as a required check is how a pipeline gets muted. Dispatch it, read it, then
promote what passes.

**`FE/.github/workflows/backend.yml`** and **`seeded-e2e.yml`** — deleted. Every
static gate they named now runs in `BE/ci.yml`; every database-bearing job is in
`BE/db-gates.yml`. What was *not* ported, and why: SBOM generation, artifact hash
recording and the two upload steps (release artifacts, not gates); the
`docker build` step; `txn-ceiling` and `build-read-ceiling` (both need a booted
API and a seeded load, and both are `needs: [backend]` on a job that has never
run). These are named here rather than silently dropped.

**`FE/.github/workflows/frontend.yml`** — split the same way: `frontend` (lint,
type-check, tests, build) and a `gates` job with **29 steps**, no `needs:`.

---

## 2. Finding 2 — the false `N+1-FIXED` claims

Ticket 35 measured 8. At the time I ran it, **7**: `payroll/runs/inputs.service.ts`
now reports 0 loop DB calls, because the other agent's in-flight fix is in the
tree. I did not touch its entry.

I read every reported site before reclassifying. Two of the seven turned out to
be artifacts of the newly-fixed detector, and saying so is part of reporting
honestly — the point is that `N+1-FIXED` was false, not that every file is
guilty.

| File | New verdict | Why |
|---|---|---|
| `/build/core/projects-webhooks-dispatch.service.ts` | ACTIONABLE | `for (const delivery of deliveries) await OutboxWriter.emit(tx, …)` at 177/178 — one write per delivery. Its own baseline note already admitted this. |
| `/kb/wiki/kb-import-export.service.ts` | ACTIONABLE | `for (const parentId of parentIds)` issuing `select max(sortOrder)` per parent at 127/129. The note only covered `importPages`. |
| `/kb/wiki/kb-page-duplicate.service.ts` | ACTIONABLE | `await tx.insert(kbPages)` at 78 inside `for (const [originalId, original] of subtreeMap.entries())` at 61 — one insert per node. |
| `/organization/onboarding/workspace-onboarding.service.ts` | ACTIONABLE | Nested `for` at 245/247 issuing `tx.update(orgUnits)` per team at 251. The note said "only the per-team reparent stays, bounded at ~4" — bounded is not fixed. |
| `/surveys/survey-builder.service.ts` | ACTIONABLE | `reorder()` — one `tx.update(surveySections)` per section (165/167) and one `tx.update(surveyQuestions)` per question (171/173). The note only covered `duplicateQuestion`/`replaceChoices`. |
| `/cron/cron-leave.service.ts` | FALSE-POSITIVE | Both sites (134/136, 322/324) are `while (true)` **keyset pagination** loops. Each iteration reads the next page; that is the correct bounded-read pattern, and the source comment says so. |
| `/support/core/support-kb.service.ts` | FALSE-POSITIVE | All three "loop" lines (284/285/291) are single-line `.map`/`.filter`/`.values(...map(...))` callbacks; the insert they are matched against (302) is at method top level inside `if (tagRows.length > 0)`. `syncArticleTags` issues 4 statements regardless of tag count. |

Result:

```
before my change    ACTIONABLE: 0 file(s)   7 REGRESSION(s)   102 UNCLASSIFIED   rc=1
after my change     ACTIONABLE: 5 file(s) (9 call sites)   0 REGRESSION(s)   101 UNCLASSIFIED   rc=1
```

**I did not add the 101 unclassified files to the baseline** — a baseline raised
to turn a regression green is the defect this ticket forbids, and leaving the
gate honestly red was the intended outcome. Every note records the exact line
numbers so the claim can be checked rather than believed.

**Then the shared tree moved.** While I was writing this report, ticket 21
triaged all 101 in the same file (66 → 168 entries, `mtime 19:18`), and the gate
now reads:

```
final   ACTIONABLE: 49 file(s) (71 call sites)   0 REGRESSION(s)   0 UNCLASSIFIED   rc=0
```

That is green *and* honest — 49 files of real N+1 debt are recorded and
ratcheted rather than declared fixed — so the step was promoted from
allow-failure to **blocking** before commit. The commit therefore carries ticket
21's 102 classifications alongside my 7 reclassifications, because they live in
one file and staging it by path takes the file as it is on disk; this is called
out in the commit body. My 7 verdicts are intact inside it (verified by reading
them back after their write).

### A defect in the newly-fixed detector, quantified

The two FALSE-POSITIVE rows are one bug. `LOOP_OPENERS` includes `.map(`,
`.filter(`, `.flatMap(`, `.reduce(`, `.forEach(`. A single-line callback whose
body contains an object literal — `.map((name) => ({ name, slug: slugify(name) }))`
— satisfies `loopBodyOpenedOnLine` (it has a `{`) so the "balanced single-line
loop" skip at line 182 is not taken; its braces net to zero so `enteredBody`
never becomes true; and the scanner then walks up to 30 lines forward and adopts
the *next* multi-line block as the loop body. In `support-kb.service.ts` that is
18 lines later.

Measured across `src/modules`, running the exported `detectLoopDbCalls` directly:
**8 files (of 153 with any hit) have hits only from array-callback openers, and
18 of 224 hit sites are one.** So roughly 5% noise — the 41 → 147 improvement is
overwhelmingly real. Fix belongs in `src/scripts/check-db-call-count.mjs`
(ticket 35): require `enteredBody` to have been set by a brace that is still open
at end of line, or exclude callback openers that balance on their own line.

---

## 3. Finding 3 — five unwired gate scripts, and the 222

Five package scripts added (plus their `:self-test` twins where one exists):

| New script | Gate rc | Self-test rc |
|---|---|---|
| BE `check:cache-key-shapes` | 0 | 0 |
| BE `check:hr-pagination` | 0 (35 known violations, baseline 60 — ratchet OK) | 0 |
| BE `check:namespace-coverage` | 0 (0 stale namespaces, 75 reads / 76 bumps) | 0 |
| BE `check:replay-ledger` | 2 (`COLD_DATABASE_URL` required) | 2 |
| FE `check:import-direction` | 1 | 0 |

### The 222, before and after

**Before: unrunnable.** No package script existed, so nobody had ever seen the
number and the in-script baselines had drifted unenforced.

**After: runnable and measured, at HEAD as well as in the working tree.** I
replicated the gate's classification over `git cat-file` blobs of HEAD and got
exactly the gate's numbers, which validates the replication:

```
working tree   shared-imports-feature 20 (baseline 19)   cross-feature-import 222 (baseline 210)
HEAD           shared-imports-feature 20                 cross-feature-import 222
```

So this is committed debt, not another agent's in-flight work.

**The cross-feature delta is fully attributable and is not a §9 violation.**
28 of the 222 come from `features/__tests__/*-a11y.test.tsx` — module-sweep
accessibility harnesses that import one skeleton from each of a dozen features by
design, added on 2026-09-01 in `e03fe10e6` and `1698b2bff`. Excluding
`*.test.ts(x)` — the walker already excludes `*.spec.ts(x)`, and the query-scope
gate already carries exactly this exemption for exactly these files (`1698b2bff`
is literally titled "exempt the test harness from the query-scope gate") — gives:

```
cross-feature-import excluding *.test.ts(x):  194   (baseline 210)  → BELOW baseline
```

That is a one-line change to the walker in
`frontend/scripts/check-import-direction.mjs`, which is ticket 35's territory and
which I did not touch. **With it, this step becomes blocking.**

**The shared delta is a genuine new violation.** Dating every one of the 20 with
`git log -S`, the newest is `398359abe` (2026-09-02), which added a static
`import { LeaveOrganizationMenuItem } from
"@/features/settings/organization/leave-organization-control"` to
`components/layout/header/org-switcher.tsx`. The file already had a `dynamic()`
import of the same module, so it counts twice; merging them would lower the
number without fixing anything (the dynamic import exists to code-split the
dialog), so I did not. The real fix is relocating `leave-organization-control`
out of `features/`, which is not a one-line import move.

**I did not raise either baseline**, and I could not lower one — both constants
live inside the gate script.

---

## 4. Finding 4 — suppressed coverage on a money path

`src/modules/quotes/quotes.service.spec.ts:339` held an empty-bodied
`it.skip("create: sets approvalStatus=pending when discount exceeds
maxDiscountPercent setting")` while the logic is live at `quotes.service.ts:141`
(create) and `:245` (update). Replaced with **8 real tests**, covering both call
sites and both directions:

```
create: over the ceiling         → approvalStatus "pending", and 1000.00/250.00/750.00 money math
create: within the ceiling       → approvalStatus undefined, 950.00
create: no ceiling configured    → undefined even at 90%
create: zero discount, zero ceiling → undefined (pins the `discountPercent > 0` guard)
update: over the ceiling         → approvalStatus "pending" on the patch
update: within the ceiling       → the patch has no approvalStatus key at all
update: no ceiling configured    → same
update: no discount in payload   → the settings row is never read
```

Proof they bite, not just pass. Neutering both assignments in the service
(`approvalStatus = undefined` in create; `updateData.approvalStatus = undefined`
in update) kills exactly the two positive tests:

```
unmutated   23 passed, 23 total
mutated      2 failed, 21 passed
```

The service file was restored byte-for-byte (`git diff --stat` empty, `git status`
clean) — no application source is modified by this ticket.

### A defect found while writing them, NOT encoded in a test

`update()` gates approval on `input.discountPercent` at line 240, but recomputes
`discountAmount`/`netAmount` only inside `if (input.lineItems)` at line 255. The
`quotes` table stores `discount_amount`, never `discount_percent`
(`db/schema/crm/invoicing.ts:179`). So:

> `PATCH /quotes/:id { discountPercent: 25 }` with no `lineItems` sets
> `approvalStatus = "pending"` and **changes no money at all**. The discount is
> not stored anywhere, and on approval the quote still carries its old
> `netAmount`. An approval workflow fires for a price change that never happened.

`create()` does not have this shape — it computes the amounts in the same block.
Not tested here, per the instruction not to encode a bug in a test. Needs a
product decision (persist `discount_percent`, or reject a discount-only update)
before it can be gated.

---

## 5. `check:lifecycle-predicates` — genuine regression, not a broken gate

Diagnosis: **genuine new violation.**

```
gate       FAIL — 76 primary reads of a lifecycle table carry no predicate, 1 above the recorded baseline of 75
self-test  FAIL: the three-way filter keeps the primary-read candidate set actionable (found 76)   1 failed, 21 passed
```

The self-test's failing assertion is not a fixture assertion. It runs the **real**
detector over the **real** source tree and asserts `primaryCandidates <=
PRIMARY_CANDIDATE_BASELINE` — the same ratchet the gate asserts. So a source
regression necessarily reds both, which is exactly what happened, and the gate is
sound. The other 21 assertions pass.

It is **committed**, not another agent's in-flight work: I intersected the 53
files contributing the 76 candidates with `git status --porcelain src` and the
intersection is empty. I could not pin *which* read is the new one, because the
gate records a count baseline, not a list, and 12 of the 53 candidate files were
last touched today. Narrowed suspect set:

```
gdpr/gdpr-subject-erasure.service.ts   kb/retrieval/kb-content-adapter.ts
kb/wiki/kb-spaces.service.ts           chat/chat-channels.service.ts
chat/chat-membership-lookup.ts         directory/employment-facts.service.ts
hr/directory/employee-mutations.service.ts   chat/chat-huddles.service.ts
chat/chat-pins.service.ts              chat/chat-reactions.service.ts
chat/chat-summarize.service.ts         realtime/web-push.service.ts
```

I did not fix it: I cannot identify the offending read without guessing, and
guessing here means adding a predicate to a read that may be deliberately
unfiltered. Ticket 06. Wired allow-failure with this reason in the step comment.
**Raising `PRIMARY_CANDIDATE_BASELINE` to 76 is the forbidden move and I did not
make it.**

---

## 6. Commands run

Every gate wired as blocking was run individually; the two `gates` jobs were then
executed end to end by parsing the YAML and running each step's `run:` in the
job's `working-directory` with its `env:`.

**BE `gates` job — 70 steps**

```
ok = 58   soft-fail = 4   HARD FAIL = 3   skipped = 4
```

Skipped locally, not by CI: `openapi:check` (needs the generation env block),
`check:spec-typecheck` (run separately, rc=0), `check:vulnerabilities` and
`check:licenses` (network).

The 3 hard failures are all traceable to **untracked or uncommitted work by other
agents**, and all three would be green on a clean checkout of HEAD:

| Step | Cause | Evidence |
|---|---|---|
| `check:kebab-case` | `src/scripts/.tmp-dcc-lib.mjs` | `git status` says `??`. A leftover mutation-harness artifact; nothing in `src/scripts/*.mjs` references it. Absent from a CI checkout. |
| `check:unbounded-reads` | `/cron/cron-hr-retention-documents.ts:130` unclassified | `git status` says `??` — a brand-new untracked file. The gate is doing its job; it will red that agent's commit until they classify it. |
| `check:route-budgets` | 2 measured values above ceiling | `src/scripts/check-route-budgets.mjs`, `read-cost-budgets.mjs`, `run-read-cost-budgets.mjs` are all ` M` and `measure-route-budgets.mjs` is `??` — ticket 22's in-flight work. At HEAD the gate exits 0 printing INCONCLUSIVE. The two breaches are real findings for ticket 22: `GET /notifications` measuredDbCalls=5 > 3, `GET /notifications/unread-count` measuredBufferBlocks=10234 > 3000. |

**FE `gates` job — 26 steps**

```
ok = 17   soft-fail = 7   HARD FAIL = 1   skipped = 0
```

The one hard failure is `check:route-thinness` — 1 in-scope thick route,
`app/(authenticated)/accounting/setup/page.tsx` at 305 lines against a baseline
of 0. `git status` shows it ` M`: **uncommitted**, last committed 2026-08-25.
Green at HEAD, and a ratchet at 0 is exactly the case for a hard gate, so it
stays blocking.

**Individually**

```
check:db-call-count            gate=1 (deliberate)  self-test=0
check:import-direction (FE)    gate=1               self-test=0
check:cache-key-shapes         gate=0               self-test=0
check:hr-pagination            gate=0               self-test=0
check:namespace-coverage       gate=0               self-test=0
check:replay-ledger            gate=2               self-test=2
check:lifecycle-predicates     gate=1               self-test=1
check:hardcoded-secrets        gate=0               self-test=0   (see below)
check:spec-typecheck           gate=0               self-test=0
jest --testPathPattern=quotes.service.spec           23 passed / 23
   with the service mutated                          2 failed / 23
BE pnpm typecheck              rc=2 — 8 errors, none mine (see Honest gaps)
FE pnpm type-check             rc=0 — 0 errors
```

**A gate caught me.** My first draft of `db-gates.yml` used
`postgres://user:password@localhost:5432/streamlineos`, and
`check:hardcoded-secrets` flagged it `[url-credential]` — the newly-wired
security gate biting on the newly-added file within the same session. Rewritten
to the `postgres://ci:ci@127.0.0.1:5432/ci` form the existing `ci.yml` uses;
gate back to rc=0 over 15,725 files.

**Workflow validation.** All three files parse, and every `pnpm <script>` they
name resolves in the right `package.json`: `ci.yml` 96 steps, `db-gates.yml`
23 steps, `frontend.yml` 37 steps, `missing = none` for all three.

---

## 7. Files changed

**Backend** (`streamlineos-backend`)

```
.github/workflows/ci.yml                                   restructured: verify + gates + tenant-isolation + live-evals
.github/workflows/db-gates.yml                             new
package.json                                               +8 scripts (4 gates + 4 self-tests)
src/scripts/baselines/db-call-count-classification.json    7 entries reclassified
src/modules/quotes/quotes.service.spec.ts                  it.skip -> 8 tests
```

**Frontend** (`streamlineos-frontend`)

```
.github/workflows/frontend.yml     restructured: frontend + gates
.github/workflows/backend.yml      DELETED (never executed a step)
.github/workflows/seeded-e2e.yml   DELETED (never executed a step)
frontend/package.json              +2 scripts (check:import-direction + self-test)
```

No `check-*.mjs` was modified in either repository. No application source was
modified (the quotes service mutation was reverted and verified clean).

---

## 8. Findings I was not allowed to fix

1. **`check-db-call-count.mjs` array-callback false positives** (§2). 8 files,
   18 of 224 hit sites. One-line fix in the walker. Ticket 35's file.
2. **`check-import-direction.mjs` should exclude `*.test.ts(x)`** (§3). It already
   excludes `*.spec.ts(x)`; the sibling query-scope gate already carries this
   exact exemption for these exact files. With it, 194 vs baseline 210 and the
   step becomes blocking. Ticket 35's file.
3. **`verify-server-data-seam.mjs` asserts a pre-Prettier literal** (§1c). The
   seam is intact; the needle is not. One line.
4. **`quotes.service.ts` discount-only update changes no money** (§4). Needs a
   product decision, not a test.
5. **`check:lifecycle-predicates` +1 regression** (§5). Ticket 06, unowned.
6. **`GET /notifications` route budget breaches** (§6). Ticket 22.
7. **`src/scripts/.tmp-dcc-lib.mjs`** — untracked leftover inside `src/`, currently
   reds `check:kebab-case` locally. Left in place because it may be another
   agent's live scratch.
8. **`db-gates.yml` has never run anywhere.** Its three jobs are dispatch-only for
   that reason. Someone with dispatch rights should run it once and promote the
   jobs that pass into `ci.yml`.
9. **Lint is red in both repos** (BE 258 / FE 48 errors, pre-existing). The `gates`
   split means it no longer hides the gates, but it still reds `verify` and
   `frontend` on every push.
