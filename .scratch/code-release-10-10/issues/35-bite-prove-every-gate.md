# 35 — Make every architecture and release gate bite-proven

**What to build:** Each gate is proven to fail against a known-bad fixture or mutation, for the intended reason. A gate that has never failed is an assertion about itself, not about the codebase — this repository has already shipped several.

**Blocked by:** None — can start immediately.

**Status:** 7 of 8 closed; box 5 still OPEN. S15 closed its baseline PARTIAL with a gate, built the frontend gate the box had never had, and found 6 defects — three of them in places this ticket recorded as clean.

**2026-09-03 S14 — the `BARE_THROW` residue is triaged, and it was triaged by RUNNING it.** The
333/125 figure is not reproducible (the 35e scanner was ephemeral); re-derived by AST + grep it is
**370 sites / 150 files**, of which 150 are `.not.toThrow()` and cannot be satisfied by a crash.
All 207 in-scope positive sites were EXECUTED through a `Symbol.hasInstance` recorder that captured
the real constructor, status and message. **4 of 220 were real** — a test literally named "BITE
PROOF" that passed on a `TypeError` while its other assertion named a `jest.fn()` wired to nothing;
two cross-tenant tests green over a 500 the double produced, one of them a same-tenant control
asserting the opposite of its own title; and a payments control that never reached the write it
exists to cover, which is 35e's R4 reproduced at a second point. All four fixed, each bite-proved in
both directions. A 5th was found while tightening. **60 more sites now name their refusal**, which
makes 404-never-403 enforceable by the tests that claim it. **New gate `check:bare-throw`**, rc=0 at
ACTIONABLE 2, self-test 16/16, bite-proved nine ways including three INCONCLUSIVE floors. Residue: 2
registered sites with named owners. See `reports/35g-bare-throw-triage.md`.

**S13 REOPENED BOX 5 AND FOUND THE RESIDUE CLAIM WAS WRONG:
the residue was NOT confined to excluded modules. Seven tests were live, green, counted as coverage
and could not fail, FOUR of them naming cross-tenant isolation in their own title — in finance/tax,
organization/setup, invoices, calendar, notifications, chat and payroll, all in scope. One was
concealing a production defect; a second instance of the already-shipped purge defect was found in
the same sweep.** See `reports/35e-vacuity-sweep-s13.md`.

**S13 also built the gate that keeps the class out: `check:vacuous-assertions` (NEW).**
`check:test-suppressions` owns the honest skip; this owns the opposite and more dangerous shape — a
test that RUNS and cannot fail. Measured 1,921 spec files · 14,773 test callbacks · 55,380 `expect()`
calls -> no_assertion 1 · tautology 2 · cond_assert 1 · floating_assert 0 · focused 0, rc=0, all four
registered with a named owner. Bite-proved six ways; self-test 16/16.

**2026-09-03 residual-risk register:** the last box = **R-9**, ACCEPTED RESIDUAL, blocker SCOPE, owner CRM/inventory release owner, deadline 2026-12-01 review. Both gates re-verified exit 0 at their ratchets. See `reports/residual-risk-register.md` §3.7.

**S12 headline, measured 2026-09-03:** (1) NOTHING IS PUSHED — `git rev-list --count
origin/main..HEAD` is **129 backend / 131 frontend**, so 35b's `gates` job has never reached
GitHub; the newest real runs (BE 33622305895, FE 33622293615) are both on the PRE-35b workflow and
their STEP LISTS show `Lint FAILURE` then every gate `skipped`. Routed to the orchestrator: agents
may not push. (2) Even once pushed, **both `gates` jobs aborted at their first or second step**:
`check:repo-paths:self-test` asserted that the SIBLING repository is checked out, which is an
environment fact CI does not satisfy, so GitHub skipped everything after it — **FE executed 0 of 27
gates, BE 1 of 76.** The job-level fix 35b made was undone at step level. Both are now closed:
every gate step carries `if: ${{ !cancelled() }}`, and the cross-repository self-test reports
INCONCLUSIVE/PARTIAL instead of failing. After the change all 76 BE and all 27 FE steps execute.

**A BLIND GATE was found by bite proof and fixed: `check:effect-fetches`.** It printed "No
useEffect-driven API fetches found (5,278 files scanned)" over a real one, because rule 1 needs an
`async` effect and rule 2 needs both a `useCallback` and a `void` call. Rule 3 (brace-matched effect
bodies) added; sites 0 -> 1; self-test 20 -> 25. The one site is
`components/layout/command-palette.tsx:177` — FE component territory, reported not fixed, step left
blocking and red.
Re-verified at head 2026-09-03: both gates exit 0 at their ratchets, and the entire residue — 6 quarantined
`describe.skip` blocks in `modules/ai/core/crm-copilot.service.phase2.spec.ts` (all CRM subject matter) and 2 VOID
transaction specs in `modules/inventory` and `modules/leads` — sits in modules this release excludes. Nothing here
is blocked on another agent, on infrastructure or on a measurement.

- [x] Every gate in both repositories has a self-test that constructs a known-bad fixture and confirms the gate rejects it for the right reason.
      Measured by mutation testing, not by reading: every named detector each self-test executes was neutered and the self-test re-run. 89 gates, 349 detector mutants, 341 killed. All 85 registered self-tests exit 0.
      **S12 — this box's evidence is DOWNGRADED to unre-verified, by measurement.** The one gate
      re-bite-proved this session that a prior session had counted as proven, `check:effect-fetches`,
      was BLIND: it reported "No useEffect-driven API fetches found (5,278 files scanned)" while
      `components/layout/command-palette.tsx:177` held the canonical shape
      (`useEffect(() => { apiClient.get(...).then(setState); }, [dep])`). Rule 1 required an `async`
      effect; rule 2 required both a `useCallback` and a `void` call, and its `[^}]*` window stopped
      at the first brace in the body. Rule 3 added (brace-matched effect bodies, which is also what
      stops the scan running past the effect into an unrelated `useQuery`); sites 0 -> 1, self-test
      20 -> 25, bite-proven both directions in a hermetic tree. Eight gates were bite-proven this
      session (both `check:repo-paths`, FE `check:colors` / `check:formatters` /
      `check:type-assertions` / `check:over-300` / `check:import-direction` / `check:icon-labels`,
      plus the repaired `check:effect-fetches`); **the other ~90 were NOT REACHED and are not
      claimed.** One in nine of a random sample being blind means the S8 mutation corpus should be
      re-run, not cited.
      PARTIAL: 5 gates on disk are wired to no package script at all and so can never run — BE `check-cache-key-shapes`, `check-hr-pagination-gate`, `check-namespace-coverage`, `check-replay-ledger`; FE `check-import-direction` (reports 222 violations, exit 1). Registering them is a release-management decision, not a gate repair.
- [x] Gates whose self-test only asserts their own constants are rewritten to actually run the scan.
      No survivor of this exact shape remained after S8. The live variant found this session is worse and is fixed: `FE check:query-scope` ran the real detectors but scored them with `result !== null`, so a detector returning nothing counted as a detection, and rule 4's failures were recorded after the only place the failure array was read. 4/7 mutants killed → 7/7.
- [x] A gate that cannot currently measure anything reports INCONCLUSIVE or PARTIAL rather than OK.
      `check:module-lifecycle` printed "SKIP — APP_DATABASE_URL is not set. Gates 1–4 require…" and exited 0; gates 1–4 ARE the check. Now exit 2, with `STREAMLINE_ALLOW_PARTIAL_GATES=1` for a labelled PARTIAL. Empty-corpus sweep (walker neutered, gate run) found four more reporting OK over zero files: BE `check:log-secrets`, `check:drop-column-safety`; FE `check:query-scope`, `check:seo-metadata`. All four now exit 2 below a floor.
