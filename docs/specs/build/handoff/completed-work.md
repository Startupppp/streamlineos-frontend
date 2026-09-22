# Completed work — 2026-09-21

Each entry says what was proved and **what it does not prove**. An evidence
level that overstates itself is worse than an open box.

Evidence levels used across this corpus: Source proof · Unit-contract proof ·
Database proof · Browser proof · Deployed proof. Nothing below is above
Unit-contract proof, because there is no database and no browser on this
machine yet.

---

## 1. A week-old silent deletion, found and reversed

**Commits `8f0143bc4`, `0b6a6f258`.**

`e192ec53b` (2026-09-14, titled *"remove obsolete log files"*) deleted **584
files** under `architecture-refactor/` and recorded none of it:

- `prd/completion-plan.md`, 6,640 lines, **195 PRD criteria** spanning Home,
  Directory/Me, HRMS, Build/PM, Workflows, Billing, Accounting, Chat,
  Notifications and shared adapters;
- **14 executable probes and drills** — PITR catalog census, PD column scan, AI
  redaction probe, drain probe, kill-switch readpath drill, lease recovery
  drill, queue-backlog repro, manifest readiness, alert DLQ and signature
  fire-and-clear, break-glass audit mutability, search-vector deletion;
- the **23 evidence documents** that `check-prd-traceability`'s own
  `REQUIRED_EVIDENCE_MD` names as consumed by evidence seals and the S7
  collector.

