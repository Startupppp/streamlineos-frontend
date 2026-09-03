# 35d — Do the gates actually RUN, and do they bite? (session S12)

**Ticket:** `issues/35-bite-prove-every-gate.md`
**Repos:** both. Six commits (BE 2, FE 4). Measured 2026-09-03.
**Trees measured:** BE `git archive HEAD` @ `41ef38c4` then `3fda4e9c`; FE @ `ae4d077a3` then `7a85e7ab`.
Every bite proof was run inside a `git archive HEAD` copy under the scratch directory.
**No defect was planted in either shared working tree; `git status` in both was checked before
each commit and carried nothing of mine but the intended edits.**

---

## 1. THE HEADLINE: no gate had ever run in CI, and the 35b fix did not change that

Two independent reasons, both measured, both now closed.

### 1a. Nothing is pushed

`git rev-list --count origin/main..HEAD` — **backend 129, frontend 131**. The entire release,
including 35b's `gates` job, is committed locally and has never reached GitHub. The newest real
runs are BE `33622305895` and FE `33622293615`, both 2026-09-02T10:59Z, both on the PRE-35b
workflow. Their step lists (read with `gh run view --json jobs`, not their badges) are the proof:

```
BE 33622305895 / verify:   6. Typecheck success · 7. Lint FAILURE · 8..37 ALL skipped   (30 gate steps)
FE 33622293615 / frontend: 5. Install success  · 6. Lint FAILURE · 7..19 ALL skipped   (13 steps)
```

**This is not fixable from an agent session — pushing is forbidden by the brief. It is routed to
the orchestrator as the single blocking prerequisite for every gate claim in this release.**

### 1b. Even once pushed, both `gates` jobs would have died at their first or second step

