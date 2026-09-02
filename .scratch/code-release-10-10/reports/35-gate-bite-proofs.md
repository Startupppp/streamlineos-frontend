# 35 — Gate bite-proofs

Session S9. Measured 2026-09-02 on this machine (macOS, sibling-repo layout).
BE = `streamlineos-backend`, FE = `streamlineos-frontend/frontend`.

This report **replaces** the S8 report. S8's repairs are all present on disk and
committed — I verified that first — but S8 classified gates by reading their
self-tests. Reading cannot tell a self-test that asserts its detector's output
from one that merely calls it. This session measured that instead.

---

## 0. What S8 left, verified against artifacts

S8's report claimed 5 vacuous self-tests rewritten, 6 INERT gates repaired, 4
self-tests added and 2 new path resolvers. All of it is on disk and committed
(`BE 626a9f20`, `FE 6d041ab5c` and earlier). Both `check-repo-paths.mjs` files
exist. Nothing had regressed. **Zero ticket boxes were ticked**, which is what
sent me here; the work was real, the proof standard was not.

The gap: S8 asserted "BITE" for ~50 self-tests it did not mutation-test, and its
own text says so. Three of those were not biting.

---

## 1. Method

Three measurements, all mechanical, all run over every gate in both repos.

**(a) Coverage probe.** Run each `--self-test` under `NODE_V8_COVERAGE` and count
what fraction of the gate file's own named functions it executes. Catches a
self-test that never reaches the detector.

**(b) Mutation probe.** For every named function the self-test *does* execute,
insert `return undefined` at the top of its body, re-run the self-test, and record
whether it goes red. A **SURVIVOR** is a detector the self-test runs but whose
output it never checks — the defect this ticket exists for, one level deeper than
"asserts its own constants".

**(c) Empty-corpus probe.** Neuter each gate's file walker so the scan sees zero
files, then run the **gate**. Exit 0 means the gate reports OK having looked at
nothing: its failure is indistinguishable from its success.

Mutants are written to a dot-prefixed sibling file and deleted immediately; no
gate source was left mutated.

### Results

| | Count |
|---|---|
| Gates measured (BE 65 · FE 24) | **89** |
| Registered `check:*:self-test` scripts (BE 62 · FE 23) | **85** |
| Self-tests exiting 0 today | **85 of 85** |
| Detector mutants generated | **349** |
| Mutants killed **before** this session | 341 |
| Mutants killed **after** | **349 of 349** |
| Gates reporting OK over an empty corpus, before | **7** |
| after | **0** |

`check:spec-typecheck:self-test` and `check:set-null-column-lists:self-test` were
excluded from the mechanical sweep (they run `tsc` / ts-node); both were run
individually and pass.

---

## 2. The five defects found and fixed

### 2.1 P0 — `check:db-call-count` could not see the N+1 it was standing on

Flagged by the orchestrator with a confirmed defect to validate against:
`payroll/runs/inputs.service.ts:187`, roughly 4,000 serial round-trips. The gate
reported `ACTIONABLE: 0`.

`detectLoopDbCalls` returned `[]` for that entire file. Two independent blind
spots, isolated with fixtures before changing anything:

```
A  multi-line chained  await this.db \n .select(...)          -> []   MISSED
B  indirect handle     await pullAttendanceInputs(this.db,..) -> []   MISSED
C  single-line direct  await this.db.select(...)              -> 1    caught
```

- **A** — the body scan tested one line at a time. Every formatted Drizzle query
  inside a loop was invisible. The patterns already separate their tokens with
  `\s*`, so the fix is to run them over the body text accumulated so far: that
  spans a newline and nothing else. Two adjacent statements still cannot bridge,
  because `;` is not whitespace — asserted.
- **B** — every pattern matched the handle as a *receiver* (`db.select(`), never
  as an *argument*. A helper that receives the handle issues the query just as
  surely. New pattern: `await <callee>(this.db|db|tx , …)`.