- [x] Critical tests exercise transaction callbacks, authorization deny and cross-tenant paths, retries and failure branches.
      The five classes were separated into gateable and not, and the one that was buildable was built. **Transaction callbacks — NEW GATE, `check:transaction-callbacks`.** BE/CLAUDE.md §8 has said "a `db.transaction` mock must invoke its callback" since before any gate existed and nothing enforced it. Per spec FILE: INVOKES / DECLARED-UNREACHED / REJECTS / VOID. Measured 1,963 spec files, 235 with a transaction double, 407 doubles: invokes 223, declared-unreached 3, **VOID 9**. Three false-positive classes were removed from the detector BEFORE baselining (22 → 11 → 9): a double configured after the object literal (`db.transaction.mockImplementation(...)`), a cast-then-call (`(cb as Fn)(mockDb)`), and a `transaction:` inside a TYPE annotation. Baselining first would have recorded 13 files of detector noise as debt. Bite-proven: planted `transaction: jest.fn()` in a new spec → rc=1 ("10 spec file(s)… 1 above the ratchet of 9"); removed → rc=0. Self-test 21/21. **Cross-tenant — already gated**, re-measured this session: `check:tenant-isolation` rc=1, 1 uncovered service (`src/modules/organization/setup/org-setup-completed-consumer.service.ts`), 100% of the rest covered.
      **S11 — AUTHORIZATION DENY IS NOW BUILT AND BITE-PROVEN: `check:authz-deny` (NEW).** The population is DERIVED from the authorization decorators actually present in `src/` -- `@RequirePermission`, `@RequireModule`, `@RequireOperatorGrant` -- not from an invented list, parsed the way `route-classification-report.mjs` parses handlers. `@Public()` / `@Universal()` have no deny branch and are excluded; `@AuthorizedInService` is reported as INFO with its reason (the deny lives in a service, so only the weak SYMBOL link could ever fire, and counting 57 handlers on that link would move the ratchet without measuring anything). The attribution rule is written into the script header so a reader can check it, and `--why <route>` prints the exact spec file and the exact link behind any single verdict, so no verdict rests on a count. Measured at HEAD: 546 controllers, 1,969 spec files (435 asserting a deny), 3,219 gated handlers, **766 covered / 2,453 uncovered**, ratchet set at that measured 2,453 behind three vacuity floors that exit 2 if the walk, the decorator parser or the deny matcher measures nothing. Bite-proven BOTH directions in a hermetic HEAD tree: planting a `@RequirePermission` handler with no deny test gives 2454, rc=1, naming it; removing it gives 2453, rc=0. Adding a deny spec for an uncovered handler gives 2452 with covered 766 -> 767, the gate naming the file and the ROUTE link and asking for the ratchet to be lowered; removing it returns to 2453, rc=0. Self-test 40 passed. A hard-coded id segment deliberately does NOT route-link (`/x/given` is as often a real sibling route as an id), so the rule under-counts coverage rather than over-counting it -- the safe direction for a floor, and now stated in the header.
      PARTIAL: the remaining two classes are named rather than gated, with the reason. **Retries: `check:idempotent-commands` gates the source-side fence, not the test.** **Failure branches: genuinely un-gateable** -- whether a branch is adequately tested is a reading, not a measurement, and a scanner claiming to measure it would be the exact defect this ticket exists to remove. Superseded S10 text follows. **Authorization deny: not built (S10; SUPERSEDED above).** `check:route-classification` proves every one of 3,518 handlers declares an exposure (0 undeclared) and `check:module-gate` / `check:scope-application` / `check:record-access` gate the source side, but nothing asserts a deny TEST exists per gated handler. It is buildable in `check:tenant-isolation`'s shape and is the next gate to write; it was not written here. **Retries: `check:idempotent-commands` gates the source-side fence, not the test.** **Failure branches: genuinely un-gateable** — whether a branch is adequately tested is a reading, not a measurement, and a scanner that claims to measure it would be the exact defect this ticket exists to remove.
