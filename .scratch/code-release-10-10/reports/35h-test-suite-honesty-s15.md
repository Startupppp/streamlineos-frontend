# 35h — Box 5, session S15: the four failure modes swept independently of the gates

**Box:** *Zero silently skipped or quarantined tests, vacuous mocks, swallowed promise failures, or
baselines raised merely to turn a regression green.*

**Verdict: the box stays OPEN.** Three of the four modes are non-zero at head and every remaining
item is named below with an owner. The fourth — baselines raised — is at its floor and is now
*enforced going forward* for the first time. Six defects were found and fixed, three of them in
places the ticket recorded as clean.

The method was S13's, applied to a population the gates do not define: **execute, do not read.** Every
verdict below that says "vacuous" was produced by mutating the subject and observing the spec stay
green, not by looking at the code.

---

## 1. Three claims in this ticket were wrong, and correcting them is most of the finding

| Ticket text | Measured at head |
|---|---|
| "the frontend … measures 0 in every class today (0 suppressions, 0 no-assertion, 0 tautologies, 0 focused, 0 floating)" | **False.** Running the backend detector against the frontend package found **2 live COND_ASSERT tests**, `hooks/api/notifications-inbox.test.ts:333` and `:354`. Both fixed. |
| "35g did NOT extend to the frontend: its **18 bare-throw sites / 10 files** are still the inherited 35e figure, unmeasured and un-triaged" | Re-derived: **19 sites, and every one is `.not.toThrow()`** — the NEGATED class 35g's own rule excludes, because a negated matcher fails on any throw and cannot be satisfied by a crash. **Actionable frontend bare-throw sites: 0**, not 18. |
| "§8 says 14 sites and its table names 10; ranks 10–14 appear nowhere — 35e to reconcile" | §8 is in **35e**, not 35f. It says neither 14 nor 10: it counts **302 sites in five classes** (backend 191 / frontend 111) and separately excerpts **11 sites** under rank labels 1–9 and **15**. Labels 10–14 were never transcribed into the table. **Reconciliation: a transcription gap in a top-N excerpt, not a missing set of findings.** The ranks themselves are unrecoverable — the 35e scanner was ephemeral, the same reason the `333/125` BARE_THROW figure was not reproducible. |

---

## 2. Mode 1 — silently skipped or quarantined

### 2a. Backend, swept independently of `check:test-suppressions`

- Raw grep over `src test evals`: **43 suppression sites**, all accounted for by the gate's 20 sites +
  27 conditional aliases. `it.only` / `fdescribe` / `fit`: **0**.
- **Suites excluded by a config nothing references — checked, and there are none.** `package.json`'s
  jest `roots` is `src`, `evals`, `test/security`, `test/perf`, so anything under `test/` outside
  those two directories would never run. Exactly one non-e2e spec lives there,
  `test/helpers/__tests__/seeded-e2e-app.spec.ts`, and it is named **explicitly** in
  `jest-e2e-seeded.json`'s `testMatch`. Not orphaned.
- **Frontend: 0 suppressions, 0 focused, and `testPathIgnorePatterns` is only `node_modules` and
  `.next`.** Confirmed by grep and by the new gate.

### 2b. The shape no gate covered: a conditional early `return` in a test body

`check:vacuous-assertions`' COND_ASSERT catches `if (guard) { expect(...) }`. It was blind to the
same defect written as `if (!x) return;` above the assertions — a different AST shape, identical
consequence. An AST sweep found **7 backend sites**. Two were real:

**`hr/recruitment/recruitment-candidate-vault.spec.ts:172` — the one that mattered.** The test
*"keeps the document reference tenant-scoped when it is declared as a composite"* guarded on a
**source-text scan**: `lines.find(l => l.includes("foreignKey(") && l.includes("table.vaultDocumentId"))`.
Dropping `table.orgId` from that composite foreign key and letting the declaration wrap across lines
— the Prettier-wrap blind spot that has bitten this repository before — empties the scan, makes the
guard true and leaves the test green. Measured with `jest --runInBand`:

| | result | the tenant-scoping test |
|---|---|---|
| HEAD spec vs de-tenanted + wrapped FK | rc=1, 1 failed / 12 passed | **✓ PASS** |
| fixed spec vs the same mutation | rc=1, 2 failed / 11 passed | **✕ FAIL** |
| fixed spec vs clean schema | rc=0, 13 passed | ✓ |

Its sibling caught the `onDelete` change; nothing caught the tenant column leaving.

**`hr/lifecycle/__tests__/soft-delete-predicates.spec.ts:42`** — `if (result === null || !result) return;`
over a db double, same shape. Both guards were **executed and found true today**, so neither test was
vacuous at head. They were escape hatches, and the table above is what an escape hatch costs.

**New class `EARLY_RETURN` in `check:vacuous-assertions`.** 7 sites → 2 fixed → **5 registered**, each
with the guard's kind stated: 2 ENVIRONMENT (`if (!db) return;`, `NODE_ENV === "production"`) and
3 DOMAIN (`it.each` cases over wholly-`@Public()` controllers, which have no module gate to assert).
Ratchet 5, sized **after** the fixable ones were fixed rather than to the breach.

### 2c. The frontend result was 11, and 11 was wrong — reading it is what stopped 11 sites of noise being banked as debt

The same class reported **11 frontend sites**, all in the two cross-repo permission-catalog suites, all
on `if (!backendAvailable) return;`. That looked like the S12 finding reproduced — CI's
`actions/checkout` produces a single-repo layout, so the sibling backend is absent and every one of
those tests would return immediately while reporting **PASSED**.

**It is not.** Both files carry a sentinel:

```ts
it("can reach the backend catalog — the cross-repo checks below assert nothing without it", () => {
  expect({ backendAvailable, artifact: PERMISSION_CATALOG_PATH })
    .toEqual({ backendAvailable: true, artifact: PERMISSION_CATALOG_PATH });
});
```

so the suite goes **red** when the backend is unreachable rather than silently green. All 11 are
false positives of the detector. Registering them would have recorded detector noise as debt — the
mistake `check:transaction-callbacks` avoided when it went 22 → 11 → 9 before baselining.

**Sentinel exemption added to both gates:** an early return is exempt when its guard's identifier is
asserted by an `expect()` **outside** the guarded test body. *Outside* is load-bearing — a guard's
identifier almost always appears in the assertions it guards, and the first, unscoped version
exempted every early return including the real ones. That was caught by the self-test fixture going
red, not by inspection. Frontend `early_return` 11 → **0**; backend stays **5**, because none of those
five is sentinel-protected. Bite-proved: deleting the sentinel from `catalog-sync.test.ts` gives
rc=1, *"7 site(s), 7 above the ratchet of 0"*.

### 2d. Residue

**6 quarantines**, all `describe.skip` in `src/modules/ai/core/crm-copilot.service.phase2.spec.ts`
(lines 174/246/313/405/435/478), every skipped assertion targeting `CrmScoringService` /
`CrmBriefService`. Enumerated by the gate's own `--list`, not by grep. **Accepted residual R-9,
blocker SCOPE.** 13 placeholders and 28 conditional aliases, each with a registered blocker.

---

## 3. Mode 2 — vacuous mocks

### 3a. Frontend, found where the ticket said there was nothing

`hooks/api/notifications-inbox.test.ts:333` and `:354`, both titled *"passes signal to
apiClient.get"*, both behind `if (apiClient.get.mock.calls.length > 0)` — a guard on the very fact
each test exists to prove. Measured by execution: with **both notification hooks mutated to
`enabled: false` so they never fetch at all**,

- HEAD spec → **rc=0, 2 passed** — the tests cannot fail on the regression they exist to catch;
- fixed spec → **rc=1, 2 failed**;
- fixed spec, clean source → **rc=0, 23 passed**.

### 3b. Backend: one registered site was fixable, and its own registration said so

`surveys/survey-lead-automation-tenant-isolation.spec.ts:59` — *"never creates a lead in a different
org than the survey's org (isolation: org boundary)"* — was registered with the words *"the escape
hatch survives: if the leads double is ever re-shaped the test goes quiet instead of red."* It is
cheaper to remove the hatch than to own it. With the `create_lead` branch neutered:

