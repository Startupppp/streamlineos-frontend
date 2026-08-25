# 01 — What the access snapshot promises is what the next request allows

**What to build:** A test proving that, for every combination of plan, organisation module row, per-person deny and module key, the access snapshot and the request-time authorization path return the same availability and the same reason. The snapshot's own comment claims this property — that it uses the same inputs so it cannot promise what a request then refuses — and nothing currently proves it.

Expect this test to fail on first run. Three callers assemble the availability inputs differently, and the snapshot's definition of a core module is the widest, which is exactly how it can over-promise. Assert today's behaviour, mark the disagreeing cells, and let tickets 02 and 03 flip them.

**Blocked by:** None — can start immediately.

**Status:** done — verified 2026-08-25

## Acceptance criteria

- [x] The matrix covers: plan-locked and not; organisation row enabled, disabled and absent; per-person deny present and absent; a core module and a plan-gated one.
- [x] Each cell asserts availability **and the reason**, not just the boolean — the reason is what distinguishes an upgrade prompt from an ask-your-admin prompt, and a boolean-only test passes under every defect described here.
- [x] Cells where the snapshot and the authorization path currently disagree are asserted at today's behaviour and marked for tickets 02 and 03.
- [x] The test drives the real availability function through each caller's own resolver, so a difference in how the inputs are assembled shows up as a failure.
- [x] Backend suite green with the new test included.

## Todo

- [x] Enumerate the matrix and write the expected verdict and reason per cell before coding
- [x] Drive both paths from one fixture so a divergence fails rather than requiring two comparisons
- [x] Record in this ticket which cells disagree and why — that list is the input to tickets 02 and 03
- [x] Follow the warm/cold parity spec's shape; it is the existing precedent for this kind of two-path assertion
- [x] Run the backend suite in shards
- [x] Tick every acceptance criterion above
- [x] Set **Status** to `done` and update this ticket's row in `../README.md`

---

## Verification (2026-08-25)

`backend/src/modules/access/__tests__/module-availability-parity.spec.ts` drives each caller through ITS OWN resolver construction across plan × org row × deny × module key, asserting availability AND reason.

`cd backend && npx jest --testPathPattern "modules/access/__tests__/module-availability-parity" --maxWorkers=2` → **12 tests, all pass** (asserting today's real behaviour, wrong reasons included).

### The disagreeing cells — the input to tickets 02 and 03

| Module | Org row | Deny | Plan-locked | `authorize()` | Snapshot | `ModuleGuard` | Cause |
|---|---|---|---|---|---|---|---|
| `hr` | absent | no | **yes** | `org-disabled` | `org-disabled` | `not-in-plan` | Both stub `getPlanLockedModules: async () => []`, so step 5's `not-in-plan` is unreachable. → ticket 03 |
| `billing` | absent | no | no | **available** | **available** | `org-disabled` | Three different `isCoreModule` definitions. → ticket 02 |

**The `billing` row is the more serious of the two.** `authorize()` and the snapshot both report billing AVAILABLE where `ModuleGuard` refuses it, because the guard's `coreModuleIds()` excludes modules with the `platform-admin` ladder while the other two only test `!isPlanGatedModule`. So the snapshot can tell the client billing is reachable on a path the guard would 402. Practical blast radius is limited because platform billing is never delegable, but the divergence is real.

### Are the three `isCoreModule` definitions equivalent?

For every currently registered module **except `billing`**, yes — plan-gated modules are non-core under all three, and non-plan-gated modules are core under all three. The snapshot's extra `|| !(key in effective)` clause is **currently redundant**: every non-administrable module is also non-plan-gated, so the first disjunct already answers true. It would only bite if a non-administrable plan-gated module existed, and none does today.

That matters for ticket 02: the clause is not (yet) causing the over-promising I attributed to it in the spec — `billing`'s `platform-admin` ladder is. Reconcile on that evidence, not on the spec's original guess.
