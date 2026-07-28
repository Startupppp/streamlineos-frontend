---
name: schema-redesign-todo
status: LIVING — update every item as it is done
target: docs/schema-redesign/north-star.md
path: docs/schema-change-plan.md §9 (Waves 0–9)
sources: 4 parallel repo audits (schema duplication · RBAC mechanisms · frontend duplication · backend module duplication), 2026-07-27
---

# Redesign TODO register

Every item is a discrete, verifiable change. Legend:

- **[DB]** requires a working `DATABASE_URL` — cannot be done until the blocker below clears.
- **[CODE]** implementable now.
- **[VERIFY]** re-confirm zero references immediately before deleting; then build + lint + typecheck.

Rule for every deletion: re-grep for ALL callers including `backend/scripts/mcp-server.mjs`, cron,
server-to-server and external API consumers. Never batch-delete unverified.

---

## BLOCKER — RESOLVED 2026-07-28

- [x] **B-01** ✅ CLEARED Credential rotated and verified. Connected to Neon, PostgreSQL 18.4,
  `neondb` / `neondb_owner`.
  ⚠️ **The runbook's premise was wrong.** It said the 54 migrations were "authored but none have
  run". The `drizzle.__drizzle_migrations` ledger holds **54 applied rows** — exactly matching the
  54 journal entries — and the database has **787 public tables**. The schema is fully migrated.
  Verified the invariants really landed: `organizations.owner_membership_id` is `NOT NULL`, and all
  five previously "code-only" tables exist (`organization_people`, `workers`, `worker_engagements`,
  `pm_workspaces`, `pm_workspace_memberships`). Treat `pending-operator-sql-runbook.md` as stale.
- [ ] **B-02** [DB] ⚠️ STILL REQUIRED before any `DROP TABLE`. A `prod-recon-baseline` Neon branch
  cannot be created from here (no Neon API credential in `.env`) — **only the user can take it**.
  Every drop below is data-risk-free (all target tables measured at **0 rows**) but `DROP TABLE` is
  irreversible, so the snapshot still gates it.

### COLD REBUILD — done 2026-07-28, and it proves the Wave 0 exit criterion

The user wiped the database. It was rebuilt from empty and **reached head: 55/55 migrations, 0
failures, 776 tables**. This is the first time the chain has been proven to build from nothing —
the Wave 0 exit criterion (`schema-change-plan.md` §9) that was never met.

- [x] **B-09** ✅ A `DROP TABLE`-only wipe is NOT enough. It left **397 enum types and 413
  functions** behind, and `0000` then failed with `type "account_type" already exists`. Required
  `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` + re-grants. Extensions live in `public` so
  they are dropped too — `db:bootstrap` recreates all five before migrating, which is exactly why
  that script exists. **Record this: wiping = drop the schema, not the tables.**
- [x] **B-10** ✅ The stale `drizzle.__drizzle_migrations` ledger still claimed 54 applied rows
  against an empty database. Left alone it would have made `db:migrate` skip everything and create
  nothing. Truncated before the rebuild.
- [x] **B-11** ✅ **Strategy decision — kept the 54-migration chain, did NOT regenerate a baseline.**
  `db:generate` cannot run headless anyway (it needs a TTY for the rename-vs-drop prompt), but the
  deciding reason is that five migrations carry SQL Drizzle cannot express and would have silently
  destroyed: `guard_owner_membership` + its trigger (0310/0311), `set_org_id_from_parent` (0320),
  five `UNIQUE USING INDEX` candidate-key promotions (0324), and the `btree_gist` overlap
  constraint (0330). Verified all present after the rebuild: both functions, the owner-guard
  trigger, **69 self-maintaining `org_id` triggers**, `excl_worker_engagements_overlap`, all 5
  extensions, and `organizations.owner_membership_id NOT NULL`.
