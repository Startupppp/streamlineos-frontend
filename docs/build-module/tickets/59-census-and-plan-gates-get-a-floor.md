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

- [ ] The census verdict counts are held in a ratchet file and may only improve
- [ ] The execution-plan check fails when it finds fewer documents than it expects, rather than passing over an empty set
- [ ] The route count the plan check asserts in prose is counted, or the prose is removed
- [ ] Each gate has a self-test proving it fails when its set is empty
- [ ] Each gate's output states what it verified and what it did not
- [ ] The current true numbers are recorded, with any earlier figure marked as wrong rather than improved
