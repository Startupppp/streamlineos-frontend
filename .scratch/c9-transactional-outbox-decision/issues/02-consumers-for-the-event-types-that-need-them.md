# 02 — Events that matter get a consumer instead of being suppressed

**What to build:** Today the bus delivers, but only one event type has a consumer. The other 23 are suppressed — recorded honestly as "nobody subscribed" rather than retried to death, which is correct behaviour for an unsubscribed type but is not the end state. This ticket decides, per event type, whether anything should react to it, and wires a consumer where the answer is yes.

The evidence: 24 types emitted across 9 modules — `accounting.*` (7), `inventory.*` (5), `build.*` (5), `sign.*` (3), `support.*` (2), `deal.closed`, `survey.response.submitted`. Exactly one (`deal.closed` → a draft inventory sales order) has a consumer.

**Blocked by:** None — ticket 01 shipped the registry and the relay.

**Status:** analysis complete · 1 of 8 wired · 7 need product input

## Acceptance criteria

- [x] Every one of the 24 emitted event types is listed with a verdict: has a consumer, should have one (and what it should do), or is genuinely fire-and-forget.
- [x] A type with no reason to exist is removed at the producer — **none qualified.** Every one of the 24 either has a consumer, has a named consumer it should get, or carries audit value worth keeping. Nothing is emitting into a void for no reason.
- [ ] Each new consumer uses the inbox claim fence for exactly-once processing, like the existing one.
- [ ] Each new consumer registers itself with the registry and needs no change to the publisher.
- [ ] Each runs in its own tenant transaction.
- [ ] A consumer that throws leaves the event RETRY, never DELIVERED, and its failure is observable.
- [ ] The suppressed count after a flush equals only the types deliberately left unsubscribed.

## Per-type verdict table

> **Double-apply warning.** Ten of the fourteen fire-and-forget events already have a synchronous reaction that covers the same ground. Adding a consumer to those would apply the effect twice. The "synchronous reaction" column records exactly what already fires, so the reviewer can verify.

