# 35 — Make every architecture and release gate bite-proven

**What to build:** Each gate is proven to fail against a known-bad fixture or mutation, for the intended reason. A gate that has never failed is an assertion about itself, not about the codebase — this repository has already shipped several.

**Blocked by:** None — can start immediately.

**Status:** 7 of 8 closed; 1 PARTIAL. **S13 REOPENED BOX 5 AND FOUND THE RESIDUE CLAIM WAS WRONG:
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
      PARTIAL: **`BARE_THROW` — 333 backend sites / 125 files, 132 of them on a risk path, UN-TRIAGED and with NO
      OWNER.** This is now the largest vacuity surface in the repository. It is deliberately not gated: the probe
      showed 2 of 44 in the isolation suite were asserting a crash, but most of the 333 are legitimate, and
      baselining them would bank detector noise as debt — the mistake `check:transaction-callbacks` avoided by
      removing three false-positive classes BEFORE baselining. **Needs an owner.**
      PARTIAL: **the frontend has no equivalent gate.** It measures 0 in every class today (0 suppressions, 0
      no-assertion, 0 tautologies, 0 focused, 0 floating), so there is nothing to ratchet — but nothing stops the
      first one either.
      PARTIAL: **`check:over-300` is red at 403 vs baseline 394 (exit 1)**, and `c3f0b73d` had raised that baseline
      to 394 when the count was 395 — sized to that day's breach with no headroom. Re-measured, not inherited.
      Release management, already routed; the baseline was deliberately NOT raised again.
      PARTIAL: **14 swallowed-failure sites in production code are named and NOT fixed** (report §8), several on
      money and auth paths — the AI credit debit, a revoked session authenticating, payroll loan/leave status
      writes, FX gain/loss journalling, the idempotency fence, the NextAuth session enrichment, and leave/overtime
      approval workflows. Owners named per item.
      PARTIAL: **`FIN-TAX-WINDOW`** — the GST due-date sweep is unreachable in production. Owner:
      finance/accounting release owner. Changing when a tax notification fires is a product decision.
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
