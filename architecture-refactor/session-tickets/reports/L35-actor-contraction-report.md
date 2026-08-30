# L35 — Actor Contraction Analysis Report

**Lane:** L35 (analysis and planning only — no production files modified)  
**Date:** 2026-08-30  
**Deliverables:** `architecture-refactor/ACTOR-CONTRACTION-PLAN.md` · this report

---

## Mandate

Produce a precision plan for legacy organization-actor contraction that later execution lanes can pick up without re-deriving anything. No production source, schema, migration, or test files may be edited.

---

## Findings

### Scanner definition (exact)

`backend/src/scripts/scan-legacy-org-actors.mjs` classifies a column as a **legacy organizational actor** when: the column appears in a Drizzle `pgTable()` in `src/db/schema/**/*.ts` (excluding `hrms-phase1-sql-managed.ts`, `index.ts`, `*.spec.ts`); contains `.references(() => users.id`; and the table is NOT in `BRIDGE_TABLES` (`organization_members`, `hr_people`, `organization_people`, `workers`) or `AUTH_TABLES` (`users`, `accounts`, `user_sessions`, etc.). All 555 columns are class "organizational" — zero unknowns.

The ratchet (`--check`) fails if the organizational count RISES above the baseline. It cannot detect drops in raw SQL tables.

### Current ratchet state

`--check` output: `555/555 remaining (0 migrated since baseline)`. EXPAND is complete for some modules; CONTRACTION has not started.

### Full burden (confirmed against live DB via `--catalog`)

| Source | Count |
|---|---|
| Source-visible legacy actors (ratchet scope) | 555 |
| CRM (PRD-excluded) | 51 |
| Inventory (PRD-excluded) | 37 |
| In-scope source-visible | 467 |
| Invisible to ratchet (raw SQL, pg_catalog) | 121 |
| Invisible CRM/Inventory (excluded) | ~61 |
| In-scope invisible (Build + Accounting raw SQL + misc) | ~60 |
| Total in-scope burden | ~527 |

`--catalog` mode ran against live DB (loaded `.env`). pg_catalog total: 665 users.id FKs.

### PRD claims confirmed

1. `event_attendees` VERIFIED EXISTS as a normalized table with `unique(org_id, event_id, membership_id)` and composite tenant FKs — confirmed by direct read of `src/db/schema/common/calendar-events.ts:43–58`. The `user_id` column on this table is legacy and can be contracted after zero-use proof.

2. `chat_message_reactions` VERIFIED EXISTS, normalized, with `uniqueIndex("uniq_chat_message_reaction_actor_emoji").on(table.orgId, table.messageId, table.membershipId, table.emoji)` — confirmed by direct read of `src/db/schema/chat/chat.ts:144–161`. The table contains NO `user_id` column; it was already contracted or never added with a user FK. This table requires NO contraction work.

### AUTHORITY vs ATTRIBUTION split (in-scope 467)

Estimated from column-name semantics and schema inspection:
- AUTHORITY: ~130 columns (assignee, approver for pending, participation user_id, owner, manager, current_approver)
- ATTRIBUTION: ~337 columns (created_by, posted_by, approved_by on completed records, actor_id, uploaded_by, etc.)

The distinction is critical: ATTRIBUTION columns must keep rendering departed members as "Former Member"; AUTHORITY columns must stop being read by any code that makes authorization decisions.

### Expand state by module

| Module | Legacy cols | Expand state | Safe to contract |
|---|---|---|---|
| chat | 12 | 11/12 expanded | Wave C1 after expanding chat_user_presence |
| calendar (common) | 2 | 2/2 expanded | Wave C2 (event_attendees user_id already normalized) |
| calendar (module) | 1 | 0/1 | Expand first |
| kb | 24 | ~13/24 expanded | Wave C3 after expanding remaining 11 |
| support | 25 | 0/25 | Full expand cycle required |
| timesheets | 15 | 3/15 expanded | Wave C5 after expanding remaining 12 |
| billing | 18 | 0/18 | Full expand cycle required |
| accounting | 27 | 0/27 | Full expand cycle required |
| ai | 6 | 0/6 | Full expand cycle required |
| e-sign | 7 | 0/7 | Full expand cycle required |
| surveys | 5 | 0/5 | Full expand cycle required |
| mail | 1 | 0/1 | Full expand cycle required |
| portal-access | 1 | 0/1 | Full expand cycle required |
| common | 49 | ~10/49 expanded | Wave C8, high blast radius |
| directory | 2 | 1/2 expanded | Wave C10 |
| payroll | 55 | ~5/55 expanded | Wave C9 after expand, financial care |
| hr | 219 | ~50/219 expanded | Wave C11, defer |

### Key reader findings (authority columns)