- HEAD spec → rc=1, **1 failed / 1 passed** — the *sibling* control caught it; the isolation test,
  the one whose title claims the org boundary, **stayed green**;
- fixed spec → rc=1, **2 failed**.

`cond_assert` 1 → **0**, ratchet lowered 1 → 0, the registration **removed** rather than kept.

### 3c. Residue, enumerated by the gates rather than by grep

- `check:transaction-callbacks` **VOID 2**: `inventory/replenishment/inv-replenishment.service.spec.ts`
  (`22:BARE`) and `leads/lead-status-tenant-isolation.spec.ts` (`36:RESOLVES-WITHOUT-INVOKING`). R-9.
- `check:vacuous-assertions` **3 registered**, and the ticket's claim that the residue "sits entirely
  in modules this release excludes" is **still incomplete**: `inv-engine-misc-isolation-ai.spec.ts`
  is inventory (R-9), but `payroll/__tests__/prd-e2e-journey.spec.ts:153` (payroll/RBAC) and
  `test/security/operator-access.spec.ts:77` (security) are **in scope**. Both carry honest reasons —
  the payroll one needs the access layer's role fixtures, the security one deliberately documents the
  absence of an operator-access mechanism — but they are not excluded modules.
- `check:bare-throw` **2**, `check:mock-surface` **0 phantom methods over 4,090 doubles**.

---

## 4. Mode 3 — swallowed promise failures

### 4a. Backend: the gain was left as slack, and slack is a raise pointing the other way

`check:fire-and-forget` had printed *"TIER 2 IMPROVED — 4 fewer than the ratchet"* on every run since
those four sites left. Four sites of unclaimed headroom is four swallowed rejections a future change
lands for free. **`TIER2_RATCHET` lowered 283 → 279**, measured **hermetically against
`git archive HEAD src test`** rather than the shared working tree, so the pinned number is the one CI
will see: 3,605 files, 198 floating promises + 81 swallowed rejections. Bite-proved: one planted
`void this.svc.doThing()` gives 280 and rc=1.

### 4b. Frontend: an equivalent gate is NOT warranted today, and the measurement is why

| Shape | Frontend count | Verdict |
|---|---|---|
| `void x.y(` floating promise | **999** | **Do not ratchet.** 775 are in `hooks/api/`, and the dominant form is `void queryClient.invalidateQueries(...)` / `void query.refetch()` — TanStack Query APIs whose promise is idiomatically discarded because the error surfaces through `isError`/`error` on the hook. Pinning 999 would bank ~96% idiom as debt, which is the mistake 35g avoided by keeping 139 off-risk bare-throw sites out of its ratchet. |
| `.catch(() => {})` and friends | 18 | Overwhelmingly browser-media and realtime idiom where the rejection is expected and non-actionable: `el.play()` (autoplay policy), `pc.addIceCandidate` (stale candidate), `channel.presence.leave()` (already-closed channel). |
| empty `catch {}` | 31 | Not triaged this session. |

**Three are worth an owner's eyes and are reported, not fixed** (`lib/` and `features/` are another
territory): `lib/onboarding-gate.ts:33` `update().catch(() => null)` and
`app/(auth)/invitation/[token]/page.tsx:160` `await update().catch(() => null)` — a silently failed
session update leaves the client's session stale on the durable-wizard path CLAUDE.md §8 requires to
be durable; and `hooks/common/use-push-subscription.ts:33`. `frontend/lib/auth.ts:254` remains
35e's escalation, unchanged.

### 4c. Residue

Non-zero and largely unowned: 279 backend TIER-2 sites, and 35e §8's 302 sites across five classes in
both repos of which 4 were fixed and 6 escalated. **Mode 3 is the furthest from zero of the four.**

---

## 5. Mode 4 — baselines raised to turn a regression green

### 5a. The historical audit: exactly two upward moves exist, in either repository, ever

Every `const <NAME> = <int>` ratchet in both repos was walked commit by commit (`git log --follow`,
reading the blob at each revision rather than parsing diffs).