**Result.** Detected files **41 → 147**. The known defect now reports at
`loopLine 187 / callLine 188`, and a second multi-line one at `207/209` in the
same file. Both fixture cases in the self-test are that real code verbatim, per
the orchestrator's instruction.

The regression check now fires. **Eight files recorded `N+1-FIXED` in the
baseline still contain loop DB calls** — the detector's blindness is why nobody
noticed:

```
/build/core/projects-webhooks-dispatch.service.ts   /kb/wiki/kb-import-export.service.ts
/cron/cron-leave.service.ts                         /kb/wiki/kb-page-duplicate.service.ts
/organization/onboarding/workspace-onboarding.service.ts
/payroll/runs/inputs.service.ts                     /support/core/support-kb.service.ts
/surveys/survey-builder.service.ts
```

`ACTIONABLE` stays 0 because the 101 newly-visible files are UNCLASSIFIED, not
triaged. **I did not add them to the baseline** — that is precisely the "baseline
raised to turn a regression green" this ticket forbids. The gate is honestly red
at exit 1.

### 2.2 P1 — `check:hardcoded-secrets` reported a credential that was a header name

```
src/modules/calendar/calendar-webhook-secret.ts  [named-secret-assignment]
```

The only match is line 4: `export const CALENDAR_WEBHOOK_SECRET_HEADER =
"x-calendar-webhook-secret";` — a header **name**. The identifier matched
`SECRET`, and the entropy heuristic counted hyphens as a character class, so any
lowercase kebab slug of 12+ characters cleared the bar. A false positive in a
security gate is how a security gate gets allowlisted.

Two rules, both asserted in both directions: a slot-naming identifier suffix
(`_HEADER`, `_NAME`, `_LABEL`, `_PARAM`, … — suffix-anchored, so `SECRET_HEADER_VALUE`
still bites) and a value that is entirely lowercase kebab/snake segments.

Re-proven end to end, each probe planted as a real file in the tree and the gate run:

```
aws-secret       rc=1  [aws-secret-access-key, named-secret-assignment]
anthropic-key    rc=1  [openai, anthropic]
named-mixedcase  rc=1  [named-secret-assignment]
url-credential   rc=1  [url-credential]
header-name NEG  rc=0  (the false positive above)
env-read    NEG  rc=0
clean tree       rc=0
```

Self-test 34 → 39 assertions.

### 2.3 P1 — `FE check:query-scope`'s self-test discarded its own failures

The gate printed `✔ All 5 rules self-tested successfully`. Mutation testing killed
only 4 of 7 detectors. Three distinct defects in one self-test:

1. **The oracle was `result !== null`.** Every detector returns a violation string
   or `null`. A detector returning `undefined` — or anything non-null — scored as
   a *successful detection*. `checkQueryKeyHashFn` and `checkPrefetchDehydrate`
   survived on this alone. (`checkNewQueryClient` and `checkHardcodedKeyBase` were
   killed only because they also appear in the *exempt* fixtures, where the same
   comparison runs the other way.)
2. **Rule 4's failures were unreachable.** `selfFailures` was checked and
   `process.exit(1)`-ed *before* the rule-4 block, then rule 4 pushed into the same
   array — which was never read again. Every rule-4 result was discarded.
3. **Rules 2 and 3 had no negative fixture**, so neither direction was pinned.

Fixed: the oracle now requires a violation naming the file **and** containing the
reason that fixture is supposed to be rejected for; rule-4 scoring moved before the
exit; four negative fixtures added; and a closing assertion fails if any of the
five rule functions has no known-bad fixture, so the count in the success line
cannot drift from reality again. **4/7 → 7/7.**

### 2.4 P1 — `check:module-lifecycle` exited 0 having verified nothing

```
SKIP — APP_DATABASE_URL is not set.
Gates 1–4 require a non-owner connection to query pg_catalog as the app role.
…
rc=0
```

