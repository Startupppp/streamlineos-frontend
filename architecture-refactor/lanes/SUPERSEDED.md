# SUPERSEDED — use [`../sessions/`](../sessions/README.md)

These four lane files described the split as of 2026-08-26. Much of that work has since landed, so
their ticket lists and "what is genuinely open" sections are now wrong in both directions — they name
closed tickets as open, and predate the current territory boundaries.

**Do not start a session from a file in this directory.** The current split is five sessions in
[`../sessions/`](../sessions/README.md), partitioned on real file boundaries rather than by candidate:
notably `billing.service.ts` carries both the webhook path and coupon redemption, so c17 cannot be
split the way the old LANE-1 implied.

Kept rather than deleted because the running sessions were started from them and their territory
rules are still what those sessions are obeying.
