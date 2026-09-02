# S1 / ticket 03 — tenant relationships, indexes and RLS against a fully bootstrapped target

Second pass. The first pass (17:20) repaired three blind gates and left three findings open,
each blocked on a migration it was not allowed to write. This pass owns migrations, applies
them to a live target and closes all three.

Target: **`scratch_t03`**, a private `CREATE DATABASE ... TEMPLATE scratch_boot_a` copy taken at
637 ledger rows and carried to head. Never `DATABASE_URL` (remote Neon), never a `cornerstone_*`
database, no `.env` edit. Every number below came from a command I ran and read.

## Headline — the migrations already existed and had never been run

`0994`, `0995` and `0996` address exactly the three open findings. They were authored by a
concurrent session and committed in `a3bf8470` at **17:44**, twenty-four minutes *after* the first
pass wrote its report, so no report has ever mentioned them and nothing had applied them. They were
journalled correctly (`idx` 771/772/773, `when` above the 2027-02-19 watermark) and the four
rollback files were present. I wrote no new migration: the correct action was to prove these, not
to stand a second set beside them.

    db-bootstrap.mjs -> scratch_t03    exit 0    RESULT: REACHED_HEAD 646/646
    exactly 9 pending applied (0992..1000), 0 hash drift on the 637 already present

| gate | before (ledger 637/646) | after (ledger 646/646) |
|---|---|---|
| `check:tenant-relationships` | exit 1 — **4 actionable** | exit 0 — **0 actionable** |
| `check:tenant-indexes --db` | exit 1 — **985 of 988** | exit 0 — **988 of 988** |
| `db:verify-rls` coverage | exit 0 — **966 of 988**, 16 exposed | exit 0 — **982 of 988**, 0 exposed |

The mid-bootstrap guard the first pass installed did its job: before the run it printed
`Ledger rows on target 637 of 646` and refused to call the number release evidence. After, it
prints `646 of 646`.

## 1. Four tenant foreign keys — CLOSED

`0995` drops each single-column constraint and moves its referential action onto the composite
`(org_id, child_id) → (org_id, id)` twin, which is where the tenant conjunct lives. Verified in
`pg_constraint`, not inferred from the file:

    credit_note_items.fk_credit_note_items_credit_note_id_org
      FK (org_id, credit_note_id) -> credit_notes(org_id, id) ON DELETE CASCADE     validated=true
    vendor_credit_items.fk_vendor_credit_items_vendor_credit_id_org
      FK (org_id, vendor_credit_id) -> vendor_credits(org_id, id) ON DELETE CASCADE validated=true
    credit_notes.fk_credit_notes_invoice_id_org
      FK (org_id, invoice_id) -> invoices(org_id, id) ON DELETE SET NULL (invoice_id) validated=true
    vendor_credits.fk_vendor_credits_bill_id_org
      FK (org_id, bill_id) -> purchase_bills(org_id, id) ON DELETE SET NULL (bill_id) validated=true

    the four single-column constraints: (none — all four dropped)

The `SET NULL` column lists are the detail that matters, and they are right: both name only a
**nullable** column (`invoice_id notnull=false`, `bill_id notnull=false`). A composite `SET NULL`
with no list writes NULL into every referencing column including `org_id`, which is `NOT NULL` on
both tables, so a parent delete would raise `23502` instead of clearing the pointer — the defect
class `0770` introduced and `0992` swept. `0992` re-derives its lists at run time but runs *before*
`0995`, so the `DO $$` assertion at the end of `0995` is what keeps these four honest; it passed.

**Scope buckets confirmed unchanged and untouched, as instructed:** `EXCL: CRM 95`,
`EXCL: Inventory 136`, `EXCL: platform-global 1` — identical before and after. Only the total moved,
236 → 232, which is exactly the four that were repaired.

## 2. Three leading tenant indexes — CLOSED (live), PARTIAL (declarations)

`0996` adds the three the first pass measured. Catalog mode is now clean:

    Tenant tables 988 · Leading tenant index 988 · exit 0

