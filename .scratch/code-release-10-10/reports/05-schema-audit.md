# 05 — Schema integrity audit

Session S2 · 2026-09-02 · **audit only, no schema or migration file was edited.**

## Method and confidence

Constraint state was derived two ways and cross-checked:

1. **Declared state** — `drizzle-kit export --sql` against `src/db/schema/index.ts`, giving the
   full DDL for **872 tables / 2340 foreign keys / 2135 indexes**, then parsed into structured
   facts. This is drizzle-kit's own serializer, so it sees inline `.references()` and explicit
   `foreignKey({})` identically — no regex blind spots.
2. **Live-DB-bound state** — a replay simulation over all 637 journalled migrations in journal
   order, tracking every `ADD CONSTRAINT … FOREIGN KEY` / `DROP CONSTRAINT` / `CREATE TABLE` /
   `DROP TABLE`, plus the sweeping `DO` block in `0770`. Used wherever the declaration and the
   migration chain disagree — which they do, materially, on referential actions.

Scope is everything except `db/schema/crm/` (108 tables) and `db/schema/inventory/` (66):
**698 in-scope tables, 653 of them tenant-owned, 1873 in-scope foreign keys.**

Postgres *semantics* claims below were proven by execution against local PostgreSQL 18.4 in a
throwaway `audit05` schema on `scratch_boot_c` (dropped afterwards; `scratch_boot_a` and
`scratch_boot_b` untouched). **Constraint state itself is declaration- and
migration-derived and is NOT confirmed against the live `pg_catalog`** — no bootstrapped
database was available. Every finding below says which of the two it rests on.

---

## Ranked findings

### P0-1 — `support_tickets`: a `SET NULL` column list that names a `NOT NULL` column

| | |
|---|---|
| **Table / constraint** | `support_tickets` · `fk_support_tickets_created_actor` |
| **Current state** | `FOREIGN KEY (org_id, created_by_membership_id) REFERENCES organization_members(org_id, id) ON DELETE SET NULL (created_by_membership_id)` — added by `0865_support_actor_expand.sql:47-52`. Migration `0916_support_remaining_actor_drop.sql:92` then runs `ALTER TABLE support_tickets ALTER COLUMN created_by_membership_id SET NOT NULL`. |
| **Verdict** | **REFACTOR** |
| **Failure prevented** | Removing any member who has ever created a support ticket raises `23502 null value in column "created_by_membership_id"`. `org-member-departure.service.ts:157` catches only `23503` and `23001`, so this escapes the handler as an unhandled 500 — member removal is broken with no actionable message. |
| **Effort** | Small. One migration: drop and re-add with `ON DELETE NO ACTION` plus a `MEMBERSHIP_ARTIFACTS` entry (the pattern `0839` already established for `calendar_events`), *or* make the column nullable. `SET NULL` on that column is unreachable either way. |

This is precisely the trap the ticket names. The column list was applied correctly at `0865`;
a later migration made the named column `NOT NULL` and silently converted the fix into the bug.
**Any repair of the SET NULL family must re-derive the nullable set at the time it runs — a
column list authored earlier is not durable.**

Proven on PostgreSQL 18.4:

```
ERROR:  null value in column "org_id" of relation "child_bad" violates not-null constraint
CONTEXT:  SQL statement "UPDATE ONLY "child_bad" SET "org_id" = NULL, "head_membership_id" = NULL …"
```
and, with `ON DELETE SET NULL (head_membership_id)`, the same parent delete succeeds and leaves
`org_id` intact.

---

### P0-2 — 11 more `SET NULL` foreign keys that can only raise `23502`

Residual after replaying the whole chain (so `0770`'s sweep, `0839`, `0974` and `0982` are all
accounted for). All are in-scope.

**Composite, no column list, `org_id` is `NOT NULL`** (7):

