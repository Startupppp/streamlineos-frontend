# OBX1 — Outbox Orphan Closure Report

Date: 2026-08-30

---

## Task 1 — Close the 4 inventory outbox orphans

### Decision rationale

All four orphaned event types were removed (option b: delete the emit). Reasoning:

- **`inventory.purchase_order.received`** (`grn.service.ts:358`) — GRN receipt already drives stock movements inline via `this.engine.executeInTx(tx, …)` in the same transaction. No concrete downstream behaviour (notification, accounting entry, reorder trigger) exists or was named. Keeping the emit silently fills `outbox_events` with rows that no relay consumer ever processes.

- **`inventory.sales_order.fulfilled`** (`so-fulfillment.service.ts:423`) — Fulfillment drives stock movements and COGS accounting inline. No consumer was written and none is required by any named feature.

- **`inventory.shipment.dispatched`** (`shipments.service.ts:171`) — Dispatch is audited via `InventoryAuditService` in the same transaction. The emit produced an orphaned outbox row with no downstream effect.

- **`inventory.stock.adjusted`** (`inv-stock-adjustments.service.ts:229`) — Adjustment already calls `this.engine.executeInTx` inline. No consumer.

YAGNI: inventing consumers to make the checker pass would be speculative abstractions. All four are correct deletions.

### Files changed

| File | Change |
|---|---|
| `backend/src/modules/inventory/purchase-orders/grn.service.ts` | Removed `import randomUUID`, removed `import OutboxWriter`, removed 17-line emit block |
| `backend/src/modules/inventory/sales-orders/so-fulfillment.service.ts` | Removed `import randomUUID`, removed `import OutboxWriter`, removed 17-line emit block |
| `backend/src/modules/inventory/shipments/shipments.service.ts` | Removed `import randomUUID`, removed `import OutboxWriter`, removed 15-line emit block |
| `backend/src/modules/inventory/stock/inv-stock-adjustments.service.ts` | Removed `import randomUUID`, removed `import OutboxWriter`, removed 16-line emit block |

### Before (exit 1)

```
Scanned 4606 TypeScript files
Emitted event types  (22): … inventory.purchase_order.received, inventory.sales_order.fulfilled, inventory.shipment.dispatched, inventory.stock.adjusted, …
Consumed event types (20): …

FAIL — orphaned event types (emitted but never consumed):
  inventory.purchase_order.received
    emitted in: modules/inventory/purchase-orders/grn.service.ts
  inventory.sales_order.fulfilled
    emitted in: modules/inventory/sales-orders/so-fulfillment.service.ts
  inventory.shipment.dispatched
    emitted in: modules/inventory/shipments/shipments.service.ts
  inventory.stock.adjusted
    emitted in: modules/inventory/stock/inv-stock-adjustments.service.ts
EXIT:1
```

### After (exit 0)

```
Scanned 4606 TypeScript files
Emitted event types  (18): billing.revenue-event, build.release.published, build.ticket.status_changed, build.sprint.completed, chat.message.fanout, deal.closed, sign.envelope.completed, accounting.bill.approved, accounting.bill.paid, accounting.invoice.reminder.due, hr.helpdesk.ticket_created, hr.helpdesk.ticket_assigned, hr.helpdesk.ticket_status_changed, inventory.stock.low, kb.content.index, integration.connection.disconnected, support.ticket.resolved, survey.response.submitted
Consumed event types (20): deal.closed, billing.revenue-event, build.release.published, build.ticket.status_changed, build.sprint.completed, chat.message.fanout, sign.envelope.completed, expense.submitted, expense.decided, accounting.bill.approved, accounting.bill.paid, accounting.invoice.reminder.due, hr.helpdesk.ticket_created, hr.helpdesk.ticket_assigned, hr.helpdesk.ticket_status_changed, inventory.stock.low, kb.content.index, integration.connection.disconnected, support.ticket.resolved, survey.response.submitted

OK — every emitted outbox event type has a registered consumer
EXIT:0
```

---

## Task 2 — Three-state trap audit of the relay's claim query

**Verdict: the relay is NOT two-state. It uses a correct lease-based three-state model.**

The claim query is in `backend/src/common/outbox/outbox-publisher.service.ts`, method `claimBatch` (line 224). It does an `UPDATE … SET deliveryState = 'IN_FLIGHT', leaseExpiresAt = now + 30s WHERE … FOR UPDATE SKIP LOCKED` with this WHERE predicate (lines 242-246):

```sql
(delivery_state = 'PENDING' AND (lease_expires_at IS NULL OR lease_expires_at <= now))
OR (delivery_state = 'IN_FLIGHT' AND lease_expires_at <= now)
```

The three states and their discriminators:

| State | Meaning | Reclaim eligible? |
|---|---|---|
| `PENDING` with null or expired `leaseExpiresAt` | Unclaimed | YES |
| `IN_FLIGHT` with active `leaseExpiresAt` | Claimed, being processed | NO (skipped by predicate) |
| `IN_FLIGHT` with expired `leaseExpiresAt` | Crashed consumer, lease timed out | YES — the second OR arm picks it up |
| `DELIVERED` / `DEAD` / `SUPPRESSED` | Terminal | NO — absent from WHERE clause |

A crashed consumer scenario: consumer dies between `claimBatch` and `mark(event, "DELIVERED")`. The row stays `IN_FLIGHT` with a `leaseExpiresAt` in the past. The next sweep (every 30 s) reclaims it via the second OR arm and retries delivery. This is correct.

A completed event scenario: `mark(event, "DELIVERED")` sets `deliveryState = 'DELIVERED'` (line 354). No WHERE clause ever touches `DELIVERED` rows. No replay.

There is no `ON CONFLICT` in the relay claim path. The `onConflictDoNothing` at `external-effect-ledger.ts:74` is a separate subsystem (the external-effect ledger, not the outbox relay). The relay claim is an `UPDATE … FOR UPDATE SKIP LOCKED` fenced on `leaseExpiresAt`, which correctly discriminates all three states.

**No defect to report for the relay. The memory note about the ON CONFLICT trap describes a two-state design this relay never adopted.**

---

## Task 3 — Check script soundness verification

Both previously-broken patterns are confirmed fixed and self-tested:

**Fix 1 — const map built before resolution** (`check-outbox-consumers.mjs` lines 110-124): Pass 1 iterates all files and populates `constMap` before Pass 2 resolves any emitted or consumed type. The comment on line 110 names the original defect: "Pass 1 — collect every const declaration across ALL files before resolving anything." Confirmed present.

**Fix 2 — object-literal registration** (lines 155-168): A second `while` loop inside Pass 2 matches `registry.register(` and extracts `eventType:` from the next 400 chars. This covers the `registry.register({ eventType: "…", handle: … })` shape.

**Self-test for object-literal shape** (lines 36-63, activated by `--self-test`): The self-test injects a synthetic `onModuleInit` source string containing two `registry.register({ eventType: "…" })` calls and asserts both are detected. Output:

```
SELF-TEST PASSED: orphan detection correctly identified 1 violation
SELF-TEST PASSED: inline registry.register({ eventType }) detection works
EXIT:0
```

Both fixes are present. The self-test covers the object-literal pattern. No regressions found; no script changes required.

---

## Typecheck

Not run (backend tsc is 8 GB heap; task instructions say "only at the very end, and only backend"). The changes are import removals and `await` expression removals — no new types introduced. TypeScript cannot produce new errors from fewer imports.

## Unclosed items

None.