The three are `communication_backfill_issues (org_id, created_at DESC)`,
`subprocessor_subscribers (organization_id, created_at DESC)`,
`support_ticket_tags (org_id, ticket_id)` — the same three named in the ticket, enumerated from the
gate rather than carried over.

**Declaration mode is still red and is not mine.** `pnpm check:tenant-indexes` with no `--db` is
**exit 1 at 821 of 828**, worse than the 823/828 the first pass saw. All seven were checked
individually against `pg_index`, and every one carries a leading `uniq_<table>_org_id (org_id, id)`
in the catalog:

    crm_sla_breach_log · org_custom_domains · release_tickets · ticket_label_mappings
    ticket_related_links · webhook_deliveries · work_item_relations

So the live database is complete and the Drizzle declarations are behind it. Two are new since the
first pass — `crm_sla_breach_log` and `org_custom_domains`, both from schema edits in `a3bf8470`.
`org_custom_domains` declares `uniqueIndex("uniq_org_custom_domains_domain").on(table.domain)` and
nothing on `orgId`; `crm_sla_breach_log` declares only a `(leadId, policyId)` unique. The fix is one
`uniqueIndex(...).on(t.orgId, t.id)` per table in `src/db/schema/**` — ticket 08's territory.

I did **not** relax the gate to make this green. It is reporting a real drift: a `db:generate` run
against these declarations would want to drop indexes the catalog depends on.

## 3. Sixteen unpoliced inventory tables — CLOSED, and the decision stated

**Decision: add the policies, even though Inventory is excluded from this release.** A demonstrated
cross-tenant read is a security defect, not a scope question. A release exclusion decides *who fixes
a thing*; it has never decided *whether the thing is exposed*. The grant is what makes a row
readable, not the presence of a caller, so every raw-SQL path reaches these today and every WMS
service that lands later would inherit an already-open table. `0994` is the durable form — revoking
the grant instead would be undone by the `ALTER DEFAULT PRIVILEGES` the role bootstrap re-applies.

`0994` enables RLS and adds `tenant_isolation ... USING (org_id = app.current_org_id())` on all 16,
with `current_org_id()` schema-qualified rather than relying on `0431`'s role-dependent search_path.

**Before / after of the exploit itself**, as `streamline_app` (`rolbypassrls = false`) inside
transactions that were rolled back. The pre-`0994` shape is RLS *disabled*, confirmed against the
untouched `scratch_boot_a`: all 16 had `relrowsecurity = false`.

    pre-0994 (RLS off), GUC = org_probe_A   rows_visible = 2   org_ids: org_probe_A,org_probe_B
    pre-0994 (RLS off), no GUC at all       rows_visible = 2
    at head (0994 applied), GUC = org_probe_A  rows_visible = 1   org_ids: org_probe_A
    at head, no GUC at all                  ERROR 42501 no tenant context

The first attempt at the "before" leg was wrong and is worth recording: dropping the *policy* while
leaving RLS *enabled* returns **0** rows, because that state is deny-by-default. It reproduces
nothing. Only `DISABLE ROW LEVEL SECURITY` reproduces the real exposure.

Coverage after: **982 of 988**, `EXCLUDED: INVENTORY: 0`, no EXPOSURE block, 16/16 behavioural
checks PASS. Counted independently from `pg_catalog` rather than trusting the gate, exactly **6**
org-bearing tables have no policy and all 6 are the registered platform-global control-plane set:
`noisy_neighbour_reviews`, `organization_lifecycle_sagas`, `organization_placement`,
`organization_relocations`, `organization_reservations`, `placement_decisions`. Every RLS-enabled
`inv_*` table has exactly one policy.

**Blast radius of enabling RLS on out-of-scope tables: zero.** All 16 table names and their
camelCase symbols return **0** hits across `src/modules/`. Nothing can start failing `42501`,
because nothing reads them.

## The honesty hole in `db:verify-rls`, closed

The first pass added an EXPOSURE block that named all 16 tables with their measured app-role
grants — and the gate still exited **0**. That is the same all-clear the block exists to prevent:
16 tables were named as cross-tenant readable while `RESULT: RLS VERIFIED` printed underneath.
One line in `db-verify-rls.mjs` now counts an unpoliced excluded tenant table as a failure.

