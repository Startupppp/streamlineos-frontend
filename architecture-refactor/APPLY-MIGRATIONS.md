# Migration hand-off — operator

**Reconciled 2026-08-26: 312 `.sql` files on disk, 297 journal entries, 15 un-journalled.** Reproduce with:

```bash
node backend/scripts/migration-journal-reconcile.mjs backend/migrations
```

It also checks for journal entries with no file, and for `when` timestamps that go backwards — Drizzle skips by timestamp, not by hash, so an entry older than the one before it never runs. Both were zero at the time of writing.

**Read [§ Un-journalled files](#un-journalled-files-15) before running anything.** Eleven of the fifteen are not the deliberate hand-apply drops and are not mentioned anywhere else in this document; one of them is the only migration that puts a row-level-security policy on a CRM table that has none.

This document grew past its original title. It now covers 0473/0475/0476, the 0483 calendar rewrite, the deliberate un-journalled drops, and the c26 ledger set 0520–0524.

---

## The original three: 0473, 0475, 0476

Three migrations are **written and journalled but not applied**.

**Deploy order is now safe in both directions.** The search service originally called the new
`app.search_*` functions with no guard, so shipping the code before the migration would have made
every search error with `42883`. That was a hazard I introduced and it is fixed: each branch now
catches a missing-function error specifically, logs it, and falls back to the plain `ILIKE` path.
Search is therefore **correct but unindexed** until 0475 runs — the old behaviour, not a break.

Only `42883` is caught. Any other database error still propagates, so this cannot mask a real fault.

What each one gives you:

- **0475** — the actual performance fix. Until it runs, search still does the five sequential
  scans this whole ticket exists to remove, and you will see one `search probe … is missing` log
  line per branch per query. That log line disappearing is how you know it worked.
- **0476** — the notification watermark table. The list read tolerates its absence (a missing
  watermark row reads as zero), but mark-all-read stays O(n) until it exists.
- **0473** — the coupon uniqueness constraint. Defensive; the enforcing application code is live
  either way, but without it two simultaneous redemptions can still both win.

Run them together.

## 1. Apply

```bash
pnpm -C backend db:migrate
```

`drizzle-kit` exits 1 with the real error hidden behind its spinner, and it blocks on a TTY prompt. If it hangs or exits non-zero with no visible cause, that is the known behaviour — capture stderr rather than trusting the exit line.

## 2. Verify — do not trust the journal

A migration in this repo has already been recorded as applied with **half its statements unrun**. The journal says "done"; only the catalog knows. Run this as the **owner** role:

```sql
SELECT 'coupon constraint' AS object,
       to_regclass('coupon_redemptions') IS NOT NULL
       AND EXISTS (SELECT 1 FROM pg_constraint
                   WHERE conname = 'uq_coupon_redemptions_coupon_org') AS present
UNION ALL SELECT 'app.search_deal_ids',
       EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
               WHERE n.nspname = 'app' AND p.proname = 'search_deal_ids')
UNION ALL SELECT 'app.search_contact_party_ids',
       EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
               WHERE n.nspname = 'app' AND p.proname = 'search_contact_party_ids')
UNION ALL SELECT 'app.search_client_party_ids',
       EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
               WHERE n.nspname = 'app' AND p.proname = 'search_client_party_ids')
UNION ALL SELECT 'idx_deals_name_trgm',
       to_regclass('idx_deals_name_trgm') IS NOT NULL
UNION ALL SELECT 'idx_deals_contact_person_trgm',
       to_regclass('idx_deals_contact_person_trgm') IS NOT NULL
UNION ALL SELECT 'notification_read_watermarks',
       to_regclass('notification_read_watermarks') IS NOT NULL
UNION ALL SELECT 'idx_notifications_list_cursor',
       to_regclass('idx_notifications_list_cursor') IS NOT NULL
UNION ALL SELECT 'idx_notifications_unread_count',
       to_regclass('idx_notifications_unread_count') IS NOT NULL
UNION ALL SELECT 'idx_chat_messages_unread',
       to_regclass('idx_chat_messages_unread') IS NOT NULL;
```

**Every row must be `true`.** Anything false means that statement did not run, regardless of what the journal says.

## 3. Verify the probes are actually reachable

The three new functions are `SECURITY DEFINER` and owned by the BYPASSRLS owner — the highest-privilege objects written this session. Two things must both hold:

```sql
-- EXECUTE granted to the app role, and revoked from PUBLIC
SELECT p.proname,
       has_function_privilege('streamline_app', p.oid, 'EXECUTE') AS app_can_execute,
       has_function_privilege('public',         p.oid, 'EXECUTE') AS public_can_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'app' AND p.proname LIKE 'search_%';
```

`app_can_execute` must be **true**, `public_can_execute` must be **false**, for every row.

## 4. Prove it fails closed

Each probe takes its organisation from `app.current_org_id()` and never from a parameter, so a caller with no tenant context must get an error rather than rows. Confirm as `streamline_app`, **outside** a transaction that sets the GUC:

```sql
SELECT app.search_deal_ids('test', 10);
```

**This must raise an error**, not return an empty set. An empty set would mean the org filter silently matched nothing, which is a very different failure.

## 5. Then re-measure the thing this was for

Search was five concurrent sequential scans per keystroke. Measure as **`streamline_app` with the GUC set** — never as the owner, which carries BYPASSRLS and produces plans the application will never get:

```sql
BEGIN;
SELECT set_config('app.organization_id', '<a real org id>', true);
EXPLAIN (ANALYZE, BUFFERS) SELECT app.search_deal_ids('ac', 501);
COMMIT;
```

Expect an index scan on `idx_deals_name_trgm`. If you see a sequential scan, the probe is not doing its job and I want to know.

## 0483 rewrites `calendar_events` — read this before running it

`ALTER COLUMN … TYPE TIMESTAMP WITH TIME ZONE` is not a metadata change. It takes an **ACCESS
EXCLUSIVE lock and rewrites every row**, blocking reads and writes for the duration. `lock_timeout`
is set to 5s so it fails fast rather than queueing behind a long reader — on a busy or large
`calendar_events` expect to retry, possibly in a maintenance window.

**Immediately after it applies:**

```sql
VACUUM ANALYZE calendar_events;
```

A rewrite invalidates the planner statistics **and** empties the visibility map. This has already
been measured in this codebase: a rewritten table went from 53 to 201,875 blocks until `ANALYZE`,
and a count stayed wrong until `VACUUM`. Skip this and the table looks slow for reasons unrelated to
any query.

**The assumption 0483 bakes in:** every existing naive timestamp is treated as UTC, and every
existing row gets `timezone = 'UTC'`. That is correct if the server timezone has always been UTC —
which is Neon's default and what the ORM writes. **If any events were ever written under a different
server timezone, they will shift.** Check before applying:

```sql
SHOW timezone;   -- expect UTC
```

## The two DROP migrations are deliberately NOT journalled

`0478_invoice_line_items_column_drop.sql` and `0482_candidate_resume_column_drop.sql` exist on disk
but have **no journal entry**, so `db:migrate` will skip them. That is intentional, not the bug
described above.

`DROP COLUMN` is irreversible. Journalled in sequence, the backfill and the drop would run
back-to-back in a single command, with no opportunity to check that the backfill actually worked —
which defeats the point of writing them as separate migrations.

**Run the backfills, verify, and only then apply the drops by hand:**

```sql
-- after 0477: every invoice with line items must now have rows
SELECT count(*) AS unmigrated
FROM invoices i
WHERE i.line_items IS NOT NULL AND jsonb_array_length(i.line_items) > 0
  AND NOT EXISTS (SELECT 1 FROM invoice_items ii WHERE ii.invoice_id = i.id);

-- after 0481: every candidate with résumé text must now have a sidecar row
SELECT count(*) AS unmigrated
FROM candidates c
WHERE c.resume_text IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM candidate_resumes cr WHERE cr.candidate_id = c.id);
```

**Both must return 0.** Then apply each drop file directly and add its journal entry afterwards so
the history stays accurate.

> **A hole I found and closed in `0478`.** Its reconciliation guard originally checked only invoices
> that *have* `invoice_items` rows — so an invoice whose JSONB held line items but whose backfill
> produced **zero** rows was excluded from the check by its own `EXISTS` clause. It would have
> passed, the column would have dropped, and those lines would be gone with no error. The guard now
> asserts nothing is left behind *before* it reconciles what was moved. `0482` did not have this
> gap; its guard was already the nothing-left-behind form.

After each drop: `VACUUM ANALYZE` the table. A column drop leaves stale statistics and the planner
keeps assuming the old tuple width.

## If something is wrong

- **A function is missing** → 0475 partially executed. Re-run just that file; the `CREATE OR REPLACE` statements are idempotent.
- **`public_can_execute` is true** → the REVOKE did not run. That is a real privilege problem; fix before serving traffic.
- **The fail-closed probe returns rows instead of erroring** → stop. The org filter is not doing what it should, and that is a cross-tenant risk.
- **Search errors after applying** → the function signature and the call site disagree. Tell me and I will reconcile them.

## Un-journalled files — RESOLVED 2026-08-31

All 15 formerly un-journalled files have been journalled and applied to the live neondb. The ledger confirms:

```
node --env-file=.env src/scripts/check-migration-ledger.mjs
→ Ledger: 505 applied row(s) against 513 journal entr(ies).
  Watermark 1798000131000; 8 migration(s) pending.
  No orphan, duplicate or unreachable entries. Gate passed.
```

| File | Journal idx | Applied |
|---|---|---|
| `0234_business_parties_name_order` | 308 | YES |
| `0262_party_company_columns` | 309 | YES |
| `0263_crm_org_party_map` | 310 | YES |
| `0264_crm_org_party_backfill` | 311 | YES |
| `0265_party_association_columns` | 312 | YES |
| `0266_party_association_backfill` | 313 | YES |
| `0267_record_layout_adjustments` | 314 | YES |
| `0268_backfill_record_layouts_permission` | 315 | YES |
| `0269_mailbox_push_secret` | 316 | YES |
| `0271_crm_suppression_hashes_rls` | 317 | YES |
| `0272_quote_document_key` | 318 | YES |
| `0472_outbox_inbox_aggregate_fence` | 319 | YES |
| `0478_invoice_line_items_column_drop` | 320 | YES |
| `0482_candidate_resume_column_drop` | 321 | YES |
| `0488_hr_people_drop_identity_cols` | 325 | YES |

The `verify-migration-chain.mjs` allowlist (`DELIBERATE_ALLOWLIST`) still references the four deliberate files — update it if those entries are removed from the allowlist.

## ⚠ P0 chain gap — cold bootstrap blocked at 0768

Discovered during cold bootstrap proof (2026-08-31). Migration `0768_rls_uncovered_tenant_tables` fails on every cold database with:

```
P0001  0768: table public.inv_asn_lines does not exist
```

14 inventory tables have no `CREATE TABLE` migration — they were created via `drizzle-kit push` and never journalled:

```
inv_asn_lines           inv_asns                inv_channel_pools
inv_dock_appointments   inv_dock_doors          inv_handling_units
inv_kit_components      inv_labor_records       inv_platform_payout_lines
inv_platform_po_lines   inv_platform_purchase_orders
inv_slotting_recommendations  inv_slotting_rules  inv_velocity_classes
```

**Fix:** write `CREATE TABLE IF NOT EXISTS` migrations for these 14 tables (with all their columns, constraints and indexes), journal them before `0768`'s `when` timestamp (`1798000080000`), and apply them. Then cold bootstrap succeeds. See `architecture-refactor/MIGRATION-PROOF.md` for full evidence.

---

## c26 commercial billing ledger — 0520 … 0524

Five migrations, all on disk.

> **Correction, 2026-08-26.** This section previously said "none journalled". **That was wrong** — all five are journalled, as `idx` 293–297, ending `0524_billing_invoice_snapshots` at `when=1787830369441`. Verified by `migration-journal-reconcile.mjs`. Acting on the old text would have added duplicate entries. **Do not journal them again**; `pnpm -C backend db:migrate` picks them up as they stand.

Apply together:

```
0520_commercial_billing_catalog.sql
0521_billing_seat_ledger.sql
0522_billing_proration_ledger.sql
0523_billing_usage_events.sql
0524_billing_invoice_snapshots.sql
```

### What each creates

| Migration | Tables |
|---|---|
| 0520 | `billing_products`, `billing_plans`, `billing_price_versions`, `billing_plan_entitlements` (global catalog, no RLS); `org_entitlement_overrides`, `subscription_items` (tenant, RLS) |
| 0521 | `billing_seat_events` (tenant, RLS) |
| 0522 | `billing_proration_lines` (tenant, RLS) |
| 0523 | `billing_usage_events`, `billing_usage_rollups`, `billing_usage_reservations` (tenant, RLS) |
| 0524 | `billing_invoice_number_sequences`, `billing_invoice_snapshots`, `billing_invoice_line_snapshots`, `billing_credit_notes`, `billing_credit_note_lines` (tenant, RLS) |

### Operator notes

**Indexes:** every `CREATE INDEX` in these migrations runs inside the migration transaction — `CONCURRENTLY` is not permitted inside a transaction block. Each migration's comment block carries the exact `CONCURRENTLY` forms to run by hand **before** applying on a live table with existing data. The `IF NOT EXISTS` guards make the in-transaction statements a no-op if the indexes are already present.

**Sequence-dependent FKs:** all FK constraints use `ADD CONSTRAINT … NOT VALID` → `VALIDATE CONSTRAINT` to avoid a long `ACCESS EXCLUSIVE` lock on the referenced table. On a busy database, run the VALIDATE statements during a low-traffic window.

**RLS fail-closed check:** after applying, confirm each tenant table fails closed with no GUC set:

```sql
-- run as streamline_app, outside a transaction that sets the GUC
SET app.organization_id TO '';
SELECT * FROM org_entitlement_overrides LIMIT 1;
-- must raise 42501, not return zero rows
```

**Global catalog tables** (`billing_products`, `billing_plans`, `billing_price_versions`, `billing_plan_entitlements`) have no `org_id` and no RLS policy by design — they are platform-wide data. Access is controlled by `REVOKE ALL … FROM PUBLIC` + `GRANT … TO streamline_app`.

**idx_billing_usage_res_expires** does not lead with `org_id` — it exists for the background expiry sweep job that scans across all orgs. That job must set the tenant GUC before processing each reservation row. Tenant-scoped queries use `idx_billing_usage_res_org_meter_active` instead.

**idx_billing_inv_lines_snapshot** and **idx_billing_credit_note_lines_note** index only `snapshot_id` / `credit_note_id` without `org_id`. They serve parent → child FK navigation where the parent row is already RLS-filtered; tenant-scoped list queries use `idx_billing_inv_lines_org` and `idx_billing_credit_note_lines_org`.

### Verify after applying

```sql
SELECT relname AS table,
       to_regclass(relname::text) IS NOT NULL AS present
FROM (VALUES
  ('billing_products'),
  ('billing_plans'),
  ('billing_price_versions'),
  ('billing_plan_entitlements'),
  ('org_entitlement_overrides'),
  ('subscription_items'),
  ('billing_seat_events'),
  ('billing_proration_lines'),
  ('billing_usage_events'),
  ('billing_usage_rollups'),
  ('billing_usage_reservations'),
  ('billing_invoice_number_sequences'),
  ('billing_invoice_snapshots'),
  ('billing_invoice_line_snapshots'),
  ('billing_credit_notes'),
  ('billing_credit_note_lines')
) AS t(relname);
```

Every row must be `true`. Also confirm RLS is enabled on the twelve tenant tables:

```sql
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname IN (
  'org_entitlement_overrides', 'subscription_items',
  'billing_seat_events', 'billing_proration_lines',
  'billing_usage_events', 'billing_usage_rollups', 'billing_usage_reservations',
  'billing_invoice_number_sequences', 'billing_invoice_snapshots',
  'billing_invoice_line_snapshots', 'billing_credit_notes', 'billing_credit_note_lines'
)
ORDER BY relname;
```

`relrowsecurity` must be `true` for every row.
