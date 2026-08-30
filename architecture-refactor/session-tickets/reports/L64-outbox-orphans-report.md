# L64 — Outbox Orphan Remediation Report

## Gate output before / after

**Before (8 orphans):**
```
build.project.created
build.ticket.created
hr.helpdesk.ticket_assigned
hr.helpdesk.ticket_status_changed
inventory.purchase_order.received
inventory.sales_order.fulfilled
inventory.shipment.dispatched
inventory.stock.adjusted
```

**After (4 orphans — all inventory, all out of scope):**
```
inventory.purchase_order.received
inventory.sales_order.fulfilled
inventory.shipment.dispatched
inventory.stock.adjusted
```

---

## Per-event decisions

### `hr.helpdesk.ticket_assigned` — Outcome 1: Consumer exists; checker was blind

**What breaks today:** Nothing. The consumer `HrHelpdeskEventsConsumer` handles this event correctly. The outbox row is claimed, the notification is sent to the newly-assigned HR agent, and `inbox.markProcessed` is called.

**Root cause:** `HrHelpdeskEventsConsumer` has `readonly eventType = "hr.helpdesk.ticket_created"` (one event type declared on the class), but it registers two additional event types in `onModuleInit` via plain object literals:
```typescript
this.registry.register({ eventType: "hr.helpdesk.ticket_assigned", handle: (e) => this.handle(e) });
this.registry.register({ eventType: "hr.helpdesk.ticket_status_changed", handle: (e) => this.handle(e) });
```
The checker only scanned for `readonly eventType = "..."` class properties. It never matched `registry.register({ eventType: "..." })`.

**Fix:** Added a second detection pass in `check-outbox-consumers.mjs` that scans for `registry.register(` calls and extracts `eventType:` from the argument window (400-char look-ahead). Extended `--self-test` to verify the pattern is recognised on a synthetic snippet with two inline registrations.

---

### `hr.helpdesk.ticket_status_changed` — Outcome 1: Consumer exists; checker was blind

Same root cause as `hr.helpdesk.ticket_assigned` above. Same fix. `handleTicketStatusChanged` in `HrHelpdeskEventsConsumer` dispatches a notification to the ticket owner when an admin moves the ticket's status.

---

### `build.project.created` — Outcome 3: Emit removed

**What breaks today:** Nothing observable. Member notifications when a project is created are dispatched inline via `NotificationDispatchService.emit` (event key `build.project.member_added`) before the outbox emit was ever there. The outbox event produced a dead row that would accumulate and eventually dead-letter after the retry ceiling.

**Proof of zero consumers:** Grep of `build.project.created` across both repos (`backend/src`, `frontend/`) returns only the emission sites (`projects-provision.service.ts` ×2) and test fixtures for the cross-cell guard — no consumer, no frontend reference.

**Action:** Removed both `OutboxWriter.emit` calls (one in `createProject`, one in `createFromDeal`) and cleaned up the now-unused `OutboxWriter` and `randomUUID` imports.

Files changed:
- `src/modules/build/core/projects-provision.service.ts`

---

### `build.ticket.created` — Outcome 3: Emit removed

**What breaks today:** Nothing observable. The ticket creation flow already dispatches an in-request notification to assignees via `NotificationDispatchService.emit` (event key `build.ticket.assigned`), dispatches webhooks via `ProjectsWebhooksDispatchService.dispatch`, and triggers automations via `BuildAutomationRunnerService.runForTicketEvent`. The outbox event was redundant and produced dead rows.

`outbox-publisher.service.spec.ts` already used `build.ticket.created` as the canonical example of an event with no registered consumer (testing retry/dead-letter paths). That test continues to be self-contained — the string is hardcoded in the spec, not imported from a live emission site.

**Proof of zero consumers:** Grep across both repos returns only the emission site (`projects-tickets-create.service.ts`), the publisher spec (uses the string as a test fixture), and the cross-cell guard spec (tests refusal). No consumer, no frontend reference.

**Action:** Removed the `OutboxWriter.emit` call in `createTicket` and cleaned up the now-unused `OutboxWriter` and `randomUUID` imports.

Files changed:
- `src/modules/build/core/projects-tickets-create.service.ts`

---

### Inventory events (4) — OPEN, excluded from scope

| Event | Emitted in |
|---|---|
| `inventory.purchase_order.received` | `grn.service.ts` |
| `inventory.sales_order.fulfilled` | `so-fulfillment.service.ts` |
| `inventory.shipment.dispatched` | `shipments.service.ts` |
| `inventory.stock.adjusted` | `inv-stock-adjustments.service.ts` |

**Recommendation:** Each of these is a meaningful domain event. `inventory.stock.adjusted` is the most critical — without a consumer, stock-level notifications and downstream reorder triggers never fire. The others (purchase order received, sales order fulfilled, shipment dispatched) are natural integration hooks for accounting journals, customer notifications, and fulfilment pipelines. A separate inventory program owns this module; they should apply Outcome 2 for all four.

---

## Checker defect analysis

The checker has had two documented bugs fixed:

1. **Scan-order bug (previously fixed):** A two-pass design now collects all `const` declarations before resolving values, so a consumer whose `eventType` references an imported constant is not dropped when its file is scanned before the constant's declaration file.

2. **Inline registration blindspot (fixed this session):** `registry.register({ eventType: "..." })` was invisible to the `readonly eventType` class-property scan. Fixed by adding a second pass that reads 400 chars after each `registry.register(` call and extracts `eventType:` from that window.

The self-test (`--self-test`) was extended with a second assertion that proves the inline pattern is correctly detected on a synthetic snippet.

---

## Verification

- `pnpm check:outbox-consumers` — passes (only 4 out-of-scope inventory orphans remain)
- `pnpm check:outbox-consumers:self-test` — passes (both assertions green)
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm typecheck` — clean
- `node ./node_modules/jest/bin/jest.js --testPathPattern="outbox|consumer" --maxWorkers=2` — 198/202 pass; 4 pre-existing failures in `notification-outbox-relay-tenant-isolation.spec.ts` and `deal-closed-consumer-tenant-isolation.spec.ts` (mock setup issues: `enumerationDb.select is not a function` / `this.db.insert is not a function`); neither file was touched by this session.

## Files changed

| File | Change |
|---|---|
| `src/scripts/check-outbox-consumers.mjs` | Added inline `registry.register({ eventType })` detection; extended self-test |
| `src/modules/build/core/projects-provision.service.ts` | Removed 2× `OutboxWriter.emit` for `build.project.created`; removed `OutboxWriter` and `randomUUID` imports |
| `src/modules/build/core/projects-tickets-create.service.ts` | Removed `OutboxWriter.emit` for `build.ticket.created`; removed `OutboxWriter` and `randomUUID` imports |