The `gates` jobs carry no `needs:` (verified: zero `needs:` keys in either repository's workflows),
so 35b's fix holds. But a job is a SEQUENCE, and GitHub skips every step after the first failing
one that is not `continue-on-error`. So the job-level fix was undone at step level.

Measured by running every step of each `gates` job against a hermetic `git archive HEAD` tree, in
two layouts — with the sibling repository present (a dev machine) and without it (what
`actions/checkout` actually produces):

| | sibling present | single-repo (CI) |
|---|---|---|
| BE `check:repo-paths:self-test` (step **2** of 76) | rc=0, 9 passed | **rc=1, "5 failed, 4 passed"** |
| FE `check:repo-paths:self-test` (step **1** of 27) | rc=0, 18 passed | **rc=1, "3 failed, 15 passed"** |

Simulating GitHub's abort semantics: **the FE gates job executed 0 of 27 gates and the BE job 1 of
76.** The `gates` job was a badge over nothing. This is the same masking defect 35b found under
`Lint`, one level down, and it is why "a green or absent check here has historically meant *did not
run*".

Four more BE steps and two FE steps exit **2 INCONCLUSIVE** in a single-repo checkout on a
cross-repository prerequisite rather than on a defect, and each would have aborted the job in turn:
BE `check:permission-keys`, `check:navigation-permissions`, `check:evidence-seal`,
`check:s05-artifact-contract`; FE `check:module-manifest`, `check:home-manifest`.

### What was changed

1. **`check:repo-paths` (both repos) — the environment fact is separated from the defect.**
   Whether the sibling repo is checked out is not a resolver bug. When it is absent the self-test
   now asserts the **absence contract** instead (null root; the path composer throws and names the
   marker) and ends **INCONCLUSIVE, exit 2**, downgraded to a labelled **PARTIAL, exit 0** only
   under `STREAMLINE_ALLOW_PARTIAL_GATES=1` (BE) / `STREAMLINE_ALLOW_FRONTEND_ONLY=1` (FE) — the
   escape hatch these modules already define for their own gates. The CI steps set that env and
   **stay blocking**. Assertion counts in the two-repo layout are unchanged: BE 9, FE 18.
2. **Every step of both `gates` jobs now carries `if: ${{ !cancelled() }}`** (BE 76 steps + the
   cache-restore step, FE 27). A failed step still fails the job; it no longer hides its
   successors. After the change all 76 BE and all 27 FE steps execute in the CI layout.
3. **The six cross-repository gates are `continue-on-error` with the prerequisite, the measured CI
   exit code and the measured two-repo exit code named in the step comment.** They are deliberately
   NOT given the PARTIAL opt-in: a comparison that never happened must not read as a green tick.

---

## 2. Bite proof — the PARTIAL opt-in cannot mask a defect

Run in `scratchpad/t35/iso-{be,fe}`, a directory holding only the script, so no sibling resolves.

| Repo | Planted defect | rc no env | rc WITH the CI opt-in |
|---|---|---|---|
| BE | `frontendPath` composes onto a null root instead of throwing | **1** | **1** |
| BE | an unfindable marker resolves to the search dir instead of `null` | **1** | — |
| FE | `isBackendRoot` accepts any directory | **1** | **1** |
| FE | `backendPath` composes onto a null root | **1** | **1** |
| FE | the dot-directory scan exclusion narrowed to a literal `.next` | **1** | **1** |
| both | defect removed (control) | **2** INCONCLUSIVE | **0** PARTIAL |

Each failure named the exact assertion. The opt-in changes only the INCONCLUSIVE→PARTIAL verdict;
it never turns a failed assertion into a pass.

---

## 3. A BLIND GATE, found by bite proof: `check:effect-fetches`

The bite proof is the whole point of this ticket, and it caught one on the first pass.

`check:effect-fetches` is named "No useEffect-driven API fetches". It printed
`✔ No useEffect-driven API fetches found (5,278 files scanned)` — over a real one.

Planting the canonical shape produced **rc=0**: the gate did not bite.

```
useEffect(() => { apiClient.get("/x").then(setData); }, []);
```

Both existing rules need a shape the common case does not have. Rule 1 requires an **`async`**
`useEffect`. Rule 2 requires **both** a `useCallback` holding `apiClient` **and** a `void fn()`
call — and its window regex is `useEffect\s*\(\s*\(\)\s*=>\s*\{[^}]*void\s+(\w+)\s*\(`, whose
`[^}]*` stops at the first brace in the body, so any effect with an object literal or nested block
before the call escapes it too.

**Rule 3 added:** brace-match every `useEffect` callback body and look for a direct `apiClient.`
call in it. Brace matching rather than a regex window is load-bearing in the *risky* direction —
it is what stops the scan running past the end of the effect and into an unrelated
`useQuery({ queryFn: () => apiClient.get(...) })` below it, which would flag the CORRECT pattern as
the forbidden one. Pinned by a negative fixture (`effect-then-query.tsx`) and two assertions that
an object literal inside a body does not truncate the match.

**Measured: 5,278 files, sites 0 → 1. Self-test 20 → 25 passed.**

The one site is **`components/layout/command-palette.tsx:177`** — a debounced entity search calling
`apiClient.get("/search", { q })` inside `useEffect` with a hand-rolled `cancelled` flag instead of
`useQuery`. **Frontend component territory; reported, not fixed.** The step is left BLOCKING and
red: the code is what is wrong, and `if: !cancelled()` means it no longer hides anything.

Bite proof, hermetic HEAD tree:

| Step | rc |
|---|---|
| head as-is | **1**, naming `command-palette.tsx:177` |
| the one site rewritten to `useQuery` | **0**, "5,276 files scanned" |
| a fresh canonical effect fetch planted | **1**, naming the planted file |
| planted file removed | **0** |

---

## 4. Bite proofs completed this session — both directions, hermetic

`before` is head, `planted` is with a defect added to the `git archive HEAD` copy, `restored` is
after removing it. Every `planted` run was checked to name the planted file, not merely to be red.

| Gate | before | planted | restored | verdict |
|---|---|---|---|---|
| FE `check:repo-paths` (5 defects, 2 layouts, 2 env states) | 0 / 2 | 1 | 0 / 2 | **BITE-PROVEN** |
| BE `check:repo-paths` (2 defects, 2 env states) | 0 / 2 | 1 | 0 / 2 | **BITE-PROVEN** |
| FE `check:colors` | 0 | 1 | 0 | **BITE-PROVEN** — named `features/_t35/t35-color.tsx:2` |
| FE `check:formatters` | 0 | 1 | 0 | **BITE-PROVEN** — named `t35-fmt.ts:1` |
| FE `check:type-assertions` | 0 | 1 | 0 | **BITE-PROVEN** — `t35-assert.ts :: as any x1` |
| FE `check:over-300` | 0 | 1 | 0 | **BITE-PROVEN** — `342  features/_t35/t35-long.ts` |
| FE `check:import-direction` | 0 | 1 | 0 | **BITE-PROVEN** — a `components/` file importing `@/features/...` |
| FE `check:icon-labels` | 0 | 1 | 0 | **BITE-PROVEN** — an icon-only `Button` with no accessible name |
| FE `check:effect-fetches` | **0 over a real defect** | — | — | **BLIND — fixed, then bite-proven (§3)** |

**NOT REACHED.** The remaining ~90 gates were not bite-proven in this session. They are not claimed.
S8/S10/S11 recorded mutation proofs for many of them (`reports/35-gate-bite-proofs.md`,
`35c-gate-bite-proofs-s10.md`, `35-bite-prove-every-gate.md`); this session did not re-verify those.
The one gate this session did bite-prove that a prior session had counted as proven —
`check:effect-fetches` — was blind, so the prior corpus should be treated as **unre-verified**, not
as sound.

---

## 5. Every gate step, measured at head in the layout CI actually checks out

All 76 BE and all 27 FE steps executed (they abort no longer). `rc=2` is INCONCLUSIVE, not a pass.

### Frontend — 20 green / 1 blocking-red / 6 allow-failure-red

| # | Step | rc | blocking? |
|---|---|---|---|
| 9 | `check:command-catalog` | **1** | **BLOCKING RED** — 1,504 hooks, 4 above a baseline of 0 |
| 12 | `check:effect-fetches` | **1** | **BLOCKING RED** — the §3 finding |
| 6 | `check:module-manifest` | 2 | allow-failure, prerequisite named |
| 7 | `check:home-manifest` | 2 | allow-failure, prerequisite named |
| 20 | `check:file-sizes` | 1 | allow-failure — 3 files over 500 |
| 22 | `check:dead-code` | 1 | allow-failure — 1 unclassified export |
| 23 | `check:route-bundle-budget` | 1 | allow-failure — 17 measured breaches |
| 24 | `check:routes` | 1 | allow-failure — 1 business route handler |
| 25 | `check:web-vitals-budget` | 1 | allow-failure — 2 TTFB breaches |
| 27 | `check:contract-vendor` | 1 | allow-failure by design in a frontend-only checkout |
| — | the other 18 | 0 | blocking, green |

`check:command-catalog`'s four are real defects and the baseline was NOT raised to absorb them:
`hooks/api/ai.ts:175 useGenerateJobDescription` (UNCLASSIFIED — no `apiClient` call in the hook
body) and `hooks/api/git-integration.ts:59/69/79` (WRONG-KEY — declare `integrations:git:manage`
where the contract requires `settings:manage`). **Frontend hook territory.**

### Backend — 57 green / 12 blocking-red / 6 allow-failure

Blocking and red at head, every one naming a specific defect (all other territories):
`check:dead-code` (1 unclassified: `ai/core/dto/request.schemas.ts:MeetingPrepInput`) ·
`openapi:check` (ts-node throws in `email/templates/registry/_shared.ts:51`) ·
`check:record-access` (`hr-automation-engine.service.ts:303` can read a deleted row) ·
`check:placement-bypass` (2 un-allowlisted bypasses: `audit-log.controller.ts:36`,
`contacts.controller.ts:93`) · `check:fire-and-forget` · `check:mock-surface` (phantom
`CacheService.delByPrefix()` in `organization-custom-domains-404.spec.ts`) · `check:spec-typecheck`
(rc=2 — `crm-custom-fields.service.ts:7` imports `keysetAfterIntValue`, which does not exist at
head) · `check:vulnerabilities` (4 HIGH, all `fast-uri`) · `check:licenses`
(`@img/sharp-libvips-darwin-arm64@1.3.2` LGPL-3.0-or-later) · `check:tenant-isolation` ·
`check:unbounded-reads` · `check:lifecycle-predicates` (self-test assertion "the candidate set
stays actionable" now fails at 78) · `check:route-budgets`
(`GET /calendar/events` measuredBufferBlocks=7072 over 2000).

**None of these is a blind gate — every one bit and named a file. They are 12 real defects
sitting in other tickets' territories, and they are why the `gates` job will be red on its
first real run. That is the correct result.**

---

## 6. Allow-failure numbers re-measured, because a stale number is the same defect as a blind gate

The brief requires the number in each allow-failure comment to stay honest. Three were wrong:

| Gate | comment said | measured at head |
|---|---|---|
| FE `check:dead-code` | 3 unclassified exports, named | **1** (`types/projects/shared.ts:PaginatedResponse`) |
| FE `check:route-bundle-budget` | "6 routes never measured" | **17 measured breaches** |
| FE `check:web-vitals-budget` | 5 breaches incl. mobile FCP | **2**, both TTFB |
| FE `check:import-direction` | rc=1 at 222/210 and 20/19 | **rc=0 at 182/182 and 19/19** |

`check:import-direction` is green at its ratchet, so per the workflow's own written rule the
`continue-on-error` was **deleted and the step now blocks**. The FE dead-code note had also drifted
above the wrong step and was moved back.

BE `check:file-sizes` keeps its `continue-on-error` for a **newly measured and different** reason,
now recorded in its comment: the GATE is rc=0 ("3,574 files, all within 500 lines"), but its
SELF-TEST exits 1 in a backend-only checkout ("the §7 exception registry is reachable in this
checkout" — 3 failed / 36 passed), because the registry lives in the frontend repository.

Allow-failure gate steps: BE 6 (was 3), FE 8 (was 7). The brief's figure of 8 was already stale.

---

## 7. Cross-territory findings — reported, not fixed

1. **NOTHING IS PUSHED. 129/131 commits ahead of `origin/main`.** Until that is resolved no gate
   in this release has ever executed in CI, whatever a report says. **Orchestrator.**
2. `components/layout/command-palette.tsx:177` — the useEffect-driven fetch (§3). **FE components.**
3. `hooks/api/ai.ts:175` and `hooks/api/git-integration.ts:59/69/79` — 4 `check:command-catalog`
   defects, baseline deliberately not raised. **FE hooks.**
4. The 12 red blocking BE gates in §5. **Various backend tickets.**
5. BE `check:file-sizes:self-test` cannot pass in a backend-only checkout (§6). Left as a named
   prerequisite; the durable fix is to give it the same absence contract `check:repo-paths` now has.
6. FE `check:properties` and `verify:server-data-seam`, BE `check:alert-ack` (live half) and the
   `db:check-*` instruments remain wired to no workflow, each with a reason recorded in 35b.

## 8. What this session did NOT do

- **Did not push, and could not.** Every claim above is a local hermetic measurement.
- **Did not bite-prove the other ~90 gates.** Named individually in §4 as NOT REACHED.
- **Did not re-verify S8/S10/S11's mutation corpus.** Given that the one gate re-checked here was
  blind, that corpus is unre-verified rather than sound.
- **Did not run either repo's unit suite, lint, or typecheck.** Not run.
- **Did not touch** `check-db-call-count.mjs`, `check-benchmark-manifest.mjs`, or the frontend
  empty-states / a11y gates — other agents' territory.