| # | Event type | Emitting module / file | Aggregate | Key payload fields | Synchronous reaction (before consumer) | Verdict |
|---|---|---|---|---|---|---|
| 1 | `deal.closed` | `deals/deals.service.ts` | `deal` | dealId, orgId, dealName, actorUserId | none | **has a consumer** — `offer-fulfillment:deal-closed` creates a draft inventory SO |
| 2 | `accounting.journal.posted` | `accounting/posting/journal-posting.service.ts` | `journal_entry` | org_id, entry_id, entry_number, lines[], total_debit, total_credit | none | **fire-and-forget** — journal record is already in the DB; no cross-module reaction needed now; value preserved for future audit streaming |
| 3 | `accounting.period.closed` | `accounting/gl/periods.service.ts` | `accounting_period` | org_id, period_id, period_name, closed_at, closed_by | `dispatch.emit({ eventKey: "accounting.period.closed" })` fires synchronously to the actor after the transaction — **DOUBLE-APPLY** | **fire-and-forget** — notification already delivered synchronously; a consumer would send a second notification |
| 4 | `accounting.bill.approved` | `finance/ap/bills-workflow.service.ts` | `purchase_bill` | org_id, bill_id, bill_number, total_cents, actor_user_id | none (the dispatch fires for `approval_requested`, not `approved`) | **needs one** — finance/ap module: notify the bill submitter that their bill was approved and is now POSTED; nothing does this today |
| 5 | `accounting.bill.paid` | `finance/ap/payment-runs.service.ts` | `purchase_bill` | org_id, bill_id, bill_number, amount, payment_date | `dispatch.emit({ eventKey: "accounting.payment.recorded" })` fires synchronously in the same method — **DOUBLE-APPLY** | **fire-and-forget** — payment notification already delivered synchronously; a consumer would send a second notification |
| 6 | `accounting.invoice.issued` | `invoices/invoices-write.service.ts` and `invoices/invoices-update.service.ts` | `invoice` | org_id, invoice_id, invoice_number, customer_id, total_cents | none | **needs one** — invoices module: send the invoice to the customer (email + in-app notification); nothing does this today in either the write or update path |
| 7 | `accounting.invoice.paid` | `invoices/invoices-lifecycle.service.ts` | `invoice` | org_id, invoice_id, total_cents, paid_at | `CrmAutomationBusService.emit("invoice.paid")` fires synchronously — **PARTIAL DOUBLE-APPLY for CRM automations** | **fire-and-forget** — CRM pipeline automation already fires synchronously; a consumer targeting the same bus would double-apply; no other cross-module reaction currently required |
| 8 | `accounting.payment.received` | `invoices/invoices-payment.service.ts` | `payment` | org_id, payment_id, invoice_id, invoice_number, amount_cents, payment_date, payment_method, actor_user_id | `dispatch.emit({ eventKey: "accounting.invoice.payment_received" })` fires synchronously to org members after the transaction — **DOUBLE-APPLY** | **fire-and-forget** — payment receipt notification already delivered synchronously; a consumer would send a second notification |
| 9 | `build.project.created` | `build/core/projects-provision.service.ts` | `project` | projectId, orgId, name, key, createdBy | `projectsEmail.notifyProjectMembers(...)` fires synchronously for additional members — **DOUBLE-APPLY for the member-email path** | **fire-and-forget** — member email already fires synchronously; no cross-module reaction needed |
| 10 | `build.ticket.created` | `build/core/projects-tickets-create.service.ts` | `ticket` | ticketId, projectId, orgId, title, type, priority, status, assigneeId, actorUserId | `dispatch.emit({ eventKey: "build.ticket.assigned" })` fires synchronously when an assignee is set — **DOUBLE-APPLY for assignment notification** | **fire-and-forget** — assignment notification, webhooks, and automations all fire synchronously; a consumer would double-send the assignment notification |
| 11 | `build.ticket.status_changed` | `build/core/projects-tickets-update.service.ts` | `ticket` | ticketId, projectId, orgId, previousStatus, newStatus, actorUserId | `projectsEmail.notifyStatusReview(...)` fires synchronously for IN_REVIEW/CHANGES_REQUESTED; `automationRunner` fires synchronously for all changes — **DOUBLE-APPLY for those statuses** | **fire-and-forget** — targeted emails and automation runner fire synchronously; broader "all status change" notification is a product decision not yet made |
| 12 | `build.sprint.completed` | `build/execution/sprints.service.ts` | `sprint` | sprintId, projectId, orgId, name, actorUserId | `webhooksDispatch.dispatch("sprint.completed")` fires synchronously; no in-app notification dispatch | **needs one** — build module: notify project members via in-app notification that the sprint completed; nothing does this today |
| 13 | `build.release.published` | `build/core/projects-releases.service.ts` | `release` | releaseId, projectId, orgId | none | **needs one** — build module: notify project members and stakeholders when a release is published; nothing fires synchronously |
| 14 | `inventory.purchase_order.received` | `inventory/purchase-orders/grn.service.ts` | `inv_purchase_order` | poId, poNumber, grnId, grnNumber, orgId | none | **needs one** — inventory module: notify the procurement manager / accounts payable team that goods have been received and the vendor invoice can be matched; nothing fires synchronously |
| 15 | `inventory.stock.low` | `inventory/stock-engine/movement-costing.service.ts` | `inv_product_variant` | productVariantId, onHand, reorderPoint, orgId | none | **needs one** — inventory module: notify inventory managers via in-app notification (and optionally email) that a variant has crossed its reorder point; nothing fires synchronously |
| 16 | `inventory.stock.adjusted` | `inventory/stock/inv-stock-adjustments.service.ts` | `inv_stock_adjustment` | adjustmentId, referenceNumber, reason, orgId | none | **fire-and-forget** — adjustment is a deliberate staff action; the record and journal entry are already in the DB; no cross-module reaction is needed |
| 17 | `inventory.shipment.dispatched` | `inventory/shipments/shipments.service.ts` | `inv_shipment` | shipmentId, shipmentNumber, soId, orgId | none (only an audit log) | **needs one** — inventory module: notify the sales team / customer that the shipment has been dispatched; nothing fires synchronously beyond the audit record |
| 18 | `inventory.sales_order.fulfilled` | `inventory/sales-orders/so-fulfillment.service.ts` | `inv_sales_order` | soId, soNumber, shipmentId, orgId | none | **needs one** — invoices module: create a customer invoice when a SO is fully fulfilled; this is the key inventory → AR integration trigger; nothing fires synchronously |
| 19 | `sign.envelope.sent` | `e-sign/sign-envelope-dispatch.service.ts` | `sign_envelope` | envelopeId, orgId, invitedCount, actorUserId | `SignNotificationsService.sendInvitation(...)` fires synchronously for every recipient in the same request — **DOUBLE-APPLY** | **fire-and-forget** — invitation emails already delivered synchronously; a consumer would re-send every signing invitation |
| 20 | `sign.envelope.completed` | `e-sign/sign-envelope-dispatch.service.ts` | `sign_envelope` | envelopeId, orgId | `finalization.finalize(orgId, envelopeId)` is called synchronously in `sign-public.service.ts` immediately after `applyRecipientOutcome` returns; that method sends completion emails to all recipients and emits integration events — **DOUBLE-APPLY** | **fire-and-forget** — all completion reactions (emails, integration events) already fire synchronously in the same request; a consumer would re-run finalization |
| 21 | `sign.envelope.voided` | `e-sign/sign-envelopes.service.ts` | `sign_envelope` | envelopeId, orgId, reason | `SignNotificationsService.sendVoidedToRecipient(...)` fires synchronously for every non-completed recipient — **DOUBLE-APPLY** | **fire-and-forget** — voided emails already delivered synchronously; a consumer would re-send them |
| 22 | `support.ticket.created` | `support/core/support-tickets.service.ts` | `support_ticket` | ticketId, orgId, title, priority, assigneeId, actorUserId | `SupportNotificationsService.sendAssignmentEmail(...)` fires synchronously when an assignee is set; `AutomationService.runAutomationsForEvent("ticket.created")` fires synchronously — **DOUBLE-APPLY for assignment email** | **fire-and-forget** — assignment email and automations fire synchronously; no additional cross-module reaction is needed |
| 23 | `support.ticket.resolved` | `support/core/support-tickets.service.ts` | `support_ticket` | ticketId, orgId, actorUserId | `SupportNotificationsService.sendStatusEmail(...)` fires synchronously to the ticket creator; `SupportCsatService.createRequestForTicket(...)` fires synchronously — **DOUBLE-APPLY** | **fire-and-forget** — status email and CSAT creation already fire synchronously; a consumer would double both |
| 24 | `survey.response.submitted` | `surveys/survey-response.service.ts` | `survey_response` | sessionId, surveyId, orgId, score, passed | `automations.record(...)` and `leadAutomations.run(...)` (CRM) fire synchronously — **PARTIAL DOUBLE-APPLY for CRM lead automations** | **needs one** — surveys module: notify the survey owner of the new response; for assessment surveys, notify the respondent of their pass/fail result; neither happens synchronously; the consumer must NOT re-trigger lead automations (those already fire) |

