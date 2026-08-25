# 04 — No failure is swallowed

**What to build:** Every caught error is either handled or reported — never discarded. Ten known sites currently discard: six realtime publishes, two payment side effects, the plan-limit counter and vector retrieval.

**Blocked by:** 01 — Errors reach a person

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Each of the ten sites reports rather than discarding.
- [ ] A realtime publish failing produces a log line — a realtime outage is no longer invisible.
- [ ] A background side effect failing is reported even though the request succeeded.
- [ ] A quota counter falling back is reported, so a disabled limit is noticed.
- [ ] Non-fatal still means non-fatal — the realtime publishes do not start throwing.
- [ ] A test forces each class of failure and asserts a signal was emitted.

## Todo

- [ ] Enumerate by behaviour, not by the literal message — a string search misses handlers that branch on a tag
- [ ] Keep the non-fatal ones non-fatal; the change is visibility, not severity
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c20 — A failure in production is visible`](../prd.md) · Candidate index: [`../README.md`](../README.md)