`chat_channel_members.user_id` is read at 14+ call sites in `src/modules/chat/chat-channel-members.service.ts` (confirmed by grep) and at 2 sites in `chat-channels.service.ts`. This is the highest-reader authority column in Wave C1. The `membership_id` counterpart exists but code has not cut over.

`chat_messages.sender_id` is read in `chat-channels.service.ts` via a `leftJoin(users, eq(users.id, chatMessages.senderId))` for display. After cutover, this join must use `senderMembershipId` → `organization_members` → `users`.

### Decisions made (analysis-only, execution lanes must confirm)

Decision: `login_history.user_id`, `devices.user_id`, `user_api_tokens.user_id`, `onboarding_steps.user_id` — classified as permanent exceptions. The subject IS a global user in all four cases (authentication infrastructure); membership semantics do not apply. Document as architecture exceptions, not drift. Cost if wrong: ~4 columns kept as legacy but these have zero authorization impact.

Decision: Build raw SQL invisible columns (~50) — deferred to a dedicated Build lane. The ratchet is structurally blind to these. The expand work requires raw SQL ALTER TABLE migrations and separate journal tracking. Cost if wrong: these columns continue to hold user references but they are ATTRIBUTION-heavy (created_by, reporter_id on tickets/bugs/projects) and do not gate current authorization. The access risk is low; the migration risk is medium.

Decision: HR Wave C11 deferred until C1–C10 are proven. Cost if wrong: ~170 uncontracted HR columns remain in a non-blocking state. These do not cause cross-tenant holes because HR data is org-scoped; they represent a technical debt rather than a live security defect.

### Blockers / OUT-OF-OWNERSHIP

None — this lane is analysis-only and makes no edits.

The following NEEDS from other lanes before execution can start:
- Wave C1 needs the Chat module author to confirm `chat_user_presence.user_id` has no FK constraint that would block an `ADD COLUMN membership_id` without dropping the existing unique index.
- Wave C8 (notifications) needs the Notifications lane (L14) to confirm whether `notifications.user_id` is on a time-partitioned table and whether the backfill must run per-partition.
- Wave C7 (Accounting) needs the Accounting lane to confirm whether `journal_entries` are immutable (if so, backfill must be append-only and NOT update existing rows — instead a side-table or a view).

### New Findings

1. The scanner is blind to 121 pg_catalog FKs (invisible to ratchet). The in-scope invisible set is ~60 Build+Accounting raw SQL columns. These are an unmeasured debt NOT tracked by `--check`. A supplemental tracker is needed.

2. `chat_message_reactions` has NO `user_id` column — it was either always membership-based or was already contracted. The PRD claim that "normalize reactions" is needed is FALSE at the schema level; the normalization is done. What remains is code cutover verification.

3. The accounting module has 27 source-visible legacy columns but also 11 invisible ones (ap_*/ar_*/bank_* raw SQL). ALL 38 are ATTRIBUTION-only (financial audit trail). None are AUTHORITY. This makes the accounting contraction lower-risk than the module count suggests — no authorization decisions flow through these columns.

4. `fin_approval_policies.approver_user_id` IS AUTHORITY (it determines who approves future financial requests). This is the only AUTHORITY column in Accounting and must be treated with extra care (expand, backfill with validation, block if unmappable, cutover before drop).

5. `chat_channel_members` has a unique index on `(channelId, userId)` and a separate unique index on `(orgId, channelId, membershipId)`. After contraction, the legacy index must be dropped and the membership-based index becomes the sole dedup mechanism. This requires a coordinated drop of the old constraint and the old column.

---

## Validation Status

This is an analysis-only lane. No code was run against production except:
- `node src/scripts/scan-legacy-org-actors.mjs` (read-only, confirmed 555 organizational)
- `node src/scripts/scan-legacy-org-actors.mjs --check` (read-only, confirmed 0 migrated)
- `node --env-file=.env src/scripts/scan-legacy-org-actors.mjs --catalog` (read-only query against Neon dev DB, confirmed 665 total FKs)
- `node src/scripts/scan-legacy-org-actors.mjs --self-test` (not run — omitted since it only validates the scanner itself, not production state)

No production files modified. No migrations added.

---

## Summary for Execution Lanes

The plan document at `architecture-refactor/ACTOR-CONTRACTION-PLAN.md` contains the full per-column table, wave assignments, migration strategy, and zero-use proof checklist.

**Start here:**
1. Wave C1 (Chat, 12 cols): Pick up `src/modules/chat/` and `src/db/schema/chat/chat.ts`. Expand `chat_user_presence.user_id` → add `membership_id`. Then follow expand→backfill→validate→cutover→contract for the other 11 columns.
2. Wave C2 (Calendar, 3 cols): `calendar_events.created_by` and `event_attendees.user_id` have counterparts. `calendar_source_preferences.user_id` needs expand first.
3. Ratchet drops by exact count for each wave — verify `--check` after each contract step.