Gates 1–4 *are* the check; the schema-side table discovery above them is not.
Its sibling `check:audit-log-privileges` exits 2 in exactly this situation.
Now `INCONCLUSIVE` / exit 2, naming what was not verified, with
`STREAMLINE_ALLOW_PARTIAL_GATES=1` for a labelled PARTIAL at exit 0 —
the convention S8 established for the six cross-repo gates.

```
node check-module-lifecycle.mjs                              -> rc=2  INCONCLUSIVE
STREAMLINE_ALLOW_PARTIAL_GATES=1 node check-module-lifecycle.mjs -> rc=0  PARTIAL
```

### 2.5 P1 — four gates reported OK over an empty corpus

The empty-corpus probe (§1c) over all 89 gates. Seven passed; two were the
already-fixed `check:query-scope` / `check:seo-metadata`; the dangerous pair:

| Gate | Was | Now |
|---|---|---|
| `BE check:log-secrets` | walker neutered → `rc=0`. A secrets-in-logs gate reporting clean without looking. | floor of 500 source files; `rc=2` INCONCLUSIVE below it. Measures 3527. |
| `BE check:drop-column-safety` | walker, `collectDrops` and `collectAdds` all neutered → `rc=0`. The violation set is a cross-product, so an empty **either** side prints OK. | three floors — migrations (100), schema files (50), and drops parsed (≥1, because history demonstrably contains drops, so zero means the parser stopped matching). Measures 646 / 348 / 126. |

---

## 3. Detectors executed but never asserted (mutation survivors), all fixed

Each row is a function the self-test ran while proving nothing about its output.

| Gate | Survivor | Why it mattered | After |
|---|---|---|---|
| `BE verify-migration-chain` | `numericPrefix`, `isPendingPath` | Both checks asserted only "some failure containing (b)/(d)". Neutered, `numericPrefix` collapses every tag to one prefix — still a "(b)" — and `isPendingPath` makes every pending entry an orphan — still a "(d)". **The pending root was entirely unproven.** | negative fixtures for distinct prefixes and for both pending shapes (slashed tag, bare tag under `pending/`). 3/6 → 5/6 |
| `BE check-unjoined-table-refs` | `isBoundToName`, `lineOf` | The fragment rule — a `.select` bound to a name or handed to a correlating combinator — had no fixture. Neutered, every fragment becomes a violation and the positive cases still pass. | fixtures for the assignment branch, the `exists(…)` branch, and two negatives. 8/10 → 10/10 |
| `BE check-db-call-count` | `parenBalance`, `loopParensBalanced` | The arithmetic that stops the scanner walking past a one-line loop into an unrelated construct. **The assertion caught my own wrong expectation while I wrote it.** | 7 arithmetic cases + 2 loop cases. 7/9 → 9/9 |
| `BE check-module-di` | `hasTopLevelBar` | Union splitting for injected types; a `|` nested in `Map<A\|B, C>` must not split. | 8 cases. 12/13 → 13/13 |
| `BE check-bodyless-conflicts`, `check-multipart-contracts` | `extractHandlerName` | Findings asserted their *reason* but never *which handler* — attribution, i.e. "for the right reason". | 3 declaration shapes each + an attribution assertion. 4/5 → 5/5, 2/3 → 3/3 |
| `BE check-kebab-case`, `check-over-300`, `check-file-sizes` | `resolvePath` | Module-level root resolution. Neutered, `SRC` is undefined and the gate dies — but the self-test uses fixture trees and never noticed. This is the exact INERT class S8 repaired elsewhere. | reachability assertions on `SRC` and `BACKEND_ROOT` |
| `FE check-file-sizes` | `isExcludedDir`, `isCrmOrInventory` | The exclusion keeping 718 MB of `.next-buildmart` chunks out of the corpus was unproven *here*, and it is dot-anchored so an authored `next-intl/` must still be scanned. | 5 assertions incl. `!isExcludedDir("next-intl")` and `!isExcludedDir("build")`. 3/5 → 5/5 |
| `FE check-seo-metadata` | `hasRobotsNoIndex`, `hasDynamicSegment` | The failure counts hold even if both return a constant. | 7 cases incl. a half-declared robots block. 9/12 → 11/12 |
| `FE check-module-manifest` | `parseRegistryVersion` | Including the `null` case, which must make rule-1 inconclusive rather than silently agree. | 3 cases. 7/8 → 8/8 |