| Move | Verdict |
|---|---|
| BE `check-over-300.mjs` `BASELINE` **392 → 394** (`c3f0b73db`) | **The one unjustified raise.** Sized to that day's breach with no headroom. **RED at head: 406 vs 394, rc=1.** Routed to release management; deliberately not raised again. |
| FE `check-client-pages.mjs` `CLIENT_PAGE_CEILING` **259 → 315** (`63579eb29`) | **Justified.** A detector *correction*: the gate did not strip the UTF-8 BOM, so 56 client pages were invisible. Corpus fix and ceiling correction in one commit, stated in the message, and later **lowered to 304**. |

Everything else moved **down**: `UNDETECTED_CLAIM_BASELINE` 2→0, `hr-pagination` 87→60,
`VOID_FILE_BASELINE` 9→2, FE `BASELINE_SHARED_IMPORTS_FEATURE` 19→3, FE `BASELINE_CROSS_FEATURE`
210→194→182→177, FE `check-test-typecheck` `BASELINE` 139→0.

### 5b. The named PARTIAL — a net raise carried across a rename — is CLOSED by a gate

The ticket recorded the hole: `c0daca5b` lowered `UNDETECTED_CLAIM_BASELINE` 2 → 0 in
`check-db-call-count.mjs` while introducing `ACTIONABLE_UNDETECTED_BASELINE = 3` in the same file. Per
identifier both moves look fine; the file went **2 → 3**. My own per-identifier walk reproduced the
hole exactly — `ACTIONABLE_UNDETECTED_BASELINE first=3 changes=0`.

**`check:baseline-integrity` (NEW).** Every top-level integer constant in every backend gate script,
**plus every ratchet field inside `src/scripts/baselines/*.json`**, registered in
`baselines/ratchets.json` with a direction. Fails on a constant that moved the unsafe way, one present
in source but unregistered (what a rename looks like), one registered but gone from source (the other
half), and a malformed entry. **A rename therefore cannot land without touching the registry, and the
failure prints the net movement for that file.**

Three directions, because two would have been wrong: **ratchet** may only decrease (debt, policy
ceilings); **floor** may only increase — anti-vacuity floors and the detector look-around windows,
where a *smaller* number makes the detector see less, which is how a gate goes blind while printing
OK; **pinned** may not change without re-registering, used where the safe direction is genuinely not
obvious rather than letting the gate guess.

Measured at HEAD: **rc=0, 88 gate scripts, 123 constants, 12 json ratchets in 9 baseline files, 135
registered, 0 unregistered, 0 stale — ratchet 32 · floor 102 · pinned 1.** Five auto-classifications
were corrected by hand against the source (`CEILING_FLOOR_TOTAL`, `CONTROLLER_MIN` and
`STATEMENT_MAX_LINES` are floors, not ratchets or pinned; `MIN_CREDENTIAL_LENGTH` is a ratchet, not a
floor — raising it makes the secret detector match fewer strings).

**Two things happened while building it that are worth recording.**

1. **The shared tree moved under the measurement.** Another agent committed `MAX_GROWING_SITES`
   106 → 102 between the enumeration and the registry being written. The registry is pinned to
   **HEAD's** value, verified in a `git archive HEAD src/scripts` tree — the S11 lesson applied.
2. **The gate bit its author on the day it was written.** Adding `ratchets.EARLY_RETURN = 5` to
   `vacuous-assertions.json` read as one unregistered ratchet and a **net raise of 5** for that file,
   rc=1. That is the designed behaviour; it was registered as what it actually is — a new class, 7
   sites measured, 2 fixed before baselining, 5 remaining.

