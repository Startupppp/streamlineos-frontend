# L68 Actor Contraction Session Report
**Date:** 2026-08-30  
**Lane:** L68  
**Repo:** backend (`streamlineos-api`)

---

## 1. Authoritative FK Count

| Source | Count |
|---|---|
| pg_catalog FKs to `users.id` (before wave) | **665** |
| Source scanner (organizational class) | **555** |
| Delta (invisible to ratchet) | **110 raw SQL FKs** |

**The scanner undercounts by 110.** Reaching ratchet=0 does not mean the work is done — 110 pg_catalog FKs from raw-SQL tables (Build, Accounting, CRM/Inventory) are invisible to `pnpm scan:legacy-actors`. The catalog mode (`--catalog`) is the only reliable count.

After this wave:
- pg_catalog total: **663** (−2)
- Scanner organizational: **553** (−2)
- Chat module: **10** (was 12)

---

## 2. Wave Executed: L68-A (Chat Attribution — 2 columns)

### Target Tables and Columns

| Table | Legacy column | Class | Counterpart | Action |
|---|---|---|---|---|
| `chat_org_settings` | `updated_by` (TEXT FK → users.id) | ATTR | `updated_by_membership_id` (INT) | Backfill → FK → DROP |
| `chat_channel_invite_links` | `created_by` (TEXT FK → users.id, NOT NULL) | ATTR | `created_by_membership_id` (INT) | Backfill → relaxed NOT NULL → FK → DROP |

**Why these 2:** Both are pure attribution (audit trail only — who last updated settings, who created an invite link). Neither column is ever read in service code for access decisions. Each had zero service-layer reads; only write sites needed updating. Counterpart columns already existed in DB.

### Decision NOT to include other chat columns

The remaining 10 chat columns include:
- **AUTH columns** (`chatChannelMembers.userId`, `chatHuddleParticipants.userId`, `chatSavedMessages.userId`, `chatReplyReminders.recipientUserId`) — active access gates with 14+ reader call sites in service code. Switching without a full reader migration plan would break channel membership checks.
- **MIXED columns** (`chatHuddles.startedBy`) — incorrectly classified ATTR in the plan; used for host-transfer authority logic at lines 299, 301, 423 of `chat-huddles.service.ts`.
- **ATTR with relation joins** (`chatMessages.senderId`, `chatPinnedMessages.pinnedBy`, `chatChannels.createdBy`) — have Drizzle relation traversals that join through the legacy column for display; removing requires updating the join path and render logic.

The plan classifies `chatHuddles.started_by` as ATTR (LOW risk). **This classification is wrong.** Lines 299 and 423 of `chat-huddles.service.ts` read `huddle.startedBy` as an AUTHORITY predicate (host-transfer and kick guards). The plan's §3 definition of MIXED exactly covers this. A later lane picking up Chat must re-classify it and treat the cutover as AUTHORITY.

---

## 3. Migration Files

| File | Journal tag | When | Applied |
|---|---|---|---|
| `migrations/0672_chat_attribution_contraction_backfill.sql` | `0672_chat_attribution_contraction_backfill` | 1788091200000 | YES |
| `migrations/0673_chat_attribution_contraction_drop.sql` | `0673_chat_attribution_contraction_drop` | 1788091260000 | YES |

**0672 steps:**
1. Backfill `chat_org_settings.updated_by_membership_id` from `organization_members`
2. Backfill `chat_channel_invite_links.created_by_membership_id` from `organization_members`
3. `ALTER COLUMN created_by DROP NOT NULL` (relax before code cutover)
4. Add `fk_chat_org_settings_updated_by_membership` (ATTR → SET NULL, NOT VALID + VALIDATE)
5. Add `fk_chat_invite_links_created_by_membership` (ATTR → SET NULL, NOT VALID + VALIDATE)

**0673 steps:**
1. `DROP COLUMN updated_by` from `chat_org_settings`
2. `DROP COLUMN created_by` from `chat_channel_invite_links`

---

## 4. Code Changes