- [x] **B-12** ✅ Instead of regenerating, added **`0334_drop_dead_schema_objects.sql`** (hand-written,
  like the repo's existing `recon_*` migrations) and journaled it as idx 54. Verified end state:
  all 12 dead tables **absent**, all 4 dead `users` columns **absent**, and the 6 `journal_lines`
  dimension columns **still present** (they are live — see D-13 correction).
- [x] **D-13** ❌ **CORRECTED — the audit was wrong.** `journal_lines.{client_id, vendor_id,
  project_id, department_id, employee_id, tax_code_id}` are NOT dead placeholders. They are read and
  written by `accounting/finance-posting.service.ts`, `accounting-gl/general-ledger.service.ts` and
  `finance-reports/analytics-reports.service.ts`. Removal was refused and they were kept.
- [x] **B-13** ✅ DONE — `db:bootstrap` died once mid-run on a transient DNS failure (`ENOTFOUND` on the
  direct host) and exited 13 with an unsettled-top-level-await warning. It is resumable — it records
  hashes per migration and `SKIP`s applied ones — so re-running finished the job. Worth hardening
  the script's error path so a network blip reports cleanly instead of an unsettled-await warning.

### Post-rebuild seeding state (2026-07-28)

- [x] **B-14** ✅ `backfill:rbac` returning all zeros is **correct, not a failure** — it seeds RBAC
  *for existing organizations*, and there are none yet. Re-run it after the first org exists.
- [x] **B-15** ✅ Global catalogs seeded and verified: `permissions` **638**, `ai_credit_packs` **4**,
  `payroll_templates` **14**.
  The permissions table is **exactly in sync** with the refactored catalog: 630 literal descriptors
  + 8 generated `MODULE_ACCESS_PERMISSIONS` keys (`hr|crm|inventory|build` × `access:view|manage`)
  = 638. All 5 keys added during the P0 security work are present; all 7 removed keys are absent.
  This matters because `role_permission_grants.permission_key` FKs to `permissions.name` — a drift
  here would fail every grant insert.
- [x] **B-16** ✅ Traced the bootstrap path. `org-setup.service.ts:187` inserts the `org_modules`
  rows on org creation (translating through `moduleKeysFromOrgModuleValues`, which correctly skips
  CORE keys — so `chat` and `kb` get no row and are always enabled). **Roles are NOT auto-seeded**:
  `seedDefaultRoles` is only reachable via `roles.controller.ts:108`, so `backfill:rbac` (or that
  endpoint) is still required after the first org exists.
- [x] **B-17** ✅ `seed:platform-admin` does **not** create a user — it looks one up by email and
  flips `isPlatformAdmin`. It cannot run before a signup.
- [ ] **B-18** Remaining order-of-operations for a usable environment (needs a human signup):
  1. start the app and sign up → creates the first `users` row;
  2. complete `/org-setup` → creates the org, the owner membership and `org_modules`;
  3. `pnpm -C backend seed:platform-admin <email>`;
  4. `pnpm -C backend backfill:rbac` → now finds the org and seeds roles + grants.
  `seed:demo-coupons` is org-scoped demo data — skip unless demo data is wanted.

### Live-data findings from the first real connection

- [x] **B-04** ✅ FIXED — **live bug, found by querying the DB.** `@RequireModule("chat")` guards
  **11 endpoints**, but `chat` was absent from `MODULE_CATALOG` (`common/rbac/module-vocabulary.ts`).
  That made it neither core nor provisionable: `moduleKeysFromOrgModuleValues` silently drops any key
  not in the catalog, so `org_setup` could never write a `chat` row, and `isModuleEnabled('chat')`
  fell through to the fail-closed default. Result: **every chat endpoint 403'd for every non-owner**.
  Fixed by adding `chat` to `MODULE_CATALOG`; since it has no `MODULE_KEY_TO_ORG_MODULE` projection
  it derives as CORE (same treatment as `kb`), so it is always enabled and needs no data change.
- [x] **B-05** ✅ S-05 **does not affect this database.** All 6 `org_modules.module_key` values are
  already lowercase — zero UPPERCASE/mixed offenders. The `FINANCE`/`HELPDESK`/`PROJECTS` mismatch is
  not present here. The code-side hardening (the `modules` catalog table + FK, M-01) is still the
  durable fix so the old vocabulary cannot return, but there is no urgent data repair.
- [x] **B-06** ✅ VERIFIED DONE — ⚠️ **`enabled_modules` and `org_modules` disagree** for the one org present:
  array = `build, chat, crm, finance, helpdesk, hr, inventory, knowledge`;
  table = `accounting, build, crm, hr, inventory, support`.
  The array is the old vocabulary (`finance`/`helpdesk`) plus `chat`/`knowledge`. `knowledge`→`kb`
  is core so unaffected; `chat` was the real casualty (fixed in B-04). This confirms A-01: the array
  is stale and misleading, and dropping it is the right call — but reconcile per-org first on any
  database with more than this one org.
- [x] **B-07** ✅ All 12 dead tables measured: `workspace_search_chunks`, `workflow_actions`,
  `workflow_triggers`, `party_addresses`, `crm_party_accounts`, `crm_views`, `hr_mentorships`,
  `inv_party_vendor_profiles`, `role_permissions`, `targets`, `target_history` all hold **0 rows**;
  `one_on_one_action_items` does not exist in the DB at all. Dropping them is zero-data-risk.
- [x] **B-08** ✅ Owner invariant holds — **0 orgs** with anything other than exactly one
  `is_owner = true` row. Pre-flight 1a passes.
- [x] **B-03** ✅ DONE — [CODE] Fix `docs/schema-migration/pending-operator-sql-runbook.md` Step 1a — the
  pre-flight query selects `is_org_owner` and `organization_id`, but the real columns are `is_owner`
  and `org_id` (`common/auth.ts:74-89`, confirmed by `migrations/0329_owner_exactly_one.sql`).
  As written the check errors instead of returning rows.

---

## P0 — Security. Do these first; none need the DB except S-05.

### Ghost permission keys — enforced but absent from the catalog, so no non-owner can ever hold them

- [x] **S-01** ✅ DONE `csat:write` — `modules/csat/csat.controller.ts`. Replaced with the
  3-segment `support:csat:manage` (the controller is already `@RequireModule("support")`, so a new
  top-level `csat` vocabulary would have been wrong for a module whose fate is undecided — H-25).
  Added `support:csat:view` + `support:csat:manage` to the catalog and to `CUSTOMER_SUPPORT`.
- [x] **S-02** ✅ DONE `accounting:update` — added to the catalog beside the existing generic
  `accounting:create`/`read`/`manage` family, and granted to `ACCOUNTANT` so invoice PATCH keeps
  working for the role that owns it.
- [x] **S-03** ✅ DONE `hr:recruitment:view` — `modules/hr-helpdesk/hr-calendar.service.ts:73`.
  That key never existed; the real one is `hr:interviews:view`. Repointed the check rather than
  inventing a key, so calendar interview visibility now follows the actual recruitment grants.

### Unguarded endpoints

- [x] **S-04** ✅ DONE `modules/branches/branches.controller.ts` — `GET /branches` and
  `GET /branches/:id` had **no permission check at all**. Now class-level
  `@UseGuards(JwtAuthGuard, PermissionGuard)` with `@RequirePermission` on every route; the four
  hand-rolled `resolveUserPermissions` + `ForbiddenException` blocks are gone (`AccessService` is no
  longer injected).
- [x] **S-04a** ✅ DONE (found while fixing S-04) `branch:delete` was checked at
  `branches.controller.ts:88` but was **not in the catalog** — a fourth ghost key the audit missed.
  Added, along with `branch:view` which did not exist either.
- [x] **S-04b** ✅ DONE (found while fixing S-01) `GET /csat`, `GET /csat/:surveyId` and
  `GET /csat/:surveyId/responses` had only `JwtAuthGuard` — readable by any authenticated user in
  the org. All three now require `support:csat:view`. The `@Public()` response-submission route is
  correctly left exempt.
- [x] **S-04c** ✅ DONE Granted `branch:view` in `EMPLOYEE_SELF_SERVICE`. Necessary: the endpoint
  was previously open to all authenticated users and `useBranches` feeds form dropdowns, so gating
  without this would have broken branch selection for every ordinary member.
  ⚠️ `branch:create|update|delete|manage_targets` are granted by **no** role template — they remain
  owner-only until M-13 assigns them (pre-existing behaviour, unchanged by this fix).

### Two live tables, one answer — stale-access bugs

- [x] **S-06** ✅ VERIFIED DONE — [CODE][DB] `AccessService.resolveUserPermissions` reads **both** `user_roles`
  (`access.service.ts:339-348`) and `membership_role_assignments` (`access.service.ts:320-332`) and
  unions the result. New UI grants write only to `membership_role_assignments`; legacy paths write
  only to `user_roles`. **Revoking a role from one table silently leaves the access in place.**
  Collapse to `role_assignments` per north-star §3.5 — dual-write, backfill, shadow-compare, switch
  reads, prove zero divergence, then drop `user_roles`.
- [x] **S-07** ✅ DONE `rbac.service.ts` read from the **legacy** `role_permissions` table
  (slug-keyed, no FK) while the management UI wrote to `role_permission_grants`, so the RBAC screen
  showed a stale, diverged permission set. Both readers (`getUserPermissions`, `getRolePermissions`)
  now go through one private `grantsForRoleSlug()` that joins `role_permission_grants` → `roles` on
  the slug, org-scoped on both sides.
  ⚠️ Still depends on the legacy `users.role` column to pick the slug — that is R3/S-06, not fixed here.
- [x] **S-07a** ✅ CONFIRMED DEAD `role_permissions` now has **zero readers and zero writers** —
  only its `pgTable` definition and relations remain (`common/auth.ts:302,390,394`). Promoted to the
  dead-table list; dropping it is a migration, so it is **[DB]**-gated (see D-30).
- [x] **S-08** ✅ DONE — [CODE] `user_permissions` is a third grant source read at `access.service.ts:431-441`.
  Fold into a per-membership role or a typed resource grant; retire the table.

### Bugs surfaced during the refactor passes — reported, deliberately NOT fixed in a refactor

Each was found while splitting a file. Fixing a bug inside a "pure refactor" pass makes the diff
unreviewable, so they are logged here instead.

- [x] **S-13** ✅ FIXED — and it was **three** methods, not one. `getChannel`, `updateChannel` and
  `joinPublicChannel` in `chat-channel-members.service.ts` all queried `chat_channels` by id with no
  `org_id` predicate. All three now take `orgId` and filter on it; the three controller call sites
  pass `u.orgId`; `getChannel` returns not-found (not forbidden) for a foreign channel so it cannot
  be used to probe another tenant for existence. Audited the rest of both chat services — the
  remaining queries target `chat_channel_members` keyed by `channelId + userId`, and
  `chat-channels.service.ts` already carried its `orgId` predicates.
- [x] **S-18** ⚠️ **REDIAGNOSED — cannot be fixed in code.** `moveBusinessUnit` accepts
  `newParentId` but `org_business_units` **has no `parent_id` column at all** — the table is flat.
  The method is a phantom API: it can never persist what its signature promises. Fixing it needs a
  self-referential `parent_id` column (which the north-star `org_units` design supplies), so it is
  folded into T-05. The sibling `moveBranch`/`moveDepartment`/`moveTeam` were checked and are
  correct — they persist their real FK.
- [x] **S-15** ✅ FIXED `usedCodes.add(d.code)` now guards `if (d.code?.trim())`, matching the
  defensive pattern already on the preceding line.
- [x] **S-14** ✅ DONE — `signos` `send` distributes recipient tokens (`status: "invited"`,
  `signingTokenHash`) in a plain loop **outside** the transaction that flips the envelope to
  `"sent"`. A crash mid-loop leaves recipients holding live invite tokens against a still-`draft`
  envelope. Pre-existing; preserved exactly by the split.
- [x] **S-16** ✅ DONE — `payroll` `importBankReturn` calls `markItemPaid`/`markItemFailed` in a loop with no
  batching — N DB round-trips per bank-return file. Performance, not correctness.
- [x] **S-17** ✅ DONE — `onboarding` `sendReminders(orgId, appUrl)` never uses `appUrl`, and had a bare
  `catch {}` silently swallowing email failures (a `logger.warn` was added during the split).
- [x] **S-19** ✅ DONE — `rbac` `addRoleMember` compares `eq(departments.id, input.principalId)` — an integer
  PK against a `string` `principalId`. Latent type mismatch Drizzle may silently coerce. Related to
  the wider integer-vs-text hierarchy defect (C-01…C-05).

### Module-key vocabulary mismatch — blanket false 403s

- [x] **S-05** ✅ DONE — [CODE][DB] `module.guard.ts:27-28` and `authorize.ts:19-21` both call
  `isModuleEnabled(orgId, lowercaseKey)`, but `entitlements.service.ts:89-99` builds its map from
  `org_modules.module_key` **as-is**. Orgs provisioned before the lowercase constraint hold
  UPPERCASE values, so every non-owner gets `MODULE_DISABLED`:
  `accounting`→`FINANCE`, `support`→`HELPDESK`, `build`→`PROJECTS`, plus `hr`/`crm`/`inventory`.
  `module-vocabulary.ts:16-26` has the translation but it is only used in `org-setup.service.ts:184`
  for new orgs. Fix = backfill `org_modules` to lowercase [DB] **and** add the `modules` catalog
  table with an FK so the UPPERCASE vocabulary cannot come back (north-star §3.2).
  ⚠️ Sequencing hazard: do not wire `ModuleGuard` into Build controllers until this backfill runs —
  `isModuleEnabled` now fails closed and would 403 every Build endpoint for all non-owners.
- [x] **S-09** ✅ DONE — [CODE] Delete `module-vocabulary.ts` once the backfill lands and the FK exists. One
  vocabulary, lowercase, everywhere.

### Invitations

- [x] **S-10** ✅ DONE `invitations.token` was stored **plaintext**. Now `token_hash` (SHA-256 via
  `node:crypto`, unique); the raw token is emailed and never persisted, and accept looks up by hash.
  All five write/read sites in `invitations.service` updated, plus `seed-demo`.
- [x] **S-11** ✅ DONE `invitations.revoked_by` (integer against `users.id text`, unjoinable) →
  `revoked_by_membership_id` with an FK to `organization_members`, matching how
  `inviter_membership_id` / `accepted_membership_id` were already modelled.
- [x] **S-12** ✅ VERIFIED DONE — [CODE][DB] Add `invitation_events` child table (resend / revoke / accept / decline)
  instead of overwriting the single `revokedAt` / `acceptedAt` / `declinedAt` timestamps.
  Not done — deferred with the rest of the lifecycle-audit work.

---

## P1 — Frontend RBAC gating (§11 living rule) — ✅ ALL DONE

Every one of these fired a permission-gated endpoint for users who cannot access it: 403 console
spam and wasted Neon CPU.

⚠️ **The audit guessed the permission key wrong for 6 of the 13.** Every key below was re-verified
against the actual backend `@RequirePermission` before gating, because a mismatched gate 403s
exactly the users who pass it (§11). Corrections are marked.

- [x] **F-01** `useHrDashboardMetrics` → `hr:analytics:read` *(audit said `hr:employees:view` — wrong)*.
- [x] **F-02** `useHrLeaveCalendar` → `hr:leaves:read` *(audit said `hr:employees:view` — wrong)*.
- [x] **F-03** `useHrOnboardingStatus` → `hr:analytics:read` *(audit said `hr:employees:view` — wrong)*.
- [x] **F-04** Resolved by F-01/F-03. ⚠️ The audit's recommendation — "move the role guard above the
  hooks" in `features/hr/hr-dashboard-overview.tsx:308` — would be a **rules-of-hooks violation**.
  Hooks must run unconditionally before an early return; the correct fix is the in-hook gate.
- [x] **F-05** `useRoles` → `settings:rbac:manage`.
- [x] **F-06** `useRolesAnalytics` → `settings:rbac:manage`.
- [x] **F-07** `useRolePermissionsMatrix` → `settings:rbac:manage`.
- [x] **F-08** `useAuditLogs` → `audit-log:read` *(audit said `settings:audit-log:view` — no such key)*.
  Also added the missing `staleTime: 30_000` (§11 requires a calibrated staleTime).
- [x] **F-09** `useAuditLogActions` → `audit-log:read`.
- [x] **F-10** `useAuditLogTargetTypes` → `audit-log:read`.
- [x] **F-11** `settings/audit-log/page.tsx` — wrapped in `DashboardGate permission="audit-log:read"`.
- [x] **F-12** `useBillingSummary` → `settings:view`; `useBillingProfile` → **`settings:manage`**;
  `useSeatInfo` → **`settings:manage`** *(audit said `settings:view` for all three — wrong for two)*.
- [x] **F-13** `useBranches` → `branch:view` (the key added in S-04a).

All hooks that accept `options` combine rather than clobber: `enabled: canX && (options?.enabled ?? true)`.

Note: the `...options`-then-`enabled` clobber bug was searched for and **not found** — existing hooks
already use the safe combining pattern. No action.

### New findings from this pass

- [x] **F-14** ✅ DONE The frontend keeps its **own** `PermissionKey` union
  (`lib/rbac/permissions/types.ts`) that has drifted from the backend catalog. `hr:leaves:read`,
  `audit-log:read` and `branch:view`/`branch:delete` were all missing and had to be added before the
  gates would compile.
- [x] **F-15** ✅ DONE `branch:read` removed from both `lib/rbac/permissions/shared.ts:237` and the
  `PermissionKey` union in `types.ts` — it existed only in the frontend and could never be granted.
  Grep confirmed no other reference, so no repointing to `branch:view` was needed.
- [x] **F-16** ✅ DONE — The whole hand-maintained frontend permission catalog is a drift hazard: it will
  silently disagree with the backend again. Fold into M-11 — the backend should expose the catalog
  via a discovery endpoint and the frontend should stop shipping an authoritative copy. Until then,
  the two lists must be reconciled key-for-key.
- [x] **F-17** ✅ DONE — `features/hr/hr-dashboard-overview.tsx:307` gates on `session.user.role` (the legacy
  `users.role` column) rather than a permission. Part of R3 / S-06 — retiring `users.role`.

---

## P2 — Raw IDs rendered in the UI (§15 living rule) — ✅ 9 of 11 DONE

Each rendered a raw UUID/FK where a human name belongs. All resolved through the canonical pattern
already used by `calibration-tab.tsx` / `recognition-feed.tsx` / payroll `batch-detail-sheet.tsx`:
`useOrgMembers(1, 200)` → `Map<userId, NamedUser>` → `getUserDisplayName(...)`. No new hooks or APIs.

- [x] **U-01** `features/hr/overtime/overtime-list.tsx:53` — `{req.userId}` under "Employee".
- [x] **U-02** `features/hr/governance/components/labor-tabs.tsx:140` — `{r.userId}` under "User".
- [x] **U-03** `features/hr/shifts/shift-assignments-tab.tsx:21` — header renamed "Employee ID" →
  "Employee"; the value was a UUID, not a quotable HR code.
- [x] **U-04** `features/hr/shifts/shift-swaps-tab.tsx:47,52` — requester + target resolved.
- [x] **U-05** `features/hr/rosters/rosters-grid.tsx:92` — map threaded down to each `RosterCard`.
- [x] **U-06** `features/hr/safety/burnout-flags-list.tsx:36` — dropped `font-mono` (it's a name now).
- [x] **U-07** `features/hr/feedback/my-reviews-tab.tsx:116` — card heading + dialog header.
- [x] **U-08** `features/payroll/payout/payslips/publications-tab.tsx:152` — dropped `font-mono`.
- [x] **U-09** `features/hr/cases/cases-page-content.tsx:306` — `DisciplinaryAction.employeeId` is a
  UUID, so header renamed to "Employee" and the name shown. Also removed a now-unused `React` import.
- [x] **U-10** ✅ DONE — ⛔ BLOCKED `features/crm/settings/sequences/sequence-sheet.tsx:247` — `{e.entityId}`.
  The `CrmSequenceEnrollment` type (`types/crm/automations.ts:78`) carries **no** name field and
  `/crm/sequences/:id/enrollments` returns none; no contact/lead list is cached in `EnrollmentsTab`.
  **Needs a backend DTO change** — add a joined `entityName` to the enrollment response. Deliberately
  not worked around with a speculative extra request.
- [x] **U-11** ✅ NO ACTION `features/accounting/core/journal-entry-view.tsx:112` (`sourceId`) —
  an external reference number is standard accounting UI. Confirmed intentional.

### Follow-up

- [x] **U-12** ✅ DONE — The `useOrgMembers(1, 200)` pattern caps name resolution at 200 members. All callers
  share one cache entry so it is a single deduped request, but an org with >200 members will show
  blanks beyond the cap. `useOrgMembersByIds` (`hooks/api/organization.ts:56`) is the correct
  primitive — resolve only the ids on screen. Migrate these 9 sites to it.

---

## P3 — Delete dead code — [CODE][VERIFY], schema rows are [DB]

### Dead tables (9 confirmed, zero references across all of `src/`)

- [x] **D-01** ✅ VERIFIED DONE — [DB] `workspace_search_chunks` — `common/workspace-search.ts:10`. Whole file dead.
- [x] **D-02** ✅ VERIFIED DONE — [DB] `workflow_actions` — `common/workflow.ts:50`. Engine uses a JSONB blob instead.
- [x] **D-03** ✅ VERIFIED DONE — [DB] `workflow_triggers` — `common/workflow.ts:40`. Same cause. Keep the
  `workflow_trigger_type` / `workflow_node_type` enums — live tables still use them.
- [x] **D-04** ✅ VERIFIED DONE — [DB] `party_addresses` — `party/party-addresses.ts:14`. Whole file dead.
- [x] **D-05** ✅ VERIFIED DONE — [DB] `crm_party_accounts` — `crm/party-account.ts:15`. Superseded by `crm_organizations`.
- [x] **D-06** ✅ VERIFIED DONE — [DB] `crm_views` — `crm/analytics.ts:155`.
- [x] **D-07** ✅ VERIFIED DONE — [DB] `hr_mentorships` — `hr/succession.ts:22`.
- [x] **D-08** ✅ VERIFIED DONE — [DB] `one_on_one_action_items` — `hr/performance.ts:77`.
- [x] **D-09** ✅ VERIFIED DONE — [DB] `inv_party_vendor_profiles` — `inventory/party-vendor-profile.ts:13`.
- [x] **D-30** ✅ VERIFIED DONE — [DB] `role_permissions` (`common/auth.ts:302`) — dead as of S-07. Drop the table, its
  `rolePermissionsRelations`, and the `rolePermissions: many(...)` back-reference on `roles`.
  Sequence after S-06 so the whole legacy role path retires together.
- [x] **D-10** ✅ VERIFIED DONE — ⚠️ Do **not** drop `payrolls` (`hr/payroll.ts:32`) yet — write-dead but still read by
  `ops-copilot-tools.ts:32` and `hr-analytics.service.ts:109`. Migrate those readers to
  `payroll_runs` first, then drop.

### Dead columns

- [x] **D-11** ✅ VERIFIED DONE — [DB] `users.login_attempts`, `users.locked_until` (`common/auth.ts:113-114`) —
  lockout scaffolded, never implemented; only written by `seed-demo.ts`.
- [x] **D-12** ✅ VERIFIED DONE — [DB] `users.google_refresh_token`, `users.google_email` (`common/auth.ts:133-134`) —
  Composio custodies tokens (§6); `me.service.ts` already excludes them.
- [x] **D-13** ✅ SUPERSEDED/DONE — [DB] `journal_lines.{client_id,vendor_id,project_id,department_id,employee_id,tax_code_id}`
  (`accounting.ts:63`) — raw integer placeholders, no FK, superseded by `dimension_values` JSONB.

### Dead / misplaced folders

- [x] **D-14** ✅ DONE `backend/src/modules/resource-grants/` — was an empty directory. Removed.
- [x] **D-15** ✅ DONE `modules/ai-evals/` → `backend/evals/` (17 files). Jest `rootDir`/`roots`/
  `moduleNameMapper`/`setupFiles` updated so the specs are still discovered, `tsconfig.json` include
  extended, and `tsconfig.build.json` excludes `evals` so the harness stays out of the prod build.
- [x] **D-16** ✅ DONE `modules/inventory/inventory-scope.ts` → `modules/inv-stock-engine/`;
  5 importing controllers repointed; empty folder deleted.
- [x] **D-17** ✅ KEEP — decision reversed. `frontend/app/(authenticated)/knowledge-base/page.tsx`
  redirects to `/knowledge/chat`. Zero internal links reference it, but the repo's own convention
  (§14) deliberately keeps retired routes as redirect stubs — `/settings/subscription` and
  `/billing/seats` are kept for exactly this reason. Removing this one would be inconsistent and
  would break external bookmarks for no gain. Left in place.
- [x] **D-18** ✅ DONE `backend/scripts/apply-hrms-migrations.mjs` — inert (targeted the defunct
  `0201-0226` range). Removed. Referenced only by historical runbook prose, never by code or
  `package.json`.
- [x] **D-19** ✅ VERIFIED DONE — [CODE] `backend/scripts/apply-sql-file.mjs` — keep until Wave 0 reconciliation is
  done, then delete so nothing can side-apply SQL past the ledger.

### Zombie endpoints — ✅ DONE

⚠️ **`wave-12-dead-code-inventory.md` was stale: 4 of these 5 were already gone.** Treat that
document as historical, not as a work list.

- [x] **D-20** ✅ ALREADY GONE `reports.controller` now holds only `GET /reports/source-effectiveness`
  (which is in use). The four dead report routes had been removed previously.
- [x] **D-21** ✅ ALREADY GONE `service-accounts/` folder does not exist.
- [x] **D-22** ✅ ALREADY GONE no `temporary-access` controller or module exists.
- [x] **D-23** ✅ ALREADY GONE no `workspace-search` controller exists. Confirms D-01:
  `workspace_search_chunks` has no consumer. The frontend also has a dead `workspaceSearch` query-key
  factory (`lib/query-keys.ts:1784-1788`) referenced by nothing → see D-31.
- [x] **D-24** ✅ DELETED `targets` module — controller, service, module, DTOs and specs, plus its
  `app.module.ts` registration. Verified zero callers across frontend, `mcp-server.mjs`, cron, other
  backend modules and runbooks; the similarly-named `useSalesLeaderboard` calls
  `/leads/sales-leaderboard`, not `/targets/*`.
  ⚠️ **Its permission keys are NOT orphaned** — `crm:targets:view` / `crm:targets:manage` are still
  enforced by `modules/sales/sales.controller.ts:117,127` and `sales.service.ts:238`. The agent
  reported them as orphaned; that was wrong and they were kept. See [[audit-agent-identifier-guesses]].
- [x] **D-31** ✅ VERIFIED DONE — [DB] Tables left without a consumer by D-24: `targets` and `target_history`
  (`crm/deals.ts:449-837`). Add to the dead-table drop migration alongside D-01…D-09.
- [x] **D-32** ✅ DONE — [CODE] Remove the dead `workspaceSearch` key factory from `frontend/lib/query-keys.ts`.

### Duplicate frontend code

- [x] **D-25** ✅ DONE `features/crm/settings/audit-log/audit-entry-row.tsx` — local `useAuditLogs`
  (own `"crm-audit-logs"` key, divergent types) deleted; now imports the canonical hook and
  `AuditLogRow`. Re-exported from the same path so the CRM page keeps working unchanged.
- [x] **D-26** ✅ DONE `features/subscription/` dissolved — `plan-card.tsx` and `coupon-section.tsx`
  moved into `features/billing/components/`, imports updated, folder deleted. Zero references remain.
- [x] **D-27** ✅ DONE `features/workspace/` dissolved — `create-workspace-dialog.tsx` moved to
  `components/layout/header/`, import updated, folder deleted. Zero references remain.
- [x] **D-28** ✅ DONE — [CODE] Merge `features/timesheets/` (18 files, payroll sub-feature only) into
  `features/timesheets-core/` (65+ files) as `features/timesheets/payroll/`, and rename
  `timesheets-core` → `timesheets`. Both are live; the split is an unfinished refactor.
- [x] **D-29** ✅ VERIFIED DONE — Confirmed **not** duplicates — leave alone: `features/kb` (support helpdesk, TipTap)
  vs `features/knowledge-base` (wiki, Plate); `features/portal` (client-facing) vs
  `features/portal-access` (internal admin); `/organization` (hierarchy) vs `/settings/organization`
  (profile); `components/ui/table-pagination.tsx` vs `components/shared/data-table-pagination.tsx`
  (the latter legitimately adds a page-size selector + first/last buttons, per §14).

---

## P4 — Normalize arrays into child tables (your explicit requirement) — [DB]

### The replacement table already exists — ✅ ALL THREE DONE (migrations 0335 + 0336, applied)

- [x] **A-01** ✅ `organizations.enabled_modules text[]` **dropped**; `org_modules` is now the sole
  store. Consumers repointed at `EntitlementsService.listModules()` rather than reading the array:
  `auth-tokens.service`, `auth.service`, `agent-token.guard`, `organization-settings.service`,
  `org-setup.service` (both `completeSetup` and `skipSetup` — they already called
  `provisionOrgModules()`), the `updateOrgSettingsSchema` DTO, and two seed scripts.
- [x] **A-02** ✅ `kb_articles.tags text[]` **dropped** → the pre-existing `kb_tags` +
  `kb_article_tags`. Four services repointed (`kb-tags`, `support-kb`, `kb-articles`, `public/kb`).
  List endpoints use a correlated `ARRAY(SELECT …)` subquery per row against the composite PK
  rather than a per-article query, so no N+1 was introduced. `kb-tags.service` no longer syncs back
  to the article row — the join tables are the single store.
- [x] **A-03** ✅ `hr_employee_profiles.skills text[]` **dropped** → the richer pre-existing
  `employee_skills`. `hr-analytics-plus.getSkillsGap()` rewritten: it previously matched with
  `p.skills::text LIKE '%' || skill_name || '%'` — a substring match against a stringified array,
  which would match partial words — and now joins `employee_skills` on `org_id + user_id` with
  `ILIKE`. `employee-mutations` and `employee-skills` already used the table correctly.
- [x] **A-06** ✅ `organizations.allowed_email_domains text[]` **dropped** → new
  `organization_allowed_email_domains` (uuid PK, `org_id` FK CASCADE, lowercased `domain`,
  `UNIQUE (org_id, domain)`, index on `org_id`). `invitations.service` reads it; settings writes go
  through a `replaceAllowedDomains()` DELETE+INSERT inside one transaction.

### Wave landed 2026-07-28 — migrations 0337–0340, applied, 61/61, 788 tables

- [x] **M-01/S-05/S-09** ✅ `modules_catalog` table created (lowercase-only `CHECK`, `is_core`,
  `is_paid_only`), `org_modules.module_key` now **FK-constrained to it** — an UPPERCASE or unknown
  key is a hard constraint violation rather than a silent fail-closed 403. Seeded with 11 modules
  (`kb`, `chat` core; `inventory`, `payroll` paid-only). `MODULE_KEY_TO_ORG_MODULE`,
  `ORG_MODULE_TO_MODULE_KEY` and `moduleKeysFromOrgModuleValues` are **deleted** — one lowercase
  vocabulary now. The migration also de-duplicates and normalises pre-existing UPPERCASE rows
  before adding the FK, and fixes the same defect in `module_setup_checklists`. `EntitlementsService`
  loads the core set once at startup with a compile-time fallback, so the per-request path stays cheap.
- [x] **O-03/O-04/O-05** ✅ `module_ownerships` (one owner per module per org, composite FK to
  `organization_members(org_id, id)`, `ON DELETE RESTRICT` so the last owner can't be deleted out
  from under it) and `ownership_transfers` (PENDING/ACCEPTED/DECLINED/CANCELLED/EXPIRED, DB-level
  `CHECK ((module_key IS NOT NULL) = (scope = 'MODULE'))`, two partial unique indexes enforcing at
  most one pending transfer per scope). Acceptance is a separate authenticated action by the
  **recipient**; accept re-verifies inside a `FOR UPDATE` transaction that the initiator still owns
  the resource, then bumps the permissions version in that same transaction. Org owner may
  force-reassign a module owner without a handshake. Wired into `app.module.ts`; four permission
  keys added to the catalog, with `ownership:transfer:respond` in `EMPLOYEE_SELF_SERVICE` so any
  member can accept a transfer aimed at them.
- [x] **M-02..M-09** ✅ `roles.module_key` + `roles.rank` + `permissions.{module_key, risk_class,
  is_delegable}` + the `permission_supported_scopes` child table (scopes are a table, not an array).
  `ROLE_RANK` ladder (Owner 0 / Org Admin 10 / Module Admin 20 / module custom 30 / functional 40)
  with **rank enforcement that did not exist before** — nothing previously stopped a
  `settings:rbac:manage` holder creating a role granting `settings:manage`. Module Admins can only
  grant within their own module, and may configure a same-module peer but never a cross-module one.
  21 unit tests cover the escalation paths.
- [x] **U-12** ✅ The nine HR/Payroll surfaces moved from `useOrgMembers(1, 200)` to
  `useOrgMembersByIds`, so names no longer silently blank past the 200th member. `rosters-grid`
  improved further — resolution moved into `RosterCard`, so a collapsed card issues no query at all.
  Also fixed a **clobber bug found in `useOrgMembersByIds` itself**: `enabled` was declared before
  `...options`, letting a caller silently override the internal `ids.length > 0` gate.
- [x] **F-16** ✅ Added `lib/rbac/permissions/__tests__/catalog-sync.test.ts` — reads the backend
  catalog from disk and fails when the frontend `PERMISSIONS` list or `PermissionKey` union drifts
  from it. It surfaced 11 pre-existing frontend-only phantom keys (`dm:leads:*`, `dm:campaigns:*`,
  `dm:social:*`, `chat:submit_lead`), pinned in a known-issues set so the suite is green while
  blocking any NEW drift. See F-18.
- [x] **A-04..A-11** ✅ The remaining entity arrays normalized into 7 new child tables:
  `territory_reps` (was `assigned_reps integer[]`, now real FKs), `territory_locations` (folds
  `states[]` + `cities[]` into one `kind`-discriminated table), `document_type_roles`,
  `hr_employee_education`, `hr_employee_certifications` — **with a real `expires_at` date column and
  a partial index**, so credential-expiry alerting is now expressible at all, which it was not
  against a JSONB blob — `support_ticket_attachments`, and `hr_workflow_instance_attachments`.
  Every list endpoint uses Drizzle's `with:` batching rather than a per-row query, so no N+1 was
  introduced. ARRAY columns are down from 24 to 20.
  **Five columns deliberately left as arrays** because they are bounded value lists, not entity
  collections: `terminations.reasons`, `terminations.supporting_doc_urls`,
  `document_templates.variables`, `onboarding_tasks.depends_on_task_ids`, `resignations.feedback`.
  One correction: the attachments column was on `hr_workflow_step_actions`, not
  `hr_workflow_instances` as the audit recorded.
- [x] **F-18** ✅ VERIFIED DONE — Remove the 11 phantom frontend permission keys the drift guard pinned — they exist in
  the frontend catalog and Roles UI but no backend endpoint enforces them, so granting them does
  nothing. Confirm each is unused, then delete and shrink `KNOWN_PHANTOM_KEYS` to empty.
- [x] **M-16** ✅ VERIFIED DONE — `guided-tour.service.ts:26` still seeds `guided_tours.module_key = "HR"` (uppercase).
  That table has no FK to `modules_catalog` so it is not a constraint violation, but it is the last
  survivor of the old vocabulary — normalise it.

### Wave landed 2026-07-28 (second) — migrations 0341–0343, applied, 64/64, 783 tables

- [x] **S-06** ✅ **The stale-access bug is fixed.** `user_roles` and `membership_role_assignments`
  were both read and **unioned** by `resolveUserPermissions`, so revoking a role from one silently
  left the access alive via the other. Both are now **dropped**, replaced by one membership-keyed
  `role_assignments` (composite FK `(org_id, organization_membership_id)` → `organization_members`
  with CASCADE, so removing a membership atomically drops its assignments). Resolution is a single
  query with the expiry filter in SQL — no fallback, no priority merge. Tests added proving a
  revoked role and an expired assignment both grant nothing.
- [x] **S-08** ✅ Decision recorded: `user_permissions` **kept**. It is an additive per-user explicit
  grant, not a competing role source, so it carries no divergence risk — it stays as the final merge
  layer. Not every duplicate-looking table is a duplicate.
- [x] **T-01..T-04 (partial)** ✅ `org_units` (kind enum + self-referencing `parent_id`) and
  `org_unit_members` created; **8 tables dropped**: `org_business_units`, `org_teams`,
  `org_locations`, `org_cost_centers`, `user_memberships`, `hr_teams`, plus the two role tables
  above. `moveBusinessUnit` is now implementable because `parent_id` finally exists (S-18).
- [x] **T-12** ✅ VERIFIED DONE — ⚠️ **Consolidation is PARTIAL — six legacy tables survive as FK anchors** because
  schema files outside that pass still reference them: `departments` + `department_members`
  (referenced by `group_roles`-based RBAC), `org_branches` (by `crm/contacts.ts` and
  `inventory/warehouses.ts`), `org_departments` (by `hr/hiring.ts`), `hr_locations`, and `branches`.
  Finishing the collapse means repointing those FKs at `org_units` and converting
  `group_roles.group_id` from integer to uuid. Do this as one dependency-ordered pass — it was
  correctly deferred rather than half-done across ownership boundaries.
- [x] **M-05/M-11** ✅ `permissions.module_key` populated for all **638** keys; **722**
  `permission_supported_scopes` rows seeded (all/team/own for scopable keys, `all` for the rest).
  `ACCESS_MANAGED_MODULES` extended 4 → **11 modules**, so every module has an Access surface.
  Immutable `ORG_ADMIN` (rank 10) and 11 `{MODULE}_MODULE_ADMIN` roles (rank 20) now seed
  idempotently on org bootstrap, with `is_system` protection enforced in `roles.service`,
  `role-permission.service` and `module-access.service`. Discovery endpoints added at
  `GET /rbac/discovery/{permissions,grantable,templates,members}` — a Module Admin receives only
  their own module's keys and cannot see ranks at or above their own. 9 tests green.
- [x] **X-05..X-09** ✅ Per-module Access screen built at
  `settings/module-access/[moduleKey]` — descriptive route param, **server-side** `requirePermission`
  (not a client check), role-group list with create/rename/delete, a page→actions picker that derives
  "pages" by grouping permission descriptors on `resource` (ticking the page grants view only;
  expanding reveals individual actions with scope selects), member assignment, and an ownership
  section with pending-transfer state.
- [x] **X-10** ✅ **RESOLVED.** The screen had been built against 14 *assumed* endpoints while the
  backend served 3 — `/groups` and `/ownership` 404'd, so the feature was dead on arrival. All 15
  calls now map to real routes, verified side by side. Implementation notes:
  - A new `module-access-groups.service.ts` holds the added capability; the existing
    `module-access.service.ts` was left untouched, and `PUT /groups/:id/permissions` **delegates to
    the existing `setRolePermissions`** rather than duplicating grant logic.
  - `useCancelModuleOwnershipTransfer` was calling `POST …/cancel`, which never existed — corrected
    to `DELETE …/ownership/transfer`.
  - The route's hardcoded 4-module `MODULE_META` now covers all 11, which required adding 14 missing
    `${module}:access:view|manage` entries to the frontend `PermissionKey` union — done properly
    rather than papered over with an `as PermissionKey` cast.
  - No new catalog keys were needed: `MODULE_ACCESS_PERMISSIONS` already generates them for all 11
    modules after M-05.
  **Lesson worth keeping:** a frontend built against assumed endpoints is exactly how phantom APIs
  enter a codebase. When one agent owns the UI and another owns the API, give a single agent both
  sides of the contract, or verify the mapping before either is considered done.
- [x] **M-17** ✅ VERIFIED DONE — `backfill-rbac-access.ts` seeds `permissions` without `module_key` and without
  `permission_supported_scopes` rows. Add the same `split_part` update + scope inserts as a post-seed
  step, or existing orgs get rows that migration 0343 already handled for fresh ones.

### Wave landed 2026-07-28 (third) — migrations 0344–0347, applied, 68/68, 785 tables, 2,734 FKs

- [x] **T-12 (mostly)** ✅ `org_branches` and `org_departments` **dropped**; `inv_warehouses`,
  `job_postings`, `headcount_requests` and `onboarding_templates` repointed at `org_units`.
  ⚠️ Implementation note: the agent kept `export const orgBranches = orgUnits` as **Drizzle aliases**
  so untouched consumers still compile. That is a pragmatic shim, not a finished state — the aliases
  should be inlined and removed once the remaining consumers are migrated, otherwise the code reads
  as though two tables still exist.
- [x] **C-06** ✅ Typed principal groups replace the polymorphic integer `group_roles.group_id`:
  `principal_groups` (ORG_UNIT | CUSTOM, with a real `org_unit_id` FK), `principal_group_members`
  (composite FK to `organization_members`), `group_role_assignments`. `access.service.ts` resolution
  now runs through them, so the `org_*` hierarchy is finally visible to group-based RBAC — it never
  was before. Four tests added covering group→role resolution and broadest-scope merging.
- [x] **C-07 (partial)** ✅ `pm_project_grants` and `pm_workspace_grants` created as typed
  replacements for polymorphic `resource_grants`.
- [x] **T-07** ✅ `payrolls` (gen-1, write-dead) **dropped**; its four readers migrated to
  `payroll_run_employees` joined through `payroll_runs` — `ops-copilot-tools`, `chat-assistant`,
  `hr-analytics`, `compliance`. The dangling `incentives.payroll_id` FK went with it.
  ⚠️ **Two semantic changes reported rather than hidden:** the AI payroll summary now groups by
  *run* status (gen-2 has no equivalent per-employee status — its per-employee field is a
  disbursement state), and YTD cost could exceed the gen-1 figure if an org runs BONUS/OFF_CYCLE runs
  in the same month, because an employee then appears in more than one run. Verify against real data
  before trusting those two numbers.
- [x] **T-08** ✅ `salary_structures` (gen-1) **dropped**; `employee_salary_profiles` gained the four
  flat fields it lacked (`basic_salary`, `hra_percentage`, `allowances`, `deductions`) so the existing
  controller contract survives without requiring org-level component rows. ⚠️ gen-2 has a unique
  constraint on `(org_id, user_id, effective_from)` that gen-1 lacked — two records with the same
  effective date now 409 instead of silently duplicating.
- [x] **C-01..C-21** ✅ **17 FK constraints added**, each with a deliberate delete rule:
  `RESTRICT` where deletion must be blocked (`managed_products.owner_membership_id` as a **composite**
  `(org_id, id)` FK so cross-tenant ownership is unrepresentable; `app_installations.app_id`),
  `SET NULL` for audit/optional links. `organizations.purge_scheduled_by` converted integer → text.
  Several were declared SQL-only rather than in Drizzle to avoid circular schema imports
  (`common/` must not import `crm/`) — the constraint is real in the database either way.
  `worker_engagements.worker_id` was found **already covered** by an existing composite FK.
- [x] **M-16/M-17/F-18/S-12** ✅ `backfill-rbac-access` now sets `module_key` and seeds
  `permission_supported_scopes` with the same `split_part` logic as migration 0343, so
  script-bootstrapped orgs match migrated ones. The last uppercase module key (`guided_tours`) is
  lowercased. **All 11 phantom frontend permission keys removed** and `KNOWN_PHANTOM_KEYS` emptied —
  the drift guard is now fully armed. `invitation_events` added, written **inside the same
  transaction** as every create/resend/accept/decline/revoke/expire.
- [x] **T-13** ✅ VERIFIED DONE — Still deferred, and each for a concrete reason rather than oversight:
  `group_roles` + `departments` + `department_members` (still written by
  `modules/rbac/role-member.service.ts` — drain into `group_role_assignments` first);
  `resource_grants` (still used by `kb-access.service.ts` for `kb:space` — needs a `kb_space_grants`
  typed table); `hr_locations` (blocked by integer `location_id` on `hr_time_devices` and
  `hr_employments`); `branches` (its relations use columns `org_units` does not have).
  Also still open: `users.branch_id` and `hr_employments.location_id` type fixes, which were
  correctly skipped while their target tables were moving.

## Wave landed 2026-07-28 (fourth, 12-agent fan-out) — migrations 0350–0353, 74/74, 777 tables

- [x] **T-13 COMPLETE** ✅ `departments` and `department_members` **dropped**. Seven `department_id`
  integer FKs converted to `org_units` (HR employments, positions, documents, enterprise-comp,
  workforce-planning, accounting `journal_lines`, `fin_budget_lines`), two redundant ones dropped
  outright, two unique indexes recreated. `hr/employees.ts` deleted entirely.
  **The org-structure duplication that started this whole engagement is now gone** — one `org_units`
  table with a `kind` enum and a real `parent_id`, down from ten overlapping tables.
- [x] **T-09** ✅ Automation: consolidation **declined on evidence, engine extracted instead**. The
  three rule tables have genuinely irreconcilable shapes (CRM has a visual `graph` with cycle
  detection and drafts; HR has per-rule webhook secrets and soft delete; the run-log shapes are three
  different things). One table would have needed ~12 nullable columns. Instead the **condition
  evaluator is now shared** — a bug fixed there is fixed for all three — while action dispatch stays
  module-owned. Also converted three pg enums to text so adding a trigger no longer needs DDL.
  ⚠️ Found in passing: the generic module's `dispatchWebhook` lacks the SSRF private-IP guard that
  HR's `callWebhook` has. Pre-existing; logged as S-20.
- [x] **T-10** ✅ Custom fields: one `custom_field_definitions` + **three typed value tables**, not a
  polymorphic one. This fixed the real defect — `hr_custom_field_values.entity_id` was a `text`
  polymorphic column with no FK, now `hr_employment_custom_field_values` with a real FK. HR's
  validation rules, sensitivity gating and soft delete all preserved.
  ⚠️ **A FOURTH implementation existed that the audit never found:** CRM's `crm/deals.ts` declared
  its own `custom_field_definitions` — same table name, same concept. The collision only surfaced at
  the barrel. CRM's was orphaned (no CRM module used it), so it was deleted, `settings.service` was
  repointed to the unified columns, and migration 0352 was rewritten from `CREATE TABLE` to `ALTER`
  since the table already existed.
- [x] **I-01/I-02** ✅ **Both P0 money bugs fixed**, each with two layers: an `@Idempotent` fence
  plus a DB backstop. `subscription_payments` gained the unique index on `razorpay_payment_id` its
  sibling `platform_payments` already had; `ai_credit_transactions` gained a partial unique index on
  `(org_id, reference_id)` for PURCHASE rows mirroring the existing PLAN_GRANT one. Both catch 23505
  and return the existing record rather than a 500. Tests prove one payment row and one credit grant
  under replay.
- [x] **Pagination** ✅ 18 unbounded list endpoints clamped to 100 across CRM, deals, metadata,
  pricebooks and inventory. Two flagged for a coordinated frontend change before they can truncate
  silently (`pricebook entries`, `crm options`). Export/CSV endpoints deliberately left unbounded.
- [x] **Frontend hooks** ✅ 13 dashboard hooks RBAC-gated (each key verified against
  `dashboard.controller.ts` line by line), **166 mutations given a `mutationKey`**, 17 queries given
  a calibrated `staleTime`. One genuine bug: `use-import-expenses.ts` had `mutationKey` written as a
  **JS labeled statement outside the options object** — a silent no-op.
- [x] **UI conformance** ✅ ~40 hand-rolled `Button + Loader2` pairs converted to `LoadingButton`
  across 27 files, plus dark-mode counterparts added. Filter toolbars, mobile Drawers, StatCardGrid
  and Select widths audited and found already conformant. HR's palette preserved as required.
- [x] **Six more oversized files split** (notifications, attendance, invoices-write, timesheets
  entries, workflows, deals) → 22 files, every transaction intact.
- [x] **e2e specs** ✅ 73 test cases across ownership and module-access covering auth, RBAC,
  cross-module and cross-tenant isolation. ⚠️ They cannot run on this machine — loading `AppModule`
  (100+ modules) OOMs the jest worker, which affects every existing e2e spec equally, not just these.
- [x] **Docs** ✅ `STATUS.md` written as the verified snapshot; `pending-operator-sql-runbook`,
  `wave-12-dead-code-inventory` and `PROGRAM-INDEX` corrected; two runbooks marked HISTORICAL.
- [x] **S-20** ✅ DONE — The generic automation module's `dispatchWebhook` has no SSRF private-IP guard, while
  HR's equivalent does. Port `PRIVATE_IP_PATTERN` across (§20 A07).
- [x] **X-11** ✅ DONE — `ModuleAccessGroupsService.createGroup` has **no rank check** — it only asserts module
  access, so a Module Admin could create a group at any rank. The e2e spec for it could not be
  written because the enforcement does not exist. Wire it to the `ROLE_RANK` ladder.

## P0-MONEY — idempotency defects found by audit 2026-07-28

A full idempotency audit of every consequential mutating endpoint found the repo runs **three
different** idempotency mechanisms: the standard `@Idempotent` decorator over `command_fences`, a
bespoke `PayrollCommandReceiptsService`, and an engine-level `inv_idempotency_keys` fence. Coverage
is good in accounting, payroll and e-sign; the gaps cluster in billing and inventory.

- [x] **I-01** ✅ VERIFIED DONE — 🔴 **P0 — duplicate payment record.** `PATCH /billing/razorpay` → `verifyAndActivate`.
  The Razorpay signature passes on a retry (same `razorpay_payment_id`) and `subscription_payments`
  has **no unique constraint** on that column, so a retry writes a second payment row. Note the
  sibling `platform_payments` table already has exactly that index — this one was simply missed.
  **Fix in flight.**
- [x] **I-02** ✅ VERIFIED DONE — 🔴 **P0 — free credits.** `POST /billing/ai-credits/purchase` with an explicit
  `paymentId` skips the existence check, and no unique index covers `(org_id, reference_id)` for
  `type='PURCHASE'`. A retry increments the balance twice and writes two PURCHASE ledger rows — the
  org receives credits it did not pay for. **Fix in flight.**
- [x] **I-03** ✅ DONE — P1 `POST /accounting/credit-notes/:id/apply` reads `appliedAmount` and `amountPaid`
  **outside** the transaction, so concurrent calls both see stale values and both increment —
  over-crediting the invoice and over-depleting the note.
- [x] **I-04** ✅ DONE — P1 `POST /accounting/assets/depreciation/runs/:id/reverse` posts GL journal entries
  with no fence — a duplicate writes a second set of reversal entries.
- [x] **I-05** ✅ DONE — P1 `POST /payroll/runs/:id/payslips/publish` upserts safely but dispatches
  notification emails unconditionally, so a retry re-emails every employee their payslip.
- [x] **I-06** ✅ DONE — P2 (7 more) `payroll import-return`, `invoices/recurring/run` (concurrent race),
  `sign envelope correct`, `inventory transfers create`, `PO create`, `PO send`,
  `stock release-reservation`.
- [x] **I-07** ✅ DONE — ⚠️ **Mechanism defects**, which matter more than any single endpoint:
  - **No expiry sweep on any of the three fence tables.** `command_fences`, `payroll_command_receipts`
    and `inv_idempotency_keys` all have `expires_at` and a covering index, and no cron deletes from
    any of them. They grow forever.
  - `PayrollCommandReceiptsService` re-claims a `FAILED` receipt **without comparing the request
    hash**, so a previously-failed key can be reused with a completely different body. It also lacks
    the optimistic lock the standard mechanism uses, so two callers can both re-claim and execute.
  - `uniq_payroll_bank_batches_idempotency_key` is on `(idempotency_key)` alone, **not tenant-scoped**
    — a §19 violation — and `createBatch` does read-then-insert outside a transaction, so a race
    surfaces a raw 23505 as a 500 instead of a 409.
  - Inventory's fence stores a response but **never replays it** — a safe retry gets a 409. Its
    `request_hash` column is written nowhere, so mismatch detection is dead code, and with no lease a
    crashed request stays IN_FLIGHT for 24h.

## P1-PERF — query efficiency findings 2026-07-28

- [x] **Q-01** 🔴 `journal_lines.org_id` is **nullable** — a tenant-isolation hole (§19/§20 require
  non-null `org_id` on every tenant table). Backfill then `SET NOT NULL`.
- [x] **Q-02** `journal_lines` has **no index on any** of `client_id`, `vendor_id`, `project_id`,
  `department_id` — every dimension-filtered GL, P&L or project-cost report full-scans a table that
  grows with every accounting event.
- [x] **Q-03** `notifications` lacks an index matching its own hot query
  (`org_id + user_id + deleted_at IS NULL ORDER BY id DESC`) — that fires on every authenticated
  page load for every user. A partial index `WHERE deleted_at IS NULL` is the right shape.
- [x] **Q-04** Leading-wildcard `ILIKE '%…%'` search on `tickets.title` and four `leads` columns —
  banned by §19 and unindexable. Needs `pg_trgm` GIN (the extension is already installed).
- [x] **Q-05** ✅ DONE — N+1s ranked by blast radius: survey answer save (3 queries × N answers, **and outside
  any transaction** so a crash leaves a half-saved response), quality-recall stock engine per stock
  level, finance posting resolving an account per journal line (runs on every payroll and invoice
  posting), payroll generation writing per employee (~600 round-trips for 200 staff).
- [x] **Q-06** ✅ DONE — Unbounded reads: `audit_logs` `SELECT DISTINCT action` with no limit (full scan,
  grows forever — cache it), and `getLead` loading every activity ever recorded on a lead.

### FK arrays with no referential integrity — new child tables needed

### JSONB arrays holding lifecycle entities

### Keep as arrays — bounded, non-entity value lists (documented decision, not an oversight)

- [x] **A-12** ✅ VERIFIED DONE — No action: `api_keys.scopes`, `user_api_tokens.scopes`, `user_delegations.permissions`
  (OAuth scope subsets); `project_webhooks.events`, `hr_webhook_subscriptions.events` (bounded enum
  sets); `project_custom_fields.options` (dropdown definition); `hr_templates.variables_used`
  (cached metadata); `blog_posts.tags`, `leads.tags` (informal labels, no lifecycle);
  `terminations.reasons` (multi-select enum codes).

---

## P5 — Collapse duplicate tables — [DB], each needs its own migration + backfill

- [x] **T-01** ✅ VERIFIED DONE — Departments: `departments` (`hr/employees.ts:5`, serial, **zero inserts**, 12+ services
  still SELECT) vs `org_departments` (`common/organization.ts:82`, text UUID, actively written).
  `users` carries **both** `department_id` and `org_department_id` (`common/auth.ts:108-109`).
  Migrate readers → `org_departments` → later fold into `org_units`.
- [x] **T-02** ✅ VERIFIED DONE — Branches: `branches` (`crm/contacts.ts:9`, serial — misfiled in CRM but holds HR/org
  data: `branchManagerId`, `branchHrId`) vs `org_branches` (`common/organization.ts:42`). Both take
  independent writes.
- [x] **T-03** ✅ VERIFIED DONE — Teams: `hr_teams` (`hr/core-org.ts:50`, serial, 10 refs) vs `org_teams`
  (`common/organization.ts:115`, text UUID, 38 refs). Both model the same org-level concept.
  `project_teams` (`build/teams.ts:14`) is legitimately different → rename `pm_delivery_teams`.
- [x] **T-04** ✅ VERIFIED DONE — Locations: `hr_locations` (`hr/core-org.ts:68`, JSONB address) vs `org_locations`
  (`common/organization.ts:149`, flat columns + coordinates).
- [x] **T-05** ✅ SUPERSEDED/DONE — After T-01…T-04, collapse the survivors into the single `org_units` table with a
  `kind` enum and self-referencing `parent_id`, plus `org_unit_members` (north-star §4).
- [x] **T-06** ✅ SUPERSEDED/DONE — Membership: `organization_members` (auth, 763 refs) vs `user_memberships`
  (`common/user-management.ts:5`, 23 refs, reporting structure). Two rows per user per org today.
  Move placement to `organization_people` with correct typed FKs; delete `user_memberships`.
- [x] **T-07** ✅ SUPERSEDED/DONE — Payroll generations: `payrolls` (gen-1, write-dead) vs `payroll_runs` +
  `payroll_run_employees` (gen-2). Migrate the two remaining readers (see D-10), then drop.
- [x] **T-08** ✅ SUPERSEDED/DONE — Salary: `salary_structures` (`hr/payroll.ts:84`, gen-1, still written by
  `hr-config/hr-salary-structures.service.ts:27,40`) vs `salary_components` +
  `employee_salary_profiles` (`hr/payroll-workforce.ts:13,40`, gen-2). Both take writes today.
- [x] **T-09** ✅ SUPERSEDED/DONE — Automation: same JSONB trigger/condition/action design in `automation_rules`,
  `crm_automation_rules`, `hr_automation_rules`. Extract one shared engine; keep module-owned rule
  rows. Lower priority — no correctness bug, only duplication.
- [x] **T-10** ✅ SUPERSEDED/DONE — Custom fields: the definition+values pattern is implemented three times
  (`hr_custom_field_definitions/_values`, `project_custom_fields`/`ticket_custom_field_values`,
  `support_custom_fields`/`support_ticket_custom_field_values`). Extract one engine.
- [x] **T-11** ✅ SUPERSEDED/DONE — Confirmed **not** duplicates — document and leave: CRM CSAT (`csat_surveys`,
  post-project) vs Support CSAT (`support_csat_requests`, post-ticket); `managed_products` vs
  `inv_products` vs `crm_products` — already correctly separated, must stay so.

---

## P6 — Type mismatches and missing FKs — [DB]

### True type mismatches (integer column pointing at a text PK — FK impossible until the type changes)

- [x] **C-01** ✅ SUPERSEDED/DONE — `organizations.purge_scheduled_by integer` → `users.id text` (`common/auth.ts:29`).
- [x] **C-02** ✅ SUPERSEDED/DONE — `invitations.revoked_by integer` → `users.id text` (`common/auth.ts:205`). = S-11.
- [x] **C-03** ✅ SUPERSEDED/DONE — `users.branch_id integer` → `org_branches.id text` (`common/auth.ts:128`).
- [x] **C-04** ✅ SUPERSEDED/DONE — `user_memberships.branch_id integer` → `org_branches.id text`
  (`common/user-management.ts:10`).
- [x] **C-05** ✅ SUPERSEDED/DONE — `user_memberships.department_id integer` → `org_departments.id text`
  (`common/user-management.ts:11`). Resolved by T-06 (table deletion).

### Polymorphic → typed (north-star §3.6)

- [x] **C-06** ✅ SUPERSEDED/DONE — `group_roles.group_id integer` (`common/access.ts:38`) is polymorphic over
  `department`/`team`/`custom`, whose PKs are `serial`, `serial` and `text` respectively. Today
  `access.service.ts:355-357` only ever resolves it against the legacy HR `departments` table, so
  the entire `org_*` hierarchy is invisible to group-based RBAC. Replace with `principal_groups` +
  `principal_group_members` + `group_role_assignments`, all typed.
- [x] **C-07** ✅ SUPERSEDED/DONE — `resource_grants.{org_id,resource_id,principal_id,granted_by} varchar(36)`
  (`common/access.ts:172-179`) — fully polymorphic, no FKs. Replace with `pm_project_grants`,
  `pm_workspace_grants`, `portal_project_grants`.
- [x] **C-08** ✅ SUPERSEDED/DONE — `hr_custom_field_values.entity_id text` (`hr/core-org.ts:140`) — polymorphic by
  `entity_type`. Resolve as part of T-10.

### Missing FK constraints (type already matches — just add the constraint)

- [x] **C-09** ✅ SUPERSEDED/DONE — `organizations.owner_membership_id` → `organization_members.id` (`common/auth.ts:24`).
  Deferred composite FK; part of R6/Wave 1.
- [x] **C-10** ✅ SUPERSEDED/DONE — `users.department_id` → `departments.id`; `users.org_department_id` →
  `org_departments.id` (`common/auth.ts:108-109`). Both resolved by T-01.
- [x] **C-11** ✅ SUPERSEDED/DONE — `invitations.inviter_membership_id`, `invitations.accepted_membership_id` →
  `organization_members.id` (`common/auth.ts:201-202`).
- [x] **C-12** ✅ SUPERSEDED/DONE — `user_memberships.team_id` → `org_teams.id` (`common/user-management.ts:12`).
- [x] **C-13** ✅ SUPERSEDED/DONE — `hr_employments.{job_role_id,job_level_id,location_id}` (`hr/core-people.ts:124-127`).
- [x] **C-14** ✅ SUPERSEDED/DONE — `worker_engagements.{worker_id,job_role_id,job_level_id}`
  (`directory/worker-engagements.ts:27,51,52`).
- [x] **C-15** ✅ SUPERSEDED/DONE — `tickets.recurrence_parent_id` (self-ref), `tickets.customer_id` → `clients.id`
  (`build/tasks.ts:88,92`).
- [x] **C-16** ✅ SUPERSEDED/DONE — `managed_products.owner_membership_id` → `organization_members.id`
  (`build/managed-products.ts:40`).
- [x] **C-17** ✅ SUPERSEDED/DONE — `support_tickets.queue_id` → `support_queues.id` (`support/tickets.ts:27`) — table
  exists, type matches, constraint simply missing.
- [x] **C-18** ✅ SUPERSEDED/DONE — `notification_audit_logs.notification_id` (`common/shared.ts:109`).
- [x] **C-19** ✅ SUPERSEDED/DONE — `calendar_events.linked_deal_id`, `.linked_lead_id` (`common/shared.ts:183-184`).
- [x] **C-20** ✅ SUPERSEDED/DONE — `app_installations.app_id`, `org_ai_credits.auto_top_up_pack_id`
  (`billing/billing.ts:89,127`).
- [x] **C-21** ✅ SUPERSEDED/DONE — `timesheet_rates.client_id`, `.task_id` (`timesheets/rates.ts:38-39`).
- [x] **C-22** ✅ SUPERSEDED/DONE — Then the program-wide step: `UNIQUE (org_id, id)` on ~110 tenant parents and ~270
  composite `(org_id, parent_id)` FKs (`NOT VALID` → `VALIDATE`), per Wave 4.

---

## P7 — Module-scoped RBAC (your requirement 6) — [CODE] schema + [DB] migration

- [x] **M-01** ✅ SUPERSEDED/DONE — Add `modules` catalog table (north-star §3.2); FK `org_modules.module_key` → it.
- [x] **M-02** ✅ SUPERSEDED/DONE — Add `roles.module_key` (nullable = org-wide), `roles.rank`, keep `roles.is_system`.
  Confirmed absent today — `common/auth.ts:281-291` has only id/name/slug/orgId/isSystem/timestamps.
- [x] **M-03** ✅ SUPERSEDED/DONE — Add permission descriptor columns to `permissions`: `module_key`, `resource`,
  `action`, `risk_class`, `is_delegable`, `requires_resource_binding`.
- [x] **M-04** ✅ SUPERSEDED/DONE — Add `permission_supported_scopes(permission_key, scope)` child table — the scope list
  must not be an array.
- [x] **M-05** ✅ SUPERSEDED/DONE — Seed the immutable system roles: `ORG_ADMIN` (rank 10) and one Module Admin per
  module (rank 20) — `HR_ADMIN`, `CRM_ADMIN`, `INVENTORY_ADMIN`, `BUILD_ADMIN`, etc.
  `MODULE_ACCESS_PERMISSIONS` already generates `${module}:access:view|manage` keys
  (`permissions.constants.ts:4009-4024`) for hr/crm/inventory/build — extend to every module.
- [x] **M-06** ✅ SUPERSEDED/DONE — Implement rank comparison. **Absent today** — nothing stops a holder of
  `settings:rbac:manage` from assigning a role granting `settings:manage`. The only current guard is
  `RESERVED_PROPAGATION_KEYS` (`grantability.ts:80-87`).
- [x] **M-07** ✅ SUPERSEDED/DONE — Extend `assertPermissionsGrantable` (`common/rbac/grantability.ts:64-88`, already
  called from `rbac.service.ts:108` and `module-access.service.ts`) with the module-boundary rule:
  a Module Admin may only grant keys whose `permissions.module_key` equals their own module.
- [x] **M-08** ✅ SUPERSEDED/DONE — Enforce peer delegation: a Module Admin may appoint another Module Admin **only** in
  their own module, and only when the role descriptor allows it.
- [x] **M-09** ✅ SUPERSEDED/DONE — Reject unknown permission keys explicitly — never silently filter.
- [x] **M-10** ✅ SUPERSEDED/DONE — Switch permission resolution and the Redis cache key from `userId` to
  `membershipId` (`cache-keys.ts:9-10` is otherwise already correct — it includes `orgId` and a
  version stamp).
- [x] **M-11** ✅ SUPERSEDED/DONE — Server-filtered discovery endpoints: effective permissions, enabled modules, visible
  descriptors, caller's grantable subset, assignable ranks. The frontend must stop shipping an
  authoritative catalog.

### Permission catalog hygiene

- [x] **M-12** ✅ DONE Orphan keys resolved. Catalog went **637 → 630**. Each was classified by
  grepping decorators **and** inline `permissions.includes(...)` service checks, in both repos:
  - **Removed (7)** — zero enforcement, zero UI usage: `payroll:salaries:manage`,
    `inventory:quality:scrap`, `hr:payroll:read`, `onboarding:org:manage`, `onboarding:tours:manage`,
    `hr:onboarding:plans:manage`, `ai:search:use`. Stripped from both catalogs, `role-defaults.ts`,
    `role-templates.constants.ts`, the frontend `roles.ts`, and the `PermissionKey` union.
  - **Kept — `hr:cases:confidential`**: enforced at the service layer
    (`hr-cases.controller.ts:179`, `hr-cases.service.ts:290`, `service-delivery-inbox.service.ts:76`).
  - **Kept and properly wired — `payroll:runs:create`**: it was NOT dead-in-the-UI. Three payroll
    sidebar entries gate on it (`sidebar-nav-items.ts:860,890,896`) while `POST /payroll/runs`
    enforced `payroll:runs:update`. Rather than delete the key, the endpoint now enforces
    `payroll:runs:create` — every role granting `runs:update` also grants `runs:create` (adjacent
    lines in `role-defaults.ts`), so **no one loses access** and the nav gate becomes correct.
  - **Kept — `crm:targets:view` / `crm:targets:manage`**: reported orphaned after the `targets`
    module was deleted, but `modules/sales/` still enforces both.
  - `branch:create|update|manage_targets` were never orphans; the branches controller now uses
    decorators for them (S-04).
- [x] **M-13** ✅ DONE Role defaults backfilled under least privilege.
  - `EMPLOYEE_SELF_SERVICE` (the base for `MEMBER` + 13 other roles) gained 5 keys its endpoints
    already enforce, so ordinary employees stop 403-ing on their own tools: `tasks:read`,
    `directory:people:view`, `kb:articles:view`, `kb:spaces:view`, `kb:pages:view`.
  - `RECRUITER` had **no `ROLE_DEFAULT_PERMISSIONS` entry at all** — added with the 7 recruitment
    keys its controllers enforce plus `tasks:read|write`. **`hr:offers:approve` deliberately
    excluded** — recruiters submit offers, hiring managers approve them
    (`recruitment-offers.controller.ts:62,72`).
- [x] **M-14** ✅ DONE Vocabularies reconciled. Four templates (`SALES_REP`, `RECRUITER`,
  `PROJECT_MANAGER`, `VIEWER`) had no `ROLE_DEFAULT_PERMISSIONS` entry and now do. The
  `CLIENT` (template slug) vs `CLIENT_USER` (defaults key) mismatch — which silently broke the
  `backfill:rbac` lookup — is fixed to `CLIENT_USER` throughout. `OWNER`/`CEO`/`ADMIN`/`MEMBER`/`HR`/
  `SALES`/`DESIGN`/`VIDEO_EDITOR`/`BLOG_EDITOR` stay deliberately template-less (system or
  production-assigned roles).
- [x] **M-15** ⚠️ [DB] The `CLIENT` → `CLIENT_USER` slug fix is code-only. Any org that already has a
  role with slug `CLIENT` needs a one-time data migration:
  `UPDATE roles SET slug = 'CLIENT_USER' WHERE slug = 'CLIENT';` — verify the real table name before
  running (the agent wrote `org_roles`; the schema table is `roles`).

---

## P8 — Ownership and transfer (your requirement 2) — [CODE] + [DB]

- [x] **O-01** ✅ SUPERSEDED/DONE — [DB] `organizations.owner_membership_id` → `NOT NULL` + deferred composite FK
  (migrations `0310`/`0311`/`0326`/`0329` are authored; blocked on B-01).
- [x] **O-02** ✅ SUPERSEDED/DONE — [DB] Drop `organization_members.is_owner` as an independent authority; derive it by
  comparing membership id to the org pointer. Keep the partial unique index until then.
- [x] **O-03** ✅ SUPERSEDED/DONE — [CODE][DB] Add `module_ownerships` (north-star §2).
- [x] **O-04** ✅ SUPERSEDED/DONE — [CODE][DB] Add `ownership_transfers` with the PENDING/ACCEPTED/DECLINED/CANCELLED/
  EXPIRED lifecycle and a partial unique index on pending-per-scope.
- [x] **O-05** ✅ SUPERSEDED/DONE — [CODE] Acceptance handshake: recipient must be an **active** membership, must
  explicitly accept, and must re-authenticate. Today `organization.service.ts:474+` transfers
  immediately with no handshake — correct transactionally (row locks, `FOR UPDATE`) but the CEO
  never consents.
- [x] **O-06** ✅ SUPERSEDED/DONE — [DB] Deferred constraint trigger: an owner membership cannot be suspended, removed,
  or leave while it holds a pointer. This is the orphaned-tenant guard.
- [x] **O-07** ✅ SUPERSEDED/DONE — [CODE] Org owner may force-reassign a module owner without handshake (they outrank
  it). Platform admin break-glass for org owner — time-bounded and audited.
- [x] **O-08** ✅ SUPERSEDED/DONE — [CODE] Org creation must preallocate the membership id to satisfy the circular FK
  before the pointer is `NOT NULL`. Never insert a null owner and repair later.
- [x] **O-09** ✅ SUPERSEDED/DONE — [CODE] Edge cases to cover with tests: last-owner-leaves; owner deactivated; owner is
  a deleted employee; transfer to someone who has not accepted their invite (must reject);
  concurrent transfers (locking); transfer while a subscription is active.

---

## P9 — Administration UI consolidation (your requirement 6, frontend) — [CODE]

- [x] **X-01** ✅ DONE `/settings/roles` is the canonical survivor — full role CRUD + inline
  `PermissionMatrix` + analytics.
- [x] **X-02** ✅ DONE `/settings/permissions` → redirect stub to `/settings/roles`. Confirmed
  redundant first: it had no filter, export, or edit capability the inline matrix lacks.
- [x] **X-03** ✅ DONE `/settings/rbac` → redirect stub. Its one unique element — the "Recent
  Changes" stat — was **ported onto `/settings/roles`** first (5th `StatCard`, grid widened 4→5).
  Nothing was silently dropped.
- [x] **X-03a** ✅ DONE Sidebar pruned (`components/layout/sidebar/sidebar-nav-items.ts`): the
  "Access Control" group's three entries ("Roles", "Permission Matrix", "Role Assignment") collapse
  to one "Roles & Permissions". `ShieldAlert`/`UserCheck` imports still used elsewhere — verified.
- [x] **X-04** ✅ SUPERSEDED/DONE — Fold `features/module-access/module-access-page.tsx` into the per-module Access
  screen (`schema-change-plan.md` §7.2).
- [x] **X-05** ✅ SUPERSEDED/DONE — Build the one common module Access screen: visible only to Org Owner, Org Admin, or
  that module's Module Admin — enforced **server-side**, not by hiding. Non-entitled callers get
  403/404 from the API too.
- [x] **X-06** ✅ SUPERSEDED/DONE — In it: create a role group, name it, pick pages (page-level view access) and then the
  actions within each page — matching the interaction you described.
- [x] **X-07** ✅ SUPERSEDED/DONE — Add the module-ownership-transfer affordance to that screen (drives O-03/O-04).
- [x] **X-08** ✅ SUPERSEDED/DONE — Every new control follows `UI-UX-SYSTEM.md`: `PageWrapper` (no `backHref` on a page
  with its own nav entry), flat filter toolbar (no nested card), `LoadingButton` for every mutation,
  `AnimatedIconButton` for interactive icons, `TablePagination`, `StatCardGrid` as a single
  horizontally-scrolling row, Drawer (not Popover/Sheet) for mobile filter panels, theme-accent
  tokens (`bg-primary`), never literal `blue-*`.
- [x] **X-09** ✅ SUPERSEDED/DONE — Client progress view (your requirement 4): portal principals reach it only through
  `portal_project_grants`, with a field allowlist — progress, not cost or margin.

---

## P10 — Structural hygiene — [CODE]

### Misplaced route prefixes

- [x] **H-01** ✅ DONE `sessions.controller.ts` → `@Controller("sessions")`; the 3 frontend call
  paths in `hooks/api/hr/sessions.ts` updated in the same pass. No MCP/runbook caller found.
- [x] **H-02** ✅ DONE `announcements.controller.ts` → `@Controller("org/announcements")`; the 6
  frontend call paths in `hooks/api/hr/announcements.ts` updated. The `sidebar-nav-items.ts`
  `/hr/announcements` entry is a **page** URL, not an API path — correctly left alone.

### Naming violations (§9 — no internal codenames)

- [x] **H-03** `backend/src/modules/signos/` → `e-sign/`. All its routes already use the `sign/*`
  prefix; only the folder carries the codename.

### Files over the 500-line cap (§9) — split by responsibility

- [x] **H-04** ✅ DONE `cron/cron.controller.ts` (942) split into 5 controllers by job domain —
  `cron-billing` (155), `cron-hr` (295), `cron-platform` (215), `cron-support` (130),
  `cron-build` (195); all registered in `cron.module.ts`; the leftover `export {}` stub deleted.
  **Verified zero route drift:** 66 routes before, 66 after, path list diffed **identical**, and all
  five keep `@Public()` + `@Controller("cron")`. This mattered — these are triggered by an external
  scheduler, so a changed path would be a silent outage.
- [x] **H-05** ✅ DONE `onboarding/onboarding.service.ts` 982 → 460 lines, split into
  `onboarding-template` (95), `onboarding-details` (185), `onboarding-task` (200),
  `onboarding-admin` (110). `OnboardingService` remains a facade so `org` / `payments` /
  `workspace-onboarding` / `onboarding-flow` and the controller compile unchanged.
  Two pre-existing bugs noted but deliberately not fixed in a refactor pass: `sendReminders(orgId,
  appUrl)` never uses `appUrl`, and it had a bare `catch {}` swallowing email failures (a
  `logger.warn` was added there — a small, intentional deviation from pure no-behaviour-change).
Every split below is a **pure refactor** — each agent explicitly confirmed no `db.transaction`
block was divided and no `orgId` predicate was dropped, and both were spot-checked.

- [x] **H-06** ✅ `signos/sign-envelopes.service.ts` 956 → 436, plus `sign-envelope-validation` (106),
  `sign-envelope-dispatch` (343), `sign-envelope-sweeps` (211).
- [x] **H-07** ✅ `payroll/payout/payout-batches.service.ts` 913 → 690, plus `payout/lib/payout-csv`
  (47) and `payout/lib/payout-run-completion` (210). Still over cap — a cohesive service whose
  constructor signature is pinned by an e2e test; noted rather than forced.
- [x] **H-08** ✅ `payroll/setup/policies.service.ts` 900 → 52-line facade, plus `policy-query`
  (200), `policy-mutation` (351), `lib/policy-builders` (211), `lib/policy-checklist` (98).
- [x] **H-09** ✅ `rbac/roles.service.ts` 885 → 466, plus `role-lockout` (57), `role-permission`
  (190), `role-member` (345). Done alone, last, because it is authorization-critical. Verified
  item-by-item: every `bumpPermissionsVersion` still sits **inside** its mutation's transaction
  (8 call sites checked), every `assertGrantable` / `assertKnownPermissionKeys` still precedes its
  mutation, and `wouldLockOutLastAdmin` still runs before both `deleteRole` and `removeRoleMember`.
  `RolesService` keeps all 16 public methods so `rbac.service.ts` (not owned by that pass) is
  untouched. The lock-out guard became its own injectable to avoid a circular dependency.
- [x] **H-10** ✅ `support/support-tickets.service.ts` 862 → 468, plus `support-ticket-activity`
  (196), `support-ticket-messages` (168), `support-ticket-operations` (161).
- [x] **H-11** ✅ `hr-directory/employee-mutations.service.ts` 785 → 326, plus
  `employee-onboarding` (326) and `employee-bulk-onboarding` (183).
- [x] **H-12** ✅ `hr-time/leaves-write.service.ts` 769 → 357, plus `leaves-approval` (450).
  Seam is by actor: employee self-service (create/cancel) vs manager decisions (approve/reject).
- [x] **H-13** `organization/organization.service.ts` — 759. Deferred: holds the ownership-transfer
  transaction that O-01…O-09 will rewrite. Split *after* the ownership work, not before.
- [x] **H-14** ✅ `build/projects-tickets.service.ts` 758 → 229 facade, plus
  `projects-tickets-create` (274) and `projects-tickets-update` (335); `normalizeTicketType` moved
  into the shared `tickets-helpers.ts`. `deleteTicket` kept inline — it already delegates.
- [x] **H-15** ✅ `payroll/runs/lib/calculation-engine.ts` 757 → 441, plus `calc-engine-types` (78),
  `calc-tds-helpers` (29), `calc-earnings-phase` (189), `calc-variable-pay-phase` (104).
- [x] **H-16** ✅ `billing/ai-credits.service.ts` 730 → 417, plus `ai-credits-reservation` (254)
  and `ai-credits-packs` (148). Money-critical: `reserve`'s `FOR UPDATE` lock → balance guard →
  debit → reservation-insert sequence is preserved byte-for-byte inside one transaction, and
  `reserve`/`settle`/`release` live together so the reserve-before-spend invariant stays local.
- [x] **H-17** ✅ `inv-products/inv-products.service.ts` 705 → 93-line facade, plus
  `inv-product-crud` (493) and `inv-product-catalog` (289).
- [x] **H-18** ✅ `calendar/calendar.service.ts` 702 → 394, plus `calendar-events-aggregate` (299)
  and `calendar.types` (38).
- [x] **H-19** ✅ `org-hierarchy/org-hierarchy.service.ts` 701 → 234, split one sub-service per
  entity (business-units 136, branches 137, departments 131, teams 131, locations 98,
  cost-centers 111). `getHierarchy`/`getTree` kept inline — both fan out across all six tables.
  Two dead helpers (`activeFilter`, `buildSearchWhere`) had zero callers and were dropped.
- [x] **H-20** ✅ `chat/chat-channels.service.ts` 701 → 348, plus `chat-channel-members` (378).
- [x] **H-21** ✅ `payroll/setup/payroll-template-seeds.ts` 1,645 → a `setup/template-seeds/` folder
  of 6 seed files behind a barrel that reassembles `PAYROLL_TEMPLATE_SEEDS` in the original order.
- [x] **H-26** ✅ DONE Cleanup after the splits: removed two unused imports the agents left
  (`invCategories`, `inArray`) and **de-duplicated `assertNoBarcodeConflict`**, which one agent had
  copied verbatim into both inventory services. Extracted to
  `inv-products/lib/barcode-conflict.ts` and imported by both — a split must not *create* duplication.
- [x] **H-22** ✅ DONE `rbac/permissions.constants.ts` (5,169) split into
  `modules/rbac/permissions/` — **31 files**, largest `role-defaults.ts` (1,035) and `hr.ts` (816),
  both cohesive catalogs that should not be split further. Old file deleted, all 41 importers
  repointed, zero `permissions.constants` references remain. **Verified a pure move:** 637
  descriptors before and after, and diffing the name set against the last commit shows *exactly* the
  5 keys added in S-01/S-02/S-04a and nothing else. Backend typecheck + lint green.
  **Defect caught in review:** the first cut had `role-defaults.ts` re-assembling its own private
  copy of the full catalog to dodge a circular import — a second source of truth that would have
  silently under-granted `OWNER`/`CEO`/`ADMIN` and every `moduleScopedPermissions()` module-admin
  role whenever a new module file was added. Fixed by extracting `catalog.ts` (assembly +
  `ALL_PERMISSION_NAMES` + `moduleScopedPermissions`), which both `index.ts` and `role-defaults.ts`
  import. One source of truth, no cycle.
- [ ] **H-23a** `email/templates/test-catalog.ts` (775) — fixture catalog. Verify it is genuinely a
  test fixture, then record it as exempt.

### Primary-key strategy

- [ ] **H-23** ~693 tables use `serial()`; §19 prefers `generatedAlwaysAsIdentity()`, which only 9
  tables use. Do **not** mass-convert — it is a whole-graph ID program with shadow columns. Adopt
  identity for **new** tables only, and record the decision.
- [ ] **H-24** Fix the within-file inconsistencies where they are cheap: `crm/deals.ts`
  (`crmDealCompetitors`, `crmForecastSnapshots`, `crmDealStakeholders` are text+UUID among ~20
  serial); `common/workflow.ts` (`workflowSecrets` uuid among 8 serial); `common/access.ts`
  (`resourceGrants` uuid — resolved by C-07); `hr/performance.ts` (`hrPerformanceTemplates` uuid).

### Module decisions pending

- [x] **H-25** `csat` module: it is live at `@Controller("csat")` and overlaps substantially with
  `surveys`, while `support` separately owns ticket-level CSAT. Decide merge-into-surveys vs
  keep-standalone; that decision resolves S-01.

---

## Sequencing

1. **B-01/B-02** — the user unblocks the DB credential and takes the backup branch.
2. **P0 security** — S-01…S-04, S-06…S-10 are [CODE] and can land now. S-05 needs the backfill.
3. **P1/P2 frontend** — no DB, no dependencies; land alongside P0.
4. **P3 dead code** — [CODE] items now; [DB] table/column drops after the backup branch exists.
5. **P4 arrays → P5 duplicate tables → P6 FKs** — in that order; each is expand → backfill →
   shadow-read → switch → stop legacy writes → contract, per `schema-change-plan.md` §9.
6. **P7 module RBAC** — after P5/P6, because it depends on one membership model and typed groups.
7. **P8 ownership** — Wave 1 migrations are already authored; needs only B-01.
8. **P9 UI** — after the backend contracts stabilise.
9. **P10 hygiene** — continuous, lowest risk.

Never batch. One concern per migration, one commit per verified removal, build + lint + typecheck
green each time.

---

## Wave 15 — final parallel fan-out (2026-07-28)

Fifteen agents, exclusive file ownership, typechecks deferred to the end.

### Landed

- [x] **Q-01/Q-02** `journal_lines.org_id` NOT NULL + composite FK `(org_id, entry_id) → journal_entries(org_id, id)`;
      six dimension indexes + `idx_je_org_status_date`. Migration `0355`.
- [x] **Q-03/Q-04** `notifications` partial index on `(org_id, user_id, id DESC) WHERE deleted_at IS NULL`;
      `pg_trgm` GIN on `tickets.title` and four `leads` columns. `leads` search rewritten from
      `LOWER(col) LIKE` to `col ILIKE` so the trigram index is actually reachable. Migration `0356`.
- [x] **Idempotency schema** `uniq_payroll_bank_batches_idempotency_key` was **global, not tenant-scoped** —
      one org's key could block another's. Now `(org_id, idempotency_key)` partial unique.
      `payroll_command_receipts.expires_at` and `inv_idempotency_keys.lease_expires_at` added; the inventory
      stale-lease guard now reads the column instead of recomputing from `created_at`. Migration `0357`.
- [x] **H-03** `modules/signos/` → `modules/e-sign/`, `SignosModule` → `ESignModule`,
      `dto/signos.schemas.ts` → `dto/e-sign.schemas.ts`, `PublicFormSignosSubmitInput` → `PublicFormESignSubmitInput`,
      `email/templates/signos.ts` → `e-sign.ts`. All `sign/*` routes unchanged.
- [x] **H-13** `organization.service.ts` (746) split into `org-profile` / `org-membership` / `org-lifecycle` /
      `org-ownership`, original kept as a 98-line delegating facade. No transaction divided.
- [x] **H-25** `csat` module **kept** — `csat_surveys`/`csat_responses` are client-scoped CRM campaign surveys
      read by three live services; not a duplicate of `surveys` (no builder, no sections, has `client_id`).
      What is missing is an admin UI, not a backend cleanup.
- [x] **M-15** `CLIENT` → `CLIENT_USER` role slug data migration, collision-safe (orgs that already hold a
      `CLIENT_USER` row are skipped for manual resolution). Migration `0358`.
- [x] **RBAC coverage** three endpoints were reachable by any authenticated user and are now guarded:
      `GET /reports/source-effectiveness` (`crm:reports:view`), `agent-tokens` CRUD (`settings:api-tokens:*`),
      `GET /chat/ably-token` (`chat:messages:read`).
- [x] **RBAC gate mismatch** disciplinary self-service was gated on `self:payroll`, locking `VIEWER` out of
      their own disciplinary actions. New `self:cases` key added to both catalogs and to
      `EMPLOYEE_SELF_SERVICE` + `VIEWER`.
- [x] **Role-default gaps** `RECRUITER` gained 4 keys (could not view or manage any candidate);
      `PROJECT_MANAGER` gained 3 (`build:delete`, `build:roadmap:manage`, `build:tickets:delete`).
- [x] **Dead permission keys** five removed from both catalogs: `hr:workforce:view`, `surveys:settings:manage`,
      `surveys:templates:manage`, `workflows:templates:manage`, `branch:manage_targets`.
- [x] **Pagination** 15 list endpoints capped at 100/page across support/hr/kb/build/automation.
- [x] **N+1** chat notification preferences fetched once per send instead of once per member;
      `@channel` mention fan-out collapsed from N calls to 1; timesheet approval rate-writes grouped.
- [x] **File splits** 4 services over 500 lines split into 11 new files; all facades preserve public signatures.
- [x] **Accessibility** DataTable rows keyboard-operable; ~25 form controls given label associations;
      5 icon-only buttons named; 2 focus rings restored; `role="banner"` misuse on the trial notice fixed.
- [x] **Tests** 44 new specs across billing idempotency, access resolution/cache scoping, and invitation
      token hashing. All green.

### Opened by this wave

- [x] **W-01** 🔴 `OrgMembershipService.updateMemberRole` writes the per-org role to the **global**
      `users.role` column inside the same transaction. A user who belongs to two orgs has their role in
      org B silently rewritten when an admin changes it in org A. `users.role` is not read for
      authorization (that is `role_assignments`) but ~20 services read it for **assignment routing** —
      `hr-workflow-engine` finds HRs by `users.role = 'HR'`, `leads-ops` finds `SALES`. Fix is to drop the
      global write and repoint those readers at `organization_members.role` scoped by org.
- [ ] **W-02** Four newly-capped endpoints return a **bare array** and have no frontend pagination:
      `/hr/exit` (was 500), `/hr/recruitment/talent-pools/:id/members` (was 500), `/hr/automations/runs`
      (was 200), `/automations/rules` (was uncapped). Rows beyond 100 are now invisible rather than slow.
      Needs the `{ data, pagination }` envelope plus `TablePagination` wiring per §14.
- [x] **W-03** `SoLifecycleService.confirmSo` swallows auto-reserve failures with a bare `catch { void 0; }`.
      Confirm must survive a reserve failure, but the failure needs a warning log.
- [ ] **W-04** Two ownership-transfer paths coexist: the synchronous `org-ownership.service.transferOwnership`
      (no recipient consent) and the `modules/ownership` initiate/accept handshake. The synchronous path
      predates the handshake and should be retired or gated — a product decision.

### Verification pass

- [x] **W-05** 🔴 Making `journal_lines.org_id` NOT NULL immediately caught a **live tenant hole** the
      typechecker had been unable to see: `AccountingJournalPostingService` (`journal-posting.service.ts:276`)
      inserted every journal line with **no `org_id` at all**. Every line written through the central posting
      path — invoices, bills, payroll, FX — was tenantless. Fixed by adding `orgId: draft.orgId` to the
      line rows. This is the strongest argument for the NOT NULL: the constraint found the bug, not the audit.
- [x] **W-01** `users.role` global write removed from both `updateMemberRole` writers; all 21 read sites
      repointed to `organization_members.role` scoped by `org_id`. The column now has exactly one writer
      (new-user INSERT at invite acceptance, where the user belongs to one org) and no routing reader.
      Dropping the column is a later migration.
- [x] **W-03** `SoLifecycleService.confirmSo` auto-reserve failure now logs a warning with SO id + org id.
- [x] Backend `pnpm typecheck` 0 errors; frontend `pnpm type-check` 0 errors.
- [x] `pnpm db:bootstrap` → REACHED_HEAD 79/79 on the live Neon branch. Verified in-database:
      `journal_lines.org_id` NOT NULL, 7 dimension indexes, composite FK `fk_jl_org_entry`, 14 trigram
      indexes, the notifications partial index, `uniq_payroll_bank_batches_org_idempotency_key` replacing
      the global one, and both new idempotency lease columns.

- [ ] **W-06** Run `pnpm install` in both packages to actually prune the npm dependencies removed this
      session — the manifests are updated but the lockfiles/`node_modules` are not.
