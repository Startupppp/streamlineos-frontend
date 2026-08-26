# 02 — Seats have one auditable ledger

**Status:** in-progress — schema and inclusion-rule documentation exist; no service writes events or wires seatCount()

> ⚠️ **BLOCKED — the schema exists only in TypeScript.** No migration creates any of these tables: a repo-wide grep of `backend/migrations/*.sql` for `commercial_catalog`, `org_entitlement_overrides`, `billing_seat_events`, `billing_proration`, `usage_events` and `invoice_snapshot` returns **zero** matches. Drizzle will not generate DDL for them either, because nothing has run `db:generate`. Every criterion below that is ticked against a schema file is satisfied *in code only* — the table does not exist in any database, so the query fails at runtime while typecheck and the schema barrel stay green. This is the inert-code trap. A migration per table is the first unblocking step.

## Acceptance criteria

- [x] Billable seat types and inclusion rules are explicit. — `db/schema/billing/seat-ledger.ts:18-33` (comment block enumerates INVITE_SENT, INVITE_ACCEPTED, INVITE_EXPIRED, INVITE_CANCELLED, MEMBER_SUSPENDED, MEMBER_REACTIVATED, MEMBER_DEACTIVATED, GUEST_ADDED, GUEST_REMOVED with their delta rules). Schema only, no migration.
- [ ] Membership and billing consume the same seat definition. — the schema comment at `:32-33` asserts `billedQuantityAfter` is read from `seatCount()` immediately after the triggering membership write; no seat-ledger service exists that calls `plan-limits.service.ts:67` (`seatCount`) and writes a `billing_seat_events` row in the same transaction. Genuinely open.
- [ ] Seat changes serialize under the existing per-organisation quota lock. — no service acquires `quota:${orgId}:members` advisory lock before writing a seat event. Genuinely open.
- [x] Every quantity change records actor, reason, effective time and idempotency key. — `seat-ledger.ts:41-48` (`actorId`, `reason`, `effectiveAt`, `idempotencyKey`; unique index `uq_billing_seat_events_idem` on `(orgId, idempotencyKey)`). Schema + migration `0521_billing_seat_ledger.sql` — table now has RLS and exists in the DB once applied; no service populates it yet.
- [x] Invitations, suspended members, external guests and deactivated accounts have documented treatment. — `seat-ledger.ts:18-33` (same comment block as criterion 1). Schema only.
- [ ] A reconciliation query explains billed quantity from ledger facts. — no query or service exists. Genuinely open.

**Audit note (2026-08-26):** `billing_seat_events` schema exists (`seat-ledger.ts`); no migration. Three criteria require a seat-ledger service that is entirely unwritten. The comment block in the schema file correctly names the invariant (read `seatCount()` in the same transaction) but no code enforces it.

PRD: [`c26 — Commercial billing ledger`](../prd.md) · Candidate index: [`../README.md`](../README.md)
