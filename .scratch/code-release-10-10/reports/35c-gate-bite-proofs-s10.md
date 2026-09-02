# 35c — Bite-proving the last four boxes (session S10)

Predecessors: `35-gate-bite-proofs.md` (S8/S9, 89 gates mutation-tested) and
`35b-gate-wiring.md` (S9b, the CI-invocation surface). This report covers only what
S10 measured, changed and proved. Everything below was executed and read; nothing is
inherited from a previous report or from the ticket text.

---

## 1. The stale number, re-derived

The ticket says "44 of 89 gates are never invoked by any CI workflow". That was true
when written and is not true now. **Re-derived from the workflow files on disk**, by
enumerating every `check-*.mjs`, resolving the package scripts that run it, and
regex-matching each script name against every `.github/workflows/*.yml` in its repo:

| | Measured at HEAD |
|---|---|
| Gate scripts on disk (BE `src/scripts` + FE `scripts`) | **96** |
| Never referenced by any workflow, live half or self-test | **7**, all backend |
| `check:*` package gates | 97 |
| `check:*` package gates never invoked | **3** |

The 7, each with the reason it is not wired:

| Script | Why |
|---|---|
| `check-build-read-cost.mjs` (`db:check-build-reads`) | A seeded-database read-cost **instrument**, not a gate. BE/CLAUDE.md §7 cites it as the worked example of how to measure in buffers. |
| `check-hr-list-read-cost.mjs` (`db:check-hr-reads`) | Same class. |
| `check-request-transaction-cost.mjs` (`db:check-request-txn`) | Same class. |
| `check-cell-load-headroom.mjs` (`cell:load`) | Cell-capacity instrument; needs live cell metrics. |
| `check-benchmark-manifest.mjs` | Authored by another ticket **during this session**; has no package script yet. |
| `check-dead-code.mjs` | Green (see §6) but **untracked in the working tree**. A CI step naming an uncommitted script is a red pipeline, not a gate. |
| `check-repo-paths.mjs` | **Now wired** — `check:repo-paths:self-test` was the last gate script in the backend that no workflow named at all. |

The 3 package gates: FE `check:cycles` — **now wired** (§6); FE `check:properties` — a
legacy superset whose four constituent scripts plus madge are each already wired
individually, so it is a duplicate rather than a gap; BE `check:alert-ack` — its
seven-case self-test is **now wired**, and the live half can never be, because it
requires a nonce a human typed back from the alert channel.

---

## 2. Box 4 (S9b) — `check:lifecycle-predicates`, fixed at source

S9b proved this was a genuine committed regression rather than a broken gate but could
not pin it, because the gate keeps a **count** baseline, not a list, and twelve candidate
files had been touched that day.

**Method that pinned it in one step.** Do not read commits; run the current detector over
each tree and diff its output.

```
git archive <rev> src | tar -x -C <scratch>/lp-<rev>
cp src/scripts/check-lifecycle-predicates.mjs <scratch>/lp-<rev>/src/scripts/
node <scratch>/lp-<rev>/src/scripts/check-lifecycle-predicates.mjs --list
```

Using the HEAD copy of the script against both trees keeps the detector fixed, so the
only variable is the source. Baseline `626a9f20` → **75**. HEAD → **76**. The diff is one
added line plus a rename that nets to zero:

```
> modules/kb/core/kb-tags.service.ts:88  kbArticles (from)
42,44c42,44   gdpr-subject-erasure.service.ts -> gdpr-subject-erasure-authored-content.ts
              (same three candidates; ACCEPTED already names the new path)
```

**The defect.** `42b3ed70` (ticket 15) added the article-ownership assertion that
`setArticleTags` "never had":

```ts
const [article] = await tx
  .select({ id: kbArticles.id })
  .from(kbArticles)
  .where(and(eq(kbArticles.id, articleId), eq(kbArticles.orgId, orgId)))
  .limit(1);
```

Tenant-correct, lifecycle-blind: an **archived** article still accepted a retag. A
security fix that opened a lifecycle hole.

**The fix, and why it is `status` and not `archived_at`.** `kb_articles` carries
`archived_at` as its lifecycle column, and `archive()` sets `status='archived'` **and**
`archived_at`. But `publish()` sets `status='published'` and never clears `archived_at`,
and **nothing in the repository clears it** — it is a one-way stamp. So
`isNull(archivedAt)` would permanently hide any article that was ever archived and later
republished. `status` is the only sound liveness predicate on this table, and the gate
accepts a status predicate on the same table by design (`check-lifecycle-predicates.mjs:215`).