### Summary

| Verdict | Count | Types |
|---|---|---|
| has a consumer | 1 | `deal.closed` |
| needs one | 9 | `accounting.bill.approved`, `accounting.invoice.issued`, `build.sprint.completed`, `build.release.published`, `inventory.purchase_order.received`, `inventory.stock.low`, `inventory.shipment.dispatched`, `inventory.sales_order.fulfilled`, `survey.response.submitted` |
| fire-and-forget | 14 | all others |
| should stop being emitted | 0 | — |

### Double-apply map (10 fire-and-forget types with active synchronous reactions)

A consumer added to any of these would apply the same effect twice. The synchronous call is the authoritative one.

| Event type | What already fires synchronously | Where in source |
|---|---|---|
| `accounting.period.closed` | `dispatch.emit({ eventKey: "accounting.period.closed" })` — notification to actor | `accounting/gl/periods.service.ts` line 224 |
| `accounting.bill.paid` | `dispatch.emit({ eventKey: "accounting.payment.recorded" })` — notification to actor | `finance/ap/payment-runs.service.ts` line 383 |
| `accounting.invoice.paid` | `CrmAutomationBusService.emit("invoice.paid")` — CRM pipeline trigger | `invoices/invoices-lifecycle.service.ts` line 60 |
| `accounting.payment.received` | `dispatch.emit({ eventKey: "accounting.invoice.payment_received" })` — notification to org members | `invoices/invoices-payment.service.ts` line 183 |
| `build.project.created` | `projectsEmail.notifyProjectMembers(...)` — email to additional members | `build/core/projects-provision.service.ts` line 120 |
| `build.ticket.created` | `dispatch.emit({ eventKey: "build.ticket.assigned" })` — in-app notification to assignee | `build/core/projects-tickets-create.service.ts` line 190 |
| `build.ticket.status_changed` | `projectsEmail.notifyStatusReview(...)` — email for IN_REVIEW/CHANGES_REQUESTED; `automationRunner.runForTicketEvent(...)` | `build/core/projects-tickets-update.service.ts` lines 295, 343 |
| `sign.envelope.sent` | `SignNotificationsService.sendInvitation(...)` per recipient | `e-sign/sign-envelope-dispatch.service.ts` line 154 |
| `sign.envelope.completed` | `finalization.finalize(orgId, envelopeId)` — sends completion emails + fires integration events | `e-sign/sign-public.service.ts` line 510 |
| `sign.envelope.voided` | `SignNotificationsService.sendVoidedToRecipient(...)` per non-completed recipient | `e-sign/sign-envelopes.service.ts` line 303 |
| `support.ticket.created` | `SupportNotificationsService.sendAssignmentEmail(...)` — email to assignee | `support/core/support-tickets.service.ts` line 243 |
| `support.ticket.resolved` | `SupportNotificationsService.sendStatusEmail(...)` + `SupportCsatService.createRequestForTicket(...)` | `support/core/support-tickets.service.ts` lines 367, 363 |

