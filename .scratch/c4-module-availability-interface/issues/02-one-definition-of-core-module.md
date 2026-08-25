# 02 — Everyone agrees which modules are core

**What to build:** One definition of "is this module core", owned by the entitlements service, used by every caller of the availability function. Today there are three, all passed into the same function, and "core" is the earliest and most absolute branch in the resolution order — it bypasses per-person denies, organisation rows and plan locks alike. Three definitions means at least two are wrong.

The widest of the three treats any module absent from the effective module map as core. That is what lets the access snapshot report a module available which the next request refuses.

**Blocked by:** 01 — What the access snapshot promises is what the next request allows.

**Status:** done — verified 2026-08-25

## Acceptance criteria

- [x] Exactly one definition of core exists, owned by the entitlements service, and every caller uses it.
- [x] The "absent from the effective map means core" reading is either justified in writing or removed — the burden of proof is on keeping it, because it is the reading that permits over-promising.
- [x] A core module stays available even with a per-person deny and a disabled organisation row.
- [x] The modules the constitution names as core remain core.
- [x] Any behaviour change this surfaces is recorded in this ticket as a finding, not silently absorbed as a regression.
- [x] The cells marked in ticket 01 that were caused by this disagreement now agree.
- [x] Backend suite green.

## Todo

- [x] Write out the three current definitions side by side and identify precisely where they differ
- [x] Decide the single correct definition and record the reasoning in this ticket
- [x] Move it to the entitlements service and point all callers at it
- [x] Re-run the ticket 01 parity test and confirm which cells flipped
- [x] For each flip, decide and record whether it is a fix or a regression before proceeding
- [x] Confirm the constitution's named core modules still resolve as core
- [x] Tick every acceptance criterion above
- [x] Set **Status** to `done` and update this ticket's row in `../README.md`

---

## Verification (2026-08-25)

One definition, `isCoreModuleKey`, owned by `EntitlementsService`. `authorize()` and the snapshot both use it; the snapshot's extra `|| !(key in effective)` clause is deleted.

`cd backend && npx jest --testPathPattern "modules/access|common/rbac"` → **34 suites, 373 tests, all pass.**

**The `billing` decision.** `billing` is `planGated: false` but `ladder: "platform-admin"`, and it was the sole divergence: the guard said not-core, `authorize()` and the snapshot said core. The guard's answer is the one that governs real HTTP requests, and aligning the other two with it NARROWS access rather than widening it — the conservative direction, and the only safe one for a branch that bypasses per-person denies, org rows and plan locks alike. Both flipped cells are fixes: the snapshot can no longer report billing reachable on a path the guard would refuse.

`home`, `kb`, `chat`, `mail` and `calendar` all still resolve core, pinned by a test that gives each a disabled org row, a user deny AND a plan lock and still expects available.