```ts
ne(kbArticles.status, "archived")
```

| Proof | Before | After |
|---|---|---|
| `pnpm check:lifecycle-predicates` | rc=1, 76 vs baseline 75 | **rc=0, 75 vs 75** |
| `pnpm check:lifecycle-predicates:self-test` | rc=1, 21 passed / 1 failed | **rc=0, 22 passed** |
| `jest --testPathPattern="bola-bulk-fail-whole\|kb-tags"` | — | **2 suites, 16 tests, all pass** |

`PRIMARY_CANDIDATE_BASELINE` was **not** raised. The CI step is no longer allow-failure.

---

## 3. Box 1 — what is gateable, and the gate that was buildable

Five classes were named. They are not equally measurable, and saying so is part of the
answer.

| Class | Verdict |
|---|---|
| **Transaction callbacks** | **NEW GATE** — `check:transaction-callbacks`. §4. |
| **Cross-tenant paths** | Already gated. `check:tenant-isolation` re-measured this session: **rc=1 on exactly one service**, `src/modules/organization/setup/org-setup-completed-consumer.service.ts`. |
| **Authorization deny** | **Not built, and buildable.** `check:route-classification` proves all 3,518 handlers declare an exposure (0 undeclared) and `check:module-gate` / `check:scope-application` / `check:record-access` gate the source side, but nothing asserts a deny **test** exists per gated handler. It has `check:tenant-isolation`'s exact shape. Named, not written. |
| **Retries** | `check:idempotent-commands` gates the source-side fence, not the test. |
| **Failure branches** | **Genuinely un-gateable.** Whether a branch is adequately tested is a reading. A scanner claiming to measure it would be the defect this ticket exists to remove. |

---

## 4. `check:transaction-callbacks` (new)

BE/CLAUDE.md §8 has carried the rule since before any gate existed — *"a `db.transaction`
mock must invoke its callback — a bare `jest.fn()` silently voids every assertion inside
the transaction"* — and nothing enforced it. `transaction: jest.fn()` returns `undefined`
and never runs what it was handed. `transaction: jest.fn().mockResolvedValue(x)` is the
same defect wearing a return value: the method resolves happily, so even an assertion on
the RESULT passes.

Verdicts are per spec **file**, because one invoking double exercises the transactional
path the file is about: `INVOKES` · `DECLARED-UNREACHED` (the file asserts
`expect(db.transaction).not.toHaveBeenCalled()`) · `REJECTS` · `VOID`.

**Three false-positive classes were removed from the detector BEFORE any number was
recorded.** Baselining first would have written 13 files of detector noise into the repo
as debt:

| Shape | Effect |
|---|---|
| A double configured after the object literal — `db.transaction.mockImplementation(async (work) => work(db))` | 22 → 11 |
| A cast-then-call implementation — `(cb as (tx: unknown) => Promise<unknown>)(mockDb)` | 11 → 9 |
| A `transaction:` inside a **type annotation** — `db is T & { transaction: (fn: (tx) => Promise<void>) => Promise<void> }` | (folded into the above) |

A fourth was caught by the self-test itself: `jest.fn(` satisfies a naive
`\bfn\s*\(` for a parameter literally named `fn`, so every `mockImplementation(async (fn) => …)`
read as INVOKES whether or not it called anything. Fixed with a negative lookbehind.

**Measured 2026-09-02:** 1,963 spec files · 235 with a transaction double · 407 doubles ·
invokes 223 · declared-unreached 3 · rejects 0 · **VOID 9**.

```
src/common/tenant/__tests__/tenant-db.spec.ts                                  [65:BARE]
src/modules/access/__tests__/holds-and-scope-for.spec.ts                       [45:BARE]
src/modules/build/client-portal/change-requests.isolation.spec.ts              [28,68,85:BARE]
src/modules/finance/ap/vendor-payments-allocations-tenant-isolation.spec.ts    [38:RESOLVES-WITHOUT-INVOKING]
src/modules/finance/banking/reconciliation-tenant-isolation.spec.ts            [31:RESOLVES-WITHOUT-INVOKING]
src/modules/hr/workflows/__tests__/hr-workflow-engine.spec.ts                  [54:BARE]
src/modules/inventory/replenishment/inv-replenishment.service.spec.ts          [22:BARE]
src/modules/leads/lead-status-tenant-isolation.spec.ts                         [36:RESOLVES-WITHOUT-INVOKING]
src/modules/payroll/payroll-new-services-tenant-isolation.spec.ts              [51:BARE]
```

