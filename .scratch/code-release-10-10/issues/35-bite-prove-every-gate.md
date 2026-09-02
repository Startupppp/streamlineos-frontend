# 35 — Make every architecture and release gate bite-proven

**What to build:** Each gate is proven to fail against a known-bad fixture or mutation, for the intended reason. A gate that has never failed is an assertion about itself, not about the codebase — this repository has already shipped several.

**Blocked by:** None — can start immediately.

**Status:** 5 of 8 closed; 3 partial. Session S9 re-measured every claim in the S8 report against artifacts and mutation-tested 89 gates.

- [x] Every gate in both repositories has a self-test that constructs a known-bad fixture and confirms the gate rejects it for the right reason.
      Measured by mutation testing, not by reading: every named detector each self-test executes was neutered and the self-test re-run. 89 gates, 349 detector mutants, 341 killed. All 85 registered self-tests exit 0.
      PARTIAL: 5 gates on disk are wired to no package script at all and so can never run — BE `check-cache-key-shapes`, `check-hr-pagination-gate`, `check-namespace-coverage`, `check-replay-ledger`; FE `check-import-direction` (reports 222 violations, exit 1). Registering them is a release-management decision, not a gate repair.
- [x] Gates whose self-test only asserts their own constants are rewritten to actually run the scan.
      No survivor of this exact shape remained after S8. The live variant found this session is worse and is fixed: `FE check:query-scope` ran the real detectors but scored them with `result !== null`, so a detector returning nothing counted as a detection, and rule 4's failures were recorded after the only place the failure array was read. 4/7 mutants killed → 7/7.
- [x] A gate that cannot currently measure anything reports INCONCLUSIVE or PARTIAL rather than OK.
      `check:module-lifecycle` printed "SKIP — APP_DATABASE_URL is not set. Gates 1–4 require…" and exited 0; gates 1–4 ARE the check. Now exit 2, with `STREAMLINE_ALLOW_PARTIAL_GATES=1` for a labelled PARTIAL. Empty-corpus sweep (walker neutered, gate run) found four more reporting OK over zero files: BE `check:log-secrets`, `check:drop-column-safety`; FE `check:query-scope`, `check:seo-metadata`. All four now exit 2 below a floor.
- [ ] Critical tests exercise transaction callbacks, authorization deny and cross-tenant paths, retries and failure branches.
      BLOCKED: spec territory, not gate scripts. Measured, not fixed: `check:tenant-isolation` reports 924/925 services carry a declared cross-tenant negative test and fails on the one that does not. 9 `it.skip` in `src/degradation/**` are empty-bodied placeholders naming a real infrastructure blocker (no S3/R2 endpoint, no Ably key, no provisioned replica) — honest, not suppressed.
- [ ] Zero silently skipped or quarantined tests, vacuous mocks, swallowed promise failures, or baselines raised merely to turn a regression green.
      PARTIAL: swallowed failures found and fixed in `check-query-scope`'s self-test. FE has zero skipped tests. Two suppressions outside the degradation placeholders remain, both spec territory: `quotes.service.spec.ts:339` — `it.skip("create: sets approvalStatus=pending when discount exceeds maxDiscountPercent")` with an EMPTY body, while the discount-approval logic it names is live at `quotes.service.ts:140` and `:244`; and the 6 `describe.skip` blocks in `crm-copilot.service.phase2.spec.ts` (CRM, excluded from this release — logged, not fixed). Separately: 8 files recorded `N+1-FIXED` in the db-call-count baseline still contain loop DB calls; the blind detector is why the regression check never fired.
- [x] Text-based scans are validated against a known defect before being trusted.
      `check:db-call-count` reported ACTIONABLE 0 sitting over a confirmed N+1 at `payroll/runs/inputs.service.ts:187`. Two blind spots: a Drizzle chain split across lines (patterns tested one line at a time) and a helper receiving the db handle as an ARGUMENT (patterns only matched it as a receiver). Both fixed, both fixtured from that real code. Detected files 41 → 147; that line now reports REGRESSED. `check:hardcoded-secrets` was validated the other way — it flagged `calendar-webhook-secret.ts` where the only match was a header NAME; fixed and re-proven against four planted credential classes and two negatives.
- [ ] Coverage counts are honest: a path-filtered run that reports green while suites outside the filter are red is a false pass.
      PARTIAL: neither repo defines a `coverageThreshold`, so there is no coverage gate to falsify — but equally no coverage floor is enforced. The real false-green here is upstream of coverage: **44 of 89 gates are never invoked by any CI workflow**, including `check:hardcoded-secrets`, `check:drop-column-safety`, `check:db-call-count`, `check:unjoined-table-refs`, `check:module-di` and `check:file-sizes`. Full list in the report. Wiring them is a release-management decision.
- [x] Quoted globs are checked on this platform.
      All four globs in the BE `lint` script match on macOS/zsh (5447 / 50 / 182 / 56 files). No `check:*` gate in either repo uses a shell glob or `globSync`; all walk with `readdirSync`, so the platform risk is a walk that reaches nothing — measured directly by the empty-corpus sweep above rather than by inspection.
      PARTIAL: 7 of 27 tree-scanning **specs** carry no non-empty floor, including `test/security/operator-access.spec.ts` and `test/security/appsec/secrets-cookies-and-keys.spec.ts`. Both resolve real paths today, so neither is currently vacuous; spec territory.

---

## Session S9b — the four §4 findings, closed outside gate-script territory

**Status addendum:** 7 of 8 closed; 1 partial. Report: `reports/35b-gate-wiring.md`.
No `check-*.mjs` was touched; no application source was modified.

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
- [ ] `check:lifecycle-predicates` (ticket 06) — **diagnosed, not fixed.**
      PARTIAL: it is a GENUINE committed regression, not a broken gate. The failing self-test
      assertion runs the real detector over the real tree and asserts the same ratchet the gate
      asserts (76 vs baseline 75), so a source regression necessarily reds both; the other 21
      assertions pass. The 53 contributing files have an empty intersection with
      `git status --porcelain src`, so it is committed. Not pinned to one read — the gate keeps
      a count baseline, not a list, and 12 candidate files were touched today. Suspect set in
      the report. Wired allow-failure; `PRIMARY_CANDIDATE_BASELINE` NOT raised.
