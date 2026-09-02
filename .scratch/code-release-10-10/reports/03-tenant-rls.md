# S1 / ticket 03 — tenant relationships, indexes and RLS against a fully bootstrapped target

Target: `scratch_boot_a`, ticket 01's cold build at head — 637/637 ledger rows, 1027 tables,
0 organizations. Pointed at by overriding `TENANT_RELATIONSHIP_DB_URL` / `DATABASE_URL` in the
environment; `.env` was never edited and the configured remote was never touched. No git command
was run. Every number below came from a command I ran and read.

## Headline

**Three of the four gates this ticket depends on were green because they could not see.** Repaired
first, then re-run. The delta is the finding:

| gate | before | after | what it could not see |
|---|---|---|---|
| `check:tenant-relationships` (pg_catalog) | 0 actionable | **4 actionable** | `credit_notes`, `vendor_credits`, `enterprise_quotes` were listed in `CRM_TABLE_NAMES`; CRM is excluded from this release, so accounting and billing tables were skipped in **both** modes |
| `check:tenant-relationships` (static) | 0 violations | **16 violations** | `.references((): AnyPgColumn => …)` — 12 declarations the `(\s*)\s*=>` pattern never matched |
| `check:tenant-indexes` (declarations) | 745/745 clean | **823/828** | `pgTable(` only, so all **83** Build tables declared `build.table(...)` were invisible |
| `check:tenant-indexes --db` | did not exist | **985/988** | there was no catalog mode at all |

A fourth: `check-tenant-relationships`'s mid-bootstrap guard — the exact guard this ticket exists
to enforce — read `drizzle.__replay`, which only `replay-chain-cold.mjs` writes. Every database
built by `db:bootstrap` (including the release evidence target) records into
`drizzle.__drizzle_migrations`, so the guard was **inert**: the query errored, was swallowed by a
`.catch`, and `midBootstrap` came back `null`. It now reads either ledger and prints
`Ledger rows on target 637 of 637` on every run. The mode line also printed a hardcoded
`(scratch_boot_a)` regardless of the real target; it now prints `current_database()`.

## Box by box

**1. Tenant relationships — NOT closed.** `pnpm -s check:tenant-relationships` → exit 1.
236 single-column FKs · 95 CRM · 136 Inventory · 1 platform-global · **4 actionable**:

    public.credit_note_items → public.credit_notes    ON DELETE CASCADE
    public.vendor_credit_items → public.vendor_credits ON DELETE CASCADE
    public.credit_notes → public.invoices              ON DELETE SET NULL
    public.vendor_credits → public.purchase_bills      ON DELETE SET NULL

Two of them cascade, so a delete in one org can reach a child row pinned to another. Each needs a
composite `(org_id, child_id) → (org_id, id)` FK — a migration, which is outside my territory.
`vendor_credit_items` already carries `fk_vendor_credit_items_vendor_credit_id_org` **alongside**
the single-column CASCADE, so for that one the fix is a drop, not an add.

The static mode's 16 are a wider, weaker set: 12 are self-referencing FKs (`org_units.parent_id`,
`legal_entities.parent_legal_entity_id`, …) that migrations have **already** replaced with
composites in the catalog — the Drizzle declaration just never caught up. The catalog answer (4) is
the release-relevant one. Where evidence below comes from a declaration scan I say so.

**2. Tenant indexes — NOT closed.** New `check:tenant-indexes --db` → exit 1, **985 of 988**:

    public.communication_backfill_issues   1 index, none leading with org_id
    public.subprocessor_subscribers        3 indexes, none leading
    public.support_ticket_tags             2 indexes, none leading

Measured as `streamline_app` with the tenant GUC on 50,000 rows across 20 orgs, inside a rolled-back
transaction:

    no leading tenant index   Seq Scan, Filter: (org_id = app.current_org_id())
                              Rows Removed by Filter: 47500      Buffers: shared hit=516
    with (org_id, created_at) Index Scan, Index Cond: (org_id = app.current_org_id())
                              Buffers: shared hit=4 read=2

