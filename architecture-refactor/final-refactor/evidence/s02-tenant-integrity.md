> # ⛔ SUPERSEDED — FORMER HEAD (634-entry journal). NOT current-head proof.
>
> This document describes a **634-entry** migration journal on a database estate that no longer
> exists in that state. The chain has since reached **637** (proven) and **639** (unproven).
> Its parity numbers were produced by a comparator that keyed on object **names**, not definitions,
> and so could not see a same-name/different-column index, a changed constraint or policy body, a
> rewritten function, or RLS enabled-versus-FORCED. Its tenant gates had measured blind spots.
>
> Current-head evidence: [`bootstrap-head-637/README.md`](bootstrap-head-637/README.md)
> Why this is superseded, in full: [`SUPERSEDED-FORMER-HEAD.md`](SUPERSEDED-FORMER-HEAD.md)
>
> *(Banner added 2026-09-02 by the ticket-04 recorder. Nothing below it was altered. This file's
> hash already failed to match `artifact-hashes.json` before the banner was added — see the hash
> ledger in `SUPERSEDED-FORMER-HEAD.md`.)*
>
> *(Amended 2026-09-02 by the ticket-04b redactor. **This file needed no redaction** — it contains
> no connection URI and no endpoint host — and its body is byte-identical to the moment the banner
> above was added. `artifact-hashes.json` has since been re-sealed over those bytes, so the
> mismatch noted above is now closed; the sealed, pre-banner and post-banner hashes are all
> preserved in [`REDACTION-AND-RESEAL-LEDGER.md`](REDACTION-AND-RESEAL-LEDGER.md).)*

# S02 — tenant relationship integrity, schema/catalog reconciliation

Catalog measurements are taken from `scratch_boot_a` unless stated. The chain was subsequently
applied to the live `neondb` on instruction and verified there directly.
All counts come from `pg_catalog`, never from the migration files.

## Live application

All 36 S02 migrations are applied to `neondb`. A pre-flight first counted rows that would fail each
`VALIDATE`: **541 planned constraints, 0 orphan rows**, every table and column present. Live now
reports **0 actionable single-column tenant FKs**, measured by querying the live catalog directly —
`check:tenant-relationships` rewrites `neondb` to `scratch_boot_a` by design, so its output is never
evidence about live.

Live exposed three defects that an empty scratch database could not:

- **`0955` failed `42P01` at statement 142 of 162** on `payroll_journal_entries`. That table and
  `payroll_run_items` exist in no database, so 161 sound statements were rolling back because of two
  dead ones. Their drops now use `ALTER TABLE IF EXISTS`.
- **`0963` failed `42710`.** Live already held **150 of the 288** constraints these migrations
  create, from earlier un-journalled work. A migration that assumes a starting state cannot apply to
  a database that has drifted, so `0963`–`0978` were rewritten to assert the end state: every
  `ADD CONSTRAINT` is preceded by `DROP CONSTRAINT IF EXISTS`, every drop is conditional, every
  unique index is `IF NOT EXISTS`.
- **20 duplicate composite pairs existed only in the live catalog** and are removed by `0982`.
  Seven more are left alone: each has one `RESTRICT` and one `SET NULL` member, so choosing a winner
  changes delete behaviour and belongs to the HR actor-migration owner.

**Three migrations had never applied anywhere.** `0938`, `0939` and `0940` contained 20
`VALIDATE CONSTRAINT` statements with no `ALTER TABLE` prefix. That is `42601`, and each migration
runs in one transaction, so all three rolled back completely on every attempt while their
constraints appeared to exist because a prior session had created them by other means. Repaired and
applied for the first time. `0979` was withdrawn afterwards because it repaired the same 16
relationships under different names.

Applying the chain advanced the live watermark past six unapplied entries belonging to other lanes.
`drizzle-kit` skips anything at or below the watermark while printing success, so those six would
have silently never applied; they are moved to the journal tail with a `when` above the watermark
and remain pending for their owners. Nothing in the chain references their objects.

## AR-02 tenant relationship inventory

| Measurement | Before | After |
|---|---|---|
| Single-column tenant FKs in catalog | 603 | 236 |
| EXCL: CRM | 97 | 99 |
| EXCL: Inventory | 136 | 136 |
| EXCL: platform-global | — | 1 |
| **Actionable** | **353** | **0** |
| Duplicate composite tenant FK pairs | 209 | 0 |
| Static-mode findings (`--static-only`) | 469 | **0** |
| Live `neondb` actionable | unmeasured | **0** |

