# 08 — Execute the proven schema and key removals, then re-prove the database contract

**What to build:** Apply the REMOVE and REFACTOR verdicts from ticket 07 as coordinated contract changes, then re-establish every database guarantee they could have disturbed.

**Blocked by:** 07, 03.

**Status:** 6 of 7 closed · 1 PARTIAL (CRM/inventory, out of release scope) · reports at
`reports/08-execute-schema-key-minimization.md` and `reports/08b-close-schema-key-minimization.md`

**Follow-up pass (08b) closed box 3 for every module in this release and added a third population
ticket 08 had not counted.** Migration `1006` drops 16 redundant single-column foreign keys, moving
the referential action onto the composite in the 8 cases where they differed; 17 dead `.references()`
with a live composite twin were removed as declaration-only changes; 10 of the 32 undeclared tenant
columns are declared with their insert sites passing `orgId`. Everything still open is CRM or
inventory, both excluded from this release. Cold bootstrap from zero **652/652**; the organisation
purge path was run, not reasoned about — **5/5** assertions including `DELETE FROM organizations`.

**Also landed here (routed in mid-session, both in this territory):**
- **P0 — organisation creation was broken at head.** `feedbucket` had no `modules_catalog` row, so `seedSystemRolesForOrg` raised `23503` on `fk_roles_module` inside `createOrganization`'s transaction. Migration `1005` inserts the row (ticket 19's statement, unchanged). Ticket 19's deliberately red `seeded-role-modules-are-catalogued.spec.ts` is now **green, 2/2**, and the exact failing `INSERT INTO roles ... module_key='feedbucket'` now succeeds on a scratch database.
- **Payroll financial immutability** (`1001`) and **three payroll read-path indexes** (`1002`), from ticket 24.
- **`1004`** — a forward correction to migration `0445`, whose `BEFORE DELETE` guards blocked `cron-org-purge-worker`'s organisation purge. Found by the purge failing on a scratch database, not by reading.
- Ticket 19's `check:migration-discipline` exit 1 on `1001`/`1002` was a race against a half-written journal. At rest it is **exit 0, 651 files, 0 new violations**.

**Also routed in mid-session by the coordinator (08b), all three in `migrations/`):**
- **`1007` — seven indexes `0999` dropped on structure alone are restored.** Prefix containment
  proves reachability, not cost: the surviving wider index is physically larger (`idx_contacts_name_email`
  is 1,968 kB against a 1,720 kB heap) so the majority tenant falls back to a sequential scan.
  Buffers dropped→restored: contacts 645→30, inv_stock_levels 609→39, hr_people 306→24,
  chat_channel_members 108→12, organization_people 39→6, inv_locations 18→4, and a **seventh
  found by my own re-run**, inv_stock_transactions 30→12. The other 347 drops are NOT reverted.
  `measure-index-redundancy.mjs`: **347 candidates, 0 REGRESSION**; self-test 13/13.
- **`1009` — `inv_stock_transactions` carried 8 foreign keys where 6 are load-bearing**, the exact
  8-vs-6 the coordinator measured (2,000 redundant trigger invocations and 2,000 redundant parent
  `FOR KEY SHARE` locks per 1,000 rows). Both actions moved onto the composites; **8 → 6**.
  Surfaced a *pre-existing* defect it deliberately preserves rather than hides: the append-only
  `BEFORE UPDATE` guard blocks `ON DELETE SET NULL` on `location_id`, so a location delete already
  raises `23514` at head — reproduced on a database without `1009`. The org purge is unaffected
  (the guard is UPDATE-only; the purge DELETEs). Handed on as an inventory ledger decision.
- **`1008` — ticket 15d's data-only backfill** hashing legacy plaintext `support_channels.inbound_secret`.
  Idempotent, digest verified byte-for-byte against `hashInboundSecret()`, down migration RAISEs
  because a SHA-256 digest is not invertible.

- [x] Each removal carries dependency evidence: zero reads/writes through Drizzle, raw SQL, migrations, exports, search/vector ingestion, audit/retention jobs, analytics and external contracts.
- [x] Schema-file deletion additionally requires zero symbol references, zero raw table-name references, no dependent foreign key, and a grep of the file's **path** to catch specs that assert its existence. A dead-code tool reporting a schema file as unused never justifies deleting it on its own — some files are deliberately unimported.
      No schema file was deleted. `hrms-phase1-sql-managed` and `communication_backfill_issues` were re-confirmed unimported-by-design; `check:hr-table-freeze` exit 0.