Proven to bite, rather than asserted:

    RLS disabled on inv_ai_feedback -> exit 1, "RESULT: 1 CHECK(S) FAILED",
                                        exposed public.inv_ai_feedback SELECT=true WRITE=true
    restored                        -> exit 0, "RESULT: RLS VERIFIED"

Because exposure is 0 at head, this cannot turn a green gate red today; it only stops the next
unpoliced tenant table from landing silently.

## Rollback round trip, proven live

On a throwaway `TEMPLATE scratch_t03` copy, down then up:

    DOWN 0996, 0995, 0994  -> 16 inv_* back to RLS off · 4 single-column FKs restored · 3 indexes dropped
    UP   0994, 0995, 0996  -> 16/16 RLS on · 0 single-column FKs · 3/3 indexes
    check:tenant-relationships exit 0 (0 actionable) · check:tenant-indexes --db exit 0 (988/988)

Copy dropped afterwards.

## Journal note — the brief's rule is not this repo's rule

The brief says journal `idx` must equal position in the array. It does not, and never has: 646
entries, last `idx` 777, **316** entries where `idx !== position`, spread throughout the history.
`check-migration-discipline.mjs` enforces `when` **strictly increasing** and `idx` **unique** — both
hold, and the gate is exit 0. Renumbering to satisfy the stated rule would have rewritten 316
entries to fix nothing. Nothing was renumbered. The watermark rule *is* real and holds: `0992`–`1000`
are all stamped `2027-02-19T01:20:10.088Z` and above.

## Box 4 re-verified rather than inherited

Schema files changed at 17:44 and 17:55, after the first pass checked this. Re-run through
`getTableConfig` over the `src/db/schema` barrel against `scratch_t03` at head: **872 declared
tables, 10,588 declared columns, 0 missing tables, 0 missing columns.** Identical to the first pass,
so the churn introduced no undeclared column and no `db.select()` can raise `42703`.

## Files changed

- `BE/src/scripts/db-verify-rls.mjs` — an excluded tenant table with no policy now increments
  `failures`, so the EXPOSURE block can no longer print under `RESULT: RLS VERIFIED`. `node --check`
  clean. This is one script outside the two named in my prompt; it is the gate the instruction
  "make the gate's output honest about it" points at, and the change cannot alter today's result.
- `FEROOT/.scratch/code-release-10-10/issues/03-tenant-relationships-indexes-rls.md`
- `FEROOT/.scratch/code-release-10-10/reports/03-tenant-rls.md`

**No migration file was added or edited.** `migrations/` and `migrations/meta/_journal.json` are
byte-identical to what I found. No `src/db/schema/**`, no `src/modules/**`, no frontend, no `.env`.

## Handoff

- `scratch_t03` is left at head, 646/646, 1027 tables, **0 organizations, 0 users**, no probe
  residue. `db:bootstrap-role` granted `streamline_app` DML on `public` there (943/943).
- `scratch_boot_a` was read from only (two `pg_class` queries) and not modified.
- `scratch_t03b` was created and dropped.

## Needs an owner outside this session

- **P2 — ticket 08.** 7 Drizzle tables missing a `uniqueIndex(orgId, id)` declaration that exists in
  the catalog: `crm_sla_breach_log`, `org_custom_domains`, `release_tickets`,
  `ticket_label_mappings`, `ticket_related_links`, `webhook_deliveries`, `work_item_relations`.
  `pnpm check:tenant-indexes` is exit 1 at 821/828 until they are declared.
- **P2 — schema (05/07).** `support_ticket_tags` carries `org_id` live but not in Drizzle;
  `communication_backfill_issues` and `subprocessor_subscribers` are undeclared entirely. All three
  now have live indexes but no declaration.
- **P3.** `uniq_subprocessor_subscribers_email` is a bare global `UNIQUE(email)` on a tenant-owned
  table — same shape as the `coupons.code` finding, and `0993` shows the fix pattern.
- **Informational.** 105 live non-partition tables remain undeclared in Drizzle, 101 org-bearing.
  All 16 of this ticket's inventory tables sat inside that set; the other 85 were already policied.