| Module | Table · constraint | Referencing columns |
|---|---|---|
| common | `invitations` · `fk_invitations_org_revoked_by_membership` | `(org_id, revoked_by_membership_id)` |
| hr | `hr_case_notes` · `fk_hr_case_notes_author_actor` | `(org_id, author_membership_id)` |
| hr | `hr_benefit_enrollments` · `fk_hr_benefit_enrollments_user_membership` | `(org_id, user_membership_id)` |
| hr | `hr_dependents` · `fk_hr_dependents_user_membership` | `(org_id, user_membership_id)` |
| hr | `hr_insurance_claims` · `fk_hr_insurance_claims_user_membership` | `(org_id, user_membership_id)` |
| hr | `hr_insurance_claims` · `fk_hr_insurance_claims_decider_membership` | `(org_id, decided_by_membership_id)` |
| hr | `hr_travel_visit_logs` · `fk_hr_travel_visit_logs_user_membership` | `(org_id, user_membership_id)` |

All seven were introduced **after** the `0770` sweep, by `0923_hr_cases_benefits_actor_contract.sql`
and `0927_s01_invitation_membership_fk_contract.sql`. All reference `organization_members`.

**Single-column `SET NULL` on a `NOT NULL` column** (4, all `hr` → `users`):
`hr_disciplinary_actions.issued_by`, `hr_safety_incidents.reported_by`,
`hr_emergency_events.created_by`, `hr_simulations.created_by`.

| | |
|---|---|
| **Verdict** | **REFACTOR** — composite ones get `ON DELETE SET NULL (<the nullable member only>)`; the four single-column ones cannot use `SET NULL` at all and must become `NO ACTION` with an explicit clearing step, or the column must become nullable. |
| **Failure prevented** | Same as P0-1: member removal 500s with `23502` for any org whose members have authored HR case notes, benefit enrolments, dependants, insurance claims or travel logs, or revoked an invitation. `hr_*` are among the highest-traffic tables in the product. |
| **Effort** | Small — one migration in the shape of `0974_ar02_ai_actor_set_null_column_list.sql`, which already fixed the three AI-module instances the same way. Filter on `attnotnull` when building each column list. |

---

### P0-3 — Nothing prevents the next regression, and the declaration will revert the fix

| | |
|---|---|
| **Current state** | `0770_set_null_fk_column_lists.sql` swept every composite `SET NULL` with a `NOT NULL` member and fails closed if any remain — **at the moment it runs**. It sits at journal index 582 of 637. Twelve new violations were added by `0920`, `0923` and `0927` after it; `0839` and `0974` were hand-written repairs for two earlier waves. Meanwhile **every one of the 254 in-scope composite `SET NULL` FKs is still declared as a bare `.onDelete("set null")` in Drizzle** — the column list exists only in the database. |
| **Verdict** | **REFACTOR — add a gate.** |
| **Failure prevented** | (a) Recurrence: this class of bug has now been introduced three separate times after being swept once, and no `check:*` script tests for it. (b) Reversion: `drizzle-kit push` (permitted for local dev) or any future `generate` diffs the declaration against the catalog, sees `SET NULL` vs `SET NULL (col)`, and rewrites the constraint back to the broken form. |
| **Effort** | Small. A `check:set-null-column-lists` gate over `pg_constraint` — the query already exists verbatim inside `0770` (`confdeltype = 'n' AND array_length(conkey,1) > 1 AND confdelsetcols IS NULL AND EXISTS (… attnotnull)`); lift it into a script and add the mirror-image check that no `confdelsetcols` entry is itself `attnotnull` (which is what P0-1 is). Drizzle cannot express a column list, so the declaration will keep drifting — the gate is the only durable answer. |

---

### P1-4 — The AR-02 gate excludes three in-scope tables by miscategorising them as CRM

