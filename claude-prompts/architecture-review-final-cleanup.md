# Final proof and closeout for the architecture review

Work directly in `D:/projects/personal/Streamlineos` and complete this task end to end. Do not stop after a plan or partial verification.

Read the applicable root, frontend, and backend `CLAUDE.md` files first. The root and `backend/` are separate Git worktrees. Preserve all unrelated and uncommitted work. In particular:

- `frontend/test-utils/query-result.ts` has an uncommitted correction replacing a rejected Promise with a never-settling Promise; keep it unless evidence proves a better fix.
- `backend/package.json` and `backend/.github/workflows/ci.yml` contain required `check:scope-boundary` and `check:membership-writes` wiring; keep it.
- Preserve `backend/.claude/worktrees/` and do not include those artifacts in application changes.

Do not reset, clean, stash, push, rewrite history, raise a baseline, add a suppression, or weaken a test/gate. Do not commit unless the user explicitly asks.

## Current state

All implementation and integration TODOs from candidates C1, C3, C5, C6, C8, C9, and C10 in `C:/Users/Aditya_Lappy/AppData/Local/Temp/architecture-review-20260909-233331.html` are complete.

Verified on the current tree before this prompt was reduced:

- Backend application typecheck: pass.
- Backend `check:scope-boundary:self-test` and `check:scope-boundary`: pass over 123 ScopedRead-bearing files and 14 documented raw escapes.
- Backend `check:membership-writes:self-test` and `check:membership-writes`: pass over 4,131 production files with zero unapproved membership writes.
- Frontend application typecheck: pass.
- Frontend `check:import-direction`: pass at zero regressions.
- Frontend `check:test-typecheck`: pass at the hard zero baseline.
- Frontend `check:test-integrity`: pass with all seven ratchets at zero and `bare_throw 0`.
- Frontend `check:dead-code`: pass with zero dead/unclassified findings.
- Architecture-focused backend tests: 5 suites, 80 tests passed.
- Architecture-focused frontend tests: 7 suites, 200 tests passed.

The only attempted gate that is not green is `frontend pnpm verify:server-data-seam`, and its current failure is solely the missing production-build prerequisite: `.next/BUILD_ID` does not exist.

Only the proof and closeout work below remains.

## 1. Produce clean production builds

Use the package scripts as the source of truth and run production builds for backend and frontend from their own worktrees. Capture complete exit status and the relevant summary.

If a build fails, diagnose and fix the root cause in scope. Preserve contract generation, server/client boundaries, environment validation, and authorization behavior. A generated directory or stale build artifact is not evidence of success; the build must be produced from the current source. Do not track `.next`, `dist`, raw logs, or other generated build output unless repository policy explicitly requires it.

Completion criterion: both current-source production builds exit zero and `frontend/.next/BUILD_ID` exists from the successful frontend build.

## 2. Run the server-data seam gate after the build

Run:

`cd frontend && pnpm verify:server-data-seam`

The gate must run against the build created in step 1. If it now fails on a semantic assertion, fix the underlying hydration/query seam and its biting test. The hydrated documents-page path must make zero client API calls, while the unhydrated control must issue the correct request with the correct runtime contract.

Completion criterion: `verify:server-data-seam` exits zero against the current production build.

## 3. Run full regression suites

Run the complete backend and frontend test suites using their defined package scripts. Do not substitute focused tests for the full suites and do not use changed-files-only selection.

If a suite fails:

1. reproduce the individual failure;
2. identify whether it is an implementation regression, test pollution/order dependence, timing/resource flake, or an external-service prerequisite;
3. fix in-scope code/test defects without weakening assertions;
4. rerun the focused failure and then the complete suite from a clean process.

Preserve the completed architecture invariants: one request AuthContext answer, canonical branch reads, structural ScopedRead enforcement, distinct permission namespace/administering-owner vocabulary, settings hydration census, one membership mutation owner, and one organization-settings form owner.

Completion criterion: full backend and frontend suites both exit zero, with exact suite/test/pass/skip/todo counts recorded.

## 4. Visually verify affected UI

Use the repository's established local-app and browser workflow. Start the current production build or the prescribed local environment and use an authenticated, tenant-scoped session. Inspect representative desktop and mobile widths, including 375, 768, and 1280 pixels.

Verify these surfaces:

- organization branding settings;
- organization localization settings;
- organization business-hours settings;
- Support automation settings;
- global/module automation settings.

Exercise every reachable relevant state: initial/hydrated rendering, loading, error/retry, disabled module, edit, dirty form, cancel/reset, validation error, successful submit, failed submit, empty automation list, and populated automation list. Confirm responsive layout, focus order, labels, error announcements, buttons, dialogs, and absence of hydration/runtime console errors or duplicate initial network requests.

Use safe test data and avoid destructive production mutations. If a state requires unavailable external credentials, use the repository's supported local fixture/mock path. Record screenshots or the repository-prescribed browser evidence only where policy permits generated evidence to be tracked.

Completion criterion: all five surfaces are inspected at the three widths, reachable states behave correctly, and any discovered defect is fixed and reverified. A source-code inspection alone does not satisfy this item.

## 5. Final worktree and artifact audit

Run `git diff --check` and inspect `git status` in both the root and backend worktrees. Confirm:

- required backend CI/package gate wiring remains present;
- the `frontend/test-utils/query-result.ts` Promise cannot cause an unhandled rejection and remains type-correct;
- no architecture prompt except this file remains;
- no temporary log, screenshot, build, `.next`, `dist`, worktree, or generated artifact was accidentally added;
- no baseline increased, test skipped, lint/type suppression added, forced cast introduced, or permission widened;
- unrelated user changes remain untouched.

Remove generated local build output only through the repository's established cleanup mechanism when safe; otherwise leave ignored output in place. Never delete a user-owned or untracked artifact merely to make status look clean.

Completion criterion: both diffs pass whitespace validation and every remaining status entry is identified as intended architecture work, pre-existing user work, or ignored/local output.

## 6. Delete this completed prompt

After—and only after—steps 1 through 5 meet their completion criteria, delete:

`claude-prompts/architecture-review-final-cleanup.md`

Do not create a replacement progress ledger, completion report, duplicate backlog, or another prompt file. Git history and the existing architecture decision/PRD records are the archive.

## Final response

Report:

- backend and frontend production build results;
- `verify:server-data-seam` result;
- full backend/frontend suite counts;
- browser routes, widths, states, console errors, and network-duplication result;
- final root/backend worktree status and every remaining entry;
- whether this prompt was deleted.

Claim 100% completion only when every completion criterion above is satisfied and this file has been deleted. If an external prerequisite blocks visual verification, leave this file in place and report the exact prerequisite instead of claiming completion.
