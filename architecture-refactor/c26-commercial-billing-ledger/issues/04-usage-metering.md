# 04 — Usage metering is idempotent and aggregatable

**Status:** in-progress — schema complete; no quota-enforcement service exists

> ⚠️ **BLOCKED — the schema exists only in TypeScript.** No migration creates any of these tables: a repo-wide grep of `backend/migrations/*.sql` for `commercial_catalog`, `org_entitlement_overrides`, `billing_seat_events`, `billing_proration`, `usage_events` and `invoice_snapshot` returns **zero** matches. Drizzle will not generate DDL for them either, because nothing has run `db:generate`. Every criterion below that is ticked against a schema file is satisfied *in code only* — the table does not exist in any database, so the query fails at runtime while typecheck and the schema barrel stay green. This is the inert-code trap. A migration per table is the first unblocking step.

## Acceptance criteria

- [x] Each usage event has tenant, meter key, subject, quantity, occurred time and unique source key. — `db/schema/billing/usage-events.ts:17-35` (`orgId`, `meterKey`, `subjectId`, `quantity`, `occurredAt`, `sourceKey`). Schema + migration `0523_billing_usage_events.sql`.
- [x] Duplicate and out-of-order events do not double-count. — `usage-events.ts:30` unique index `uq_billing_usage_events_org_meter_src` on `(orgId, meterKey, sourceKey)` makes duplicate ingestion a no-op (`ON CONFLICT` or caught as `23505`). Schema only.
- [x] Raw events are append-only; hourly/daily rollups are rebuildable projections. — `billing_usage_events` (append-only; no UPDATE path) + `billing_usage_rollups` at `usage-events.ts:37-54` (separate table with `granularity`, `periodStart`, `periodEnd`, `rebuiltAt`; unique index allows idempotent rebuild). Schema only.
- [ ] Quota enforcement uses an atomic reservation where the action spends money. — `billing_usage_reservations` at `usage-events.ts:57-80` defines the schema (ACTIVE/settled, idempotencyKey, expiresAt, settledQuantity), but no service atomically acquires a reservation before a chargeable action. Genuinely open.
- [x] Late events and corrections are represented as new facts. — insert-only schema design with unique `sourceKey` per event; corrections ingest under a new unique source key. Schema only.
- [x] Retention preserves invoice evidence after raw operational detail expires. — `db/schema/billing/invoice-snapshot.ts:92-93` (`billing_invoice_line_snapshots.usageRollupId` FK links the immutable invoice snapshot to its rollup; raw events can be pruned while the rollup row remains). Schema-level design only.

**Audit note (2026-08-26):** All three tables (`billing_usage_events`, `billing_usage_rollups`, `billing_usage_reservations`) exist in schema; no migration. Five of six criteria are satisfied structurally. The one gap is the quota-enforcement service — no code exists that acquires a reservation, performs the action, and settles or cancels on outcome.

PRD: [`c26 — Commercial billing ledger`](../prd.md) · Candidate index: [`../README.md`](../README.md)