`pnpm -C backend check:tenant-relationships` → `EXIT=0`, `Actionable 0`.

### Repair shape

353 actionable single-column FKs collapsed to **351 distinct relationships** (`fin_reimbursement_batches`
carried two identical single-column FKs on `bank_account_id` and on `journal_entry_id`).

- 120 relationships had **no** composite constraint — one was created.
- 145 had a composite that was `NO ACTION` while the single-column FK it duplicated carried
  `CASCADE` (110), `SET NULL` (32) or `RESTRICT` (3). Each was rebuilt with the real action.
  **Dropping the single-column FK without this step would have silently converted 145 cascades into
  `NO ACTION`**, so ordinary deletes across chat, KB, accounting and HR would have begun failing 23503.
- 86 already carried the correct action and were left alone.
- 393 superseded constraints (353 single-column + 40 duplicate composites) were dropped.
- 3 parents needed `UNIQUE (org_id, key)` first: `coupons`, `principal_groups`,
  `operator_access_grants (org_id, grant_id)`.

Canonical name per relationship: the name already declared in Drizzle where one existed
(38 relationships), otherwise the existing catalog name (193), otherwise `fk_<child>_<col>_org` (120).

### Catalog diff

All 351 canonical constraints were diffed against `pg_catalog` for name, column pair, referenced
table and column pair, referential action, `SET NULL` column list and `convalidated`:

```
relations expected     351
canonical constraints  351 present
superseded to drop     393
survivors              0
problems               0
```

A journalled migration can be recorded as applied while statements inside it silently did not run,
so this diff — not the journal — is the evidence.

### Dependency proof before dropping

Every one of the 407 distinct constraint names scheduled for removal was searched across
`src/`, `test/`, `evals/` and `contracts/`. The 44 hits were all Drizzle `name:` declarations,
which is why those names, not the migration-generated ones, were chosen as canonical.

### Constraints prove they bite

Rolled-back probes on `scratch_boot_a`; nothing persisted.

- Cross-tenant insert: `chat_messages(org_id='org-B', channel_id=<org-A channel>)` →
  `23503 fk_chat_messages_org_channel`. Same-tenant control on the same statement → allowed,
  so the denial is not vacuous.
- `wfh_requests`: same user, same date, different organisation → allowed (multi-org employment);
  same organisation → `23505 uniq_wfh_requests_org_user_date`.

## Defects found and fixed

**`ON DELETE SET NULL` without a column list would null `org_id` (23502).**
`fk_ai_chat_conv_org_user_mbr`, `fk_ai_chat_msg_org_user_mbr` and `fk_ai_proposals_org_user_mbr`
were declared `SET NULL` over `(org_id, user_membership_id)` with no column list, and `org_id` is
`NOT NULL`. Proved by probe: deleting an `organization_members` row raised
`23502 null value in column "org_id" of relation "ai_chat_conversations"`, so **removing a member
who had any AI chat history was impossible**. Migration `0974` restricts the action to
`SET NULL (user_membership_id)`; the re-run probe deletes successfully with `org_id` preserved.

**13 tenant relationships were declared in Drizzle but enforced by nothing.**
No foreign key existed in the database for any of them. Migration `0975` creates the composite,
taking each parent from the committed declaration. Two of the thirteen (`payroll_runs.period_id` →
`hr_payroll_input_periods`, not `payroll_periods`; `hr_template_renders.rendered_for_employee_id` →
`hr_employments`, not `hr_people`) were initially generated against an inferred parent; that first
attempt was dropped from the database, its ledger row removed, and the migration regenerated from
`git show HEAD:` of each declaration.

**`wfh_requests` uniqueness was cross-tenant.** The database enforced
`uniq_wfh_requests_user_date (user_id, date)` while the Drizzle model declared the tenant-scoped
`uniq_wfh_requests_org_user_date`, which had never been created. Because `organization_members`
permits one user in many organisations (`uniq_org_members_org_user (user_id, org_id)`), a person
employed by two organisations could not file a work-from-home request for the same date in both,
and the 23505 disclosed the existence of a row in another tenant. Migration `0976` creates the
tenant-scoped index and drops the cross-tenant one, plus 7 other declared-but-absent unique indexes.