Seven of the nine are refusal tests that never reach the transaction **on purpose** and
never assert it either; adding `expect(db.transaction).not.toHaveBeenCalled()` moves each
to DECLARED-UNREACHED and lowers the ratchet. Spec territory.

**Bite proof.** Planted `src/scripts/__txn-bite-proof.spec.ts` holding
`const db = { transaction: jest.fn(), insert: jest.fn() };` →
**rc=1**, *"10 spec file(s) hold only inert transaction doubles, 1 above the ratchet of 9"*.
Deleted → **rc=0**. Self-test **21/21**.

---

## 5. `check:test-suppressions` (new) — box 2

An honest skip names an infrastructure blocker; a quarantine hides live assertions. They
are the same string to a grep, which is why the distinction did not survive the person who
knew it. `quotes.service.spec.ts:339` and the nine `src/degradation/**` skips had the same
shape and opposite meanings.

**Classification** — CONDITIONAL (runtime-selected, or a helper with a non-literal title;
honest by construction) · PLACEHOLDER (unconditional, body holds no `expect(` — nothing
was ever written) · QUARANTINE (unconditional, body holds live assertions that do not run).
Every unconditional site must appear in `src/scripts/baselines/test-suppressions.json`
with a blocker of at least 12 characters. The gate fails on an unregistered site, a stale
entry, a declared class that does not match the measured one, and on either ratchet growing.

**Measured:** 1,977 spec files · 20 suppression sites + 27 conditional aliases →
**conditional 28 · placeholder 13 · quarantine 6**, rc=0.

- All 13 placeholders are the `src/degradation/**` and `it.todo` set. Every one names a
  real blocker: no S3/R2 endpoint, no Ably key, no provisioned physical replica, no
  isolable integration harness (the services under test open their own transactions via
  `runInNewTenantTransaction` and cannot be rolled back on a shared database), or a source
  change owed first (a `ParseIntPipe`, an `LlmService` override seam).
- The 6 quarantines are the `crm-copilot.service.phase2.spec.ts` `describe.skip` blocks.
  CRM is excluded from this release; they are now recorded **as quarantines**, with that
  written down, and capped.
- `quotes.service.spec.ts:339` re-verified **gone** (S9b replaced it with 8 tests).
- FE has **zero** suppressions of any kind.

**Bite proof.** Planted `src/scripts/__gate-bite-proof.spec.ts` with an `it.skip` holding
an `expect` → **rc=1 on two independent branches** (unregistered site; quarantine 7 above
the ratchet of 6). Deleted → **rc=0**. Self-test **20/20**, covering every failure branch
on synthetic input plus a brace-inside-the-title case.

---

## 6. Box 3 — coverage counts are honest

**The false pass was structural, and one level below the one 35b fixed.** 35b moved the
GATES out from under a red `Lint`. It left `Test` where it was — below `Lint`, in the same
job, in both repos. Measured this session:

| | Exit | Errors |
|---|---|---|
| `pnpm lint` (backend) | **1** | 267 errors, 452 warnings |
| `pnpm lint` (frontend) | **1** | 2,375 errors, 17,184 warnings |

So **neither repository's unit suite had ever executed in CI**. Both now run in a `tests`
job with no `needs:`, unfiltered — which is also the box's own wording: a path-filtered run
that reports green while suites outside the filter are red is a false pass, and CI now
runs no filter at all.

**And the suite it was masking is red.** `jest --coverage --runInBand` on the frontend:
**303 suites, 2,911 tests — 5 suites failed, 7 tests failed.**

```
FAIL features/payroll/runs/runs-page-content.test.tsx
FAIL features/settings/roles/roles-page.test.tsx
FAIL features/directory/workers/workers-page.test.tsx
FAIL hooks/api/accounting/__tests__/cursor-pagination.test.ts
FAIL hooks/api/__tests__/billing-hook-gates.test.tsx
```

`workers-page.test.tsx:120` is an `apiClient.get` argument assertion. These are other
tickets' files; they are reported here because splitting the job is what makes them
visible. **The frontend `tests` job will be red on its first run, and that is the correct
result** — this is what "a false pass" actually looked like in this repository.

**Frontend coverage, measured** (same run, `--coverageReporters=text-summary`):

```
Statements   : 51.90%  (13052/25147)
Branches     : 45.53%  ( 4632/10172)
Functions    : 36.63%  ( 2996/ 8177)
Lines        : 53.34%  (12126/22731)
```