86× at 50k rows and it grows O(organisation). `support_ticket_tags` is the interesting one: the
Drizzle model declares only `ticket_id, tag_id, created_at`, while the live table carries `org_id` —
so the declaration gate could not classify it as a tenant table at all. The 5 Build tables the
repaired declaration gate now flags (`release_tickets`, `ticket_label_mappings`,
`ticket_related_links`, `webhook_deliveries`, `work_item_relations`) all **do** have a leading
`(org_id, id)` unique in the catalog; they are a declaration gap, not a live one.

**3. RLS on every tenant-scoped table — NOT closed.** Enumerated from `pg_catalog` over every
non-system schema, `relkind IN ('r','p')`, any tenant column type — not from declarations:

    org-bearing tables                    988
    RLS enabled + >=1 policy              966   (966 policies, 1 per table)
    policies whose qual omits the tenant    0
    policies scoped to a role / RESTRICTIVE  0
    no policy at all                       22   = 6 platform-global + 16 inv_*

All four tables the brief named — `git_webhook_seen_deliveries`, `calendar_provider_sync_queue`,
`file_quarantine_records`, `multipart_upload_intents` — now carry `tenant_isolation` with
`org_id = app.current_org_id()`. The six platform-global ones are registered with written
justifications (control-plane routing that necessarily runs before a tenant exists).

**The 16 without a policy are a live exposure, and I am not folding them into a pass.** Every one
of them grants `streamline_app` SELECT **and** INSERT/UPDATE/DELETE:

    inv_ai_feedback · inv_allocation_overrides · inv_audit_export_jobs
    inv_channel_snapshot_diffs · inv_channel_webhook_deliveries
    inv_customer_shelf_life_rules · inv_demand_forecasts · inv_grn_line_serials
    inv_inspection_plans · inv_inspection_plan_versions
    inv_landed_cost_allocations · inv_landed_cost_charges · inv_landed_cost_vouchers
    inv_proposal_overrides · inv_putaway_tasks · inv_putaway_task_lines

Demonstrated, not argued. As `streamline_app` (`rolbypassrls = false`) with
`app.organization_id = 'org_probe_A'`, inside a transaction that was rolled back:

    POLICY-BEARING access_versions            rows_visible = 1
    NO-POLICY inv_customer_shelf_life_rules   rows_visible = 2   org_probe_A/10 + org_probe_B/20

And with **no** GUC at all, `access_versions` raises `42501 no tenant context` while the no-policy
tables answer normally. `db:verify-rls` reported these as `EXCLUDED: INVENTORY` and still exited 0;
that exclusion is a statement about who fixes it, never about whether it is exposed, so the gate now
prints an `EXPOSURE` block naming each table with its measured app-role grants. Verdict: **P1, real,
not reachable through the ORM but reachable by any raw-SQL path**, and it becomes reachable the
moment the WMS services land. All 16 sit inside ticket 07's 105 undeclared-in-Drizzle set — one
finding, not two.

**4. Drizzle-declared columns absent from the catalog — CLOSED.** Enumerated at runtime through
`getTableConfig` over the `src/db/schema` barrel rather than by regex, so the Build module's
`build.table(...)` form is included by construction:

    declared tables 872 (789 public · 80 build · 3 build_events)   present in catalog 872
    declared columns 10,588                                        present in catalog 10,588
    MISSING TABLES 0 · MISSING COLUMNS 0

No `db.select()` on this branch can raise `42703` against a target at head. The reverse direction is
not zero and I report it because it is the same root cause: **105** live non-partition tables are
undeclared (`gl_*` 13, `crm_*` 18, `inv_*` 34, `ap_*`/`ar_*` 9, `tax_*` 5, `bank_*` 4, …), 101 of
them org-bearing, 85 of those already policied and 16 not. My independent count reproduces
ticket 07's exactly.

**5. Verify as the application role — CLOSED.** `APP_DB_SCHEMA=public pnpm db:bootstrap-role` → exit
0: `superuser=false createdb=false createrole=false bypassrls=false login=true`, **943/943 tables
granted**, `can create objects in: (none)`. Every measurement in this report was taken under
`SET LOCAL ROLE streamline_app` with the GUC set, inside a transaction that was rolled back; the
owner role was used only to create the fixtures. `drizzle.__drizzle_migrations` is correctly denied
to the app role (`permission denied for schema drizzle`).