Its CI step (`.github/workflows/frontend.yml:622`, "Every PRD criterion has
exactly one ticket owner") had therefore been **red on every PR for a week**.

Restored from `e192ec53b^`. `check:prd-traceability:self-test` passes 36
negative cases; the gate reports **103 acceptance checkboxes across 10 owned,
criterion-mapped sections**.

**Does not prove:** that the restored plan's *content* is current. Its ticks are
those of 2026-09-13 and nobody reconciled them during the week it was deleted —
the file now carries a header saying exactly that. Treat every tick as an
opening claim.

**Not restored:** 210 screenshots, 262 `.txt` and 45 `.log` capture files from
that commit. They remain at `e192ec53b^` and can be recovered per file with
`git show e192ec53b^:<path> > <path>`.

---

## 2. Two gates that were never actually running

**Commit `f5cc6ef65`.** Battery went **23 → 28 of 35**.

- **`check:tenant-neutral` had never run on Windows.** Its walker compared
  `relative()` output against `"features/"`; backslash paths made that **0 of
  7,081 files**, and its own vacuity guard exited 2 before judging anything —
  so it had never once reported on this machine. Fixed with a `repoRelative()`
  helper normalising separators. Self-test 11 cases pass; the gate now resolves
  **3,526 files** under `features/`.
- **`check:file-sizes`' self-test was failing correctly.** Its floor had drifted
  to 57% of a corpus grown 5,388 → 7,004 files. Raised `MIN_FILES` 4000 → 5200.
  Self-test 65 cases pass.

Also repaired in that commit: `check:colors`, `check:empty-states`;
`build-sidebar.tsx:100` contrast (`text-muted-foreground/60` 3.14:1 →
`text-muted-foreground` 4.55:1); prop types in
`lib/rbac/action-visibility-invariants.test.tsx` (11 tests).

**Does not prove:** that the other 28 passing gates are non-vacuous. Only the
three cycle gates and these have had resolved-file counts taken.

---

## 3. 121 test-typecheck errors, 19 of 22 Build files fixed

These specs are green under jest and always would have been:
`frontend/tsconfig.json` **excludes test files**, and next/jest transpiles via
SWC, which erases types with no diagnostics.
`frontend/scripts/check-test-typecheck.mjs` is the only gate that sees them.

- **Agent 1 — 13 files, commit `6e6045515`.** Uniform root cause: React 19
  removed `ref` from `HTMLAttributes<HTMLElement>`, so `{ ref: _ref, ...props }`
  in every animated-icon mock is TS2339. Verified by execution: **13 suites, 54
  tests**, identical before and after; diff contains nothing but the removed
  destructuring.
- **Agent 2 — 6 files.** `isReconciled` added to 5 `ReconciledBuildScopes`
  mocks; `settingsHref: string | null` annotated; React 19 `children`-in-props
  fix; `jest.Mock` widening; `readonly string[]` widening for union comparisons;
  tuple rest types replacing an unspreadable `unknown[]`. Verified: **6 suites,
  103 tests**. No `as`, no `any`, no weakened assertion.
- **Agent 3 — rejected and reverted.** See `pending-work.md` §2.

**Does not prove:** that the remaining 16 non-Build files are clean, or that the
gate is at zero. It is not.

---

## 4. Three Build mutations were issuing commands unguarded

**Commit `49a167a5e`.**

`useDeleteProjectFile`, `useDeleteProjectUpdate` and `useAddComment` each went
through a bare `useMutation`, so a client whose access snapshot said otherwise
still sent the request and relied entirely on the backend to refuse it. **All
three files already imported `useAuthorizedMutation`** for their sibling hooks —
these were omissions, not design.

Keys verified against the **backend decorators**, not the vendored contract:

| Route | Decorator | Source |
|---|---|---|
| `DELETE /build/:projectId/files/:fileId` | `build:files:manage` | `build/files/files.controller.ts:87` |
| `DELETE /build/:projectId/updates/:updateId` | `build:updates:manage` | `build/updates/updates.controller.ts:86` |
| `POST …/tickets/:ticketId/comments` | `build:tickets:update` | `build/core/projects-ticket-comments.controller.ts:46` |

`check:command-catalog` 19 → 16 findings. 4 suites, 24 tests pass.

**Does not prove:** the backend guard fires. That is a Database/Deployed proof
and needs the blocked environment. The client guard is defence in depth only.

---

## 5. `PG-PRJ-036` — the drift was in a different file than the ledger said

**Commit `b9d25dad1`.** `features/build/overview/project-overview-page.tsx`
read its "Active cycle" value from `useCycles(projectId)` but linked to
`/sprints`, and the quick-nav link **labelled "Cycles"** did the same. The page
said Cycles and delivered Sprints. Both repointed to `/cycles`, pinned by two
tests. `lib/build/nav/build-project-catalog.ts:79` was already correct — that
ledger lead was stale and is struck through.

**Left deliberately undone:** deleting `features/build/sprints/`. It holds
planning, velocity and complete-sprint capability `features/build/cycles/` does
not have, so deleting it loses working features rather than deduplicating. See
`pending-work.md` §4 — **a peer session has since started that removal.**

---

## 6. BLD-08-001 contrast — measurement right, conclusion inverted

**Commit `533def678`** (evidence), **`2aa36dcb7`** (script removed, measurement
kept).

41 light/dark token pairs measured by WCAG 2.1 relative luminance, tints
alpha-blended against their real backdrop, method validated against the Annex A
21.00:1 reference and a hand-computed `#808080`-on-white 3.95:1 control.

Three light-mode pairs fall below 4.5:1 — `status-success-ink` 3.58:1,
`status-warning-ink` 3.46:1, `status-danger-ink` 4.41:1. **The proposed token
fix was wrong.** `contrast-status-tokens.test.ts:29` already asserts those exact
three sit below AA *by design*: `-ink` is the 3:1 **non-text** ink (SC 1.4.11),
`-ink-strong` is the 4.5:1 **text** ink. Changing the tokens would collapse a
two-level system and break the test documenting it.

The real defect is at call sites rendering **words** in `-ink`. Extending the
measurement to untinted surfaces makes it worse than first reported:
`success-ink` and `warning-ink` fail on *every* light surface, so there is no
safe context for them as text.

**Still open**, and needs its own packet with a ratchet: ~1,716 call sites
repo-wide, ~180 in Build.

---

## 7. Corpus corrections

- `BLD-10-006` ticked — scratch seed script with fixed synthetic orgs,
  `ON CONFLICT DO NOTHING`, `--purge`, `assertScratchTarget`, 8/8 self-test.
  **A seed script is not a seeded database**; the tick says so.
- `BLD-10-037` ticked — `migration-integrity.spec.ts` **executed, 38/38**
  (filesystem-only, needs no DB). The original report rested on file-reading;
  that was replaced with a run.
- `BLD-10-068` ticked with resolved-import counts: frontend `check:cycles`
  **7,019 files**; `check:feature-cycles` **43 features, 15 cross-feature edges,
  5,149 resolved imports, 3,525 files**; backend `check:cycles` **8,163 files**.
- `BLD-09-021` — twelve Deliberate Non-Goals drafted, each with the customer
  need, how Build meets it instead, and the rule forcing it. **Left unticked**;
  it is a product review, not engineering.
- Two README findings struck through as stale after checking source: the
  nav-catalog Cycles row, and `build-scope-recovery.tsx` (both links already
  share a `handleClick` calling `useNavigationLeave`, pinned by 6 tests).