| | |
|---|---|
| **File** | `src/scripts/check-tenant-relationships.mjs:76-84`, `CRM_TABLE_NAMES` |
| **Current state** | The set contains `"credit_notes"` and `"vendor_credits"` — both declared in `src/db/schema/accounting/finance-ar-ap.ts` — and `"enterprise_quotes"`, declared in `src/db/schema/billing/billing.ts`. `isCrmTable()` is consulted by `parentIsOutOfScope()` in **both** the static and the `pg_catalog` mode, so the exclusion is total. (Six further names on that list — `pipelines`, `pipeline_stages`, `campaigns`, `campaign_recipients`, `quote_items`, `contact_notes`, `contact_tags` — are not declared as tables at all; stale, harmless.) |
| **Hidden by it** | `credit_note_items (credit_note_id) → credit_notes ON DELETE CASCADE` and `vendor_credit_items (vendor_credit_id) → vendor_credits ON DELETE CASCADE` — both single-column, both between two tenant-owned tables. |
| **Verdict** | **REFACTOR** — remove the three names from `CRM_TABLE_NAMES`, then add the composite FKs the gate will then demand. |
| **Failure prevented** | A credit-note line in org A can reference a credit-note header in org B (nothing in the constraint carries `org_id`), and deleting org B's header cascades org A's line away. A tenant-scoped read that joins `credit_note_items → credit_notes` on `credit_note_id` alone returns the other tenant's header. The gate that is meant to be the release evidence for this property will report "OK — zero actionable" forever. |
| **Effort** | Small for the gate; small-medium for the two constraints (add `unique(org_id, id)` on the parents if absent, then `NOT VALID` + `VALIDATE`). |

---

### P1-5 — The same gate's inline-reference regex cannot see a typed arrow

| | |
|---|---|
| **File** | `src/scripts/check-tenant-relationships.mjs`, `extractInlineReferences()` |
| **Current state** | The pattern requires `\.references\s*\(\s*\(\s*\)\s*=>` — an *empty* arrow parameter list. Drizzle requires a return-type annotation for any self- or forward-reference: `.references((): AnyPgColumn => orgUnits.id, …)`. That form never matches. There are **15 such declarations** in the schema, 14 of them in scope. |
| **Verdict** | **REFACTOR** |
| **Invisible single-column tenant→tenant FKs** | `org_units.parent_id`, `legal_entities.parent_legal_entity_id`, `support_tickets.merged_into_ticket_id`, `candidates.duplicate_of_id`, `hr_templates.parent_template_id`, `hr_policies.parent_policy_id`, `hr_automation_runs.triggered_by_run_id`, `test_suites.parent_id`, `bugs.linked_test_case_id`, `test_run_results.linked_bug_id`, `feedback_posts.duplicate_of_id`, `payroll_runs.source_run_id`, `payroll_policies.active_version_id`, `payroll_journal_batches.reversal_of_batch_id` |
| **Failure prevented** | Eight of these already have a composite twin, so the exposure is limited to the six that do not: `hr_templates`, `hr_policies`, `hr_automation_runs`, `support_tickets.merged_into_ticket_id`, `payroll_runs.source_run_id`, `payroll_policies.active_version_id`. Each lets a row point at a parent in another organisation — e.g. org A's payroll run can name org B's run as its source, and org A's ticket can be marked "merged into" a ticket the org cannot see, leaking a foreign identifier into its UI. |
| **Effort** | Trivial for the regex (`\(\s*\)\s*(?::\s*\w+\s*)?=>`); small-medium for the six missing composites. |

**Combined effect of P1-4 and P1-5:** my independent DDL-derived pass finds **19 tenant→tenant
foreign keys carrying no tenant column**, of which 16 are genuine gaps (the other three — one
platform-global parent and two composite FKs to the partitioned `notifications` table — are
correctly out of scope). `pnpm check:tenant-relationships --static-only` reports **0 actionable**.
The gate is not wrong about the constraints it can see; it cannot see these.

---

### P1-6 — `coupons.code` is a bare global UNIQUE on a tenant table

| | |
|---|---|
| **Table / constraint** | `coupons` · `coupons_code_unique` (`UNIQUE (code)`), `src/db/schema/common/subscriptions.ts:54` |
| **Current state** | `code: text("code").notNull().unique()`; `orgId` is nullable (platform coupons carry `NULL`, tenant coupons carry an org). `BillingCouponsService.create(orgId, …)` inserts `code.toUpperCase()` with the caller's `orgId` and maps `23505` to `ConflictException("A coupon with this code already exists")`. |
| **Verdict** | **REFACTOR** |
| **Failure prevented** | Textbook cross-tenant denial of service plus an enumeration oracle: the first organisation to create `SUMMER25` permanently blocks every other organisation from using that code, and the 409 confirms to any tenant that some *other* tenant already owns any code they guess. This is the exact scenario `backend/CLAUDE.md` §3 forbids. |
| **Effort** | Small, and the codebase already contains the pattern: split into `uniqueIndex(code) WHERE org_id IS NULL` (platform coupons) plus `uniqueIndex(org_id, code) WHERE org_id IS NOT NULL`, mirroring `email_suppressions.uniq_email_suppressions_global` and `notification_events.uniq_notification_events_global_key`. |