### Current outbox_events state (queried 2026-08-25)

| event_type | delivery_state | count |
|---|---|---|
| `accounting.journal.posted` | PENDING | 26 |
| `build.project.created` | SUPPRESSED | 2 |
| `build.ticket.created` | SUPPRESSED | 3 |
| `build.ticket.status_changed` | SUPPRESSED | 2 |

The `accounting.journal.posted` events are PENDING because the flush has not yet reached them. The three build types are SUPPRESSED because no consumer is registered for them, which is consistent with the fire-and-forget verdict above. No `deal.closed` events are currently in the table, meaning all prior ones have been DELIVERED by the existing consumer (or none have been emitted in this environment). All other event types have zero rows — they have never been emitted in this environment.

The ticket's claim — "the suppressed count after a flush equals only the deliberately-unsubscribed types" — is consistent with the current state: the 7 SUPPRESSED rows are entirely from the three fire-and-forget build types. After the PENDING `accounting.journal.posted` events are flushed, they will also become SUPPRESSED (fire-and-forget verdict), which is correct.

## Wireable-now split (2026-08-25)

### Wireable — catalog entries exist, targets are FK-determined

| Domain event | Catalog entries matched | Consumer | File |
|---|---|---|---|
| `survey.response.submitted` | `survey.response.received` (owner) · `survey.certification.passed` / `survey.certification.failed` (respondent, only when `passed ≠ null`) | `SurveyResponseSubmittedConsumerService` | `src/modules/surveys/survey-response-submitted-consumer.service.ts` |

### Needs product input — no matching catalog entry

| Domain event | Product decision required |
|---|---|
| `accounting.bill.approved` | No `accounting.bill.approved` catalog entry. Decide: who is notified (bill submitter? AP team?), what channel, deduplication window, wording. |
| `accounting.invoice.issued` | No `accounting.invoice.issued` catalog entry. Decide: does the system send the invoice to the customer, or just notify internal staff? Which channel? |
| `build.sprint.completed` | No `build.sprint.completed` catalog entry (only `build.sprint.started` and `build.sprint.ending` exist). Decide: who is notified (all project members? only the sprint owner?), wording. |
| `build.release.published` | No `build.release.published` catalog entry. Decide: who is notified (project members? stakeholders?), channel, wording. |
| `inventory.purchase_order.received` | No `inventory.purchase_order.received` catalog entry. Decide: who gets the GRN alert (AP team? procurement manager?), channel, wording. |
| `inventory.stock.low` | Catalog entry `inventory.stock.low` EXISTS, but the target audience ("inventory managers") is a product decision — no single permission key unambiguously identifies who should receive reorder alerts (`inventory:replenishment:manage`, `inventory:stock:adjust`, `inventory:products:read` are all candidates). Decide: which permission key(s) define the audience. |
| `inventory.shipment.dispatched` | No `inventory.shipment.dispatched` catalog entry. Decide: notify the sales team? the customer (external email)? internal dispatch staff? |

### Needs explicit sign-off — money-moving

| Domain event | Reason |
|---|---|
| `inventory.sales_order.fulfilled` → create customer invoice | AR integration. Money moves on consumer execution. Requires product + finance sign-off before implementation, regardless of any catalog entry. |

### Fire-and-forget confirmed untouched (10 types)

`accounting.period.closed` · `accounting.bill.paid` · `accounting.invoice.paid` · `accounting.payment.received` · `build.project.created` · `build.ticket.created` · `build.ticket.status_changed` · `sign.envelope.sent` · `sign.envelope.completed` · `sign.envelope.voided` · `support.ticket.created` · `support.ticket.resolved`

