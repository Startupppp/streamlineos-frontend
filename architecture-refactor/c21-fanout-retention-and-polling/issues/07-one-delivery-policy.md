# 07 — One delivery policy governs email, in-app, push and alerts

**What to build:** Deepen the existing typed, durable notification dispatch module so product-event producers emit an event key and recipients; policy owns channel choice, preference behavior, quiet hours, deduplication, retry and escalation. Do not force user-authored mail, external-recipient workflow mail or operator alerts through preference-governed in-app semantics: classify them behind explicit sibling interfaces.

**Status:** ready-for-agent

## Acceptance criteria

- [x] Security, ownership transfer, payment, invoice and legal events cannot be disabled. — `backend/src/modules/notifications/notification-events.catalog.ts:600,609,622,631,734,753,771,818,868,943` — all security events carry `mandatory: true`; `notification-routing.service.ts:70,161,178` enforces mandatory events bypass preference suppression and quiet hours.
- [x] Operational events respect per-user channel preferences and quiet hours. — `notification-routing.service.ts:91,120,124,166-172`: non-mandatory events are suppressed by mute, channel preference, suppression rules, and quiet hours in sequence.
- [ ] Marketing delivery requires separate recorded consent and unsubscribe handling. — No MARKETING delivery class exists; the event catalog has no marketing-category events; no consent table or unsubscribe tracking is implemented. Genuinely open.
- [ ] User-authored mail, external-recipient workflow mail and operator alerts each have an explicit delivery class with their own authorization, audit and retry rules. — No explicit delivery classes found in the notification types or dispatch service. Genuinely open.
- [ ] Product-event producers never call an email, push or SMS adapter directly; the remaining direct callers are inventoried and either migrated or classified as one of the explicit non-product-event interfaces. — At least 20 files under `src/modules/` still reference `EmailService`/`sendEmail` directly (grep: `payroll/payout/publishing.service.ts`, `calendar/calendar.service.ts`, `expenses/expenses-write.service.ts`, and 17 others). Inventory and migration genuinely open.
- [x] Delivery is at-least-once with idempotent provider keys; the product does not claim exactly-once transport. — `notification-dispatch.service.ts:86-128`: every dispatch writes a `dedupeKey` to `notification_outbox` with `onConflictDoNothing`; the outbox relay provides at-least-once retry; `notification-delivery-worker.service.ts:325` records `providerMessageId`.
- [ ] A failed mandatory delivery enters a retry/dead state and alerts an operator. — Deliveries can reach DEAD state (`notification-delivery-worker.service.ts:389,393`). However no operator alert is issued specifically when a mandatory delivery goes DEAD — the c20-05 alert scripts monitor `outbox_events`, not `notification_deliveries`. Genuinely open.
- [x] Templates are versioned, localized and render from allowlisted variables. — `db/schema/common/shared.ts:106`: unique constraint on `(orgId, templateKey, locale, version)`; `notification-template-renderer.service.ts:89-106`: locale-aware resolution with English fallback; undeclared-variable guard raises at render time.

## Todo

- [ ] Classify the event catalog into mandatory, operational and marketing, and inventory the direct email callers before changing them — mandatory is done; marketing classification and the direct-caller inventory are open.
- [ ] Move remaining direct provider calls behind the dispatch seam — open; 20+ direct `EmailService` callers remain.
- [ ] Add read-after-event tests for each classification — open.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

**Audit note (2026-08-26):** Four criteria already satisfied by the existing routing, dispatch and template infrastructure. Four criteria genuinely open: marketing consent (no infrastructure exists), explicit delivery classes (not modelled), direct email callers (20+ remain), mandatory-dead-alerts-operator (alert scripts cover `outbox_events`, not `notification_deliveries`).