Backend coverage **not run**: a `--coverage` pass over 1,963 spec files is not something
this session could execute honestly under the shared-CPU mutex without displacing other
agents. Reported as not run, not as unknown-but-fine.

**Decision on a coverage floor: recommended, and routed rather than added.**
`coverageThreshold` lives in `frontend/jest.config.cjs` and the backend `package.json`
`jest` block — neither is this ticket's territory, which is `check-*.mjs`, the workflows,
and the `check:*` script entries. The numbers to ratchet at, rounded **down** to the next
integer as a measurement-noise allowance and no further, are **statements 51 · branches 45
· functions 36 · lines 53**. It is worth having and it is not sufficient: a global
percentage is satisfied by trivially-covered files while a critical path stays void, which
is this box's own failure mode wearing a number — the 9 VOID transaction files would move
it by a fraction of a point. It belongs beside the two gates added here, not instead of
them.

**Newly wired this session:** BE `check:repo-paths:self-test` (the last unnamed gate script
in that repo) · BE `check:alert-ack:self-test` · BE `check:replay-ledger` into
`db-gates.yml`, the only job with a cold database (both halves exit 2 without
`COLD_DATABASE_URL`, so there is no hermetic half) · FE `check:cycles`, measured rc=0,
*"No circular dependency found!"* over 5,243 files — root CLAUDE.md §9 claims both repos are
at zero and madge proves it, and the frontend half had never been enforced.

**Backend allow-failure gate steps: 4 → 2.** `check:file-sizes` and
`check:lifecycle-predicates` became blocking; `check:file-sizes` was then returned to
allow-failure at commit time — see §8.

---

## 7. `check:db-call-count` — the `BATCHED` verdict was unusable (routed in-flight)

`FIXED_VERDICTS` held `{"N+1-FIXED", "BATCHED"}`, and any file with either verdict that
was **still detected** was reported as a regression. But `BATCHED` means *"the loop is
still there and still issues a call, and that is correct"* — the detector is **supposed**
to keep matching it. So the one verdict that says "I read this and it is fine" also
guaranteed a red gate, which trains people to reclassify rather than fix.

The baseline is the evidence: **0 files carry `BATCHED`, 75 carry `FALSE-POSITIVE`.** That
is where the batched loops went. A batched loop is not a false positive of the detector; it
is a true positive with an acceptable verdict, and calling it a miss is how a detector gets
tuned blind.

**Fix.** `FIXED_VERDICTS = {"N+1-FIXED"}` — only a claim of *removal* can regress. To stop
`BATCHED` becoming a silent permanent exemption, the inverse check was added:
`checkForUndetectedClaims` reports any `BATCHED` / `FALSE-POSITIVE` / `ACTIONABLE` entry the
detector **no longer matches**, because either the loop was fixed (reclassify) or the
detector lost sight of it (a false negative — the recurring failure shape here).

**Measured 2026-09-02, at the moment of writing:** rc=0 · 2,092 files scanned · 143 detected
· **49 ACTIONABLE across 71 sites** · 0 unclassified · 0 stale · 0 regressed ·
**2 stale verdicts**, ratcheted at 2:

```
UNDETECTED  /cron/cron-hr-retention-documents.ts          (marked FALSE-POSITIVE)
UNDETECTED  /hr/global/compliance-requirements.service.ts (marked FALSE-POSITIVE)
```

Ratcheted rather than blocking because ticket 21's second pass is live in the same baseline
file and the gate is green on everything else.

**Bite proof — two mutations, two kills.** Putting `BATCHED` back into `FIXED_VERDICTS` →
self-test **rc=1**, *"a still-detected BATCHED file was reported as a regression"*. Neutering
`checkForUndetectedClaims` → self-test **rc=1**, *"a BATCHED file the detector no longer
matches was not reported as stale"*. Both restored → **rc=0, 12/12**.

**Ticket-37 filename sweep** (the second half of that routing). All four path-keyed
baselines plus the lifecycle `ACCEPTED` list were cross-referenced against the six files
`c0c88116` created. `unbounded-reads-classification.json` and `db-call-count-classification.json`
both name them and both gates are green (`check:unbounded-reads` rc=0, actionable 0/0 —
the `cron-hr-retention-documents.ts` finding the routing named has since been classified);
`check:lifecycle-predicates`' `ACCEPTED` already names the new GDPR path and its stale check
passes. The one residue is the stale FALSE-POSITIVE above, which the new check found
independently.

---

