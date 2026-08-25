# 02 — Everyone agrees which modules are core

**What to build:** One definition of "is this module core", owned by the entitlements service, used by every caller of the availability function. Today there are three, all passed into the same function, and "core" is the earliest and most absolute branch in the resolution order — it bypasses per-person denies, organisation rows and plan locks alike. Three definitions means at least two are wrong.

The widest of the three treats any module absent from the effective module map as core. That is what lets the access snapshot report a module available which the next request refuses.

**Blocked by:** 01 — What the access snapshot promises is what the next request allows.

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Exactly one definition of core exists, owned by the entitlements service, and every caller uses it.
- [ ] The "absent from the effective map means core" reading is either justified in writing or removed — the burden of proof is on keeping it, because it is the reading that permits over-promising.
- [ ] A core module stays available even with a per-person deny and a disabled organisation row.
- [ ] The modules the constitution names as core remain core.
- [ ] Any behaviour change this surfaces is recorded in this ticket as a finding, not silently absorbed as a regression.
- [ ] The cells marked in ticket 01 that were caused by this disagreement now agree.
- [ ] Backend suite green.

## Todo

- [ ] Write out the three current definitions side by side and identify precisely where they differ
- [ ] Decide the single correct definition and record the reasoning in this ticket
- [ ] Move it to the entitlements service and point all callers at it
- [ ] Re-run the ticket 01 parity test and confirm which cells flipped
- [ ] For each flip, decide and record whether it is a fix or a regression before proceeding
- [ ] Confirm the constitution's named core modules still resolve as core
- [ ] Tick every acceptance criterion above
- [ ] Set **Status** to `done` and update this ticket's row in `../README.md`
