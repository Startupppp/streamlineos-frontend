# LEDGER-PATCH-M6 — ADR-0001 Amendment and KB Migration Reconciliation

Lane M6 of the AV-12/AV-13 parallel fan-out. Boxes: AV-12 (ADR amendment) and AV-13 (migration paper reconciliation).

---

## 1. ADR-0001 Amendment Summary

File: `backend/docs/adr/0001-no-db-trigger-for-scanned-document-field-pii-guard.md`

### Change 1 — Fix overly broad SET ROLE claim (Reasoning §1)

**Before:** "`SET ROLE` defeats role-based checks for the same reason."

**After:** "Role-based checks are no more sound: `streamline_admin` (BYPASSRLS, migration role) can `SET ROLE streamline_app` after setting any GUC, making the attested context indistinguishable from a legitimately scanned write. Ordinary `streamline_app` sessions cannot `SET ROLE streamline_admin`; the vulnerability runs in one direction only."

**Why:** The original sentence implied `SET ROLE` is unconstrained in the same way `set_config` is. It is not. `SET ROLE` requires a granted membership; a `streamline_app` session cannot escalate to `streamline_admin`. The actual failure mode is the reverse: the privileged admin role can impersonate the app role, not the other way around. The new text names the direction and preserves the conclusion (role-based checks do not fix the problem) without the false PostgreSQL generalization.

### Change 2 — Document runtime/migration privileges and production-only DB (Reasoning §2)

Expanded the `streamline_admin` paragraph to state:

- `APP_DATABASE_URL` (runtime, `drizzle.module.ts`) uses `streamline_app` — non-superuser, non-BYPASSRLS, subject to RLS.
- `DATABASE_URL` (drizzle-kit, migration scripts) uses `streamline_admin` — BYPASSRLS, bypasses every tenant policy.
- These are separate roles with no cross-escalation from the app side.
- Production Aurora is the ONLY Postgres environment. `backend/.env` points both URLs at the same RDS instance. There is no non-production database.

**Verified:** `backend/.env` shows `APP_DATABASE_URL` as `postgresql://streamline_app@...rds.amazonaws.com...` and `DATABASE_URL` as `postgresql://streamline_admin@...rds.amazonaws.com...`, both pointing at the same Aurora instance. `db-verify-rls.mjs` line 187 confirms `streamline_admin` still has BYPASSRLS.

### Change 3 — Add RLS, index, and GRANT caveats (Reasoning §2, new paragraph)

Added a new **"RLS, index, and GRANT caveats"** paragraph documenting:

- RLS policy predicates use `app.current_org_id()`, which is not leakproof.
- A non-leakproof predicate prevents the planner from using GIN/trigram indexes unless `org_id` is in a covering index (BE-79). Expression indexes on non-leakproof functions are dead under RLS (BE-80).
- `ALTER FUNCTION … LEAKPROOF` is not available on Aurora.
- Some tables have GRANTs but no RLS policy; others have no GRANTs at all — both gaps surface as `42501` and are tracked by `db-verify-rls.mjs`.

**Why:** The original ADR made broad PostgreSQL claims ("PostgreSQL offers no trusted-path attestation") without grounding them in the actual deployment topology. These facts are needed to understand what a DB-layer check could and could not achieve. They do not change the decision — they explain the ceiling.

### Change 4 — Add controlled direct-write / quarantine path (Consequences)

Added a **"Controlled direct-write path"** paragraph to the Consequences section:

Any migration or maintenance script writing directly to `name`, `description`, `category`, or `tags` on a `documents` row with an active `kb_linked_documents` entry must either: (a) call `assertSearchableMetadataStillPassesPublishJudgement` via the service layer for each affected row after the write, or (b) quarantine the KB link before the write (hold state → write → revalidation sweep). A script that skips both leaves KB links in an unverified PII state. `streamline_admin`'s BYPASSRLS means no trigger fires to detect it.

**Why:** The original Consequences section identified the application-layer gate as the only enforcement point but said nothing about what operators must do when they bypass it. This documents the required compensating control.

---

## 2. KB Migration Reconciliation Table

Scope: KB-tagged migrations authored or materially discussed in the S23 review cycle (files 1196–1370). All older KB migrations (0180–1193) are fully journalled and are not shown; the table would add no information.

