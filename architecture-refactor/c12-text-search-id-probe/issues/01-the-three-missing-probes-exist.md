# 01 — The three missing probes exist

**What to build:** Deals, contacts and clients each gain an id probe against the trigram indexes that already exist for them, following the same shape as the five already shipped.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Each probe takes its organisation from the session context and never from a parameter, so a missing tenant context fails closed.
- [ ] Each probe returns identifiers only, never row data.
- [ ] `EXECUTE` is revoked from `PUBLIC` and granted only to the application role.
- [ ] Each probe takes a limit argument.
- [ ] Each probe has a cross-tenant test: two organisations with colliding text, each sees only its own.
- [ ] Invoking a probe with no tenant context raises rather than returning rows.

## Todo

- [ ] Copy the migration 0275 template exactly
- [ ] Set a lock timeout; do not create indexes concurrently inside the migration transaction
- [ ] Write the cross-tenant test first — this is the security-critical part
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c12 — Route text search through the id probe that already exists`](../prd.md) · Candidate index: [`../README.md`](../README.md)