- [x] Redundant single-column foreign keys are removed only after all callers and migrations target the composite relationship.
      Closed for every module in this release. Re-measured at head: **169**, not 171 (same definition applied to `pg_constraint`). Of those, **16 were outside CRM/inventory and all 16 are gone** via migration `1006` — 8 dropped outright where single and composite already carried the same action, 8 with the action first MOVED onto the composite (1 CASCADE, 7 `SET NULL (col)` with explicit column lists) so no parent delete changes behaviour. Every pair was verified LIVE in `pg_catalog` per table before removal. A further **17 dead `.references()` covered by an existing composite** were removed as declaration-only changes. **HR needed nothing**: `hr_*` (130) and `payroll_*` (48) tenant→tenant FKs are already 100% composite. FKs 3,150 → **3,134**; remaining 153 are CRM 53 / inventory 100, both out of release scope.
- [ ] Unused request/response/DTO/Zod fields are removed across backend, OpenAPI and frontend hooks/forms as one contract change. Server-controlled tenant/actor fields, idempotency/version fields, authorization dimensions and audit fields are never removed.
      BLOCKED on territory: no DTO or Zod schema lives under `src/db/schema/**` or `migrations/**`. `check:openapi-coverage` and `check:contract-breaking-change` both exit 0 — nothing regressed, nothing was executed here.
      08b: still BLOCKED on the same territory boundary, and re-confirmed — declaring `org_id` on ten tables changed no DTO, no Zod schema and no response shape; `org_id` is a server-controlled tenant field, which this box explicitly excludes from removal.
- [x] A removed field is proven removed at the boundary too — a bare `z.object({})` strips silently rather than rejecting, which turns a dropped field into a wrong-subject write rather than an error.
      `support_ticket_tags.orgId` is `notNull()`, so both insert sites are compile-enforced; the write is tenant-scoped in code instead of by the `trg_set_org_id` trigger.
      08b: the same argument now covers 10 more tables. `org_id` is declared `notNull()` on `hr_workflow_steps`, `email_sequence_steps`, `email_sequence_enrollments`, `vendor_candidate_submissions`, `onboarding_template_steps`, `key_results`, `competencies`, `hr_import_rows`, `support_ticket_messages` and `sign_bulk_send_rows`, so all 12 insert sites are compile-enforced. The composite FK now *refuses* a cross-tenant parent id instead of letting the trigger write the row into the parent's organisation — proven: an automation `support_internal_note` carrying another tenant's `ticketId` is refused with `23503`, where it previously succeeded.
- [x] After cleanup: regenerate artifacts, then re-prove chain/ledger, two clean bootstraps, catalog parity, tenant relationships/indexes/RLS, query plans, OpenAPI compatibility, cache invalidation and focused behavior tests.
      Two independent cold bootstraps (`scratch_t08` 646/646, `scratch_t08b` 650/650). chain/ledger/discipline/rollback/tenant-indexes (both modes)/tenant-relationships (pg_catalog)/verify-rls/restrict-fks/set-null-column-lists/openapi-coverage/contract-breaking-change all exit 0. typecheck and spec-typecheck exit 0. 37 jest suites, 362 tests green. 8/8 trigger assertions.
      08b: re-proved after `1006`. Two more cold bootstraps from zero (`scratch_t09` 651/651 then 652/652 on resume; `scratch_t09_cold` **652/652 cold at the new head**), plus a rollback round trip (3,134 → 3,150 down → 3,134 re-applied, REACHED_HEAD 652/652). discipline/chain/ledger/rollback/tenant-indexes (both modes)/tenant-relationships (pg_catalog)/verify-rls/drop-column-safety/restrict-fks/set-null-column-lists — **11 gates, all exit 0**. **5/5** purge assertions including the real `DELETE FROM organizations` path, plus 2/2 cross-tenant message assertions. 179 jest suites / 1,424 tests green across the touched modules. `typecheck` and `check:spec-typecheck` are red **only** on files three concurrent agents have modified and I have not (`payment-run-executor.service.ts(157)`, an untracked `db-call-count-contract.spec.ts`) — enumerated in report 08b §5.
- [x] Before/after counts are recorded. Final acceptance is zero unclassified unnecessary keys and no orphaned schema or code reference.
      Duplicates 9→0, prefix-redundant 6→0, S16 0, S23 3-intentional, FKs 3,150 unchanged, payroll immutability triggers 2→7, `check:tenant-indexes` 821/828→829/829. Everything not executed is classified and handed on in report §9, not left unclassified.
      08b: FKs 3,150 → **3,134**; undeclared tenant columns 32 → **22**; single-column FKs beside a composite 169 → **153**; dead `.references()` 97 → 80; `check:tenant-indexes` declaration mode 829/829 → **839/839**; `check:set-null-column-lists` column lists 258 → 267, catalog half OK. Every remaining item in both populations is CRM or inventory. A third population ticket 08 never counted is now classified: **70 declared `.references()` with neither a live single nor a live composite** — a *missing* constraint, not a redundant one, so removing the declaration would hide a gap. 62 are legacy-actor columns whose FK the contraction dropped; 8 look like a real gap, four of them tenant anchors (`project_ticket_counters.org_id`, `chat_message_reactions.org_id`, `affiliate_commissions.referred_org_id`, `referrals.*`). Handed on in report 08b §7.