| File | In Journal | idx | when | Rollback? | Idempotent? | Notes |
|---|---|---|---|---|---|---|
| `1196_kb_pages_content_digest_leakproof` | yes | 1080 | 1803000010711 | rollback/ ✓ | yes (CREATE OR REPLACE) | |
| `1200_kb_linked_documents` | yes | 1084 | 1803000010715 | rollback/ ✓ | yes | |
| `1201_kb_linked_document_guard` | yes | 1085 | 1803000010716 | rollback/ ✓ | yes (CREATE OR REPLACE FUNCTION, triggers) | |
| `1203_kb_ai_generate_grant` | yes | 1087 | 1803000010718 | rollback/ ✓ | yes (GRANT is idempotent) | |
| `1205_kb_page_tree_children_index` | yes | 1089 | 1803000010720 | rollback/ ✓ | yes (CREATE INDEX CONCURRENTLY IF NOT EXISTS) | |
| `1206_kb_space_member_counts` | yes | 1090 | 1803000010721 | rollback/ ✓ | yes | |
| `1207_kb_version_restore_audit` | yes | 1091 | 1803000010722 | rollback/ ✓ | yes | |
| `1208_kb_ai_interactions` | yes | 1092 | 1803000010723 | rollback/ ✓ | yes | |
| `1209_kb_events_correlation_id` | yes | 1093 | 1803000010724 | rollback/ ✓ | yes | |
| `1212_kb_indexed_bytes_quota` | yes | 1094 | 1803000010725 | rollback/ ✓ | yes | |
| `1216_kb_page_comment_anchor` | yes | 1095 | 1803003610725 | rollback/ ✓ | yes | |
| `1217_kb_page_templates_usage` | yes | 1097 | 1803010810725 | rollback/ ✓ | yes | |
| `1218_kb_ai_interactions_research_brief` | yes | 1096 | 1803007210725 | rollback/ ✓ | yes | |
| `1226_kb_pages_drop_source_article_bridge` | yes | 1100 | 1803021610725 | rollback/ ✓ | yes | |
| `1227_kb_page_fts_tsquery_resolver` | yes | 1098 | 1803014410725 | rollback/ ✓ | yes | |
| `1228_kb_health_items` | yes | 1099 | 1803018010725 | rollback/ ✓ | yes | |
| `1229_kb_acl_revision_timestamps` | yes | 1101 | 1803025210725 | rollback/ ✓ | yes | |
| `1230_kb_pages_legal_hold` | yes | 1102 | 1803028810725 | rollback/ ✓ | yes | |
| `1231_kb_purge_ledger_add_reviews_store` | yes | 1103 | 1803032410725 | rollback/ ✓ | yes | |
| `1233_kb_research_briefs_cost_metadata` | yes | 1104 | 1803036010725 | rollback/ ✓ | yes | |
| `1234_kb_purge_ledger_widen_stores` | yes | 1105 | 1803039610725 | rollback/ ✓ | yes | |
| `1235_kb_research_briefs_approval` | yes | 1106 | 1803043210725 | rollback/ ✓ | yes | |
| `1236_kb_purge_ledger_add_remaining_stores` | yes | 1107 | 1803046810725 | rollback/ ✓ | yes | |
| `1277_kb_and_gap_status_vocabularies` | yes | 1110 | 1803057610725 | rollback/ ✓ | yes | |
| `1347_kb_hr_documents_guard_scanned_fields` | **NO** | — | — | _rollback.sql ✓ | yes (CREATE OR REPLACE, DROP TRIGGER IF EXISTS then CREATE) | Deliberate — kept unjournalled per ADR-0001. DO block wraps precondition only; main DDL is plain. |
| `1350_kb_acl_branch_indexes` | **NO** | — | — | **MISSING** | yes (CREATE INDEX IF NOT EXISTS) | No journal entry, no rollback file. Two DO blocks (precondition + post-ASSERT); main CREATE INDEX statements are plain. |
| `1360_retire_app_search_kb_chunk_ids` | **NO** | — | — | rollback/ ✓ | **NO** (DROP FUNCTION without IF EXISTS; precondition RAISE if already absent) | No journal entry. DO block is precondition only; DROP FUNCTION is plain. Comments note SECURITY DEFINER function, static non-use, unknown external callers. |
| `1370_kb_chunk_acl_dead_index` | **yes** | 1137 | 1803093626725 | _rollback.sql ✓ | yes (DROP INDEX IF EXISTS) | Journalled 2026-09-27 per commit 4980aea28. Made idempotent before journalling (second DO precondition removed; DROP INDEX IF EXISTS retained). DO blocks are precondition + post-ASSERT only; DROP INDEX is plain. |

