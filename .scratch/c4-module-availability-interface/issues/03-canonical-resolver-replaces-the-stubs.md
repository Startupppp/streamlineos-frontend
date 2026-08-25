# 03 — A person blocked by their plan is told it is their plan

**What to build:** When a module is unavailable because the organisation's plan does not include it, every path says so — including the request-time authorization path and the access snapshot, which today both report it as "the organisation disabled this". They report it wrongly because each hand-builds its availability inputs and supplies an empty plan-locked list, which silently deletes a branch of the resolution order.

The entitlements service exposes one ready-made resolver wired to its own facts. Every caller takes it. Nobody assembles one by hand, so a fifth caller cannot introduce a fifth assembly.

**Blocked by:** 02 — Everyone agrees which modules are core.

**Status:** ready-for-agent

## Acceptance criteria

- [ ] A module unavailable because of the plan reports the plan as the reason, on every path.
- [ ] A module unavailable because the organisation disabled it reports that, on every path.
- [ ] A module unavailable because of a per-person deny keeps that reason distinct from the organisation-wide one.
- [ ] No production file constructs an availability resolver by hand, and a test enforces that.
- [ ] An organisation that enabled a paid module before downgrading **keeps it** — this is a recorded product decision and this ticket must not change it, only make it a locatable branch.
- [ ] No new per-request query is introduced; every input still reads from an already-cached source.
- [ ] The parity test from ticket 01 passes on all remaining cells.
- [ ] The request-transaction ceiling job stays green.

## Todo

- [ ] Add the canonical resolver to the entitlements service, composed from its own facts plus the per-person denies
- [ ] Point the request-time authorization path at it; confirm the narrow single-module map optimisation on that path is preserved
- [ ] Point the access snapshot at it
- [ ] Delete both hand-built resolver literals
- [ ] Add the test that no production file builds one
- [ ] Re-run the parity test and confirm every cell now agrees
- [ ] Re-run the resolution-cost spec and the transaction-ceiling job
- [ ] Boot the API and hit a plan-locked module as a non-owner; confirm the reason on the response
- [ ] Tick every acceptance criterion above
- [ ] Set **Status** to `done` and update this ticket's row in `../README.md`
