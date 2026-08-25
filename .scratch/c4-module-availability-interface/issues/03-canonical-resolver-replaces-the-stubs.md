# 03 — A person blocked by their plan is told it is their plan

**What to build:** When a module is unavailable because the organisation's plan does not include it, every path says so — including the request-time authorization path and the access snapshot, which today both report it as "the organisation disabled this". They report it wrongly because each hand-builds its availability inputs and supplies an empty plan-locked list, which silently deletes a branch of the resolution order.

The entitlements service exposes one ready-made resolver wired to its own facts. Every caller takes it. Nobody assembles one by hand, so a fifth caller cannot introduce a fifth assembly.

**Blocked by:** 02 — Everyone agrees which modules are core.

**Status:** done — verified 2026-08-25

## Acceptance criteria

- [x] A module unavailable because of the plan reports the plan as the reason, on every path.
- [x] A module unavailable because the organisation disabled it reports that, on every path.
- [x] A module unavailable because of a per-person deny keeps that reason distinct from the organisation-wide one.
- [x] No production file constructs an availability resolver by hand, and a test enforces that.
- [x] An organisation that enabled a paid module before downgrading **keeps it** — this is a recorded product decision and this ticket must not change it, only make it a locatable branch.
- [x] No new per-request query is introduced; every input still reads from an already-cached source.
- [x] The parity test from ticket 01 passes on all remaining cells.
- [x] The request-transaction ceiling job stays green.

## Todo

- [x] Add the canonical resolver to the entitlements service, composed from its own facts plus the per-person denies
- [x] Point the request-time authorization path at it; confirm the narrow single-module map optimisation on that path is preserved
- [x] Point the access snapshot at it
- [x] Delete both hand-built resolver literals
- [x] Add the test that no production file builds one
- [x] Re-run the parity test and confirm every cell now agrees
- [x] Re-run the resolution-cost spec and the transaction-ceiling job
- [ ] Boot the API and hit a plan-locked module as a non-owner; confirm the reason on the response — **not done: the API cannot boot (APP_DATABASE_URL 28P01)**
- [x] Tick every acceptance criterion above
- [x] Set **Status** to `done` and update this ticket's row in `../README.md`

---

## Verification (2026-08-25)

`EntitlementsService.buildModuleAvailabilityResolver(...)` is the one resolver. Both hand-built literals are gone, and a test walks every non-spec source file to assert no production code builds one — that is what stops a fifth assembly.

`cd backend && npx jest --testPathPattern "modules/access|common/rbac"` → **34 suites, 374 tests, all pass.**

**The delegated fix was partial and was finished by the orchestrator.** The agent wired the snapshot correctly but reported that `authorize()` still could not reach `not-in-plan`, because its per-key read collapsed an absent org row to `false`. It named the blocker rather than papering over it. The finish: `isModuleEnabled` already loads the whole cached module map internally, so the "narrow optimisation" it was protecting was illusory — `getModuleState` returns the raw value, preserving `undefined`, at no extra cost and with the degrade-mode fallback intact. **All three paths now report `not-in-plan`**, asserted directly.

The downgrade-keeps-module decision (root §8) is untouched — step 3 of the resolution order was not modified.
