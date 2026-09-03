# 08 — Execute the proven schema and key removals, then re-prove the database contract

**What to build:** Apply the REMOVE and REFACTOR verdicts from ticket 07 as coordinated contract changes, then re-establish every database guarantee they could have disturbed.

**Blocked by:** 07, 03.

**Status:** 6 of 7 closed · **1 BLOCKED — permanently, on tool capability** (box 4) · reports at
`reports/08-execute-schema-key-minimization.md`, `reports/08b-close-schema-key-minimization.md`
and `reports/07b-declaration-drift.md`. The blocker was re-tested at head 2026-09-03 and is now
bite-proved, not inferred: neither `tsc --noUnusedLocals` nor `knip` reports a never-read DTO field
(both exit 0 on a hermetic probe built to contain one), so the only evidence a field-level removal
could rest on is the text search this box forbids.

**2026-09-03 — the composite-FK-with-a-NULL-tenant-column sweep was run to completion, and it found two live
holes that every previous pass on this ticket missed.** A composite FOREIGN KEY is MATCH SIMPLE, so it does not
fire **at all** when ANY of its columns is NULL — the exact shape that produced this release's P1 cross-tenant
write (`announcement_reads.org_id` nullable, omitted `org_id`, composite FK silently inert). Every previous pass
here counted FKs that were *missing* or *redundant*; none asked which *present* FK was unenforceable. Measured
against `pg_catalog` on a database at head, not against the declarations: of the **3** composite FKs in `public`
carrying a tenant-shaped column, **2 have that column NULLABLE**:

| child | constraint | tenant col nullable? | verdict |
|---|---|---|---|
| `audit_logs` | `fk_audit_logs_org_actor_membership` `(org_id, actor_membership_id)` | **yes** | **HOLE** |
| `payroll_statutory_rule_sets` | `fk_..._entity_id_org` `(org_id, entity_id)` | **yes** | **HOLE** |
| `contacts` | `fk_contacts_organization_id_org` `(org_id, organization_id)` | no (`org_id` is NOT NULL) | not a hole — the nullable member is an OPTIONAL PARENT, and a non-firing FK is correct there. CRM, also out of scope. Deliberately untouched. |

**Reproduced before fixing, on a purpose-built scratch database — this is a bite, not a reading.** With `org_id`
set, the composite FK correctly refused another tenant's membership (`23503`, "Key (org_id,
actor_membership_id)=(org-A, 2) is not present"). With `org_id` **NULL**, the same row shape was **accepted** —
and so was `actor_membership_id = 999999`, a membership that exists nowhere at all.

**`NOT NULL` is the WRONG fix and was rejected.** Both tables are on the documented nullable-`org_id` list in
`src/common/tenant/README.md` ("Tables that need a different policy") and both carry the matching RLS escape
`CASE WHEN org_id IS NULL THEN true`: `audit_logs` for platform events (already pinned by
`chk_audit_logs_tenant_or_platform`: `(org_id IS NULL) = is_platform_event`), `payroll_statutory_rule_sets` for
the system-default statutory rule sets seeded by `0292` — all 8 rows on a production-shaped seed are exactly
those. Forcing `NOT NULL` would delete the feature. Migration **`1043`** instead forbids the single combination
in which the FK stops enforcing: a row naming a tenant-scoped child while claiming to have no tenant. In that
state the reference is both unenforceable AND uninterpretable, so it is a data-integrity rule, not merely a
tightening.

`1043` proof: applied through the journal (idx **799**, `when` `1803000010118`, above the 2027-02-19 watermark);
scratch database **665 → 667/667**; both constraints `convalidated=true` in `pg_constraint`; the cross-tenant
insert now raises `23514` while a platform event with no actor and a tenant event with its own membership both
still succeed; repair matched **0** rows at head (`audit_logs` 0 of 0, `payroll_statutory_rule_sets` 0 of 8);
rollback round trip **2 → 0 → 2 validated**, all exit 0. `check:tenant-relationships` against a target at head
(667/667): **Actionable 0, exit 0** — note it reports exit 1 against the default target `scratch_boot_a`, which
is at **573/667** and self-declares `TARGET IS MID-BOOTSTRAP — this number is not release evidence`.

**Follow-up 07b executed the third population 08b handed on, and corrected its cause.** Re-measured
on a database cold-built from zero to head: the "70 declared `.references()` with neither a live
single nor a live composite" is **101** under a definition that keeps the rows whose child table is
not live (08b excluded those 23 `hrms-phase1` rows). Split: 23 SQL-managed · 19 legacy-actor ·
47 CRM/inventory · **12 in release scope, and all 12 are now enforced** — population **101 → 87**,
in-scope **12 → 0**, foreign keys **3,133 → 3,196**. 08b was right that deleting these declarations
would hide the gap.