**Everything else in this class is fine.** I examined all 139 non-tenant-scoped uniques on
tenant tables. The rest are either anchored on an already-org-scoped parent id
(`(ticket_id, label_id)`, `(project_id, bug_number)`, `(run_id, user_id)` …), or deliberately
global because the value is looked up without a tenant (opaque tokens and token hashes, webhook
endpoints, custom domains, provider event ids, outbox/inbox event ids, name reservations).
`payment_provider_accounts`/`_credentials`/`_webhook_endpoints` look alarming but anchor on
`payment_providers.id`, which is itself per-org. **Verdict for all of those: KEEP.**

---

### P1-7 — `check:tenant-indexes` is blind to the whole `build` module; 5 real violations hide there

| | |
|---|---|
| **File** | `src/scripts/check-tenant-indexes.mjs`, `parseTables()`: `/export\s+const\s+(\w+)\s*=\s*pgTable\(/g` |
| **Current state** | `db/schema/build/` declares its 83 tables through a `pgSchema` handle — `build.table("tickets", …)` — not `pgTable(`. The regex matches **0 of the 83**. All 83 carry `org_id`. The gate prints "Tenant tables 745 / Leading tenant index 745 / OK". Its two sibling gates (`check-tenant-relationships`, `check-restrict-fks`) already use `(?:pgTable|\w+\.table)`; this one was not updated. |
| **Violations it hides** | `work_item_relations`, `ticket_label_mappings`, `ticket_related_links`, `release_tickets`, `webhook_deliveries` — five tenant tables with **no index, primary key or unique constraint leading on `org_id`**. Their leading columns are `ticket_id` / `release_id` / `webhook_id` / `work_item_id`. |
| **Verdict** | **REFACTOR** — one-word regex fix, then five `CREATE INDEX … (org_id, …)`. |
| **Failure prevented** | Two things. Under RLS the policy predicate `org_id = app.current_org_id()` is not leakproof, so an index that cannot supply `org_id` is refused and the read degrades to a sequential scan — the isolation cost this gate exists to prevent. And all five carry `org_id → organizations ON DELETE CASCADE`, so `OrgPurgeService`'s `delete(organizations)` sequentially scans each of them per purge; `webhook_deliveries` is an append-only delivery log. |
| **Effort** | Small. |

Across all 872 tables these five are the *only* tenant tables without a leading tenant index —
the property genuinely holds everywhere else. **Verdict for the other 800: KEEP.**

---

### P2-8 — 344 foreign keys have no index whose leading column is one of their own

Postgres runs the referential check on the child side as `WHERE <fk cols> = …`. Where no index
leads with an FK column, that check is a sequential scan of the child table for every parent row
deleted or key-updated.

| Parent | Count | What exercises it |
|---|---|---|
| `users(id)` | 284 | physical user deletion — today `GdprSubjectErasureService` anonymises via `update(users)` rather than deleting, so this is **latent**; `verify-membership-revocation.ts` does delete users |
| `organizations(id)` | 7 | `OrgPurgeService` / `cron-org-purge-worker` — **live** (these are the five from P1-7 plus `affiliate_commissions.referred_org_id`, `referrals.referred_org_id`) |
| 53 others | 53 | e.g. `credit_note_items(credit_note_id) → credit_notes CASCADE`, `vendor_credit_items → vendor_credits CASCADE`, `release_tickets(org_id, ticket_id) → tickets CASCADE`, `onboarding_template_steps(template_id) CASCADE` |

A further **434** FKs have an index that *leads* with one of their columns but not as an ordered
prefix — usable, over-scanning within the tenant, not a correctness problem.

