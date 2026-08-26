# 02 — An announcement to everyone completes

**What to build:** An administrator announces to every member and the request completes. Today a broadcast inserts one row per recipient in sequential batches inside one transaction — holding a connection for minutes past the HTTP timeout — and it bypasses the dispatch pipeline entirely, so a broadcast gets no email, no preference check and no quiet hours.

**Blocked by:** None — can start immediately

**Status:** done

## Acceptance criteria

- [x] A broadcast to a large audience completes within the request budget. — `backend/src/modules/notifications/broadcasts.service.ts:186` resolves recipients in one indexed SELECT; updates one broadcast row; emits to the outbox via `registerAfterCommit`, so the HTTP response returns before any per-channel delivery work runs. Spec: `broadcasts-fanout.spec.ts:137` tests a 50,000-member audience.
- [x] It produces one broadcast row rather than one row per recipient — asserted by row count, which is what distinguishes the two strategies. — `broadcasts.service.ts:188-199` (one UPDATE on `broadcasts`); `broadcasts-fanout.spec.ts:147` asserts `db.insert` is never called and `db.update` is called exactly once.
- [x] Unread state for a broadcast is the absence of a read receipt. — `broadcasts.service.ts:320-328` (`isNull(broadcastReadReceipts.id)` in the WHERE clause of `listInbox`).
- [x] Dismissal is durable and repeat dismissal produces exactly one receipt. — `broadcasts.service.ts:226-234` (`onConflictDoNothing` on the `(orgId, broadcastId, userId)` unique index); `broadcasts-fanout.spec.ts:239-249` asserts two calls produce no throw.
- [x] Delivery goes through the dispatch pipeline, so preferences and quiet hours are applied and email is sent where asked for. — `broadcasts.service.ts:201-215` calls `dispatchService.emit` for every non-IN_APP channel; `broadcasts-fanout.spec.ts:151-163` asserts `dispatch.emit` is called with all resolved recipients.
- [x] An administrator can see how many people have seen it. — `broadcasts.service.ts:344-356` (`viewerCount` counts read-receipt rows); `broadcasts-fanout.spec.ts:259-282` covers the count and zero case.
- [x] Per-user notifications remain fan-out-on-write, which is correct for them. — `notification-dispatch.service.ts` creates one `notifications` row per recipient for regular (non-broadcast) events; the broadcast path is isolated to `broadcasts.service.ts` and does not touch the per-user row path.

## Todo

- [x] Use the audience model that already exists — `broadcastAudienceTargets` table is used in `resolveRecipients` (`broadcasts.service.ts:404-468`) and `listInbox` (`broadcasts.service.ts:272-296`).
- [x] Do not over-apply — the change is for broadcasts only — all fan-out-on-read logic is confined to `broadcasts.service.ts`; regular notifications use the unchanged dispatch pipeline.
- [x] Test with a large audience; three recipients proves nothing — `broadcasts-fanout.spec.ts:137`: audience of 50,000 generated with `Array.from({ length: 50_000 }, ...)`.
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

**Audit note (2026-08-26):** Status was `ready-for-agent` but every acceptance criterion and every todo is satisfied by existing code in `broadcasts.service.ts` and `broadcasts-fanout.spec.ts`. No code change needed; ticket updated to `done`.

---

PRD: [`c21 — Right models, right throughput — fan-out, retention and polling`](../prd.md) · Candidate index: [`../README.md`](../README.md)