The only remaining survivor class is the harness artifact `selfTest` itself
(neutering a self-test runner to a no-op naturally exits 0). It is uniform across
gates and not a property of any detector.

---

## 4. Findings I was not allowed to fix

### 4.1 44 of 89 gates are never invoked by any CI workflow

The largest finding of the ticket, and directly its through-line. Measured against
every workflow file in both repos.

| | Gates | Never in CI |
|---|---|---|
| Backend | 65 | **30** |
| Frontend | 24 | **14** |

Backend, uninvoked — includes everything I repaired this session bar one:

```
check:hardcoded-secrets   check:drop-column-safety  check:db-call-count
check:unjoined-table-refs  check:module-di          check:file-sizes
check:audit-log-privileges check:cache-invalidation check:mock-surface
check:restrict-fks         check:multipart-contracts check:openapi-path-params
check:contract-registry    check:contract-breaking-change check:route-duplicates
check:bounded-contracts    check:envelope-consistency check:compression
check:kebab-case           check:import-direction   check:module-registration
check:retention-coverage   check:fire-and-forget    check:public-object-urls
check:alert-ack            check:s05-artifact-contract check:db-generate-guard
check:set-null-column-lists check:lifecycle-predicates check:evidence-seal
```

Frontend, uninvoked:

```
check:colors check:effect-fetches check:routes check:formatters check:empty-states
check:icon-labels check:query-signal check:web-vitals-budget check:route-access-contract
check:home-manifest check:client-pages check:properties check:route-thinness check:file-sizes
```

36 of 62 backend self-tests and 13 of 23 frontend self-tests are likewise never
run. Wiring them is a release-management decision — several are currently red on
real findings — so I have reported rather than acted.

### 4.2 Five gate scripts exist on disk wired to no package script at all

They cannot be invoked even by hand through pnpm.

| File | State today |
|---|---|
| `BE src/scripts/check-cache-key-shapes.mjs` | exit 0 — **and passes over an empty corpus** |
| `BE src/scripts/check-hr-pagination-gate.mjs` | exit 0 |
| `BE src/scripts/check-namespace-coverage.mjs` | exit 0 |
| `BE src/scripts/check-replay-ledger.mjs` | exit 2 |
| `FE scripts/check-import-direction.mjs` | **exit 1 — 222 cross-feature import violations, unseen** |

### 4.3 Suppressed coverage on a money path, outside CRM

`src/modules/quotes/quotes.service.spec.ts:339`

```js
describe("QuotesService — discount gating (create + update)", () => {
  it.skip("create: sets approvalStatus=pending when discount exceeds maxDiscountPercent setting", () => {
  });
});
```

Empty body, no environment condition, and the logic it names is live at
`quotes.service.ts:140` and `:244`. Same shape as the CRM case the ticket cites.

The 6 `describe.skip` blocks in `crm-copilot.service.phase2.spec.ts` are present as
described; CRM is excluded from this release, logged not fixed.

The 9 `it.skip` in `src/degradation/**` are **not** this: each has an empty body and
a message naming a specific missing infrastructure dependency (no S3/R2 endpoint,
no Ably key, no provisioned physical replica, services opening their own
transactions via `runInNewTenantTransaction`). They are honest placeholders.

Frontend has **zero** skipped or `.only` tests.

