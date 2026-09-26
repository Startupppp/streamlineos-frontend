# 44 — Dragging a card fires the same effects as editing it in the panel

**What to build:** Moving a ticket to Done on the board has the same consequences as changing its status in the detail panel. It does not today: the detail route produces eleven effects and the rank route produces two, so a drag writes no activity row, fires no webhook, runs no automation and sends no notification. The bulk route is the same. A customer's integration receives ticket-updated for some status changes and not others with no pattern they can see, and the audit trail has holes exactly where the primary board gesture is used.

Both routes become callers that compute a change and delegate, so the effect set follows what changed rather than which gesture changed it.

**Blocked by:** 43 — "Apply a change to a ticket" becomes a module, and the detail route goes through it.

**Status:** ready-for-agent

- [ ] The rank route and the bulk route delegate to the change module and perform no effect step themselves
- [ ] A status change by drag produces the same effects as the same status change by panel edit, asserted side by side in one test
- [ ] A bulk transition produces the per-ticket effects for every row it moved
- [ ] Rank-only changes produce only the effects a rank change warrants — the diff decides, not the route
- [ ] Webhook subscribers receive one event per changed ticket, at the right version scale
- [ ] No production webhook is delivered while testing this