3. **It bit a third time, in the wild, minutes after landing — and the right answer was to leave it
   red.** Another agent has `check-gate-wiring.mjs` **uncommitted** in the shared tree (144 insertions
   / 59 deletions), adding `MIN_JOBS = 4` and `MIN_RUN_STEPS = 60` and raising `MIN_GATES` 60 → 90.
   All three moves are in the safe direction. Registering them would have pinned the registry to a
   **dirty tree** and turned CI red with two stale registrations the moment it ran against HEAD, which
   is the S11 mistake `check:authz-deny` avoided when it stayed at 2,453. **The registry is pinned to
   HEAD: rc=0 at HEAD, rc=1 in the working tree.** *Cross-territory: whoever lands that
   `check-gate-wiring.mjs` change must add `MIN_JOBS` and `MIN_RUN_STEPS` to
   `src/scripts/baselines/ratchets.json` and raise the registered `MIN_GATES` to 90 in the same
   commit.*

**And the gate's own blind spot was found and fixed before it was claimed:** the first version
registered the 121 script constants and reported OK over 11 more ratchets living in
`baselines/*.json`, including `authz-deny`'s `uncoveredRatchet`, `bare-throw`'s `ratchet` and all five
`vacuous-assertions` ratchets. The JSON rule is by **key name** and is stated in the header, because
no rule separates a ratchet from a measurement by value — `authz-deny.json` holds `uncovered: 2453`
(a measurement) beside `uncoveredRatchet: 2441` (the enforced number). A bare `/cap$/` matched the
path segment `cron-weekly-recap` and would have registered a per-file read count as a ratchet; the
rule requires a word boundary.

---

## 6. `rate-limit-coverage.spec.ts` — the decision asked for, and it was RED at head

**Does it count under this box?** As an instance of the four named modes: **no.** It is not skipped,
not vacuous, swallows nothing, and its registry has never been raised. It is one of the strongest
specs in the repository and its set-equality in both directions is a feature, not a defect.

**But the concern was right, and it had already fired.** The spec was **red at head — 2 of 5 tests
failing** — for nothing: `09c01de8` added one import to `internal-audit.controller.ts`, the
`@Post("audit")` handler moved from **line 12 to 13**, and both set-equality assertions failed while
the rate-limit gap itself was completely unchanged. The only way to green it was to bump `:12` to
`:13` in the registry — an edit indistinguishable from editing a baseline to make a regression go
away, on a **security registry**. The shape does not commit the defect; it *manufactures the reflex*.

**Fixed rather than accepted.** Handlers now carry a stable id, `<file>:<VERB> <route path>`, unique
per handler (`check:route-duplicates` enforces that) and unaffected by any edit that does not move the
route. The line number is kept for the failure message only. Two vacuity assertions added: every id
must parse to a verb and a path, and ids must be unique, so a broken route parser cannot make the
set-equality pass on empties. Bite-proved four ways:

| | rc |
|---|---|
| HEAD spec, HEAD tree | **1** (2 failed / 3 passed) |
| fixed spec, HEAD tree | **0** (5 passed) |
| fixed spec, handler shifted 3 more lines | **0** — the false red is gone |
| fixed spec, the internal-audit gap actually CLOSED | **1** — the "delete the key" bite is preserved |
| fixed spec, a new unlimited public write planted | **1** — the primary bite is preserved |

`check:spec-typecheck` rc=0 (specs do not typecheck under ts-jest; only `tsc` sees this).

---

## 7. The frontend had no gate for any of this. Now it has one.

**`check:test-integrity` (NEW, frontend).** Seven classes at a **hard ratchet of 0** — `NO_ASSERTION`,
`TAUTOLOGY`, `COND_ASSERT`, `EARLY_RETURN`, `FLOATING_ASSERT`, `FOCUSED`, `SUPPRESSION`, `BARE_THROW`
— because the package genuinely measures zero after the two repairs, so the first regression must be
argued for rather than merged. Measured at head: **348 test files · 2,738 test callbacks · 9,237
`expect()` calls · 24 `.toThrow()` matchers → every class 0, rc=0.** Self-test **30/30**.

**Its own blind spot was found before it shipped.** An earlier draft put `build` in `SKIP_DIRS` as
build output and reported OK over **17 live test files** — the delivery/strategy product module in
this repository is *named* Build (CLAUDE.md §8), so `features/build/`, `hooks/api/build/` and
`app/(authenticated)/build/` are product code. `build` and `out` are gone from `SKIP_DIRS`, a
self-test assertion pins it, and re-adding `build` fails the self-test **by name**.

