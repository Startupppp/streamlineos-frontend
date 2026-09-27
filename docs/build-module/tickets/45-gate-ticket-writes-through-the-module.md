# 45 — A new ticket-mutating path cannot bypass the change module

**What to build:** The next author who adds a ticket write cannot ship a partial effect set. With all three existing paths delegating, the remaining risk is a fourth path written the old way — and nothing today would notice, because forgetting one of the fifteen steps is not an error, it is a webhook that never fires. A gate makes the seam enforceable: a statement updating the tickets table outside the change module fails the check.

Pair it with the count the gate is protecting, so the number cannot be quietly moved instead of the structure fixed.

**Blocked by:** 44 — Dragging a card fires the same effects as editing it in the panel.

**Status:** all boxes earned

- [x] A ticket update issued outside the change module fails the gate — `check-ticket-write-module.mjs` scans `src/modules/build/**/*.ts` for `.update(tickets)` calls; any file not in `CHANGE_MODULE` and not in the ratchet exits 1
- [x] The gate has a self-test that constructs the bypass and fails without the check — 6 self-test assertions including: bypass file detected, clean file not flagged, new bypass produces a finding, stale ratchet entry detected; `node src/scripts/check-ticket-write-module.mjs --self-test` exits 0
- [x] Legitimate exceptions, if any, are enumerated in a ratchet file that may only shrink — `src/scripts/ticket-write-module-ratchet.json` lists 12 grandfathered bypass files; stale entries fail the gate
- [x] The gate's output states what it scans and what forms it cannot see, per the house lesson on text scans — output prints "Cannot see: indirect writes through service method chains; raw SQL UPDATE statements; dynamically resolved table handles; writes inside generated code; stored procedures."
- [x] Running it on a settled tree is green, and the run is recorded — `node src/scripts/check-ticket-write-module.mjs` on main: scanned 303 files, 12 grandfathered bypasses, 0 new bypasses, 0 stale entries, exit 0; wired into `ci.yml` `gates` job
