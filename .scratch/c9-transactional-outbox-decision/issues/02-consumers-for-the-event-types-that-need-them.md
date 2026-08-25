# 02 — Events that matter get a consumer instead of being suppressed

**What to build:** Today the bus delivers, but only one event type has a consumer. The other 23 are suppressed — recorded honestly as "nobody subscribed" rather than retried to death, which is correct behaviour for an unsubscribed type but is not the end state. This ticket decides, per event type, whether anything should react to it, and wires a consumer where the answer is yes.

The evidence: 24 types emitted across 9 modules — `accounting.*` (7), `inventory.*` (5), `build.*` (5), `sign.*` (3), `support.*` (2), `deal.closed`, `survey.response.submitted`. Exactly one (`deal.closed` → a draft inventory sales order) has a consumer.

**Blocked by:** None — ticket 01 shipped the registry and the relay.

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Every one of the 24 emitted event types is listed with a verdict: has a consumer, should have one (and what it should do), or is genuinely fire-and-forget.
- [ ] A type with no reason to exist is removed at the producer rather than left emitting into a suppressed void — emitting an event nobody wants is cost with no benefit.
- [ ] Each new consumer uses the inbox claim fence for exactly-once processing, like the existing one.
- [ ] Each new consumer registers itself with the registry and needs no change to the publisher.
- [ ] Each runs in its own tenant transaction.
- [ ] A consumer that throws leaves the event RETRY, never DELIVERED, and its failure is observable.
- [ ] The suppressed count after a flush equals only the types deliberately left unsubscribed.

## Todo

- [ ] Enumerate the 24 types from the producers and write the per-type verdict table into this ticket before writing any code
- [ ] For each "should have one", say what the consumer does and which module owns it
- [ ] Implement the consumers one at a time, each with its own spec
- [ ] Re-run the real flush and confirm the delivered/suppressed split matches the table
- [ ] Set **Status** to `done` and update this ticket's row in `../README.md`