## 8. The three drifting ratchets, and the two frontend size gates

| Ratchet | Recorded mid-run | Measured at HEAD | Verdict |
|---|---|---|---|
| BE `check:over-300` | 401 vs 394 | **400 vs 394, rc=1** | Open. Baseline deliberately not moved. Ticket 37 is finished without it, so the 6 splits are unowned — routed. |
| BE `check:file-sizes` | 5 files over 500 | **rc=0 → rc=1, 1 file** | Ticket 37 closed the original five. Re-measured ~40 minutes later at commit time: `src/modules/access/access-permission.resolver.ts` at **507**, which crossed during this run under another ticket's edits. Step returned to allow-failure with that reason named. |
| BE `check:lifecycle-predicates` | 76 vs 75 | **75 vs 75, rc=0** | Closed at source. §2. |

FE, re-measured: `check:over-300` **rc=0 at 519/519** — now blocking. `check:file-sizes`
**rc=1 at 3 files** — `features/hr/cases/cases-page-content.tsx` 501,
`hooks/api/notifications-inbox.ts` 534, `hooks/api/notifications-inbox.test.ts` 663.

### The two FE size gates disagreed about test files

`check-over-300.mjs` scanned `*.test.ts(x)`; `check-file-sizes.mjs` exempted them. One
policy, two corpora: a 663-line test file inflated the 300-line ratchet while being exempt
from the 500-line ceiling. **Both directions were measured before choosing:**

| Direction | Measured |
|---|---|
| Exempt `*.test.*` from `check-over-300` | **519 → 509.** Ten files leave the count and no file gets shorter. |
| Scan `*.test.*` in `check-file-sizes` | **2 → 3** over 500; the addition is `hooks/api/notifications-inbox.test.ts` at 663. |

Tightening was chosen. §7 lists its exceptions — generated files, unmodified shadcn
primitives, `*.d.ts` — and tests are not among them; and dropping ten files from a ratchet
without shortening one of them is a ratchet moved to make a number smaller, which this
release forbids. Revealing one row of debt is honest where hiding ten is not.

Pinned by three new self-test assertions (a `*.test.ts` over 500 is a violation, a
`*.test.tsx` over 500 is a violation, a `*.d.ts` over 500 is still exempt): 42 → **45 passed**.
Bite-proven: restoring the exclusion → **rc=1** with both new assertions named; removing it
again → **rc=0**.

### `check-import-direction` had the mirror-image bug, settled the other way

Its walker excluded `*.spec.ts(x)`, of which the frontend package has **zero**, and scanned
`*.test.ts(x)`, of which it has **303** — the intended exemption had never applied to
anything. The distinction from the case above is the rule, not the convenience: file size
is a property of the file, so a test file's length is a real fact; import **direction** is a
property of the production module graph, and the `features/__tests__/*-a11y.test.tsx`
module-sweep harness importing every feature is not the inversion the rule forbids.
`check:query-scope` already carries this exemption for that same harness.

Corpus narrowed **and `BASELINE_CROSS_FEATURE` lowered 210 → 194 in the same change**, so
the 16 that left were not banked as headroom. Bite-proven: reverting the corpus change now
reads **222 against 194** and reds the gate, and the self-test fails by name.

`shared-imports-feature` remains **20 against 19, rc=1** — a genuine new violation
(`398359abe` added a static `LeaveOrganizationMenuItem` import from
`@/features/settings/organization/leave-organization-control` into
`components/layout/header/org-switcher.tsx`). **Deliberately not baselined away.** Frontend
component territory.

---

## 9. Every command run, with its exit code

