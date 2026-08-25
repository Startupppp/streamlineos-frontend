# 07 — One delivery policy governs email, in-app, push and alerts

**What to build:** Deepen the existing typed, durable notification dispatch module so product-event producers emit an event key and recipients; policy owns channel choice, preference behavior, quiet hours, deduplication, retry and escalation. Do not force user-authored mail, external-recipient workflow mail or operator alerts through preference-governed in-app semantics: classify them behind explicit sibling interfaces.

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Security, ownership transfer, payment, invoice and legal events cannot be disabled.
- [ ] Operational events respect per-user channel preferences and quiet hours.
- [ ] Marketing delivery requires separate recorded consent and unsubscribe handling.
- [ ] User-authored mail, external-recipient workflow mail and operator alerts each have an explicit delivery class with their own authorization, audit and retry rules.
- [ ] Product-event producers never call an email, push or SMS adapter directly; the remaining direct callers are inventoried and either migrated or classified as one of the explicit non-product-event interfaces.
- [ ] Delivery is at-least-once with idempotent provider keys; the product does not claim exactly-once transport.
- [ ] A failed mandatory delivery enters a retry/dead state and alerts an operator.
- [ ] Templates are versioned, localized and render from allowlisted variables.

## Todo

- [ ] Classify the event catalog into mandatory, operational and marketing, and inventory the direct email callers before changing them
- [ ] Move remaining direct provider calls behind the dispatch seam
- [ ] Add read-after-event tests for each classification
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)
