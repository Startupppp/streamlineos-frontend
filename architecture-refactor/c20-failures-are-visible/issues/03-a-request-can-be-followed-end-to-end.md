# 03 — A request can be followed end to end

**What to build:** One request can be traced from guard to service to outbox by its correlation id. The middleware and the id already exist; the logs are unstructured text that goes nowhere.

**Blocked by:** 01 — Errors reach a person

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Logs are structured JSON carrying the correlation id.
- [ ] The same id appears in the guard, the service and any outbox record for one request.
- [ ] Logs are shipped somewhere queryable.
- [ ] Production log levels are unchanged — this changes format and destination, not verbosity.
- [ ] Output is parseable, asserted by test.

## Todo

- [ ] Replace the hand-rolled console logger
- [ ] Thread the existing correlation id through
- [ ] Assert the id is stable across layers
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c20 — A failure in production is visible`](../prd.md) · Candidate index: [`../README.md`](../README.md)
