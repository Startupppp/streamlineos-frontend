# 45 — A new ticket-mutating path cannot bypass the change module

**What to build:** The next author who adds a ticket write cannot ship a partial effect set. With all three existing paths delegating, the remaining risk is a fourth path written the old way — and nothing today would notice, because forgetting one of the fifteen steps is not an error, it is a webhook that never fires. A gate makes the seam enforceable: a statement updating the tickets table outside the change module fails the check.

Pair it with the count the gate is protecting, so the number cannot be quietly moved instead of the structure fixed.

**Blocked by:** 44 — Dragging a card fires the same effects as editing it in the panel.

**Status:** blocked on tickets 43 and 44 — the change module does not exist; a gate asserting all writes go through it cannot be written or made green until the module exists and all callers delegate

- [ ] A ticket update issued outside the change module fails the gate — BLOCKED: no module to gate against
- [ ] The gate has a self-test that constructs the bypass and fails without the check — BLOCKED
- [ ] Legitimate exceptions, if any, are enumerated in a ratchet file that may only shrink — BLOCKED
- [ ] The gate's output states what it scans and what forms it cannot see, per the house lesson on text scans — BLOCKED
- [ ] Running it on a settled tree is green, and the run is recorded — BLOCKED