### DO-block note

All four unjournalled/recent migrations use `DO $$ ... $$` blocks only for precondition checks and ASSERT post-checks, not to wrap their primary DDL. The main statements (CREATE INDEX, DROP FUNCTION, DROP INDEX) are plain SQL visible to text-scanning gates.

### Journal ordering status

The 1370 entry sits at idx 1137, when 1803093626725, which is strictly after idx 1135 (1395_sibling_version_columns, when 1803093624725) and after the out-of-sequence idx 1136 (1396_build_sprint_cycle_chain_repair, when 1803093625725). All three idx values are unique and their `when` values are strictly increasing in idx order. No new collision was introduced.

Two pre-existing `when`-ordering violations elsewhere in the journal were observed and are not introduced by this work:
- `0619_chain_creates_what_production_has` at idx 340 (when 1787895425277) follows idx 339 `0271a_waitlist_admission` (when 1803000010178) — a `when` regression.
- `1155_build_cycles_drift_reconcile` at idx 1038 (when 1803000010500) appears in file position after idx 1136 — file-position cosmetic issue only; idx and `when` are consistent with surrounding entries in idx order.

Neither affects execution: drizzle orders by `idx`, not by file position or `when`.

---

## 3. Defect List

| Severity | Defect | File | Detail |
|---|---|---|---|
| P2 | Unjournalled migration, no rollback | `1350_kb_acl_branch_indexes` | On disk, never runs. Creates two partial indexes on `kb_pages`. Missing rollback. Absence causes slower ACL-branch queries, not an outage — index-creation is additive. Cannot be journalled without touching `_journal.json` (orchestrator action). |
| P2 | Unjournalled migration, not idempotent | `1360_retire_app_search_kb_chunk_ids` | On disk, never runs. Drops `app.search_kb_chunk_ids` (SECURITY DEFINER). Not idempotent — second run raises exception. Rollback exists. Static analysis says no TypeScript production caller; external callers (dashboards, psql snippets) not ruled out by static analysis alone. Cannot be journalled without orchestrator. |
| INFO | Deliberate non-journal | `1347_kb_hr_documents_guard_scanned_fields` | Kept unjournalled per ADR-0001. This is a standing policy, not a defect. The file and its rollback are preserved on disk as a record of the rejected approach. |
| INFO | Pre-existing when-ordering violations (×2) | `0619_chain_creates_what_production_has`, `1155_build_cycles_drift_reconcile` | Pre-existing, not introduced here. Neither affects execution (drizzle uses idx). Noted to record they were re-observed and verified. |

---

## 4. Verdict per Box

### AV-12 — ADR-0001 amendment

**CLOSABLE.** Four changes made to `backend/docs/adr/0001-no-db-trigger-for-scanned-document-field-pii-guard.md`:
1. SET ROLE claim corrected to describe the actual one-directional vulnerability.
2. Runtime/migration role split (`streamline_app` vs `streamline_admin`) documented with verified env-var and BYPASSRLS facts.
3. RLS/leakproof/GRANT caveats added — bounds what a DB-layer check could achieve.
4. Controlled direct-write / quarantine path added to Consequences.

The application-layer scan decision (`assertSearchableMetadataStillPassesPublishJudgement`) is retained unchanged. Migration 1347 remains unjournalled and unapplied per the decision.

### AV-13 — Migration paper reconciliation

**PARTLY CLOSABLE.** The paper reconciliation is complete:
- All 27 KB migrations shown are accounted for.
- `1370_kb_chunk_acl_dead_index` is confirmed journalled at idx 1137, when 1803093626725, with no new collision.
- Two new unjournalled KB files (`1350`, `1360`) are documented as defects.
- No duplicate idx values exist in the range covered.
- Pre-existing ordering violations are confirmed pre-existing.

What remains open: BLOCKED-ON-live-db-hash-probe. "Reconcile … actual database hashes/schema" requires querying `drizzle.__drizzle_migrations` and `pg_indexes`/`pg_proc` to confirm applied state and hash parity. This is a production DB operation. The paper reconciliation confirms journal state; it cannot confirm applied state without a live query.

`1350` and `1360` cannot be journalled by this lane — that requires an orchestrator write to `migrations/meta/_journal.json`. Flagged as P2 above.
