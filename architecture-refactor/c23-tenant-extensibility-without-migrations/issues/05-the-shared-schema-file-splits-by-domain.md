# 05 — The shared schema file splits by domain

**What to build:** Importing one concept stops dragging in six unrelated ones. One shared file currently holds notifications, broadcasts, push subscriptions, calendar events, attendees, webhooks and subscriptions.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

**Audit note (2026-08-26):** All criteria genuinely open. `backend/src/db/schema/common/shared.ts` is 480 lines and still contains all seven domains: notifications, broadcasts, push subscriptions, calendar events/attendees, webhooks, subscriptions/payments/coupons, and ai_usage_logs. No split has been performed.

## Acceptance criteria

- [ ] The file splits along its seven domain lines.
- [ ] Mutually-referencing tables are co-located so the split does not create a cycle.
- [ ] The import graph stays acyclic, asserted in CI as it is today.
- [ ] Both repos build.
- [ ] No table definition changes — this is a move.

## Todo

- [ ] Co-locate mutually-referencing tables in the same file
- [ ] Run the cycle check after each move
- [ ] Build, do not just typecheck
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c23 — A tenant extends the product without a deploy`](../prd.md) · Candidate index: [`../README.md`](../README.md)