**6. `db:generate` fails closed — CLOSED.** `node scripts/guard-db-generate.mjs` → **exit 1**,
"newest snapshot `0464_snapshot.json`, journal entries 637, migrations with no snapshot **172**".
`check:db-generate-guard` → exit 0, 5/5.

## Also closed

`check:tenant-isolation` was red at 923/924 — `calendar-provider-webhook.service.ts` had no
cross-tenant negative test. Added `calendar-provider-webhook-tenant-isolation.spec.ts`: a fake tx that **applies the
predicate the service actually builds**, so dropping the org clause changes the result rather than
passing silently. A concurrent session then strengthened the file — actors now come from
`humanSessionPrincipal`, and two `BITE` cases flip `ignoreTenantPredicate` to prove the harness
really would serve org B's event, connection and creator to an org A webhook if the org conjunct
went away. I kept that version: **9 tests, all passing**. Gate now 924/924, exit 0.
`check:tenant-isolation:run` → **446 suites / 1806 tests, all passed**, exit 0.

## Files changed

- `BE/src/scripts/check-tenant-relationships.mjs` — CRM exclusion no longer swallows accounting/billing; inline `.references()` regex accepts a return-type annotation; mid-bootstrap guard reads both ledgers; target name is printed, not assumed; 2 new self-test checks.
- `BE/src/scripts/check-tenant-indexes.mjs` — `(?:pgTable|\w+\.table)`; new `--db` pg_catalog mode with its own vacuity guard; 3 new self-test checks.
- `BE/src/scripts/db-verify-rls.mjs` — sweeps widened to `relkind IN ('r','p')` and to any tenant-column type (the partitioned `notifications` parent and non-`text` tenant columns were invisible); new `EXPOSURE` block measuring the app role's grants on every no-policy table an exclusion covers.
- `BE/src/modules/calendar/calendar-provider-webhook-tenant-isolation.spec.ts` (new).
- `FEROOT/.scratch/code-release-10-10/issues/03-tenant-relationships-indexes-rls.md` — ticks, BLOCKED notes, evidence.

No migration, no `src/db/schema/**`, no `db-bootstrap.mjs`, no `.env`. `node --check` clean on all
three `.mjs`. Backend `tsc --noEmit` was **exit 0, 0 errors** after my spec landed; a later run shows
**3 errors, none in my territory** and all appearing after concurrent edits —
`hr/directory/org-structure-headcount.service.spec.ts:52` (`hrHeadcountNamespace` missing from the
cache-key map) and `support/core/support-ai-triage-charge.spec.ts:60,116` (arity 6 vs 5). Not mine;
flagging rather than touching.

## Handoff

- `scratch_boot_a` is left at head and row-clean: 637 ledger rows, 1027 tables, 0 organizations, 0 users, no probe residue. Every fixture I created was rolled back.
- **One non-row change to it:** `db:bootstrap-role` granted `streamline_app` DML on `public` and ran `REVOKE CREATE ON SCHEMA public FROM PUBLIC`. If ticket 02's parity comparison reads ACLs, this is mine.
- `verify-migration-chain.mjs` hardcodes `ssl: "require"` (noted by ticket 01) — the same is now true of nothing I touched; `check-tenant-indexes --db` and `check-tenant-relationships` both connect without forcing SSL.

## Needs an owner outside this session

- **P1** — 16 `inv_*` tables with `org_id`, full app-role DML and no policy. 16 `ENABLE ROW LEVEL SECURITY` + `CREATE POLICY tenant_isolation` statements.
- **P1** — 4 single-column tenant FKs, 2 of them `ON DELETE CASCADE`, on `credit_notes` / `vendor_credits` / `credit_note_items` / `vendor_credit_items`. This is accounting-rewrite territory.
- **P2** — 3 tables with no index leading on the tenant column; 516→6 buffers measured.
- **P2** — `uniq_subprocessor_subscribers_email` is a bare global `UNIQUE(email)` on a tenant-owned table, the same shape as the `coupons.code` finding already assigned elsewhere.
- **P2** — `support_ticket_tags` carries `org_id` live but not in Drizzle; `communication_backfill_issues` and `subprocessor_subscribers` are undeclared entirely. Schema territory (05/07).