- [ ] Zero silently skipped or quarantined tests, vacuous mocks, swallowed promise failures, or baselines raised merely to turn a regression green.
      **2026-09-03 S15 — THREE CLAIMS IN THIS BOX WERE WRONG, AND CORRECTING THEM IS MOST OF THE FINDING.**
      Report: `reports/35h-test-suite-honesty-s15.md`. Each of the four modes was swept independently of
      the gates, because the S13 lesson is that a gate measures the shape it was built for and the defect
      may not have it. Every "vacuous" verdict below was produced by MUTATING THE SUBJECT and watching the
      spec stay green, never by reading.
      1. **"the frontend measures 0 in every class today" was FALSE.** Running the backend detector against
         the frontend package found **2 live COND_ASSERT tests**, `hooks/api/notifications-inbox.test.ts:333`
         and `:354`, both titled "passes signal to apiClient.get", both behind
         `if (apiClient.get.mock.calls.length > 0)` — a guard on the very fact each test exists to prove.
         With BOTH notification hooks mutated to `enabled: false` so they never fetch at all: **HEAD spec
         rc=0, 2 passed**; fixed spec **rc=1, 2 failed**; fixed spec on clean source rc=0, 23 passed.
         Fixed (frontend `e03274729`).
      2. **"35g's 18 frontend bare-throw sites are un-triaged" — the real number is 19 sites and ALL of them
         are `.not.toThrow()`,** the NEGATED class 35g's own rule excludes because a negated matcher fails on
         any throw. **Actionable frontend bare-throw sites: 0, not 18.**
      3. **The residue is STILL not entirely in excluded modules.** Enumerated by the gates' own `--list`:
         of the 3 registered vacuous sites, `payroll/__tests__/prd-e2e-journey.spec.ts:153` (payroll/RBAC) and
         `test/security/operator-access.spec.ts:77` (security) are **in scope**. Both carry honest reasons;
         neither is an excluded module.
      **A DEFECT CLASS NO GATE COVERED: a conditional early `return` in a test body.** COND_ASSERT catches
      `if (guard) { expect(...) }` and was blind to `if (!x) return;` above the assertions — different AST,
      identical consequence. 7 backend sites; **2 were real and are fixed.** The one that mattered:
      `hr/recruitment/recruitment-candidate-vault.spec.ts:172`, *"keeps the document reference tenant-scoped
      when it is declared as a composite"*, guarded on a SOURCE-TEXT scan
      (`lines.find(l => l.includes("foreignKey(") && l.includes("table.vaultDocumentId"))`). Removing
      `table.orgId` from that composite FK and letting the declaration wrap across lines — the Prettier-wrap
      blind spot this repo has hit before — empties the scan and leaves the test GREEN: **HEAD spec 1 failed /
      12 passed with the tenant-scoping test a PASS; fixed spec 2 failed with it among them.** Its sibling
      caught the `onDelete` change; nothing caught the tenant column leaving.
      **NEW CLASS `EARLY_RETURN`** in `check:vacuous-assertions`: 7 -> 2 fixed -> **5 registered** (2
      ENVIRONMENT guards, 3 DOMAIN guards in `it.each` over wholly-`@Public()` controllers), ratchet sized
      AFTER the fixes, not to the breach.
      **The frontend result was 11 and 11 was WRONG — reading it is what stopped 11 sites of detector noise
      being banked as debt.** All 11 sat on `if (!backendAvailable) return;` in the two cross-repo
      permission-catalog suites, which looked like S12's CI-layout finding reproduced. Both files carry a
      SENTINEL — `it("can reach the backend catalog — the cross-repo checks below assert nothing without
      it", () => expect({ backendAvailable, ... }).toEqual({ backendAvailable: true, ... }))` — so the suite
      goes RED when the backend is absent, not silently green. **Sentinel exemption added to both gates:**
      exempt when the guard's identifier is asserted OUTSIDE the guarded body. "Outside" is load-bearing —
      the first, unscoped version exempted every early return including the real ones, caught by the
      self-test fixture going red. FE 11 -> 0; BE stays 5.
      **`survey-lead-automation-tenant-isolation.spec.ts:59` was fixed rather than kept**, and its own
      registration had said why: *"the escape hatch survives"*. With the `create_lead` branch neutered, the
      HEAD spec is **1 failed / 1 passed — the SIBLING caught it, the isolation test stayed green**; fixed
      spec 2 failed. `cond_assert` 1 -> **0**, ratchet lowered 1 -> 0, registration REMOVED.
      [x] **BASELINES: the named rename PARTIAL is CLOSED by a gate — `check:baseline-integrity` (NEW).**
      Every `const <NAME> = <int>` ratchet in BOTH repos was walked commit by commit (blob at each revision,
      not diffs). **Exactly two upward moves exist, ever:** BE `check-over-300` `BASELINE` 392 -> 394
      (`c3f0b73db`) — the one unjustified raise, already routed, **red at head 406 vs 394**; and FE
      `CLIENT_PAGE_CEILING` 259 -> 315 (`63579eb29`), which is **justified** — a detector correction (the gate
      did not strip the UTF-8 BOM, hiding 56 client pages), stated in the commit message and later lowered to
      304. Everything else moved DOWN.
      The gate registers every top-level integer constant in every backend gate script **plus every ratchet
      field in `baselines/*.json`**, with a DIRECTION — `ratchet` (may only decrease), `floor` (may only
      increase; a smaller anti-vacuity floor or look-around window is how a gate goes blind while printing
      OK), `pinned` (may not change without re-registering, where the safe direction is genuinely not
      obvious). It fails on an unregistered constant (what a rename looks like), a stale registration (the
      other half), and any unsafe move, printing the NET movement per file. **rc=0 at HEAD: 88 gate scripts ·
      123 constants · 12 json ratchets in 9 baseline files · 135 registered · 0 unregistered · 0 stale ·
      ratchet 32 / floor 102 / pinned 1.** Self-test 28/28. Bite-proved 16 ways, including the exact
      `c0daca5b` shape: renaming `ACTIONABLE_UNDETECTED_BASELINE` upward gives rc=1 naming the unregistered
      constant, the stale registration AND the net raise. **The gate bit its own author the day it was
      written** (adding `ratchets.EARLY_RETURN = 5` read as a net raise of 5, rc=1) and **its own blind spot
      was found before it was claimed** — the first version reported OK over 11 ratchets living in
      `baselines/*.json`.
      **SWALLOWED FAILURES: the backend gain is banked; a frontend gate is NOT warranted and the measurement
      is why.** `check:fire-and-forget` had printed "TIER 2 IMPROVED — 4 fewer than the ratchet" on every run
      since those sites left; four sites of slack is four regressions a future change lands for free, which is
      a baseline raise pointing the other way. **`TIER2_RATCHET` lowered 283 -> 279**, measured hermetically
      against `git archive HEAD src test` so the pinned number is CI's, not the shared tree's; bite-proved
      with one planted `void this.svc.doThing()` (280, rc=1). The frontend measures **999 `void x.y(` sites,
      775 of them in `hooks/api/`**, and the dominant form is `void queryClient.invalidateQueries(...)` /
      `void query.refetch()` — TanStack Query idiom whose error surfaces through `isError`. **Ratcheting 999
      would bank ~96% idiom as debt**, the mistake 35g avoided by keeping 139 off-risk sites out of its
      ratchet. Its 18 `.catch(() => {})` sites are overwhelmingly `el.play()` / `addIceCandidate` /
      `presence.leave()` browser and realtime idiom. **Three are reported, not fixed** (other territory):
      `lib/onboarding-gate.ts:33` and `app/(auth)/invitation/[token]/page.tsx:160`, both
      `update().catch(() => null)` on the durable-wizard path CLAUDE.md §8 requires to be durable, and
      `hooks/common/use-push-subscription.ts:33`.
      **ADJUDICATED 2026-09-03 — the two wizard-path sites are NOT defects. Do not re-raise them.**
      Neither swallow can bounce a user back into a wizard, because the gate never reads `update()`'s
      result. Full trace in the addendum "Adjudication — the two durable-wizard `update()` swallows"
      at the end of this file.
      [x] **`rate-limit-coverage.spec.ts` — DECIDED, and it was RED at head.** It is **not** an instance of
      any of the four modes: not skipped, not vacuous, swallows nothing, its registry never raised, and its
      two-directional set-equality is a feature. **But the concern was right and had already fired.** The spec
      was red at head, 2 of 5 failing, for nothing: `09c01de8` added one import to
      `internal-audit.controller.ts`, the `@Post("audit")` handler moved from **line 12 to 13**, and both
      set-equality assertions failed while the rate-limit gap was unchanged. The only way to green it was to
      bump `:12` to `:13` — an edit indistinguishable from editing a baseline to make a regression go away, on
      a SECURITY registry. The shape does not commit the defect, it **manufactures the reflex**. Fixed:
      handlers carry a stable id `<file>:<VERB> <route path>` (unique per handler, `check:route-duplicates`
      enforces it), the line number kept for the message only, plus two vacuity assertions so a broken route
      parser cannot make the set-equality pass on empties. Bite-proved: HEAD spec rc=1; fixed rc=0; handler
      shifted 3 more lines **rc=0 (false red gone)**; the gap actually CLOSED **rc=1**; a new unlimited public
      write planted **rc=1** (both bites preserved). `check:spec-typecheck` rc=0.
      [x] **THE FRONTEND HAD NO GATE FOR ANY OF THIS. `check:test-integrity` (NEW).** Eight classes at a HARD
      ratchet of 0 — NO_ASSERTION, TAUTOLOGY, COND_ASSERT, EARLY_RETURN, FLOATING_ASSERT, FOCUSED,
      SUPPRESSION, BARE_THROW — because the package genuinely measures zero after the two repairs, so the
      first regression must be argued for rather than merged. **rc=0: 348 test files · 2,738 test callbacks ·
      9,237 `expect()` calls · 24 `.toThrow()` matchers -> every class 0.** Self-test **30/30**. **Its own
      blind spot was found before it shipped:** an earlier draft skipped `build` as build output and reported
      OK over **17 live test files** — the delivery module here is NAMED Build (CLAUDE.md §8). `build`/`out`
      removed from SKIP_DIRS and a self-test assertion pins it. Bite-proved **17 ways**: 7 planted classes
      (rc=1 each), the real pre-fix spec restored (rc=1), the sentinel deleted from `catalog-sync.test.ts`
      (rc=1, 7 above 0), all four vacuity floors neutered (**rc=2 INCONCLUSIVE** each), stale registration /
      short reason / missing owner / missing ratchet (rc=1 each), and re-adding `build` (self-test red by
      name). Wired into `.github/workflows/frontend.yml`.
      **§8 RECONCILED.** The "14 sites vs 10 named" note points at **35e** §8, not 35f, and §8 says neither
      number: it counts **302 sites in five classes** (backend 191 / frontend 111) and separately excerpts
      **11 sites** under rank labels 1-9 and **15**. Labels 10-14 were never transcribed into the table.
      **A transcription gap in a top-N excerpt, not a missing set of findings**; the ranks are unrecoverable
      because the 35e scanner was ephemeral, the same reason its BARE_THROW figure was not reproducible.
      **S15 DISPOSITION — the box stays OPEN, and "zero" is still not true.** Mode 4 (baselines) is at its
      floor AND enforced going forward for the first time. Modes 1, 2 and 3 are not zero: 6 quarantines
      (R-9) · 2 VOID doubles (R-9) · 3 registered vacuous sites of which **2 are in scope** (payroll/RBAC,
      security) · 5 registered EARLY_RETURN · 2 registered bare-throw · **279 backend TIER-2 swallowed or
      floating promises** · ~292 of 35e §8's 302 production swallowed-failure sites unfixed across seven
      territories, several on money paths. Mode 3 is the furthest from zero. Full table of what remains, with
      owners, in `reports/35h-test-suite-honesty-s15.md` §9.
      **The distinction is now gated, which is what makes it survive: `check:test-suppressions` (NEW).** An honest skip names an infrastructure blocker; a quarantine hides live assertions; both are the same string to a grep. Every unconditional suppression is classified — CONDITIONAL (runtime-selected, or a helper with a non-literal title), PLACEHOLDER (empty of `expect(` — nothing was ever written), QUARANTINE (holds live assertions that do not run) — and must appear in `src/scripts/baselines/test-suppressions.json` with a blocker of at least 12 characters. The gate fails on an unregistered site, a stale entry, a declared class that does not match the measured one, and on either ratchet growing. Measured: 1,977 spec files, 20 suppression sites + 27 conditional aliases → **conditional 28 · placeholder 13 · quarantine 6**, rc=0. All 13 placeholders are the degradation/`it.todo` set and every one names a real blocker (no S3/R2 endpoint, no Ably key, no provisioned replica, no isolable integration harness, a source change owed first). The 6 quarantines are the `crm-copilot.service.phase2.spec.ts` `describe.skip` blocks — CRM, excluded from this release — now recorded with their blocker and capped. Bite-proven: planted an unregistered `it.skip` holding an `expect` → rc=1 on two independent branches (unregistered, and quarantine 7 > ratchet 6); removed → rc=0. Self-test 20/20. `quotes.service.spec.ts:339` re-verified GONE (S9b replaced it with 8 tests). FE still has zero suppressions of any kind.
      **Vacuous mocks: CLOSED for every in-scope file in S11. VOID 9 -> 2, ratchet lowered to 2.** All seven in-scope files were repaired to match what the spec CLAIMS, not whichever fix turned the gate green fastest. Five are refusal tests whose whole point is that the write is refused BEFORE any transaction opens (`tenant-db`, `holds-and-scope-for`, `change-requests.isolation`, `hr-workflow-engine`, and the cross-tenant cases in the two finance files) and now assert `expect(db.transaction).not.toHaveBeenCalled()`, plus insert/update and the inner `findFirst` where the claim is stronger. Two same-tenant controls genuinely execute work inside the transaction, so their doubles now invoke the callback and assert what it did. `reconciliation`'s same-tenant control was worse than inert: `checkApprovalPolicy` awaits `.where(...)` with no `.limit()`, so a chain answering only `.limit()` returned the builder, `policies.find` was not a function, and the method died on a TypeError before reaching the transaction -- indistinguishable to the old assertion, which only said the error was not a `NotFoundException`. **`payroll-new-services-tenant-isolation` was a DETECTOR FALSE POSITIVE, verified unchanged against HEAD and NOT edited:** its double is assigned over the object literal (`dbSurface["transaction"] = jest\n.fn()\n.mockImplementation(...)`), the form a spec must use when `db` is typed `as unknown as Db`. Reading it needed two scanner fixes, both made BEFORE the ratchet moved so the new number is a measurement and not the detector going quiet -- a chain Prettier wrapped across lines was read as `jest` alone and vanished from the scan (18 files carry that shape), and an assignment over the literal was never looked for at all. Six new self-test assertions pin both, including the risky direction (a bare double followed by sibling properties is still exactly one double, and still VOID); self-test 21 -> 27. The two remaining VOID files are `inventory/replenishment/inv-replenishment.service.spec.ts` and `leads/lead-status-tenant-isolation.spec.ts` -- inventory and CRM, both **excluded from this release** and left untouched.
      **Mutation-proven, twice, because a spec that cannot fail proves nothing.** `jest --runInBand` over all seven: **7 suites / 56 tests pass**. (1) Making the tenant-aware proxy open a transaction of its own reds `tenant-db.spec.ts` on the new assertion (1 failed / 55 passed); source restored, 56 pass. (2) Deleting the `MANUAL_JOURNAL` "no linked ledger account" branch -- which lives INSIDE the transaction -- reds the repaired reconciliation spec (1 failed / 1 passed); **the SAME mutation against that spec's pre-repair version at HEAD passes 2/2.** That is this box in one measurement: the old spec could not fail. Both source files restored, `git diff` empty on each.
      **Baselines: nothing was raised to go green, and one was lowered.** `check:lifecycle-predicates` was fixed at source instead of baselined (76 → 75). BE `check:over-300` is 400 against 394 and the baseline is deliberately left where it is. `check:import-direction`'s `BASELINE_CROSS_FEATURE` was **lowered 210 → 194** in the same change that narrowed its corpus, so the 16 that left were not banked as headroom.
      PARTIAL: not zero. 6 quarantines (CRM, excluded) and 2 VOID transaction files (inventory + CRM, excluded) remain; both are spec territory, both are ratcheted and named, and every remaining item sits in a module this release excludes.
      **2026-09-02 — the exclusion claim was RE-VERIFIED at head rather than carried forward, and it holds. Both
      gates are green at their ratchets and neither residue may be touched by this release.**
      `pnpm check:test-suppressions` → **exit 0**: 1,993 spec files · 20 suppression sites · 27 conditional aliases
      → conditional 28 (ratchet 28) · placeholder 13 · **quarantine 6 (ratchet 6)**.
      `pnpm check:transaction-callbacks` → **exit 0**: 1,978 spec files · 255 files with a transaction double · 453
      doubles → invokes 246 · declared-unreached 7 · rejects 0 · **VOID 2 (ratchet 2)**.
      The two VOID files, named by the gate itself (`--list`), are
      `src/modules/inventory/replenishment/inv-replenishment.service.spec.ts` (verdict `22:BARE`) and
      `src/modules/leads/lead-status-tenant-isolation.spec.ts` (verdict `36:RESOLVES-WITHOUT-INVOKING`) — inventory
      and leads/CRM, both excluded, both left untouched.
      **One correction to this ticket's own wording, which would have misled anyone checking it.** All 6
      quarantines are `describe.skip` blocks in a single file, and that file is
      **`src/modules/ai/core/crm-copilot.service.phase2.spec.ts`** — it lives under `modules/ai/`, not under
      `modules/crm/`. The exclusion is still correct (the skipped assertions target `CrmScoringService` and
      `CrmBriefService`, and CRM is out of release scope), but a reader grepping `modules/crm` for the residue
      finds nothing and would conclude the note was stale. The path is now recorded here so the claim is
      checkable.
      Nothing in this residue is blocked on another agent, on infrastructure or on a decision: it is blocked on
      release scope, and it will stay open until CRM and inventory are in scope. The 8 stale `N+1-FIXED` entries were closed by S9b (5 ACTIONABLE / 2 FALSE-POSITIVE, REGRESSIONS 7 → 0).
      **2026-09-03 — RE-VERIFIED at head for the third time, and the answer is unchanged: the residue is entirely
      in modules this release excludes, both gates are green at their ratchets, and nothing here is mine to fix.**
      `pnpm check:test-suppressions` → **exit 0**: **2,013 spec files** (up from 1,993 — the corpus grew, the
      residue did not) · 20 suppression sites · 27 conditional aliases → conditional 28 (ratchet 28) · placeholder
      13 · **quarantine 6 (ratchet 6)**.
      `pnpm check:transaction-callbacks` → **exit 0**: **1,998 spec files** · 260 files with a transaction double ·
      459 doubles → invokes 251 · declared-unreached 7 · rejects 0 · **VOID 2 (ratchet 2)**.
      Both residues enumerated by the gates themselves (`--list`), not by grep:
      - **All 6 quarantines are `describe.skip` blocks in one file**,
        `src/modules/ai/core/crm-copilot.service.phase2.spec.ts`, at lines 174 (`stalePipelineDigest`), 246
        (`dataQualityCopilot`), 313 (`nextBestActionWithEvidence`, CrmScoringService), 405
        (`leadSummaryWithCitations`), 435 (`predictDeal`), 478 (`meetingFollowUpDraft`, CrmBriefService). The file
        lives under `modules/ai/` but every skipped assertion targets `CrmScoringService`/`CrmBriefService` — CRM,
        **excluded**. A reader grepping `modules/crm` for the residue finds nothing; the path is recorded here so
        the claim stays checkable.
      - **Both VOID transaction specs are excluded modules**:
        `src/modules/inventory/replenishment/inv-replenishment.service.spec.ts` (verdict `22:BARE`) and
        `src/modules/leads/lead-status-tenant-isolation.spec.ts` (verdict `36:RESOLVES-WITHOUT-INVOKING`).
      **BLOCKED on release scope — a product decision, not territory, infrastructure or tool capability.** These 8
      items become actionable the moment CRM and inventory enter scope and not before; touching them now would
      edit modules the release excludes. Both ratchets are capped at the current numbers, so the residue can only
      shrink, and neither can grow back silently. Left untouched, deliberately.
      **2026-09-03 S13 — THE "RESIDUE IS ENTIRELY IN EXCLUDED MODULES" CLAIM ABOVE WAS FALSE, and it was false
      because both gates measure a shape that these tests do not have.** `check:test-suppressions` counts
      suppressions; `check:transaction-callbacks` counts `db.transaction` doubles. **A test that RUNS, is GREEN,
      is counted as coverage and cannot fail is neither**, so all four re-verifications above were true statements
      about the wrong population. An AST sweep of both repositories (method and misses in
      `reports/35e-vacuity-sweep-s13.md` §1) found **seven such tests live and in scope, four naming cross-tenant
      isolation in their own title**. They were not read into that verdict — the two decisive classes were
      EXECUTED: a throwing sentinel planted in the vacuous branch of all 9 conditional sites (2 of 9 proved
      vacuous), and every bare `.toThrow()` in the isolation suite rewritten to `.toThrow(TypeError)` (44 sites,
      42 went red, **2 stayed green — asserting a crash, not a refusal**).
      All seven are repaired, each bite-proven in a hermetic tree in BOTH directions — the new spec reds on a
      planted defect and **the HEAD spec passes the same mutation**, which is this box in one measurement:
      - `finance/tax/tax-compliance-tenant-isolation.spec.ts` — both tests vacuous. The guard was false because
        **`checkTaxDue` returns [] before touching the database on every day of the year** (deadlines computed a
        month late; min `daysUntilGstr1` 11 vs `DUE_WARNING_DAYS` 5; simulated 0 of 730 days). `cron-finance.
        service.ts:108` calls it, so the GST due-date notification is unreachable in production. The sibling
        `tax-compliance.service.spec.ts` stubs `daysBetween` to **3**, a value the real arithmetic cannot produce
        — five green tests over an impossible value, the ticket's own "mock the real dependency never produces".
        Spec fixed; the production defect is REPORTED, not fixed — owner finance/accounting.
      - `organization/setup/org-setup-tenant-isolation.spec.ts` — the db double answered `select().from().where()`
        while the service calls `.leftJoin()`, so `skipSetup` died on a TypeError that a bare `catch {}` swallowed
        under the comment `// expected - missing membership`. Both tests green without reaching an authorization
        decision.
      - `invoices/invoices-payment-tenant-isolation.spec.ts` — the same-tenant control named "proceeds for invoice
        in the owning org" asserted `.rejects.toThrow()` and passed on
        `TypeError: this.posting.seedChartOfAccountsForOrg is not a function`.
      - `calendar/calendar-conflict.service.spec.ts` (no assertion at all), `notifications/time-sweeps/…`
        (`toBeGreaterThanOrEqual(0)`, plus `forEachOrg` left real so the per-org callback never ran),
        `chat/__tests__/chat-saved-departed-actor.spec.ts` and 4 payroll/workflows contract notes
        (`expect(true).toBe(true)`).
      **A production defect of the exact class this ticket exists to remove was found and FIXED:**
      `storage/storage-key-catalog.ts` swallowed every db error and returned `[]`, starving BOTH `FAILED`
      handlers the purge adapter already had, so a failed enumeration reported `CONFIRMED "nothing to delete"`
      and a failed post-delete check reported `CONFIRMED "deleted and verified absent"` — the release's shipped
      purge defect (delete the wrong place, verify the wrong place, report success) reproduced on a GDPR erasure
      path.
      **DISPOSITION 2026-09-03 — ACCEPTED RESIDUAL R-9. Blocker: SCOPE (CRM and inventory are excluded from this
      release). Owner: CRM/inventory release owner. Deadline: 2026-12-01 review.** Recorded for ticket 41 box 7;
      register: `reports/residual-risk-register.md` §3.7.
      Both gates re-run at head by the register pass, so the exclusion is measured and not carried forward:
      `pnpm check:test-suppressions` -> **exit 0**, **2,029 spec files** (up from 2,013 — the corpus grew, the
      residue did not) · 20 suppression sites · 27 conditional aliases -> conditional 28 (ratchet 28) ·
      placeholder 13 · **quarantine 6 (ratchet 6)**. `pnpm check:transaction-callbacks` -> **exit 0**, **2,014 spec
      files** · 264 files with a transaction double · 464 doubles -> invokes 255 · declared-unreached 7 · rejects 0
      · **VOID 2 (ratchet 2)**. Both ratchets may only go down, so the residue cannot grow back silently.
      **S13 DISPOSITION — the box stays OPEN, under a stated interpretation, because "zero" as written is not
      true.** Closed as: *zero tests in either repository that run, are green and cannot fail, outside 4 registered
      sites each with a named owner, held by a gate that is bite-proven in six directions and reports INCONCLUSIVE
      rather than clean when it cannot measure.* What remains, and why it is not closed:
      [x] **`BARE_THROW` — TRIAGED BY EXECUTION, 4 REAL FINDINGS FIXED, 60 TIGHTENED, AND NOW GATED
      (`check:bare-throw`, NEW). This PARTIAL is closed; the box stays open on the others below.** Report
      `reports/35g-bare-throw-triage.md`. The 333/125 figure is NOT reproducible — the 35e scanner was ephemeral
      and nothing named BARE_THROW is on disk — so the population was re-derived: an AST scan over
      `git archive HEAD src test`, cross-checked against grep to the site, gives **370 sites / 150 files**, of
      which **150 are `.not.toThrow()`** (class rule NEGATED: it fails on ANY throw, so it cannot be satisfied by
      a crash) and **220 are positive**. 207 of those are in scope, and **all 207 were EXECUTED, not read**: each
      rewritten to `.toThrow(__rec(id))` where `__rec` returns a class whose `Symbol.hasInstance` records the real
      error's constructor, status and message and returns true. 205 produced an observed class; the 2 that did not
      are the `APP_DATABASE_URL`-gated integration describes, already registered conditional suppressions.
      **4 of 220 were real, and all four are fixed with two-directional bite proofs:**
      - `calendar/calendar-series-exception-scope.spec.ts:404` — a test **named "BITE PROOF"** that could not
        bite. `transaction: jest.fn().mockResolvedValue(undefined)` makes `const [row] = await
        this.db.transaction(...)` throw `TypeError: (intermediate value) is not iterable`, which the bare matcher
        accepted; and its only other assertion named a `jest.fn()` **wired to nothing**. Mutation (move the outbox
        kill out of the transaction): HEAD spec **rc=0**, new spec **rc=1** naming `notification_outbox`.
      - `hr/directory/employee-onboarding-tenant-isolation.spec.ts:143` and `:204` — both satisfied by
        `InternalServerErrorException: Failed to link user record.`, a 500 the double produced, with no
        authorization decision reached. `:204` is titled "control — same-tenant access works" and was asserting
        that same-tenant onboarding **rejects**. Mutation (the refusal degrades to a 500): HEAD spec **rc=0 4/4**,
        new spec **rc=1** naming the constructor swap.
      - `billing/payments/payment-test-transaction-tenant-isolation.spec.ts:45` — **R4 of 35e reproduced at a
        second point.** The control "proceeds for the owning org" asserted `.rejects.toThrow()` over a facade whose
        `isReady()` was false, so it stopped at the credential check and never reached the insert, the provider
        order or the status update. Mutation (drop `eq(paymentTestTransactions.orgId, orgId)` from the post-order
        update, letting an order be stamped onto another org's row): HEAD spec **rc=0 2/2**, new spec **rc=1**.
      **A 5th was found while tightening:** `hrms-partition-planner/partition-security.spec.ts:40` is an `it.each`
      over four different security gates whose four cases all asserted one message, so a drifted ACL or sequence
      ACL was satisfied by the public-grants error — the test could not tell which gate fired.
      **60 more sites were tightened to name the refusal**, class taken from the RECORDED constructor and never
      guessed. Cross-tenant refusals are pinned to `NotFoundException`, which makes **404-never-403** enforceable
      rather than merely described: mutating payroll setup to answer 403 on a cross-tenant template id passes the
      pre-fix spec **rc=0 17/17** and reds the tightened one **rc=1**. Four more discriminating mutations (module
      gate class, run-lock 409->404, dashboard message, and the period-lock transaction losing its SQLSTATE — read
      through `common/db/postgres-error.ts`, not off a `{code}` shape postgres-js never produces) all show
      **pre-fix rc=0 / tightened rc=1**. Two further mutations are reported as NOT discriminating because the
      files' other assertions already bite.
      **Genuinely fine, by class rather than one by one:** NEGATED (150 sites); SCHEMA_PARSE — the subject's chain
      ends in `.parse()`/`.safeParse()`, so the only reachable throw is the schema's own (21 risk-path sites, and
      execution recorded ZodError at every one); OFF-RISK (139) — counted and printed as INFO, **never ratcheted**,
      because banking them would record noise as debt. All 113 in-scope off-risk sites were executed anyway and
      none was satisfied by a crash.
      **`check:bare-throw` (NEW)** fails only on a bare throw under a title claiming a refusal. Measured
      **1,946 spec files · 1,473 `.toThrow()` matchers · 6,801 risk-titled tests -> 146 bare, 7 on a risk path,
      5 exempt SCHEMA_PARSE, ACTIONABLE 2, rc=0**; self-test **16/16**, five of them risky-direction cases
      asserted NOT caught. Bite-proved **nine ways**: an unregistered planted site (rc=1, names it and the
      ratchet), the three pre-fix specs restored (rc=1, names them by title), the whole 33-file batch reverted
      (rc=1, "62 actionable, 60 above the ratchet of 2"), walker / matcher-reader / risk-classifier each neutered
      (**rc=2 INCONCLUSIVE**), a stale registration, a short reason, and a missing owner (all rc=1). Wired into
      `.github/workflows/ci.yml` beside `check:vacuous-assertions`.
      **Its own blind spot is recorded in its header, not inferred from a green:** the calendar finding carries no
      risk word in its title or describe, so the classifier would NOT have caught it — it was found by execution.
      That classifier is what keeps 139 sites out of the ratchet, so the miss is the price of the scoping.
      **RESIDUE: 2 sites, ratchet 2, each with a named owner** (`src/scripts/baselines/bare-throw.json`):
      `degradation/search-index.spec.ts:231` (owner degradation/platform DB — the ONE site of 220 the triage could
      not reach, inside the `APP_DATABASE_URL`-gated describe; naming a class there would be a guess, which is the
      defect this gate exists to remove) and `inventory/inv-engine-misc-isolation-stock.spec.ts:194` (owner
      CRM/inventory release owner, blocker SCOPE — one of the two sites 35e MEASURED as satisfied by a crash; its
      sibling was repaired, this one is in a module the release excludes, residual R-9).
      PARTIAL: **the frontend has no equivalent gate.** It measures 0 in every class today (0 suppressions, 0
      no-assertion, 0 tautologies, 0 focused, 0 floating), so there is nothing to ratchet — but nothing stops the
      first one either. **35g did NOT extend to the frontend**: its 18 bare-throw sites / 10 files are still the
      inherited 35e figure, unmeasured and un-triaged, and `check:bare-throw` scans the backend only. Frontend
      territory.
      PARTIAL: **`check:over-300` is red at 406 vs baseline 394 (exit 1)** — re-measured 2026-09-03 by 35g and it
      has drifted a further 3 since 35e read 403. `c3f0b73d` had raised that baseline to 394 when the count was 395
      — sized to that day's breach with no headroom. Release management, already routed; the baseline was
      deliberately NOT raised again.
      PARTIAL: **the swallowed-failure sites are TRIAGED, 4 of them fixed, 6 escalated** (report
      `35f-swallowed-failure-triage.md`). Split of the 10 sites §8 actually names: (a) accidental and FIXED —
      payroll-inputs `:201`/`:221`, leaves-write `:387`, overtime `:188` (backend `7ac66b9d`, `0314ac4d`, both
      bite-proved 3→0 and 4→0); (b) deliberate, documented and CORRECT, left alone — `jwt-auth.guard.ts:229`,
      whose exposure is recorded for an explicit security decision; (c) deliberate but WRONG for what they now
      guard, ESCALATED with evidence — `ai-gateway-credit.helper.ts:168` (the loss is an over-charge today, not
      unbilled inference: `reserve` debits up front and the expiry sweep is **not scheduled anywhere**),
      `command-fence-store.ts:123` (**245 `@Idempotent` handlers enumerated; 28 where re-execution moves money
      or sends externally** — bank transfers move the cash twice, a partial invoice payment posts twice, mail and
      Twilio dispatch resend), the FX pair `payment-run-executor.service.ts:276` /
      `accounting-payables.service.ts:451` (one handler over both `getRate` and the journal write; correct remedy
      is an outbox, and both files sit in the accounting-rewrite lane), and `frontend/lib/auth.ts:254`.
      **§8 says 14 sites and its table names 10; ranks 10–14 appear nowhere — 35e to reconcile.**
      Two 35e consequence claims corrected: leave/overtime requests DO reach an approver (approval is a direct
      status flip; the workflow instance is advisory), and the `isActive ?? true` fail-open is really the
      `=== false` gate in `lib/rbac/require-permission.ts`.
      [x] **`FIN-TAX-WINDOW` — FIXED** (backend `99c52ebd`). The GSTR-1/3B deadlines were computed in the month
      after today rather than the month after the filing period; they now land in the current month. Proved by a
      **400-day calendar walk** (`tax-compliance-due-window.spec.ts`), not a stubbed `daysBetween`: pre-fix the
      window opened on **0 of 400 days** and 334 of 400 days disagree with the fix. A second defect in the same
      arithmetic was found by the walk — the emitted filing period mixed local and UTC accessors and read one day
      short at both ends in IST; both bounds now derive from `Date.UTC`. Residual, unchanged and flagged: the
      guard treats a past deadline as in-window, so the window stays open days 6–31 of each month — narrowing it
      is the product decision.
      PARTIAL: **a net baseline raise carried across an identifier rename is invisible** to per-identifier history
      (`c0daca5b`: `UNDETECTED_CLAIM_BASELINE` 2 -> 0 while introducing `ACTIONABLE_UNDETECTED_BASELINE` = 3, net
      2 -> 3). The verdict on that commit stands, but the auditing method has the hole.