**Four of the eight 08b called "a real gap" have a cause it did not find: the column type.**
`referrals.referrer_org_id`/`referred_org_id`/`referrer_user_id`,
`affiliate_commissions.referred_org_id` and `app_installations.installed_by` are `integer` in the
catalog and `text` in the declaration, referencing `organizations.id`/`users.id` which are `text`.
Postgres could never install those foreign keys. This is a live run-time defect, not a stale
declaration: `ReferralService.createReferral` inserts an organisation id into an integer column and
raises **22P02**, reproduced on a database at head before migration `1023` fixed it. All three tables
hold 0 rows on `scratch_perf_seed`, which is what a write path that has never succeeded looks like.

`notifications.org_id` — a fifth anchor 08b's list did not name — was a genuine orphan, not just a
missing declaration: `membership_id` is nullable, so an org-wide notification survived
`DELETE FROM organizations` (reproduced: 1 row left behind, now 0).

Migrations `1023`-`1026`. The six self/sibling references were added as **composite**
`(org_id, col)` with explicit SET NULL column lists, per section 3 — the declaration was asking for
the single-column form, which is the cross-tenant hole. 12/12 behavioural assertions including the
real organisation purge; cold bootstrap 662/662; rollback round trip 3196 -> 3133 -> 3196.

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
      **BLOCKED — permanently, on tool capability. Re-confirmed 2026-09-03 and NOT re-litigated: the coordinator
      directed that the bite proof below stands and that no run should be spent trying to build the missing
      instrument. No field was removed on text-search evidence this pass, and none should be.**
      **BLOCKED — permanently, on tool capability, and the reading is now bite-proved rather than argued.**
      Two independent blockers, either of which alone keeps this box open. Neither is unfinished work.
      **(1) No instrument in either repository resolves a FIELD.** The box asks for unused fields *inside*
      request/response/DTO/Zod schemas. knip, both dead-code ledgers and `tsc` all resolve at the granularity of a
      file, an export or a type alias. Proved in a hermetic scratch tree, not asserted: a `probe.ts` declaring
      `CreateThingInput.neverReadRequestField?` and `ThingResponse.neverReadResponseField`, both exported, both
      never read anywhere, gives
      `tsc --noEmit --strict --noUnusedLocals --noUnusedParameters --esModuleInterop probe.ts` → **exit 0, zero
      diagnostics** (`noUnusedLocals` does not reach object or interface members), and
      `knip --no-progress` with `probe.ts` as the entry → **exit 0, zero findings** (the types are reachable; knip
      has no opinion about their members). So the only available evidence for a field-level removal is a text
      search — which this box's own wording, and AGENT-BRIEF rule 8, forbid as sole grounds for deletion. Closing
      this needs an instrument that does not exist: a cross-repo property-reachability analysis over the OpenAPI
      schema and the frontend hooks. That is a build, not a reading, and it is not this ticket's scope.
      **(2) Territory, independently.** The removal must land "as one contract change" across backend, OpenAPI and
      frontend hooks/forms. `frontend/hooks/api/**` and `frontend/types/**` are another agent's; the DTO-dense
      backend modules (hr, support, notifications, workflows, chat, timesheets, accounting, finance, billing,
      storage, build, invoices) are another agent's; crm/inventory are excluded from the release.
      **Re-verified at head 2026-09-03, so the numbers are current and not carried forward:**
      BE `pnpm check:dead-code` → **exit 0** (0 unclassified; it was exit 1 last pass on
      `admission-tenant-hint.ts`, since resolved) · BE `pnpm check:openapi-coverage` and
      `pnpm check:contract-breaking-change` → both **exit 0** · FE `pnpm exec knip --no-progress` → **exit 1**:
      1 unused file, **39 unused exports, 65 unused exported types** · FE `pnpm check:dead-code` → **exit 1**, 2
      unclassified, both `hooks/api/meetings-ai.ts` (`streamMeetingPrep`, `readMeetingPrepSources`) — a different
      lane's in-flight work, reported not touched. Note the shape of the 65: they are unused *aliases*, not unused
      *fields*, so removing every one of them would not satisfy this box.
      **Explicitly not half-satisfied.** No field was removed on text-search evidence, and none should be.