| | |
|---|---|
| **Verdict** | **REFACTOR the 7 `organizations` and the 53 others** (concrete delete paths exist today). **KEEP the 284 `users` FKs for this release** and record the constraint: physical `users` deletion is not an implementable operation until they are indexed. |
| **Failure prevented** | Organisation purge is a saga step wrapped in `runInTenantTransaction` with a `lock_timeout`; 60 sequential scans of high-volume child tables inside one transaction is how that step starts timing out and rolling back on a large tenant, leaving a half-purged org. Cascading a credit-note delete scans every credit-note line in the database. |
| **Effort** | Medium — ~60 `CREATE INDEX CONCURRENTLY` statements, individually trivial, but they must be split out of any transactional migration. |

---

### P2-9 — 28 auto-generated foreign-key names exceed Postgres's 63-byte identifier limit

| | |
|---|---|
| **Current state** | 1034 of the 1873 in-scope FKs carry drizzle's auto-generated `<table>_<cols>_<parent>_<parentcols>_fk` name; 839 are explicitly named. 28 of the auto-generated names are 64-91 bytes. Longest: `principal_group_members_org_id_organization_membership_id_organization_members_org_id_id_fk` (91). |
| **Verdict** | **REFACTOR the 28** (name them explicitly). **KEEP the other 1006** — a deterministic generated name is stable and carries no failure; renaming 1006 constraints is churn, not integrity. |
| **Failure prevented** | Proven on PostgreSQL 18.4: the server emits `NOTICE: identifier "…" will be truncated to "…"` and stores the 63-byte prefix. Consequences: a hand-authored migration that does `DROP CONSTRAINT "<declared name>"` fails `42704`; `err.constraint` at runtime returns the truncated name, which is the string interpolated into the user-facing message at `org-member-departure.service.ts:160`; and any catalog-vs-declaration parity gate reports 28 phantom mismatches. **Tickets 06 and 08 will hit this the first time they write a migration against one of these names.** No two names currently collide after truncation (checked across all indexes, uniques, PKs and FKs) — the next long one might. |
| **Effort** | Small. |

---

### P2-10 — 8 relationships carry two foreign keys, two of them with contradictory actions

| Table | Redundant single-column FK | Composite twin | Actions |
|---|---|---|---|
| `org_units` | `org_units_parent_id_org_units_id_fk` | `fk_org_units_parent_tenant` | **`set null` vs `restrict`** |
| `candidates` | `candidates_duplicate_of_id_candidates_id_fk` | `fk_candidates_duplicate_of_id_org` | **`set null` vs `no action`** |
| `legal_entities` | `legal_entities_parent_legal_entity_id_…_fk` | `fk_legal_entities_parent_legal_entity_id_org` | set null / set null |
| `feedback_posts` | `feedback_posts_duplicate_of_id_…_fk` | `fk_feedback_posts_org_dup` | set null / set null |
| `bugs` | `bugs_linked_test_case_id_…_fk` | `fk_bugs_org_test_case` | set null / set null |
| `test_run_results` | `test_run_results_linked_bug_id_…_fk` | `fk_test_run_results_org_bug` | set null / set null |
| `test_suites` | `test_suites_parent_id_…_fk` | `fk_test_suites_org_parent` | set null / set null |
| `payroll_journal_batches` | `payroll_journal_batches_reversal_of_batch_id_…_fk` | `fk_payroll_journal_batches_org_reversal_of` | set null / set null |

| | |
|---|---|
| **Verdict** | **REMOVE the 8 single-column constraints.** `0982_ar02_drop_live_duplicate_composites.sql` already does exactly this for `invitations`, `ticket_comments` and `build.tickets`, so the pattern and the precedent exist. |
| **Failure prevented** | For `org_units` and `candidates` the two declarations disagree about what happens on parent delete, and which one wins is decided by Postgres trigger ordering rather than by the author — a reader of the schema is told `set null` and gets a `restrict` error. For all eight, every insert and update of the column fires two RI triggers instead of one, and a future `DROP CONSTRAINT` on the composite silently leaves the un-tenant-scoped one in place. |
| **Effort** | Small — one migration. |

