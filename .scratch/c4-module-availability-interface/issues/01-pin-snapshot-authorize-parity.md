# 01 — What the access snapshot promises is what the next request allows

**What to build:** A test proving that, for every combination of plan, organisation module row, per-person deny and module key, the access snapshot and the request-time authorization path return the same availability and the same reason. The snapshot's own comment claims this property — that it uses the same inputs so it cannot promise what a request then refuses — and nothing currently proves it.

Expect this test to fail on first run. Three callers assemble the availability inputs differently, and the snapshot's definition of a core module is the widest, which is exactly how it can over-promise. Assert today's behaviour, mark the disagreeing cells, and let tickets 02 and 03 flip them.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

## Acceptance criteria

- [ ] The matrix covers: plan-locked and not; organisation row enabled, disabled and absent; per-person deny present and absent; a core module and a plan-gated one.
- [ ] Each cell asserts availability **and the reason**, not just the boolean — the reason is what distinguishes an upgrade prompt from an ask-your-admin prompt, and a boolean-only test passes under every defect described here.
- [ ] Cells where the snapshot and the authorization path currently disagree are asserted at today's behaviour and marked for tickets 02 and 03.
- [ ] The test drives the real availability function through each caller's own resolver, so a difference in how the inputs are assembled shows up as a failure.
- [ ] Backend suite green with the new test included.

## Todo

- [ ] Enumerate the matrix and write the expected verdict and reason per cell before coding
- [ ] Drive both paths from one fixture so a divergence fails rather than requiring two comparisons
- [ ] Record in this ticket which cells disagree and why — that list is the input to tickets 02 and 03
- [ ] Follow the warm/cold parity spec's shape; it is the existing precedent for this kind of two-path assertion
- [ ] Run the backend suite in shards
- [ ] Tick every acceptance criterion above
- [ ] Set **Status** to `done` and update this ticket's row in `../README.md`