- [x] A removed field is proven removed at the boundary too — a bare `z.object({})` strips silently rather than rejecting, which turns a dropped field into a wrong-subject write rather than an error.
      `support_ticket_tags.orgId` is `notNull()`, so both insert sites are compile-enforced; the write is tenant-scoped in code instead of by the `trg_set_org_id` trigger.
      08b: the same argument now covers 10 more tables. `org_id` is declared `notNull()` on `hr_workflow_steps`, `email_sequence_steps`, `email_sequence_enrollments`, `vendor_candidate_submissions`, `onboarding_template_steps`, `key_results`, `competencies`, `hr_import_rows`, `support_ticket_messages` and `sign_bulk_send_rows`, so all 12 insert sites are compile-enforced. The composite FK now *refuses* a cross-tenant parent id instead of letting the trigger write the row into the parent's organisation — proven: an automation `support_internal_note` carrying another tenant's `ticketId` is refused with `23503`, where it previously succeeded.
- [x] After cleanup: regenerate artifacts, then re-prove chain/ledger, two clean bootstraps, catalog parity, tenant relationships/indexes/RLS, query plans, OpenAPI compatibility, cache invalidation and focused behavior tests.
      Two independent cold bootstraps (`scratch_t08` 646/646, `scratch_t08b` 650/650). chain/ledger/discipline/rollback/tenant-indexes (both modes)/tenant-relationships (pg_catalog)/verify-rls/restrict-fks/set-null-column-lists/openapi-coverage/contract-breaking-change all exit 0. typecheck and spec-typecheck exit 0. 37 jest suites, 362 tests green. 8/8 trigger assertions.
      08b: re-proved after `1006`. Two more cold bootstraps from zero (`scratch_t09` 651/651 then 652/652 on resume; `scratch_t09_cold` **652/652 cold at the new head**), plus a rollback round trip (3,134 → 3,150 down → 3,134 re-applied, REACHED_HEAD 652/652). discipline/chain/ledger/rollback/tenant-indexes (both modes)/tenant-relationships (pg_catalog)/verify-rls/drop-column-safety/restrict-fks/set-null-column-lists — **11 gates, all exit 0**. **5/5** purge assertions including the real `DELETE FROM organizations` path, plus 2/2 cross-tenant message assertions. 179 jest suites / 1,424 tests green across the touched modules. `typecheck` and `check:spec-typecheck` are red **only** on files three concurrent agents have modified and I have not (`payment-run-executor.service.ts(157)`, an untracked `db-call-count-contract.spec.ts`) — enumerated in report 08b §5.
- [x] Before/after counts are recorded. Final acceptance is zero unclassified unnecessary keys and no orphaned schema or code reference.
      Duplicates 9→0, prefix-redundant 6→0, S16 0, S23 3-intentional, FKs 3,150 unchanged, payroll immutability triggers 2→7, `check:tenant-indexes` 821/828→829/829. Everything not executed is classified and handed on in report §9, not left unclassified.
      08b: FKs 3,150 → **3,134**; undeclared tenant columns 32 → **22**; single-column FKs beside a composite 169 → **153**; dead `.references()` 97 → 80; `check:tenant-indexes` declaration mode 829/829 → **839/839**; `check:set-null-column-lists` column lists 258 → 267, catalog half OK. Every remaining item in both populations is CRM or inventory. A third population ticket 08 never counted is now classified: **70 declared `.references()` with neither a live single nor a live composite** — a *missing* constraint, not a redundant one, so removing the declaration would hide a gap. 62 are legacy-actor columns whose FK the contraction dropped; 8 look like a real gap, four of them tenant anchors (`project_ticket_counters.org_id`, `chat_message_reactions.org_id`, `affiliate_commissions.referred_org_id`, `referrals.*`). Handed on in report 08b §7. 
      2026-09-03: a **fourth** population, which none of ticket 08, 08b or 07b had counted — **composite FKs whose
      TENANT column is nullable, i.e. keys that are present in `pg_constraint` and enforce nothing on the rows that
      matter.** Measured at head: **3** such keys, **2 of them real holes**, **2 of 2 now guarded** by `1043`.
      Foreign keys are unchanged at **3,196** (a CHECK is not an FK) and CHECK constraints on the two tables go
      **1 → 2** and **1 → 2**. The population does not go to 0 and should not: the third row (`contacts`) has a
      NOT NULL tenant column and its nullable member is a legitimate optional parent. Nothing here is left
      unclassified.
      07b: **executed.** Re-measured as **101** (08b's 70 excluded 23 rows whose child table is not live) -> **87**; the **12 in release scope are 0**. Foreign keys **3,134 -> 3,196**; declared `.references()` 1,385 -> 1,379 (six converted to composite `foreignKey()`); `check:set-null-column-lists` column lists **267 -> 274**. The 62 legacy-actor rows re-measure as **19 -> 17**: two were never legacy-actor at all but an integer-vs-text type drift that made their foreign key impossible. Numbers and gate output in `reports/07b-declaration-drift.md` sections 3-7.
