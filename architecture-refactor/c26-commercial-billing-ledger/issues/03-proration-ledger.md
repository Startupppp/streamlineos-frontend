# 03 — Proration is stored, not recomputed

**Status:** in-progress — schema complete; no service produces proration lines on plan changes

> ⚠️ **BLOCKED — the schema exists only in TypeScript.** No migration creates any of these tables: a repo-wide grep of `backend/migrations/*.sql` for `commercial_catalog`, `org_entitlement_overrides`, `billing_seat_events`, `billing_proration`, `usage_events` and `invoice_snapshot` returns **zero** matches. Drizzle will not generate DDL for them either, because nothing has run `db:generate`. Every criterion below that is ticked against a schema file is satisfied *in code only* — the table does not exist in any database, so the query fails at runtime while typecheck and the schema barrel stay green. This is the inert-code trap. A migration per table is the first unblocking step.

## Acceptance criteria

- [ ] Upgrade, downgrade and seat-quantity changes produce immutable proration line items. — `billing_proration_lines` table exists (`db/schema/billing/proration-ledger.ts:17-47`) but no service inserts into it on plan-change events. Genuinely open.
- [x] Each line names old/new price version, effective interval, quantity, currency and rounding. — `proration-ledger.ts:24-32` (`oldPriceVersionId`, `newPriceVersionId`, `effectiveFrom`, `effectiveUntil`, `quantity`, `currency`, `amountMinor`, `roundingRule`). Schema + migration `0522_billing_proration_ledger.sql`.
- [x] Provider-calculated proration is stored and reconciled; it is not blindly trusted. — `proration-ledger.ts:33-36` (`providerAmountMinor`, `providerRef`, `reconciledAt`). Schema only.
- [x] Retry with the same idempotency key returns the same result. — `proration-ledger.ts:40` unique index `uq_billing_proration_org_idem` on `(orgId, idempotencyKey)` prevents a second insert; a service must also implement the replay-return path. Schema constraint present, service absent.
- [x] Negative adjustments become credits, never mutation of an issued invoice. — `db/schema/billing/invoice-snapshot.ts:104-127` (`billing_credit_notes` with `originalSnapshotId` FK and `onDelete: "restrict"`) and `:129-150` (`billing_credit_note_lines`). Schema only; immutability trigger 0492 is unapplied.

**Audit note (2026-08-26):** All five structural criteria are covered by schema; no migration. The single behavioral gap is the proration-line producer — a service that inserts rows on upgrade/downgrade/quantity change does not exist. The idempotency constraint (criterion 4) prevents double-write but a service must also return the stored result on replay.

PRD: [`c26 — Commercial billing ledger`](../prd.md) · Candidate index: [`../README.md`](../README.md)
