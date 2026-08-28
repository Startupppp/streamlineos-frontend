# 12: Add the missing tenant-leading indexes

**What to build:** Candidate resume and Finance item queries can satisfy tenant predicates from leading organization indexes at production-shaped volume.

**Blocked by:** None (can start immediately).

**Status:** in-progress — 3 of 4 criteria met; the read-budget criterion is blocked on a production-shaped dataset

- [x] All four currently failing tenant tables have indexes matching their real filters and sorts.
- [x] The tenant-index structural check reports zero failures.
- [ ] Query plans under the application role and tenant context meet declared read budgets. **BLOCKED — see below.**
- [x] Migration is journaled, lock-bounded and verified in the catalog.

## Finding

`pnpm check:tenant-indexes` at session start:

```
Tenant tables           718
Leading tenant index    714
  FAIL  candidate_resumes      (src\db\schema\hr\hiring.ts)             — leads with candidateId
  FAIL  credit_note_items      (src\db\schema\accounting\finance-ar-ap.ts) — leads with creditNoteId
  FAIL  fin_payment_run_items  (src\db\schema\accounting\finance-ar-ap.ts) — leads with billId, runId
  FAIL  vendor_credit_items    (src\db\schema\accounting\finance-ar-ap.ts) — leads with vendorCreditId
FAIL — 4 of 718 tenant tables have no leading tenant index.
```

Each had a child-key index only. Under RLS the policy adds `org_id = app.current_org_id()`, which is not leakproof, so it is evaluated against the heap tuple — an index that does not itself supply `org_id` cannot answer it and the planner declines the index outright.

## Change — each column order derived from the real query, not a template

| Table | Index | Evidence |
|---|---|---|
| `candidate_resumes` | `(org_id, candidate_id)` | upsert conflict target `candidateResumes.candidateId` (`recruitment-candidate-ai.service.ts:291`); relation loads by `candidateId` (`hiring.ts:554`). The pre-existing `unique(candidateId)` is retained — it is the upsert's conflict target. |
| `credit_note_items` | `(org_id, credit_note_id)` | `with: { items: true }` joins on `creditNoteId` (`credit-notes.service.ts:46`); insert by `creditNoteId` (`:94`). |
| `fin_payment_run_items` | `(org_id, run_id, status)` | `getRun` filters `runId` (`payment-runs.service.ts:107`); `executeRun` filters `runId AND status='PENDING'` (`:273`) — `status` third serves that without a second index. |
| `vendor_credit_items` | `(org_id, vendor_credit_id)` | `getVendorCredit` filters `vendorCreditId` (`vendor-credits.service.ts:113`). |

None of the four has a `deleted_at` column, so no partial predicate applies.

The three superseded child-only indexes (`idx_credit_note_items_cn`, `idx_vendor_credit_items_vc`, `idx_fin_payment_run_items_run`) are now fully covered by the new tenant-leading ones and are **dropped in the same migration** — the drizzle schema had stopped declaring them, and leaving them in the database would be silent schema drift plus write amplification on three tables. `idx_fin_payment_run_items_bill` is kept; it serves bill-side lookups.

## Migration

`migrations/0633_tenant_leading_indexes.sql`, journal `idx` 353, `when` 1787939778254.

`lock_timeout = '5s'` so a build fails fast rather than queueing and blocking the table behind it. `CREATE INDEX CONCURRENTLY` is deliberately **not** used: drizzle wraps each migration file in a transaction and `CONCURRENTLY` cannot run inside one. A closing `DO $$` block raises if any of the four new indexes is absent **or** any of the three superseded ones survived, so a partially-executed migration cannot report success.

**Journal watermark:** the dev DB's `max(created_at)` was `1787939718254`, above the journal's highest `when`. Drizzle skips by timestamp, not hash, so this migration is stamped above the watermark — otherwise it would have been silently skipped while `db:migrate` still printed success.

## Verification

After (`pnpm check:tenant-indexes`):

```
Schema files            326
Tenant tables           720
Leading tenant index    720

OK — every tenant table declares an index leading with its tenant column.
```

(720 not 718: concurrent sessions added two tenant tables during the session.)

`pnpm check:tenant-indexes:self-test` → all 15 checks true, proving the checker still bites.

Catalog verification against the live dev database after applying:

```
new_indexes       4
superseded_left   0
```

## Blocked criterion — query plans and read budgets

**Not met, and not claimable on this database.** All four tables are empty in the configured development database:

```
candidate_resumes      0
credit_note_items      0
fin_payment_run_items  0
vendor_credit_items    0
```

Postgres seq-scans a zero-page table whatever indexes exist, so an `EXPLAIN` here would measure nothing — and PRD §15 explicitly requires read-budget checks to run against production-shaped datasets, not empty tables. Reporting a plan from these tables would be a false pass.

**Unblock condition:** seed the four tables to production shape (the repo's pattern is `src/scripts/seed-*.mjs`, e.g. `seed-employment-read-scale.ts`), `VACUUM ANALYZE` each one — a bulk load leaves stale statistics and an empty visibility map, which alone can turn 53 blocks into 201,875 and will refuse an index-only scan regardless of the index — then `EXPLAIN (ANALYZE, BUFFERS)` each query **as `streamline_app` with the tenant GUC set**, never as the owner, whose `BYPASSRLS` hides the very cost this ticket is about. `pnpm db:check-read-budgets` is the existing harness to extend.

What *is* proved: the indexes exist, are valid, lead with `org_id`, and the three superseded child-only indexes are gone — verified directly in `pg_catalog` on the live database.

## Cross-session note

`migrations/0632_accounting_child_tenant_indexes.sql` (another session) creates bare `(org_id)` indexes on three of these four tables. It is unjournalled, so it never applies. Distinct index names plus `CREATE INDEX IF NOT EXISTS` on both sides mean neither file breaks the other. Raised in `CROSS-SESSION.md`.