**209 duplicate composite tenant FK pairs.** Same child, same parent, same columns, two
constraints — 206 of them a `NO ACTION` copy sitting beside the one carrying the real action,
left behind by the earlier AR-02 tranches. Every insert and update paid for two foreign-key trigger
pairs and the integrity truth was split. Migration `0977` drops the redundant member of each pair;
no group had two conflicting non-`NO ACTION` actions, so no judgement call was required.

## Drizzle ↔ catalog reconciliation

Static-mode findings fell 469 → 13 through three passes over `src/db/schema/**`:
209 composite declarations added for the constraints this session created, 429 added for composites
that already existed in the catalog but were never declared, 296 stale inline `.references()`
removed, and 195 declarations pruned for constraints `0977` dropped.

A guard rejected 27 candidates that would have produced a **second** `foreignKey` declaration on a
column pair that already had one under a different name — those would have become duplicate
constraints on the next regeneration.

Scoped typecheck of the schema tree after every pass: **0 errors**
(`tsc --noEmit` over `src/db/schema/**`, which imports only `drizzle-orm`, `postgres` and
`node:crypto`). `madge --circular` over the same tree: no circular dependency.

The static parser was also comparing a Drizzle **symbol** against a set of SQL **table names**, so
its CRM, global-parent and trigger-managed rules never matched anything and every relationship fell
through to actionable. It now resolves the parent symbol to its SQL name through a map built from
every schema file — building that map from the CRM-filtered list is what left `deals` unresolvable.
Both modes now report 0.

The gate carried two further blind spots, both closed. It matched only `attname = 'org_id'`, hiding
**81 tables** that scope tenancy with `organization_id` and 4 real single-column violations among
them. And its `EXCL: In-migration` bucket excused 17 constraints as "covered by 0934–0937" when
**0935, 0936 and 0937 were never written**, so that exclusion protected nothing; it is replaced by a
platform-global registry sharing the RLS verifier's table names.

## Tenant-column and uniqueness inventory

- 902 tenant tables. 893 declare `org_id NOT NULL`. The 9 nullable ones are deliberate dual-scope
  tables where `NULL` means a platform-global row: `audit_logs`, `coupons`, `email_suppressions`,
  `guided_tours`, `login_history`, `notification_events`, `payroll_statutory_rule_sets`,
  `payroll_templates`, `platform_payments`. `payroll_statutory_rule_sets` holds 8 rows, all with
  `org_id IS NULL` and `is_system_default`, which is the intended shape.
- 745 of 745 tenant tables carry a tenant-leading index (`check:tenant-indexes`, `EXIT=0`).
- 1,079 unique indexes on in-scope tenant tables: 884 contain the tenant column, 26 are global by
  design (tokens, hashes, codes, endpoints — global uniqueness is the point), 153 are transitively
  tenant-scoped through a composite FK to a tenant-owned parent, and 16 were reviewed individually.
  Of those 16, `wfh_requests` was the one real defect and is fixed; the rest are external-identity
  uniqueness that must stay global (provider payment references, custom domains, API key prefixes,
  public form slugs, the global email suppression list).

The transitive argument only holds because the composite FKs now exist. Before this session many of
those parents were reachable through a single-column FK, so a child row could be scoped to a parent
in another tenant and the uniqueness guarantee did not follow.

## Open findings recorded, not fixed here

**100 Drizzle-declared columns do not exist in either database** — almost all `*_membership_id`
actor columns across HR, hiring, payroll and performance, plus `payroll_runs.posting_state` (which
migration `0933` adds and is still pending). No journalled or pending migration creates the other 99.
This is pre-existing at `HEAD`, not introduced here, and it is a live failure rather than cosmetic
drift:

```
select "id","interview_id","org_id","user_id","user_membership_id","created_at"
  from "interview_panel_members" limit 1
→ 42703 column "user_membership_id" does not exist
```

That statement is exactly what `db.select().from(interviewPanelMembers)` renders (verified with
`PgDialect.sqlToQuery`), and it fails against the live database. Any `select()` or
`db.query.<table>.findMany()` without an explicit column list on those ~85 tables fails the same way.
Four of them additionally declare a `uniqueIndex` or `foreignKey` over the absent column.

**The Drizzle snapshot chain is stale by design of practice, not by decision.** The newest snapshot is
`meta/0464_snapshot.json` while the journal has 624 entries, because every recent migration is
hand-written rather than generated. `drizzle-kit generate` is therefore not a safe operation on this
repository today. Reconciling the snapshot chain was not attempted and is not claimed.