No consumer was added to any of these. Their synchronous reactions remain the authoritative path.

## Todo

- [x] Enumerate the 24 types from the producers and write the per-type verdict table into this ticket before writing any code
- [x] For each "should have one", say what the consumer does and which module owns it
- [x] Implement the consumers one at a time, each with its own spec (`survey.response.submitted` — 17 tests, 0 typecheck errors)
- [ ] Implement consumers for remaining types once product decisions are made (see table above)
- [ ] Re-run the real flush and confirm the delivered/suppressed split matches the table
- [ ] Set **Status** to `done` and update this ticket's row in `../README.md`

---

## The finding that matters most

**Ten of the fourteen fire-and-forget events already have a synchronous reaction covering the same ground.** Giving those a consumer would apply the effect **twice** — a second notification for a period close, a duplicate payment receipt, a repeated ticket-assignment alert. The table's "synchronous reaction" column names each one so a reviewer can check rather than trust.

That is a strong independent justification for the SUPPRESSED decision taken in ticket 01. Had unrouted events been retried to dead-letter instead, the obvious "fix" would have looked like *write consumers for all of them* — which for ten of these would have shipped duplicate user-facing notifications.

**Seven types genuinely need a consumer** and each names its owning module and behaviour in the table. The most valuable is `inventory.sales_order.fulfilled` → create a customer invoice, which is the inventory-to-receivables integration point.

## Why implementation is not started here

Writing seven consumers means deciding who gets notified, through which channel, and with what wording — product decisions, not refactors. Inventing them would repeat the mistake recorded in c7 ticket 03: building something that satisfies a criterion without being asked for.

The analysis is the deliverable that unblocks that work; it is done. Each consumer should ship as its own ticket with a product owner, using `DealClosedConsumerService` as the template — inbox claim fence, self-registration, its own tenant transaction.

**Live state at time of writing:** 26 `accounting.journal.posted` PENDING (not yet flushed), 7 build-namespace events SUPPRESSED — consistent with their fire-and-forget verdicts.

---

## Update (2026-08-25) — one consumer wired, seven held

The line held was: **implement only where an existing notification catalog entry already specifies the reaction.** Inventing a notification's audience, channel and wording is a product decision, and doing it unasked is the mistake recorded in c7 ticket 03.

**Wired: `survey.response.submitted`** → `SurveyResponseSubmittedConsumerService` in the surveys module. Three catalog entries already existed (`survey.response.received`, `survey.certification.passed`, `survey.certification.failed`) and the recipients are FK-determined — the form owner, and the respondent via the participant record — so nothing had to be invented. 9 suites / 93 tests pass.

**Held — each needs one specific decision:**

| Event | The decision needed |
|---|---|
| `inventory.stock.low` | **Closest to ready** — the catalog entry already exists. Only question: which permission key identifies "inventory managers" (`inventory:replenishment:manage`? `inventory:stock:adjust`?). |
| `accounting.bill.approved` | Who is notified, on what channel, in what words. |
| `accounting.invoice.issued` | Internal staff notification, or send to the customer? |
| `build.sprint.completed` | Audience and wording (only `sprint.started` / `sprint.ending` exist). |
| `build.release.published` | Project members, stakeholders, or both. |
| `inventory.purchase_order.received` | Who gets the goods-received alert — AP or procurement. |
| `inventory.shipment.dispatched` | Internal sales team, or an external customer email. |
| `inventory.sales_order.fulfilled` | **Money-moving** — creates an AR invoice. Needs product AND finance sign-off regardless of catalog state. |

### One correction to the record

The implementing agent reported that `DealClosedConsumerService` has an exactly-once defect — that claiming before the work leaves a committed inbox row if the work throws, so retries skip silently. **That is not correct, and it was checked rather than accepted.** `InboxConsumer.claim` writes through the ALS-routed handle, and the relay already wraps `consumer.handle(event)` in `runInNewTenantTransaction` — so the claim and the work share one transaction and a throw rolls back both.

The new consumer opens its own `db.transaction` inside `handle()`, which becomes a savepoint nested in the relay's transaction. That is harmless and its tests pass, but it is an unnecessary divergence from the house pattern adopted on a false premise. Left as-is rather than churned; noted so the next consumer follows `DealClosedConsumerService` instead.