**Bite-proved 17 ways:** 7 planted classes (rc=1 each, named with the ratchet); the real pre-fix
`notifications-inbox.test.ts` restored (rc=1, COND_ASSERT 2 above 0); the sentinel deleted from
`catalog-sync.test.ts` (rc=1, 7 above 0); all four vacuity floors neutered (**rc=2 INCONCLUSIVE**
each — walker, test-callback matcher, `expect()` matcher, `.toThrow()` matcher); stale registration /
short reason / missing owner / missing ratchet (rc=1 each); re-adding `build` (self-test red).

---

## 8. Commands run, with real exit codes

```
BE  pnpm check:test-suppressions        rc=0   2,084 spec files · quarantine 6 (ratchet 6)
BE  pnpm check:transaction-callbacks    rc=0   2,069 spec files · VOID 2 (ratchet 2)
BE  pnpm check:vacuous-assertions       rc=0   1,960 spec files · early_return 5 · cond_assert 0
BE  pnpm check:vacuous-assertions --self-test  rc=0   21 passed
BE  pnpm check:bare-throw               rc=0   ACTIONABLE 2 (ratchet 2)
BE  pnpm check:mock-surface             rc=0   4,090 doubles · 0 phantom methods
BE  pnpm check:fire-and-forget          rc=0   3,605 files · TIER2 279 (ratchet 279)
BE  pnpm check:fire-and-forget:self-test rc=0  18 passed
BE  pnpm check:baseline-integrity       rc=0   88 scripts · 123 consts · 12 json · 0 unregistered
BE  pnpm check:baseline-integrity:self-test rc=0  28 passed
BE  pnpm check:spec-typecheck           rc=0
BE  pnpm check:gate-wiring              rc=0   (reports check:body-binding UNWIRED — not mine)
BE  pnpm check:over-300                 rc=1   406 vs baseline 394  ← pre-existing, routed
FE  pnpm check:test-integrity           rc=0   348 files · all 8 classes 0
FE  pnpm check:test-integrity:self-test rc=0   30 passed
FE  pnpm check:gate-wiring              rc=0   34 gates, all wired
BE  jest --runInBand --testPathPattern="soft-delete-predicates|recruitment-candidate-vault|
      survey-lead-automation-tenant-isolation|rate-limit-coverage"   rc=0  6 suites / 25 tests
FE  jest --runInBand hooks/api/notifications-inbox.test.ts lib/rbac/permissions/__tests__
                                        rc=0  3 suites / 41 tests
```

---

## 9. What is NOT closed, and why

| Item | Count | Blocker | Owner |
|---|---|---|---|
| Quarantined `describe.skip` in `crm-copilot.service.phase2.spec.ts` | 6 | SCOPE (R-9) | CRM release owner |
| VOID `db.transaction` doubles (inventory, leads) | 2 | SCOPE (R-9) | CRM/inventory release owner |
| Registered vacuous sites — inventory | 1 | SCOPE (R-9) | inventory |
| Registered vacuous sites — **payroll, security: IN SCOPE** | 2 | payroll needs the access layer's role fixtures; security documents a product gap | payroll/RBAC · security |
| `EARLY_RETURN` registered sites | 5 | 2 environment guards, 3 domain guards in `it.each` over `@Public()` controllers | platform DB · platform · surveys · timesheets |
| Registered bare-throw sites | 2 | one unreachable without `APP_DATABASE_URL`, one SCOPE | degradation/platform DB · inventory |
| Backend TIER-2 swallowed/floating | 279 | ratcheted, not zero | backend platform |
| 35e §8's 302 production swallowed-failure sites | ~292 unfixed | other territories, several on money paths | AI gateway · auth · payroll · finance/AP · platform · frontend auth · HR time |
| `check:over-300` 406 vs 394 | red | the one unjustified historical raise; release management | release owner |
| Frontend `.catch` sites worth an owner's eyes | 3 | `lib/`/`features/` territory | frontend auth · frontend platform |

**Mode 4 is at its floor and now enforced. Modes 1, 2 and 3 are not zero.** The box stays open.