- [x] Text-based scans are validated against a known defect before being trusted.
      `check:db-call-count` reported ACTIONABLE 0 sitting over a confirmed N+1 at `payroll/runs/inputs.service.ts:187`. Two blind spots: a Drizzle chain split across lines (patterns tested one line at a time) and a helper receiving the db handle as an ARGUMENT (patterns only matched it as a receiver). Both fixed, both fixtured from that real code. Detected files 41 → 147; that line now reports REGRESSED. `check:hardcoded-secrets` was validated the other way — it flagged `calendar-webhook-secret.ts` where the only match was a header NAME; fixed and re-proven against four planted credential classes and two negatives.
- [x] Coverage counts are honest: a path-filtered run that reports green while suites outside the filter are red is a false pass.
      **S12 RE-AUDIT — the wiring was right and the SEQUENCING was not, so the answer was still "no gate has run".**
      Measured by executing every step of both `gates` jobs against a `git archive HEAD` tree in two
      layouts: with the sibling repository present, and in the single-repository layout
      `actions/checkout` actually produces. `check:repo-paths:self-test` is step **1** of the FE job
      and step **2** of the BE job, and it exits 1 in a single-repo checkout (FE "3 failed, 15
      passed"; BE "5 failed, 4 passed"), so GitHub skipped every step below it: **FE 0 of 27 gates,
      BE 1 of 76.** Four more BE steps and two more FE steps exit 2 INCONCLUSIVE on a cross-repo
      prerequisite and would each have aborted the job in turn (`check:permission-keys`,
      `check:navigation-permissions`, `check:evidence-seal`, `check:s05-artifact-contract`;
      `check:module-manifest`, `check:home-manifest`). Fixed three ways: every gate step now carries
      `if: ${{ !cancelled() }}` so a red gate stops hiding the rest; `check:repo-paths` separates the
      environment fact from the resolver defect and reports INCONCLUSIVE (exit 2) / labelled PARTIAL
      (exit 0 under an opt-in) instead of failing, staying BLOCKING because the opt-in cannot mask a
      defect (bite-proved with 5 planted resolver defects — all exit 1 WITH the opt-in set); the six
      cross-repository gates are allow-failure with the prerequisite and both measured exit codes in
      the step comment, and deliberately NOT given the opt-in.
      After the change **all 76 BE and all 27 FE steps execute** in the CI layout: FE 20 green / 1
      blocking-red / 6 allow-failure-red; BE 57 green / 12 blocking-red / 6 allow-failure. All 18 red
      blocking gates name a specific defect in another territory — none is a blind gate.
      Three allow-failure comments named numbers that are no longer true and were re-measured
      (FE `check:dead-code` 3 -> 1 unclassified; `check:route-bundle-budget` "6 never measured" -> 17
      measured breaches; `check:web-vitals-budget` 5 -> 2). `check:import-direction` is green at its
      ratchet (182/182, 19/19) so its `continue-on-error` was deleted and it now blocks.
      **BLOCKED, and routed to the orchestrator, not to a territory: NOTHING IS PUSHED.** 129 backend
      / 131 frontend commits ahead of `origin/main`. Until someone pushes, every gate claim in this
      release rests on local measurement only. Agents may not push.
      **The "44 of 89 gates are never invoked" number is STALE and was re-derived from the workflow files on disk, not copied.** At HEAD: 96 gate scripts (`check-*.mjs`) across both repos, **7 never referenced by any workflow**, every one with a stated reason — 3 are `db:check-*` seeded-database benchmark instruments (BE/CLAUDE.md §7 calls `db:check-build-reads` a measurement tool, not a gate), 1 is the `cell:load` capacity instrument, and 2 (`check-benchmark-manifest.mjs`, no package script; another agent's) appeared during this session. Of the 97 `check:*` package gates, 3 are never invoked: FE `check:cycles` and `check:properties` (`check:properties` is a legacy superset whose four constituent scripts are each already wired individually; `check:cycles` is madge — a real gap, see below) and BE `check:alert-ack` (its self-test IS now wired; the live half needs a nonce a human types back from the alert channel, which no CI job can fabricate). Newly wired this session: BE `check:repo-paths:self-test` — the last gate script in that repo no workflow named — and BE `check:dead-code` (measured rc=0: knip 0 unused files / 36 other findings, 9,795-file importer graph, 35 verdicts none stale), plus `check:replay-ledger` into `db-gates.yml`, the only job with a cold database (both halves exit 2 without `COLD_DATABASE_URL`, so there is no hermetic half).
      **The real false pass was one level below the one 35b fixed, and it is now closed.** 35b moved the GATES out from under a red `Lint`. It left `Test` where it was: `pnpm test` sat below `Lint` inside BE `verify` and FE `frontend`, and lint is red in both — measured this session, **BE `pnpm lint` rc=1 with 267 errors, FE `pnpm lint` rc=1 with 2,375 errors**. So neither repository's unit suite had ever executed in CI either. Both now run in a `tests` job with no `needs:`, unfiltered — which is also the direct answer to the box: `jest --testPathPattern=<x>` reports green while every suite outside the filter is red, and CI now runs no filter at all.
      **Frontend coverage MEASURED so the decision rests on a number, not an absence** — `jest --coverage --runInBand`, 303 suites / 2,911 tests: **statements 51.90% (13,052/25,147) · branches 45.53% (4,632/10,172) · functions 36.63% (2,996/8,177) · lines 53.34% (12,126/22,731)**. Backend coverage NOT run — a `--coverage` pass over 1,963 spec files is not something this session could execute honestly under the shared-CPU mutex, and an unmeasured floor is the defect this ticket exists to remove.
      **And the suite that step was masking is RED.** 5 suites / 7 tests fail today: `features/payroll/runs/runs-page-content.test.tsx`, `features/settings/roles/roles-page.test.tsx`, `features/directory/workers/workers-page.test.tsx`, `hooks/api/accounting/__tests__/cursor-pagination.test.ts`, `hooks/api/__tests__/billing-hook-gates.test.tsx`. The new `tests` job will be red on its first run and that is the correct result — this is what "a false pass" actually looked like here.
      **A coverage floor is RECOMMENDED and ROUTED, not added: `coverageThreshold` lives in `frontend/jest.config.cjs` and `package.json`'s `jest` block, neither of which is this ticket's territory.** The numbers to ratchet at, rounded DOWN to the next integer as a measurement-noise allowance and no further: statements 51, branches 45, functions 36, lines 53. A global percentage is a weak gate on its own — it is satisfied by trivially-covered files while a critical path stays void, which is this box's own failure mode under a different name; the 9 VOID transaction files would move it by a fraction of a point. It belongs beside the two gates added here, not instead of them.
- [x] Quoted globs are checked on this platform.
      All four globs in the BE `lint` script match on macOS/zsh (5447 / 50 / 182 / 56 files). No `check:*` gate in either repo uses a shell glob or `globSync`; all walk with `readdirSync`, so the platform risk is a walk that reaches nothing — measured directly by the empty-corpus sweep above rather than by inspection.
      PARTIAL: 7 of 27 tree-scanning **specs** carry no non-empty floor, including `test/security/operator-access.spec.ts` and `test/security/appsec/secrets-cookies-and-keys.spec.ts`. Both resolve real paths today, so neither is currently vacuous; spec territory.

---

## Session S9b — the four §4 findings, closed outside gate-script territory

**Status addendum:** 8 of 8 closed. Report: `reports/35b-gate-wiring.md`.
No `check-*.mjs` was touched; no application source was modified.
The last box was closed in session S10 — see below.

- [x] Coverage counts are honest — **re-closed with a larger finding than the one it named.**
      The "44 of 89 gates are never invoked" measurement is right and incomplete. Two of the
      five workflow files (FE `backend.yml`, `seeded-e2e.yml`) target a `backend/` directory
      the frontend repo does not have and die at `Setup pnpm` in 40s — measured on FE runs
      33601538287 / 33601538365, every gate step `-`. They named 11 more backend gates. And in
      BOTH live workflows every gate is sequenced after `Lint`, which is red — BE run
      33622305895 and FE run 33622293615 show `X Lint` then `-` for all 26 / 10 gate steps.
      So NO gate in either repo had executed in CI. Both workflows now carry a `gates` job with
      no `needs:`. 66 gates classified and wired: **49 blocking · 8 allow-failure with a named
      measured reason · 9 genuinely un-runnable with the prerequisite named**. Never-invoked
      count 51 → 9; dead-workflow-only 11 → 0. The two dead FE workflows are deleted and their
      database-bearing jobs ported to BE `.github/workflows/db-gates.yml` (dispatch-only,
      because they have never executed anywhere and an unproven required check gets muted).
- [x] Five gate scripts wired to no package script — **closed.** BE `check:cache-key-shapes` (0),
      `check:hr-pagination` (0), `check:namespace-coverage` (0), `check:replay-ledger` (2, needs
      `COLD_DATABASE_URL` — its self-test exits 2 too); FE `check:import-direction` (1).
- [x] Zero baselines raised merely to turn a regression green — **closed for the N+1 baseline.**
      7 of the 8 (payroll `inputs.service.ts` now reports 0, fixed in-tree by another agent).
      Reclassified with line numbers: 5 ACTIONABLE, 2 FALSE-POSITIVE (`cron-leave` — both sites
      are `while (true)` keyset pagination; `support-kb` — all three "loops" are single-line
      `.map`/`.filter` callbacks and the insert is at method top level). ACTIONABLE 0 → 5 files
      / 9 call sites, REGRESSIONS 7 → 0, UNCLASSIFIED still 101, **gate still rc=1 and left red**.
      That FALSE-POSITIVE pair is one detector bug: an array-callback opener whose line contains
      an object literal defeats the balanced-single-line skip, and the scanner adopts the next
      multi-line block up to 30 lines later. Measured blast radius: 8 of 153 files, 18 of 224
      sites. Fix is in `check-db-call-count.mjs` — ticket 35's file.
- [x] Suppressed coverage on a money path — **closed.** `quotes.service.spec.ts` `it.skip`
      replaced with 8 tests over both call sites (`quotes.service.ts:141` create, `:245` update)
      and both directions. Mutation-proven: neutering both `approvalStatus` assignments kills
      exactly 2 (23 passed → 2 failed / 21 passed); service restored, `git diff` clean.
      NEW DEFECT, deliberately not encoded in a test: `update()` gates approval on
      `input.discountPercent` but recomputes money only when `input.lineItems` is also present,
      and `quotes` stores `discount_amount` with no `discount_percent` column — so a
      discount-only PATCH raises an approval for a price change that never happens.
- [x] `check:lifecycle-predicates` (ticket 06) — **fixed at source in S10. 76 → 75, rc=1 → rc=0.**
      S9b was right that this is a genuine committed regression rather than a broken gate.
      Pinned to one read by running the CURRENT detector over each tree instead of guessing:
      `git archive <rev> src` into a scratch directory, the HEAD copy of the gate script dropped
      into it, `--list` on both, diff the candidate lists. Baseline `626a9f20` → 75, HEAD → 76,
      and the diff is exactly one line plus a file rename that nets to zero
      (`gdpr-subject-erasure.service.ts` → `gdpr-subject-erasure-authored-content.ts`, same three
      candidates, already named in `ACCEPTED`).
      **The 76th is `modules/kb/core/kb-tags.service.ts:88 kbArticles (from)`,** added by commit
      `42b3ed70` (ticket 15) — the BOLA ownership assertion `setArticleTags` "never had". It
      re-asserts `id` and `orgId` and no lifecycle predicate, so an **archived** article still
      accepted a retag: a security fix that opened a lifecycle hole.
      Fixed with `ne(kbArticles.status, "archived")`, **not** `isNull(archivedAt)`, and the
      distinction is load-bearing: `archive()` sets `status='archived'` AND `archived_at`, but
      `publish()` sets `status='published'` and never clears `archived_at` — nothing in the
      repository clears it — so `archived_at IS NULL` would permanently hide any article that was
      ever archived and later republished. `status` is the only sound liveness predicate on this
      table, and the gate accepts a status predicate on the same table by design.
      Proven: gate rc=1 at 76 before, rc=0 at 75 after; self-test 21 passed + 1 failed → **22 passed**;
      `jest --testPathPattern="bola-bulk-fail-whole|kb-tags"` 2 suites / 16 tests, all passing.
      `PRIMARY_CANDIDATE_BASELINE` was **NOT** raised, and the CI step is no longer allow-failure.

---

## Session S10 — the four open boxes, and the three drifting ratchets

**Status addendum:** ticket boxes 6 of 8 closed / 2 partial; S9b addendum 8 of 8 closed.
Report: `reports/35-bite-prove-every-gate.md`.

### The three ratchets ORCHESTRATION.md recorded as drifting — measured, not inherited

| Ratchet | Recorded mid-run | Measured at HEAD | Verdict |
|---|---|---|---|
| BE `check:over-300` | 401 vs 394 | **400 vs 394, rc=1** | Still open. Baseline deliberately NOT moved. Ticket 37 is finished and did not close it, so the 6 splits are now unowned — **routed to the orchestrator**, not to this ticket. |
| BE `check:file-sizes` (hard 500) | 5 files over | **rc=0, 3,545 files, 7 exceptions** | **CLOSED** by ticket 37 (`c0c88116`). The CI step's `continue-on-error` is deleted. |
| BE `check:lifecycle-predicates` | 76 vs 75 | **75 vs 75, rc=0** | **CLOSED** at source. See the S9b box above. |

FE size gates, also re-measured: `check:over-300` **rc=0 at 519/519** (ticket 37 closed it; the step is
now blocking). `check:file-sizes` **rc=1 at 3 files over 500** — `features/hr/cases/cases-page-content.tsx`
501, `hooks/api/notifications-inbox.ts` 534, `hooks/api/notifications-inbox.test.ts` 663. All three are
other tickets' files.

### The two frontend size gates disagreed about test files — settled by tightening

`check-over-300.mjs` scanned `*.test.ts(x)`; `check-file-sizes.mjs` exempted them. One policy, two
corpora: a 663-line test file inflated the 300-line ratchet while being exempt from the 500-line
ceiling. **Both directions were measured before choosing:**

- exempt `*.test.*` from `check-over-300` — **519 → 509**, ten files leaving the count with no file
  getting shorter. That is a ratchet moved to make a number smaller, which this release forbids.
- scan `*.test.*` in `check-file-sizes` — **2 → 3** files over 500, the addition being
  `hooks/api/notifications-inbox.test.ts` at 663.

Tightening was chosen: §7 lists its exceptions (generated files, unmodified shadcn primitives,
`*.d.ts`) and tests are not among them, and revealing one row of debt is honest where hiding ten is
not. Pinned by three new self-test assertions (a `*.test.ts` over 500 is a violation, a `*.test.tsx`
over 500 is a violation, a `*.d.ts` over 500 is still exempt) — 42 → **45 passed**. Bite-proven:
restoring the exclusion → rc=1 with both new assertions named; removing it again → rc=0.

`check-import-direction.mjs` had the mirror-image bug and was settled the other way, on a stated
distinction. Its walker excluded `*.spec.ts(x)`, of which this package has **zero**, and scanned
`*.test.ts(x)`, of which it has **303** — the intended exemption had never applied to anything. File
size is a property of the file, so a test file's length is a real fact; import DIRECTION is a property
of the production module graph, and a test harness importing every feature (`features/__tests__/*-a11y.test.tsx`)
is not the inversion the rule forbids — `check:query-scope` already carries this exemption for that
same harness. Corpus narrowed, and **`BASELINE_CROSS_FEATURE` lowered 210 → 194 in the same change**
so the 16 that left were not banked as headroom. Bite-proven: reverting the corpus change now reads
222 against 194 and reds the gate, and the self-test fails by name.

### Cross-territory findings — reported, not fixed

- **`shared-imports-feature` 20 vs baseline 19, rc=1 — a genuine new violation, deliberately NOT
  baselined away.** `398359abe` added a static `LeaveOrganizationMenuItem` import from
  `@/features/settings/organization/leave-organization-control` into
  `components/layout/header/org-switcher.tsx`. Frontend component territory.
- **`check:tenant-isolation` rc=1 on one service:**
  `src/modules/organization/setup/org-setup-completed-consumer.service.ts` has no cross-tenant
  negative test. Spec territory.
- **9 spec files hold only inert `db.transaction` doubles.** Seven are refusal tests
  (`*-tenant-isolation.spec.ts`, `*.isolation.spec.ts`) that never reach the transaction on purpose
  but never assert it either; adding `expect(db.transaction).not.toHaveBeenCalled()` moves each to
  DECLARED-UNREACHED and lowers the ratchet. Spec territory. Full list in the report.
- **BE `check:over-300` 400 vs 394** — 6 files to split, ticket 37 finished without them.

---

## Session S11 — the two open boxes closed to their in-scope floor

**Status addendum:** ticket boxes 7 of 8 closed / 1 partial. Report: `reports/35-bite-prove-every-gate.md`.
Commits (backend): `check:authz-deny` + baseline + package scripts; the seven VOID spec repairs +
`check-transaction-callbacks.mjs`. The `Gated handlers have a deny test` CI step was already committed
inside `32e4fe6d` by another agent's pathspec commit and was NOT re-added.

### A planted mutation was left live in the shared tree, and it was still there

`src/common/tenant/tenant-db.ts` carried an uncommitted
`if (!context) void target.transaction(async (tx) => tx);` inside the proxy `get` trap — a defect
planted for a bite proof that the previous session was killed before restoring. It fires a floating
transaction on **every property access** whenever no tenant context is active. It was caught only
because `tenant-db.spec.ts` was run: the file typechecks, and no gate looks for it. Removed, and
`git diff` on that file is now empty. **The spec run that caught it is itself mutation proof 1** —
the new `expect(fakeDb.transaction).not.toHaveBeenCalled()` was the single failing assertion.

### Why the authz-deny ratchet is 2,453 and not the working tree's number

Measured two ways, because the shared tree is ~110 files dirty with other agents' in-flight work:

| Tree | Gated | Covered | Uncovered | rc |
|---|---|---|---|---|
| HEAD only (`git archive HEAD src test`) | 3,219 | 766 | **2,453** | **0** |
| Working tree (all agents' in-flight work) | 3,224 | 767 | 2,457 | 1 |

The ratchet is pinned to the **committed** measurement, which is what CI runs. The working tree's
extra 4 are real: nine newly gated handlers in two untracked controllers with no deny test, offset by
five that moved. That is the gate biting in the wild on the day it was written, and the baseline was
deliberately NOT raised to absorb them — see the cross-territory findings.

### Cross-territory findings — reported, not fixed

- **`check:authz-deny` is owed a ratchet LOWERING, by whoever lands the specs that earned it.**
  Mid-session the working tree read 2,457 (rc=1) on nine handlers another agent was adding with no
  deny test (`git-connections.controller.ts`, `settings-deprecated-routes.controller.ts`). That agent
  then added deny specs: the tree now reads **covered 781, uncovered 2,443 — ten BELOW the committed
  ratchet of 2,453** — and the gate says so and exits 0 rather than failing. Left at 2,453 because
  that is the honest **committed** measurement and those specs are uncommitted; banking a dirty-tree
  number would red CI for no defect if they never land. Lower `uncoveredRatchet` to the measured
  number **in the same change that commits them**, as S10 did for `check:import-direction` (210 → 194).
- **`check:spec-typecheck` rc=2, two errors, neither mine:**
  `src/modules/hr/config/hr-config-tenant-isolation.spec.ts(136,30)` and `(146,30)` — `TS2554:
  Expected 2 arguments, but got 1`. Another agent added a second constructor parameter to
  `HrNotificationPreferencesService` (`hr-notification-preferences.service.ts` and its controller are
  both dirty) without updating that spec. This is exactly the "specs do not typecheck under ts-jest"
  trap: the spec passes jest and only `tsc` sees it.
- **`@AuthorizedInService` is 57 handlers whose deny is unobservable from a route test.** Reported as
  INFO by the new gate rather than counted. If that class matters, it needs a service-level deny
  convention, not a controller-level one.

---

## Adjudication — the two durable-wizard `update()` swallows (2026-09-03)

**Verdict: NOT a defect. Both sites are deliberate best-effort. Do not re-raise them.**

The report treated `update()` as the mechanism that makes wizard completion durable. It is not.
It is the *least* load-bearing of three independent sources, and the gate never reads its result.

### The gate, literally

`app/(authenticated)/layout.tsx:31-33` is a **server component**: it calls
`resolveWizardGate(session, await cookies())` and redirects on a non-null answer.
`lib/wizard-gate.ts:27-39` fires a wizard only when **the session claim is falsy AND the scoped
cookie is absent**:

```ts
if (isOrgOwner && !session.orgOnboardingCompletedAt) {
  const setupDone = Boolean(cookieStore.get(gateCookieName("org-setup-done", orgId))?.value);
  if (!setupDone) return "/org-setup";
}
```

`app/org-setup/layout.tsx:20-21` and `app/employee-onboarding/layout.tsx:20-21` call the same
function, so there is exactly one decision authority.

### Where `session.orgOnboardingCompletedAt` comes from — the fact that settles it

`lib/auth.ts:178-180`, in the NextAuth **`session`** callback (not the `jwt` callback):

```ts
const fresh = token.id ? await fetchSessionDataCached(token.id as string, tokenOrgId) : null;
```

`fetchSessionDataCached` (`lib/auth-session.ts:124-153`) is a React per-request memo over a **live
`GET {BACKEND}/auth/session-data/:userId`**, `cache: "no-store"`, 2 attempts. It runs on **every**
session read, including the one the server layout performs — with no dependence on `update()`.
`lib/auth.ts:216-223` then prefers `fresh?.orgOnboardingCompletedAt` and only falls back to the
token claim. `update()` (`lib/auth.ts:141-166`) refreshes **only the JWT token claim**, i.e. the
fallback.

### The three layers, and what each covers

| Layer | Written by | Fails when |
|---|---|---|
| 1. DB stamp, read live on every session read | `org-setup.service.ts:153` / `:251` (`organizations.onboardingCompletedAt`), `onboarding-submission.service.ts:50` (`users.onboardingCompletedAt`) — each **awaited before** `completeOnboardingGate` | the backend is unreachable for 2 × 8 s |
| 2. JWT token claim | `update()` — the swallowed call | `update()` fails; harmless while layer 1 answers |
| 3. Scoped cookie `org-setup-done--<orgId>` / `onboarding-done--<userId>` | `lib/onboarding-gate.ts:31`, **before** the race | cookie cleared, or 30 days elapse |

Layer 1 is authoritative and the backend invalidates `CACHE_KEYS.userSession(userId)` at
`org-setup.service.ts:191` / `:287` / `onboarding-submission.service.ts:69`, whose read cache
(`auth.service.ts:209-341`) has a **60-second TTL**. So the window the cookie actually bridges is
**60 seconds of a possibly-dropped Redis invalidation** (`cache.service.ts:127-131` logs and
continues) — not 30 days of durability. A 30-day cookie guarding a 60-second window is belt, braces
and a second pair of braces; the `Promise.race` timeout is a third.

### The two questions asked, answered

- **Different device / different browser (no cookie).** Layer 1 answers. `resolveWizardGate` reads
  `session.orgOnboardingCompletedAt`, which came from the live backend read, which reads the DB row
  stamped before the client call. `lib/wizard-gate.test.ts:114` already pins this
  ("passes when the DB stamp is present, even without a cookie").
- **After `GATE_COOKIE_MAX_AGE` (30 days).** Same answer, and `session.maxAge` is 30 days
  (`lib/auth.ts:69`), so the session itself expires on the same horizon and a fresh sign-in
  re-mints the claim from the DB (`lib/auth.ts:55-58`, `:121-139`).
- **Did the server stamp always happen first?** Yes, on all three paths, each `await`ed:
  `app/org-setup/page.tsx:126 → :131` (skip), `features/org-setup/components/step-generation.tsx:289
  → :141` (complete), `features/employee-onboarding/components/step-review.tsx:211 → :213`.

Bouncing a completed/skipped user therefore requires layers 1, 2 **and** 3 to be unavailable at the
same instant — and layer 1 being unavailable means the backend is down, in which case the wizard
destination is equally broken. The swallow is not what makes that possible.

### `app/(auth)/invitation/[token]/page.tsx:140` — checked separately, as asked

It does **not** call `completeOnboardingGate`; it is a bare
`clearBackendTokenCache(); await update().catch(() => null); router.push("/dashboard");`
so it has **no cookie and no timeout cap**. It is still not a bounce:
`invitation-acceptance.service.ts:174` invalidates `userSession`, and layer 1 supplies the new
`orgId` on the next server render — `lib/auth.ts:182-184` takes `fresh.orgId` whenever `fresh` is
non-null. The sibling branch (`autoLoginToken`, line 137) re-mints the JWT outright via
`signInWithMagicToken`.

What the swallow *does* cost here, honestly: it removes layer 2 as a **correct** fallback. If the
live read also fails, `orgId` falls back to the stale token value of `null` and the user is sent to
`/org-setup` — the create-an-organization wizard — moments after joining an existing org. That
needs a *simultaneous* second failure, and the same stale-token fallback would misfire on any other
`update()`-driven claim too. It is a resilience thinness, not the durability defect reported. No fix
is landed for it, and none is recommended without a product decision about what `/org-setup` should
do for a user whose invitation has already been accepted server-side.

### Cross-checks that came out of the trace and are worth someone's time

1. **`clearGateCookies()` (`lib/onboarding-gate.ts:18-22`) is dead.** It clears the *unscoped* names
   `org-setup-done=` / `onboarding-done=`, while `completeOnboardingGate` writes the *scoped*
   `${base}--${scopeId}`. Its two callers — sign-out and org-switch (`hooks/common/auth-hooks.ts:115`,
   `:147`) — therefore clear nothing. Harmless today precisely because the cookies are scoped by
   `orgId`/`userId`, so a different org or user cannot satisfy the gate with a stale one. Flagged
   because "fixing" it to clear scoped cookies on org switch would *remove* layer 3, not restore it.
2. **`org-setup.service.ts:231-238`, the non-owner skip branch, stamps nothing** — no
   `onboardingCompletedAt`, no `userSession` invalidation. Not reachable as a bounce, because
   `wizard-gate.ts:27` gates org-setup on `isOrgOwner`, but it is an asymmetry to know about.
