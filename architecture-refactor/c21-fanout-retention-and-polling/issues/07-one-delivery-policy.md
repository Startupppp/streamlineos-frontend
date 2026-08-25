# 07 — One delivery policy governs email, in-app, push and alerts

**What to build:** Deepen the notification dispatch module so producers emit a typed event and recipients; the module owns channel choice, mandatory-versus-optional classification, preferences, quiet hours, deduplication, retry and escalation.

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Security, ownership transfer, payment, invoice and legal events cannot be disabled.
- [ ] Operational events respect per-user channel preferences and quiet hours.
- [ ] Marketing delivery requires separate recorded consent and unsubscribe handling.
- [ ] Producers never call an email, push or SMS adapter directly.
- [ ] Delivery is at-least-once with idempotent provider keys; the product does not claim exactly-once transport.
- [ ] A failed mandatory delivery enters a retry/dead state and alerts an operator.
- [ ] Templates are versioned, localized and render from allowlisted variables.

## Todo

- [ ] Classify the event catalog into mandatory, operational and marketing
- [ ] Move remaining direct provider calls behind the dispatch seam
- [ ] Add read-after-event tests for each classification
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)