### `src/db/schema/chat/chat.ts`
- Removed `createdBy: text("created_by").references(() => users.id).notNull()` from `chatChannelInviteLinks`
- Added `foreignKey({..., name: "fk_chat_invite_links_created_by_membership"}).onDelete("set null")` for `createdByMembershipId`
- Updated `chatChannelInviteLinksRelations`: removed `createdByUser` (join through legacy FK), added `createdByMembership` (join through `organizationMembers`)
- Removed `updatedBy: text("updated_by").references(() => users.id)` from `chatOrgSettings`
- Added `foreignKey({..., name: "fk_chat_org_settings_updated_by_membership"}).onDelete("set null")` for `updatedByMembershipId`

### `src/modules/chat/chat-org-settings.service.ts`
- Changed `updateSettings(orgId: string, userId: string, ...)` → `updateSettings(orgId: string, membershipId: number | null, ...)`
- Replaced `updatedBy: userId` writes with `updatedByMembershipId: membershipId`

### `src/modules/chat/chat-org-settings.controller.ts`
- Added `import { actingMembershipId } from "../../common/auth/principal"`
- Changed `this.settings.updateSettings(u.orgId, u.userId, body)` → `this.settings.updateSettings(u.orgId, actingMembershipId(u.principal), body)`

### `src/modules/chat/chat-invite-links.service.ts`
- Replaced `createdBy: userId` writes with `createdByMembershipId: member.membershipId ?? null`
- `member` is the `chatChannelMembers` row returned by `assertAdmin`; `member.membershipId` is already the `organization_members.id` value

---

## 5. Verification

### pg_catalog (authoritative)
```
Legacy columns still present: 0
FK constraints (updated_by_membership, created_by_membership): 2 ✓
Legacy users.id FKs: 0 ✓
```

### Migration chain
`pnpm check:migration-chain`: **PASS**

### Scanner ratchet
- Before: `555/555 remaining (0 migrated since baseline)`
- After: `553/555 remaining (2 migrated since baseline)` ✓

### Tests
`jest --testPathPattern="chat-org-settings|chat-invite"`: **12/12 passed** ✓

### TypeScript typecheck
Running — OOMs at default heap; requires `NODE_OPTIONS=--max-old-space-size=8192`. In progress at session end; no errors in the directly modified files confirmed by ts-jest compilation during the test run.

---

## 6. pg_catalog Delta Restatement

**Before this wave:** 665 pg_catalog FKs, 555 ratchet-visible organizational
**After this wave:** 663 pg_catalog FKs, 553 ratchet-visible organizational

**The gap (110 invisible FKs) comes from:**
- ~50 Build module raw-SQL tables (tickets, projects, bugs, test_* etc.)
- 11 Accounting raw-SQL tables (ap_*, ar_*, bank_*)
- ~49 CRM+Inventory raw-SQL tables (excluded from PRD scope)

A later lane claiming "ratchet=0" without a corresponding pg_catalog=0 has NOT finished the migration — it has only cleared what the source scanner can see.

---

## 7. What Remains (Honest Estimate)

| Module | Source-visible remaining | Expand state | Priority |
|---|---|---|---|
| chat | 10 | 10/10 expanded in DB | Next: switch AUTH readers (chatChannelMembers.userId is HIGH — 14+ sites) |
| calendar | 1 | 0/1 expanded | Needs expand first |
| directory | 2 | 1/2 expanded | worker_engagements.created_by_membership_id exists; ready to contract |
| kb | 24 | ~13/24 expanded | KB-specific plan needed |
| support | 25 | 0/25 | Full expand cycle required |
| timesheets | 15 | 3/15 | 12 need expand |
| billing, AI, e-sign, surveys, mail, portal | 38 | 0/38 | Full expand required |
| accounting | 27 | 0/27 | Full expand + 11 raw-SQL cols |
| common | 49 | ~10/49 | notifications has high blast radius |
| payroll | 55 | ~5/55 | Financial records; careful |
| hr | 219 | ~50/219 | 8+ weeks dedicated |

**Immediate next safe actions (no expand required):**
1. `worker_engagements.created_by` (directory module) — 1 write site, `created_by_membership_id` exists, very low risk
2. Remaining 10 Chat columns — AUTH columns need reader migration plan first; start with the remaining ATTR display columns (`chatChannels.createdBy`, `chatPinnedMessages.pinnedBy`, `chatHuddles.startedBy` (reclassify as MIXED)) after verifying relation join updates

**Build invisible raw-SQL (not in ratchet):** ~50 columns across ~20 Build tables need a dedicated raw-SQL migrate program with separate tracking. These are permanently invisible to `pnpm scan:legacy-actors`.