---

### P2-11 — 1388 of 1607 timestamp columns are `timestamp without time zone`

| | |
|---|---|
| **Current state** | In scope: **219 `timestamptz`, 1388 naive `timestamp`**. 28 tables mix both — e.g. `invitations` stores `revoked_at`/`declined_at` as `timestamptz` but `expires_at`/`accepted_at`/`created_at` naive; `organizations` stores `purge_scheduled_at`/`purged_at` as `timestamptz` but `deleted_at` naive. 53 of the naive columns are expiry, lock or scheduling columns, including `api_keys.expires_at`, `agent_tokens.expires_at`, `user_sessions.expires_at`, `email_otp_codes.expires_at`, `magic_link_tokens.expires_at`, `sign_recipients.otp_expires_at` and `sign_recipients.auth_locked_until`. Nothing pins the timezone at either end: `src/db/pool.config.ts:132` sets only `application_name` on the connection, and the `Dockerfile` sets no `TZ`. |
| **Verdict** | **REFACTOR — but pin the timezone first.** |
| **Failure prevented** | Proven end-to-end with the project's own `postgres` driver against PostgreSQL 18.4. The driver serialises every JS `Date` as an ISO-8601 string typed as `timestamptz` (oid 1184, `src/types.js:29-32`) and parses every returned timestamp with a bare `new Date(x)`; a naive column comes back with no offset, which Node interprets in the *process* timezone. Writing `2026-09-02T12:00:00.000Z` with `TZ=UTC` against a session whose `TimeZone` is `Asia/Kolkata` reads back as `2026-09-02T17:30:00.000Z` — **a silent 5h30m shift**. With `TZ=Asia/Kolkata` (matching the session) it round-trips. `timestamptz` round-trips correctly in both cases. Correctness therefore depends on the API process's `TZ` matching the database's `TimeZone` GUC — two settings in two systems, neither asserted anywhere in the repository. Today they probably both default to UTC, so this is **latent, not live** — but a token that is valid 5h30m past its stated expiry is a security failure, and it is one environment variable away. |
| **Effort** | The **mitigation is small and should ship in this release**: set `connection.TimeZone = "UTC"` in `resolvePoolConfig` (`src/db/pool.config.ts`, another agent's territory) and `ENV TZ=UTC` in the `Dockerfile`. That converts a coincidence into a guarantee. The **cure** — converting 1388 columns to `timestamptz` — is large (each `ALTER TYPE` rewrites the table and takes `ACCESS EXCLUSIVE`) and should be a separate programme, module by module, starting with the 53 expiry/lock columns. |

---

### P2-12 — Two incompatible money representations, and `numeric` money is summed as JS floats

| | |
|---|---|
| **Current state** | In scope: **95 integer minor-unit columns** (`billing` is consistent and correct — `amount_minor`, `price_in_paise`, `tax_rate_bps`) and **143 `numeric`/`decimal` columns** across 11 different precision/scale variants, concentrated in `accounting` (45), `payroll` (40) and `hr` (32). The accounting kernel is internally consistent at `numeric(18,4)`. **Only 2 money columns anywhere use floating point** (`cell_capacity_measurements.limit_value`, `.per_org_cost`, both internal capacity telemetry) and no `real`/`double precision` column exists in accounting, payroll or billing. |
| **Verdict** | **KEEP `numeric` as the accounting storage type** (it is exact in Postgres, and converting the ledger is out of scope for this release). **REFACTOR the read path.** **REFACTOR the two `double precision` cost columns** if `per_org_cost` ever feeds pricing. |
| **Failure prevented** | Drizzle returns `numeric` as a **string**, and the accounting and payroll services convert with `Number()`/`parseFloat()` and then sum in IEEE-754 doubles: `accounting-statements.service.ts:32,81,96` (trial balance), `accounting-cash-flow.service.ts:155,160,166`, `accounting-aged-receivables.service.ts:48,71,83`, `payroll/insights/*.ts` (13 sites). A trial balance is the one figure in the system that must net to exactly zero, and it is computed by accumulating binary approximations. Separately, `accounting-journal-entry.service.ts:57` validates balance as `Math.round(totalDebit * 100) !== Math.round(totalCredit * 100)` — rounding to 2 decimals a column stored at 4, so a genuinely unbalanced entry at the 3rd/4th decimal passes. And `journal-posting.service.ts:74` balances in *integer minor units* against the same ledger — two representations, two posting paths, one table. |
| **Effort** | Medium. Sum in SQL (`SUM(debit)` returns `numeric`, exact) rather than in JS, or route every read through a single decimal helper. Contained to the accounting/payroll read services; no schema change required. |

---

### P3-13 — `journal_lines` has no check constraints at all

| | |
|---|---|
| **Current state** | `debit numeric(18,4) NOT NULL DEFAULT 0`, `credit numeric(18,4) NOT NULL DEFAULT 0`, `base_debit`/`base_credit` nullable. **Zero `CHECK` constraints.** The invariants live only in the Zod DTO (`dto/accounting.schemas.ts:64` enforces `(debit > 0) !== (credit > 0)`). |
| **Verdict** | **REFACTOR** — add `CHECK (debit >= 0 AND credit >= 0)` and `CHECK (debit = 0 OR credit = 0)`. |
| **Failure prevented** | Any writer that does not pass through that one DTO — a backfill migration, a bulk import, `recurring-journals.service.ts`, `journal-posting.service.ts`, an AI-generated proposal — can store a negative debit (arithmetically a credit, which silently inverts every sign-based report) or a line carrying both a debit and a credit. A corrupted general ledger is discovered by manual reconciliation and cannot be fixed without restating. |
| **Effort** | Small — `NOT VALID` then `VALIDATE`; the validate will also tell you whether bad rows already exist. Entry-level balance (lines summing to zero) cannot be a row `CHECK` and stays application-enforced. |

Schema-wide, in-scope check-constraint coverage is **73 constraints over 42 of 698 tables (6%)**,
almost all of it in `hr`, `directory` and export-job tables. This is a thin invariant layer for a
finance-bearing product, but only `journal_lines` rises to a named finding.

---

### P3-14 — 458 primary keys use `serial` / `bigserial`

| | |
|---|---|
| **Current state** | 449 `serial` + 9 `bigserial`, against 130 identity, 48 uuid, 42 text and 20 composite. `backend/CLAUDE.md` §3 says "UUID or `generatedAlwaysAsIdentity()` PK (never `serial`)". |
| **Verdict** | **KEEP the 458 for this release; gate new ones.** |
| **Failure prevented** | `serial` is a default, not a constraint: an insert that supplies an explicit `id` is accepted and does not advance the sequence, so every later insert collides with `23505` until the sequence catches up. That is how a data import, a restore, or a seed script silently poisons a table. `GENERATED ALWAYS AS IDENTITY` rejects the explicit value outright, making the corruption unrepresentable. The 449 `int4` sequences also cap at 2.1 billion — not a near-term risk for any of them, and the genuinely high-volume `build` log tables already use `bigserial`. |
| **Effort** | Converting is **large** and not worth it: each conversion rewrites the column and every FK that references it. The cheap durable move is a `check:no-new-serial` gate diffing new `pgTable` declarations. |

---

### P3-15 — 25 of 67 soft-delete tables have no partial index excluding deleted rows

`hr` accounts for 18 of them (`hr_cases`, `hr_contracts`, `hr_policies`, `hr_positions`,
`hr_legal_holds`, `hr_safety_incidents`, …), plus `org_units`, `legal_entities`, `users`,
`kb_sources`, `party_contacts`, `portal_memberships`.

| | |
|---|---|
| **Verdict** | **REFACTOR opportunistically** — not release-blocking. |
| **Failure prevented** | `backend/CLAUDE.md` §3 requires partial indexes on soft-delete tables. Every list read on these tables filters `deleted_at IS NULL` against a full index and discards; on a table whose rows are mostly archived the index stops paying for itself. This is a performance finding, not a correctness one — the *correctness* risk (a read that forgets the `isNull` filter and resurrects deleted rows) is a code-side concern outside this ticket. |
| **Effort** | Small each, ~25 of them. |

---

### P3-16 — 102 tenant tables carry no `(org_id, id)` unique

`common` 46, `hr` 14, `build` 11, `timesheets` 11, rest scattered.

| | |
|---|---|
| **Verdict** | **KEEP.** |
| **Failure prevented** | Nothing today — by construction, none of these can be the parent of a composite tenant FK, because Postgres would have rejected such a constraint without the unique. It is a latent cost only: the day someone needs to point a tenant-scoped FK at one of these tables, they must add the unique first. Worth listing so tickets 06/08 are not surprised; not worth 102 migrations now. |
| **Effort** | n/a |

---

## Things I checked that turned out to be fine

Recorded so the executing tickets do not re-litigate them.

- **Composite tenant-FK coverage is genuinely good.** 1873 in-scope FKs; only 19 lack a tenant
  column, and 16 of those are the P1-4/P1-5 blind spots. AR-02 has substantially landed.
- **`RESTRICT` foreign keys to `organization_members` do NOT block organisation purge.** I built
  the exact shape on PostgreSQL 18.4 — `orgs ← organization_members (cascade)`,
  `orgs ← artifact (cascade)`, `artifact → organization_members (restrict)` — and
  `DELETE FROM orgs` succeeded, removing all three rows. The cascade reaches the artifact before
  the `RESTRICT` check on the membership runs. The 105 `RESTRICT` FKs block *member* removal, by
  design, and `check:restrict-fks` covers that (exit 0, 343 files).
- **Only 5 FKs to `organizations` are `NO ACTION`** (`leave_blackout_dates`, `candidate_offers`,
  `offer_negotiations`, `offer_versions`, `onboarding_tasks`). `OrgPurgeService` hard-codes
  deletes for three of them; the other two cascade from `candidate_offers`. So purge works — but
  the compensation lives in application code with nothing binding it to the schema. **A sixth
  `NO ACTION` FK to `organizations` would break org purge with `23503` and no gate would catch
  it.** Worth a one-line gate; not a defect today.
- **`created_at` / `updated_at` defaults are uniformly present** — 0 of 598 `created_at` and 0 of
  362 `updated_at` columns lack a default. 100 tables have no `created_at` and 336 no
  `updated_at`; nearly all are join tables, counters, watermarks and snapshot rows where the
  parent carries the timestamp. No finding.
- **No constraint or index name collides after 63-byte truncation** (checked across every index,
  unique, primary key and foreign key in all 872 tables).
- **`check:tenant-indexes` 745/745, `check:restrict-fks` clean, `check:tenant-relationships
  --static-only` 0 actionable** — all three pass, and P1-4/P1-5/P1-7 explain why two of those
  passes are weaker than they read.

---

## Ownership note

Every fix above lands in files this ticket does not own: `BE/src/db/schema/**` (tickets 06/08),
`BE/migrations/**` (the migration agent), `BE/src/scripts/check-tenant-*.mjs` and
`check-tenant-indexes.mjs` (gate owner), `BE/src/db/pool.config.ts` and `BE/Dockerfile`
(P2-11 mitigation), `BE/src/modules/accounting/**` and `BE/src/modules/payroll/**` (P2-12).
Nothing was edited.

## Suggested execution order for tickets 06 / 08

1. **P0-1, P0-2** — one migration, 12 constraints. Derive each column list from `attnotnull`
   *at migration time*; do not copy a list authored earlier.
2. **P0-3** — the `check:set-null-column-lists` gate, before anything else can regress.
3. **P1-7** regex + 5 indexes, **P1-4** exclusion list + 2 composites, **P1-5** regex + 6
   composites, **P1-6** coupon uniques, **P2-10** drop 8 duplicates. All small, all independent.
4. **P2-11 mitigation only** — pin `TimeZone=UTC` on the pool and `TZ=UTC` in the image.
5. **P2-9** name the 28 over-long constraints — do this *before* any migration that must
   `DROP CONSTRAINT` by name.
6. **P2-8** (the 60 non-`users` indexes), **P3-13**, then the rest.
