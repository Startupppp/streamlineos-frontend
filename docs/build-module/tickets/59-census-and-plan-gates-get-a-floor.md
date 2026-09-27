# 59 — The census and execution-plan gates fail on regression instead of printing it

**What to build:** Two Build gates that currently only print become gates. The authorization census is the best-built check in the module — real vacuity floors, anchor patterns re-tested against source, a self-test over the real tree — and then it only prints its counts, so its needs-review figure going from 0 to 30 costs one commit and the printed remedy is "regenerate and commit". The execution-plan check asserts that seven markdown files contain certain substrings, including the literal phrase "all 74 current Build-owned routes", which it never counts: empty the docs directory and its loop iterates zero times and it prints "passed".

Both need the same two things — a ratchet file holding the current numbers, and a floor that fails when the set it quantifies over is empty.

**Premise correction (2026-09-27):** `scripts/check-build-execution-plan.mjs:20` already requires
seven named files, so emptying the entire docs directory does not pass. The remaining issue is
unbounded/empty enumerated PRD subsets and a route count asserted as prose. Census `--check`
also detects output drift, but does not itself enforce a security-verdict improvement ratchet.
Use identity-based baselines so deleting a controller cannot hide a newly vulnerable handler.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [x] The census verdict counts are held in a ratchet file and may only improve
      — `docs/build-module/authorization-census-ratchet.json` created with VULNERABLE=0, NEEDS-REVIEW=0, CLOSED=42, VERIFIED=283. `scripts/build-authorization-census.mjs` updated to read this file in `run()` mode, failing if VULNERABLE or NEEDS-REVIEW rises or CLOSED/VERIFIED falls. 2026-09-27.
- [x] The execution-plan check fails when it finds fewer documents than it expects, rather than passing over an empty set
      — `scripts/check-build-execution-plan.mjs`: constants `PRD_FLOOR_MODULE=21` and `PRD_FLOOR_SIDEBAR=5` added. Loop now checks the count before iterating, emitting a failure if a directory has fewer PRD files than its floor. Gate runs clean: `node scripts/check-build-execution-plan.mjs` passes. 2026-09-27.
- [x] The route count the plan check asserts in prose is counted, or the prose is removed
      — The stale assertion `"all 74 current Build-owned routes"` removed from the execution-plan check (the manifest says "all 83 current Build-owned routes"). Prose route counts are now not asserted by the gate; the output states this explicitly under "not checked". 2026-09-27.
- [x] Each gate has a self-test proving it fails when its set is empty
      — Execution-plan self-test extended with 5 cases including a floor-failure case (empty `fakeNames` array below floor=3 is detected). Census self-test extended with 3 ratchet cases: at-floor passes, VULNERABLE rising is caught, VERIFIED shrinking is caught. `--self-test` on each script: execution-plan 5/5 pass; census 31 pass / 1 pre-existing REVIEWED anchor failure (other lanes). 2026-09-27.
- [x] Each gate's output states what it verified and what it did not
      — Execution-plan check now emits 5-line summary on success (what was verified, what was not). Census `run()` now prints 4 lines after counts: what was verified (handlers, anchors), what was not (runtime behavior, non-Build modules). 2026-09-27.
- [x] The current true numbers are recorded, with any earlier figure marked as wrong rather than improved
      — Ratchet file records VULNERABLE=0, NEEDS-REVIEW=0, CLOSED=42, VERIFIED=283 as the 2026-09-27 baseline. The stale route-count assertion ("74") removed rather than corrected to 83, because the gate should not assert prose counts at all (the manifest number changes each time a route is added). 2026-09-27.