| Command | rc | Number |
|---|---|---|
| `pnpm check:lifecycle-predicates` (before) | 1 | 76 vs 75 |
| `pnpm check:lifecycle-predicates` (after) | **0** | 75 vs 75 |
| `pnpm check:lifecycle-predicates:self-test` | **0** | 22 passed (was 21+1F) |
| `jest --testPathPattern="bola-bulk-fail-whole\|kb-tags"` | **0** | 2 suites, 16 tests |
| `pnpm check:test-suppressions` | **0** | 20 sites, 28/13/6 |
| `pnpm check:test-suppressions` (defect planted) | **1** | quarantine 7 > 6 |
| `pnpm check:test-suppressions:self-test` | **0** | 20 passed |
| `pnpm check:transaction-callbacks` | **0** | VOID 9 (ratchet 9) |
| `pnpm check:transaction-callbacks` (defect planted) | **1** | VOID 10 > 9 |
| `pnpm check:transaction-callbacks:self-test` | **0** | 21 passed |
| `pnpm check:db-call-count` | **0** | 143 detected, 49 ACTIONABLE / 71 sites, 2 stale verdicts |
| `pnpm check:db-call-count:self-test` | **0** | 12 passed |
| `pnpm check:db-call-count:self-test` (BATCHED restored to FIXED_VERDICTS) | **1** | named kill |
| `pnpm check:db-call-count:self-test` (undetected-claims neutered) | **1** | named kill |
| `pnpm check:tenant-isolation` | 1 | 1 uncovered service |
| `pnpm check:unbounded-reads` | **0** | actionable 0 offset / 0 unbounded |
| `pnpm check:file-sizes` (BE) | 1 | 1 file, 507 lines |
| `pnpm check:over-300` (BE) | 1 | 400 vs 394 |
| `pnpm check:repo-paths:self-test` (BE) | **0** | 9 passed |
| `pnpm check:alert-ack:self-test` | **0** | 7 cases |
| `pnpm check:alert-ack` | 2 | needs `ALERT_WEBHOOK_URL` + an operator nonce |
| `pnpm check:replay-ledger:self-test` | 2 | needs `COLD_DATABASE_URL` |
| `pnpm check:dead-code` (BE) | **0** | knip 0 unused, 35 verdicts, none stale |
| `pnpm check:file-sizes` (FE) | 1 | 3 files (2 before the alignment) |
| `pnpm check:file-sizes:self-test` (FE) | **0** | 45 passed (was 42) |
| `pnpm check:over-300` (FE) | **0** | 519 vs 519 |
| `pnpm check:import-direction` (FE) | 1 | cross-feature 194/194; shared 20 vs 19 |
| `pnpm check:import-direction:self-test` (FE) | **0** | passed, with the new corpus assertion |
| `pnpm check:cycles` (FE) | **0** | no circular dependency, 5,243 files |
| `pnpm lint` (BE) | 1 | 267 errors |
| `pnpm lint` (FE) | 1 | 2,375 errors |
| `jest --coverage --runInBand` (FE) | 1 | 303 suites, 2,911 tests, **5 suites / 7 tests red**; statements 51.90%, branches 45.53%, functions 36.63%, lines 53.34% |
| `pnpm typecheck` (BE, after the source fix) | **0** | — |

---

## 10. Cross-territory findings

1. **`shared-imports-feature` 20 vs 19** — `components/layout/header/org-switcher.tsx`
   statically imports `@/features/settings/organization/leave-organization-control`.
   Frontend component territory. Not baselined away.
2. **`check:tenant-isolation` rc=1** on
   `src/modules/organization/setup/org-setup-completed-consumer.service.ts` — no
   cross-tenant negative test. Spec territory.
3. **9 spec files hold only inert `db.transaction` doubles** (§4). Seven are one
   `expect(db.transaction).not.toHaveBeenCalled()` away from DECLARED-UNREACHED. Spec
   territory.
4. **BE `check:over-300` 400 vs 394** — 6 files to split. Ticket 37 finished without them;
   now unowned.
5. **BE `check:file-sizes` rc=1** — `src/modules/access/access-permission.resolver.ts` at
   507, crossed during this run.
6. **FE unit suite is red** — 5 suites / 7 tests: `features/payroll/runs/runs-page-content.test.tsx`,
   `features/settings/roles/roles-page.test.tsx`, `features/directory/workers/workers-page.test.tsx`,
   `hooks/api/accounting/__tests__/cursor-pagination.test.ts`,
   `hooks/api/__tests__/billing-hook-gates.test.tsx`. Invisible until now because the suite
   had never run in CI.
6b. **A frontend `coverageThreshold` is recommended and unowned by this ticket** —
   statements 51 · branches 45 · functions 36 · lines 53, in `frontend/jest.config.cjs`.
7. **2 stale FALSE-POSITIVE verdicts** in `db-call-count-classification.json` (§7). Ticket
   21's baseline file.
8. **`check:dead-code` (BE) is green and unwired** because its script is untracked. Wire the
   CI step in the same commit that lands `src/scripts/check-dead-code.mjs`.
9. **A NEW DEFECT recorded by S9b remains open** and is repeated here so it is not lost:
   `QuotesService.update()` gates approval on `input.discountPercent` but recomputes money
   only when `input.lineItems` is also present, and `quotes` stores `discount_amount` with
   no `discount_percent` column — so a discount-only PATCH raises an approval for a price
   change that never happens.