### 4.4 `check:lifecycle-predicates` self-test is red, and is not mine

```
FAIL: the three-way filter keeps the primary-read candidate set actionable
      — a gate that flags hundreds gets switched off (found 77)
```

`git status` shows the file unmodified by me; it passed at the start of this
session and broke while application source changed underneath it. Ticket 06.

### 4.5 Other

- `BE check:tenant-isolation` — 924/925 services carry a declared cross-tenant
  negative test; fails on the one that does not.
- 7 of 27 tree-scanning **specs** carry no non-empty floor, including
  `test/security/operator-access.spec.ts` and
  `test/security/appsec/secrets-cookies-and-keys.spec.ts`. Both resolve real paths
  today, so neither is currently vacuous — but neither would notice if it stopped.
- Neither repo defines a `coverageThreshold`. There is no coverage gate to be
  dishonest about, and no coverage floor either.
- FE `jest.config.cjs` ignores `<rootDir>/.next/` but not `.next-buildmart/`.
- `BE check:audit-log-privileges` still exits 2 for want of `APP_DATABASE_URL`.
  Correct behaviour — and it means the privilege boundary remains **unproven on
  this machine** and must not be cited as evidence.

---

## 5. Commands run

Backend, each gate then its self-test:

```
check-bodyless-conflicts   gate=0  self-test=0      check-module-di          gate=0  self-test=0
check-db-call-count        gate=1  self-test=0      check-module-lifecycle   gate=2  self-test=0
check-drop-column-safety   gate=0  self-test=0      check-multipart-contracts gate=0 self-test=0
check-file-sizes           gate=1  self-test=0      check-over-300           gate=1  self-test=0
check-hardcoded-secrets    gate=0  self-test=0      check-unjoined-table-refs gate=0 self-test=0
check-kebab-case           gate=0  self-test=0      verify-migration-chain   gate=0  self-test=0
check-log-secrets          gate=0  self-test=0
```

Frontend:

```
check-file-sizes  gate=1 self-test=0     check-query-scope   gate=0 self-test=0
check-module-manifest gate=0 self-test=0 check-seo-metadata  gate=0 self-test=0
```

`gate=1` is a real finding, not a broken gate: `db-call-count` 101 unclassified +
8 regressed; BE `file-sizes` / `over-300` and FE `file-sizes` are the pre-existing
size findings S8 surfaced. `gate=2` is the new INCONCLUSIVE.

Full sweeps, both repos: every registered `check:*:self-test` exits 0 except
`check:lifecycle-predicates:self-test` (§4.4, not mine).

Lint on every file changed: **0 errors** both repos (BE 6 pre-existing warnings,
FE 3), via `npx eslint <changed files>`.

---

## 6. Files changed

**Backend** `streamlineos-backend/src/scripts/` — commit `1b1eedf1`

`check-bodyless-conflicts.mjs` · `check-db-call-count.mjs` ·
`check-drop-column-safety.mjs` · `check-file-sizes.mjs` ·
`check-hardcoded-secrets.mjs` · `check-kebab-case.mjs` · `check-log-secrets.mjs` ·
`check-module-di.mjs` · `check-module-lifecycle.mjs` ·
`check-multipart-contracts.mjs` · `check-over-300.mjs` ·
`check-unjoined-table-refs.mjs` · `verify-migration-chain.mjs`

**Frontend** `streamlineos-frontend/frontend/scripts/` — commit `6cd9fd364`

`check-file-sizes.mjs` · `check-module-manifest.mjs` · `check-query-scope.mjs` ·
`check-seo-metadata.mjs`

No application source in either repository was modified. No baseline was raised.
Files belonging to other agents that were dirty in the shared tree
(`alert-retention-dead-man.mjs`, `check-retention-coverage.mjs`,
`seed-scratch-e2e.mjs`, `check-public-object-urls.mjs`, `seed-perf-scratch.mjs`)
were left unstaged.
