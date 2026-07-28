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

## BLOCKER — clears a third of this register

- [ ] **B-01** `backend/.env` `DATABASE_URL` fails auth (`password authentication failed for user
  'neondb_owner'` — Neon password rotated mid-session). 54 journaled migrations up to
  `0333_pm_workspace_id_not_null.sql` are authored and idempotent but **none have run**.
  → Only the user can fix this credential. Everything marked **[DB]** is blocked on it.
- [ ] **B-02** [DB] Create the `prod-recon-baseline` Neon backup branch **before** any migration.
  Steps 2 and 7 of `pending-operator-sql-runbook.md` are destructive (`SET NOT NULL`, `DROP TABLE`);
  without this branch there is no rollback.
- [ ] **B-03** [CODE] Fix `docs/schema-migration/pending-operator-sql-runbook.md` Step 1a — the
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

- [ ] **S-06** [CODE][DB] `AccessService.resolveUserPermissions` reads **both** `user_roles`
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
- [ ] **S-08** [CODE] `user_permissions` is a third grant source read at `access.service.ts:431-441`.
  Fold into a per-membership role or a typed resource grant; retire the table.

### Bugs surfaced during the refactor passes — reported, deliberately NOT fixed in a refactor

Each was found while splitting a file. Fixing a bug inside a "pure refactor" pass makes the diff
unreviewable, so they are logged here instead.

- [ ] **S-13** ⚠️ **Cross-tenant read** — `chat/chat-channel-members.service.ts` `getChannel` asserts
  the caller is a member, then fetches the channel with `eq(chatChannels.id, channelId)` and **no
  `orgId` predicate**. A member of channel 5 in org A could read channel 5 in org B on an id
  collision. Pre-existing (was `chat-channels.service.ts:209-226`). This is an OWASP A01 BOLA
  defect — treat as P0 once verified.
- [ ] **S-14** `signos` `send` distributes recipient tokens (`status: "invited"`,
  `signingTokenHash`) in a plain loop **outside** the transaction that flips the envelope to
  `"sent"`. A crash mid-loop leaves recipients holding live invite tokens against a still-`draft`
  envelope. Pre-existing; preserved exactly by the split.
- [ ] **S-15** `hr-directory/employee-bulk-onboarding.service.ts:44` — `usedCodes.add(d.code)` adds
  `null` when the nullable `code` column is null, so the duplicate-code guard never fires for
  null-coded departments and one can be admitted twice.
- [ ] **S-16** `payroll` `importBankReturn` calls `markItemPaid`/`markItemFailed` in a loop with no
  batching — N DB round-trips per bank-return file. Performance, not correctness.
- [ ] **S-17** `onboarding` `sendReminders(orgId, appUrl)` never uses `appUrl`, and had a bare
  `catch {}` silently swallowing email failures (a `logger.warn` was added during the split).
- [ ] **S-18** `org-hierarchy` **`moveBusinessUnit` is a silent no-op** — it accepts
  `newParentId: string | null` but the update writes only `{ updatedAt: new Date() }`; the parent is
  never persisted. Re-parenting a business unit appears to succeed and does nothing.
- [ ] **S-19** `rbac` `addRoleMember` compares `eq(departments.id, input.principalId)` — an integer
  PK against a `string` `principalId`. Latent type mismatch Drizzle may silently coerce. Related to
  the wider integer-vs-text hierarchy defect (C-01…C-05).

### Module-key vocabulary mismatch — blanket false 403s

- [ ] **S-05** [CODE][DB] `module.guard.ts:27-28` and `authorize.ts:19-21` both call
  `isModuleEnabled(orgId, lowercaseKey)`, but `entitlements.service.ts:89-99` builds its map from
  `org_modules.module_key` **as-is**. Orgs provisioned before the lowercase constraint hold
  UPPERCASE values, so every non-owner gets `MODULE_DISABLED`:
  `accounting`→`FINANCE`, `support`→`HELPDESK`, `build`→`PROJECTS`, plus `hr`/`crm`/`inventory`.
  `module-vocabulary.ts:16-26` has the translation but it is only used in `org-setup.service.ts:184`
  for new orgs. Fix = backfill `org_modules` to lowercase [DB] **and** add the `modules` catalog
  table with an FK so the UPPERCASE vocabulary cannot come back (north-star §3.2).
  ⚠️ Sequencing hazard: do not wire `ModuleGuard` into Build controllers until this backfill runs —
  `isModuleEnabled` now fails closed and would 403 every Build endpoint for all non-owners.
- [ ] **S-09** [CODE] Delete `module-vocabulary.ts` once the backfill lands and the FK exists. One
  vocabulary, lowercase, everywhere.

### Invitations

- [ ] **S-10** [CODE][DB] `invitations.token` is stored **plaintext** (`common/auth.ts:193`).
  Replace with `token_hash` (SHA-256), compare by hash, drop the plaintext column.
- [ ] **S-11** [DB] `invitations.revoked_by` is `integer` against `users.id text` — unjoinable.
  Change to `revoked_by_membership_id int` + composite FK.
- [ ] **S-12** [CODE][DB] Add `invitation_events` child table (resend / revoke / accept / decline)
  instead of overwriting the single `revokedAt` / `acceptedAt` / `declinedAt` timestamps.

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
- [ ] **F-16** The whole hand-maintained frontend permission catalog is a drift hazard: it will
  silently disagree with the backend again. Fold into M-11 — the backend should expose the catalog
  via a discovery endpoint and the frontend should stop shipping an authoritative copy. Until then,
  the two lists must be reconciled key-for-key.
- [ ] **F-17** `features/hr/hr-dashboard-overview.tsx:307` gates on `session.user.role` (the legacy
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
- [ ] **U-10** ⛔ BLOCKED `features/crm/settings/sequences/sequence-sheet.tsx:247` — `{e.entityId}`.
  The `CrmSequenceEnrollment` type (`types/crm/automations.ts:78`) carries **no** name field and
  `/crm/sequences/:id/enrollments` returns none; no contact/lead list is cached in `EnrollmentsTab`.
  **Needs a backend DTO change** — add a joined `entityName` to the enrollment response. Deliberately
  not worked around with a speculative extra request.
- [x] **U-11** ✅ NO ACTION `features/accounting/core/journal-entry-view.tsx:112` (`sourceId`) —
  an external reference number is standard accounting UI. Confirmed intentional.

### Follow-up

- [ ] **U-12** The `useOrgMembers(1, 200)` pattern caps name resolution at 200 members. All callers
  share one cache entry so it is a single deduped request, but an org with >200 members will show
  blanks beyond the cap. `useOrgMembersByIds` (`hooks/api/organization.ts:56`) is the correct
  primitive — resolve only the ids on screen. Migrate these 9 sites to it.

---

## P3 — Delete dead code — [CODE][VERIFY], schema rows are [DB]

### Dead tables (9 confirmed, zero references across all of `src/`)

- [ ] **D-01** [DB] `workspace_search_chunks` — `common/workspace-search.ts:10`. Whole file dead.
- [ ] **D-02** [DB] `workflow_actions` — `common/workflow.ts:50`. Engine uses a JSONB blob instead.
- [ ] **D-03** [DB] `workflow_triggers` — `common/workflow.ts:40`. Same cause. Keep the
  `workflow_trigger_type` / `workflow_node_type` enums — live tables still use them.
- [ ] **D-04** [DB] `party_addresses` — `party/party-addresses.ts:14`. Whole file dead.
- [ ] **D-05** [DB] `crm_party_accounts` — `crm/party-account.ts:15`. Superseded by `crm_organizations`.
- [ ] **D-06** [DB] `crm_views` — `crm/analytics.ts:155`.
- [ ] **D-07** [DB] `hr_mentorships` — `hr/succession.ts:22`.
- [ ] **D-08** [DB] `one_on_one_action_items` — `hr/performance.ts:77`.
- [ ] **D-09** [DB] `inv_party_vendor_profiles` — `inventory/party-vendor-profile.ts:13`.
- [ ] **D-30** [DB] `role_permissions` (`common/auth.ts:302`) — dead as of S-07. Drop the table, its
  `rolePermissionsRelations`, and the `rolePermissions: many(...)` back-reference on `roles`.
  Sequence after S-06 so the whole legacy role path retires together.
- [ ] **D-10** ⚠️ Do **not** drop `payrolls` (`hr/payroll.ts:32`) yet — write-dead but still read by
  `ops-copilot-tools.ts:32` and `hr-analytics.service.ts:109`. Migrate those readers to
  `payroll_runs` first, then drop.

### Dead columns

- [ ] **D-11** [DB] `users.login_attempts`, `users.locked_until` (`common/auth.ts:113-114`) —
  lockout scaffolded, never implemented; only written by `seed-demo.ts`.
- [ ] **D-12** [DB] `users.google_refresh_token`, `users.google_email` (`common/auth.ts:133-134`) —
  Composio custodies tokens (§6); `me.service.ts` already excludes them.
- [ ] **D-13** [DB] `journal_lines.{client_id,vendor_id,project_id,department_id,employee_id,tax_code_id}`
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
- [ ] **D-19** [CODE] `backend/scripts/apply-sql-file.mjs` — keep until Wave 0 reconciliation is
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
- [ ] **D-31** [DB] Tables left without a consumer by D-24: `targets` and `target_history`
  (`crm/deals.ts:449-837`). Add to the dead-table drop migration alongside D-01…D-09.
- [ ] **D-32** [CODE] Remove the dead `workspaceSearch` key factory from `frontend/lib/query-keys.ts`.

### Duplicate frontend code

- [x] **D-25** ✅ DONE `features/crm/settings/audit-log/audit-entry-row.tsx` — local `useAuditLogs`
  (own `"crm-audit-logs"` key, divergent types) deleted; now imports the canonical hook and
  `AuditLogRow`. Re-exported from the same path so the CRM page keeps working unchanged.
- [x] **D-26** ✅ DONE `features/subscription/` dissolved — `plan-card.tsx` and `coupon-section.tsx`
  moved into `features/billing/components/`, imports updated, folder deleted. Zero references remain.
- [x] **D-27** ✅ DONE `features/workspace/` dissolved — `create-workspace-dialog.tsx` moved to
  `components/layout/header/`, import updated, folder deleted. Zero references remain.
- [ ] **D-28** [CODE] Merge `features/timesheets/` (18 files, payroll sub-feature only) into
  `features/timesheets-core/` (65+ files) as `features/timesheets/payroll/`, and rename
  `timesheets-core` → `timesheets`. Both are live; the split is an unfinished refactor.
- [ ] **D-29** Confirmed **not** duplicates — leave alone: `features/kb` (support helpdesk, TipTap)
  vs `features/knowledge-base` (wiki, Plate); `features/portal` (client-facing) vs
  `features/portal-access` (internal admin); `/organization` (hierarchy) vs `/settings/organization`
  (profile); `components/ui/table-pagination.tsx` vs `components/shared/data-table-pagination.tsx`
  (the latter legitimately adds a page-size selector + first/last buttons, per §14).

---

## P4 — Normalize arrays into child tables (your explicit requirement) — [DB]

### The replacement table already exists — just drop the array and repoint reads

- [ ] **A-01** `organizations.enabled_modules text[]` (`common/auth.ts:23`) → `org_modules`
  (`common/access.ts:65`). This is the root of S-05. Backfill, shadow-compare, switch reads, drop.
- [ ] **A-02** `kb_articles.tags text[]` (`support/kb.ts:72`) → `kb_tags` + `kb_article_tags`
  (`kb/tags.ts:15,30`).
- [ ] **A-03** `hr_employee_profiles.skills text[]` (`hr/core-people.ts:159`) → `employee_skills`
  (`hr/performance.ts:227`), which already carries level, verified flag and endorsements.

### FK arrays with no referential integrity — new child tables needed

- [ ] **A-04** `territories.assigned_reps integer[]` (`crm/deals.ts:683`) →
  `territory_reps(territory_id, crm_person_id, assigned_at)`.
- [ ] **A-05** `document_types.applicable_roles text[]` (`hr/offboarding.ts:125`) →
  `document_type_roles(document_type_id, role_id)`.
- [ ] **A-06** `organizations.allowed_email_domains text[]` (`common/auth.ts:21`) →
  `organization_allowed_email_domains` (north-star §1).
- [ ] **A-07** `territories.states text[]`, `territories.cities text[]` (`crm/deals.ts:681,682`) →
  `territory_locations(territory_id, kind, value)`.

### JSONB arrays holding lifecycle entities

- [ ] **A-08** `hr_employee_profiles.education` (`hr/core-people.ts:161`) → `hr_employee_education`.
- [ ] **A-09** `hr_employee_profiles.certifications` (`hr/core-people.ts:168`) →
  `hr_employee_certifications`. Expiry alerting cannot work against a JSONB blob.
- [ ] **A-10** `support_ticket_messages.attachments` (`support/tickets.ts:54`) →
  `support_ticket_attachments`, matching the existing `ticket_attachments` pattern
  (`build/tasks.ts:184`).
- [ ] **A-11** `hr_workflow_instances.attachments` (`hr/workflow-engine.ts:133`) →
  `hr_workflow_instance_attachments`.

### Keep as arrays — bounded, non-entity value lists (documented decision, not an oversight)

- [ ] **A-12** No action: `api_keys.scopes`, `user_api_tokens.scopes`, `user_delegations.permissions`
  (OAuth scope subsets); `project_webhooks.events`, `hr_webhook_subscriptions.events` (bounded enum
  sets); `project_custom_fields.options` (dropdown definition); `hr_templates.variables_used`
  (cached metadata); `blog_posts.tags`, `leads.tags` (informal labels, no lifecycle);
  `terminations.reasons` (multi-select enum codes).

---

## P5 — Collapse duplicate tables — [DB], each needs its own migration + backfill

- [ ] **T-01** Departments: `departments` (`hr/employees.ts:5`, serial, **zero inserts**, 12+ services
  still SELECT) vs `org_departments` (`common/organization.ts:82`, text UUID, actively written).
  `users` carries **both** `department_id` and `org_department_id` (`common/auth.ts:108-109`).
  Migrate readers → `org_departments` → later fold into `org_units`.
- [ ] **T-02** Branches: `branches` (`crm/contacts.ts:9`, serial — misfiled in CRM but holds HR/org
  data: `branchManagerId`, `branchHrId`) vs `org_branches` (`common/organization.ts:42`). Both take
  independent writes.
- [ ] **T-03** Teams: `hr_teams` (`hr/core-org.ts:50`, serial, 10 refs) vs `org_teams`
  (`common/organization.ts:115`, text UUID, 38 refs). Both model the same org-level concept.
  `project_teams` (`build/teams.ts:14`) is legitimately different → rename `pm_delivery_teams`.
- [ ] **T-04** Locations: `hr_locations` (`hr/core-org.ts:68`, JSONB address) vs `org_locations`
  (`common/organization.ts:149`, flat columns + coordinates).
- [ ] **T-05** After T-01…T-04, collapse the survivors into the single `org_units` table with a
  `kind` enum and self-referencing `parent_id`, plus `org_unit_members` (north-star §4).
- [ ] **T-06** Membership: `organization_members` (auth, 763 refs) vs `user_memberships`
  (`common/user-management.ts:5`, 23 refs, reporting structure). Two rows per user per org today.
  Move placement to `organization_people` with correct typed FKs; delete `user_memberships`.
- [ ] **T-07** Payroll generations: `payrolls` (gen-1, write-dead) vs `payroll_runs` +
  `payroll_run_employees` (gen-2). Migrate the two remaining readers (see D-10), then drop.
- [ ] **T-08** Salary: `salary_structures` (`hr/payroll.ts:84`, gen-1, still written by
  `hr-config/hr-salary-structures.service.ts:27,40`) vs `salary_components` +
  `employee_salary_profiles` (`hr/payroll-workforce.ts:13,40`, gen-2). Both take writes today.
- [ ] **T-09** Automation: same JSONB trigger/condition/action design in `automation_rules`,
  `crm_automation_rules`, `hr_automation_rules`. Extract one shared engine; keep module-owned rule
  rows. Lower priority — no correctness bug, only duplication.
- [ ] **T-10** Custom fields: the definition+values pattern is implemented three times
  (`hr_custom_field_definitions/_values`, `project_custom_fields`/`ticket_custom_field_values`,
  `support_custom_fields`/`support_ticket_custom_field_values`). Extract one engine.
- [ ] **T-11** Confirmed **not** duplicates — document and leave: CRM CSAT (`csat_surveys`,
  post-project) vs Support CSAT (`support_csat_requests`, post-ticket); `managed_products` vs
  `inv_products` vs `crm_products` — already correctly separated, must stay so.

---

## P6 — Type mismatches and missing FKs — [DB]

### True type mismatches (integer column pointing at a text PK — FK impossible until the type changes)

- [ ] **C-01** `organizations.purge_scheduled_by integer` → `users.id text` (`common/auth.ts:29`).
- [ ] **C-02** `invitations.revoked_by integer` → `users.id text` (`common/auth.ts:205`). = S-11.
- [ ] **C-03** `users.branch_id integer` → `org_branches.id text` (`common/auth.ts:128`).
- [ ] **C-04** `user_memberships.branch_id integer` → `org_branches.id text`
  (`common/user-management.ts:10`).
- [ ] **C-05** `user_memberships.department_id integer` → `org_departments.id text`
  (`common/user-management.ts:11`). Resolved by T-06 (table deletion).

### Polymorphic → typed (north-star §3.6)

- [ ] **C-06** `group_roles.group_id integer` (`common/access.ts:38`) is polymorphic over
  `department`/`team`/`custom`, whose PKs are `serial`, `serial` and `text` respectively. Today
  `access.service.ts:355-357` only ever resolves it against the legacy HR `departments` table, so
  the entire `org_*` hierarchy is invisible to group-based RBAC. Replace with `principal_groups` +
  `principal_group_members` + `group_role_assignments`, all typed.
- [ ] **C-07** `resource_grants.{org_id,resource_id,principal_id,granted_by} varchar(36)`
  (`common/access.ts:172-179`) — fully polymorphic, no FKs. Replace with `pm_project_grants`,
  `pm_workspace_grants`, `portal_project_grants`.
- [ ] **C-08** `hr_custom_field_values.entity_id text` (`hr/core-org.ts:140`) — polymorphic by
  `entity_type`. Resolve as part of T-10.

### Missing FK constraints (type already matches — just add the constraint)

- [ ] **C-09** `organizations.owner_membership_id` → `organization_members.id` (`common/auth.ts:24`).
  Deferred composite FK; part of R6/Wave 1.
- [ ] **C-10** `users.department_id` → `departments.id`; `users.org_department_id` →
  `org_departments.id` (`common/auth.ts:108-109`). Both resolved by T-01.
- [ ] **C-11** `invitations.inviter_membership_id`, `invitations.accepted_membership_id` →
  `organization_members.id` (`common/auth.ts:201-202`).
- [ ] **C-12** `user_memberships.team_id` → `org_teams.id` (`common/user-management.ts:12`).
- [ ] **C-13** `hr_employments.{job_role_id,job_level_id,location_id}` (`hr/core-people.ts:124-127`).
- [ ] **C-14** `worker_engagements.{worker_id,job_role_id,job_level_id}`
  (`directory/worker-engagements.ts:27,51,52`).
- [ ] **C-15** `tickets.recurrence_parent_id` (self-ref), `tickets.customer_id` → `clients.id`
  (`build/tasks.ts:88,92`).
- [ ] **C-16** `managed_products.owner_membership_id` → `organization_members.id`
  (`build/managed-products.ts:40`).
- [ ] **C-17** `support_tickets.queue_id` → `support_queues.id` (`support/tickets.ts:27`) — table
  exists, type matches, constraint simply missing.
- [ ] **C-18** `notification_audit_logs.notification_id` (`common/shared.ts:109`).
- [ ] **C-19** `calendar_events.linked_deal_id`, `.linked_lead_id` (`common/shared.ts:183-184`).
- [ ] **C-20** `app_installations.app_id`, `org_ai_credits.auto_top_up_pack_id`
  (`billing/billing.ts:89,127`).
- [ ] **C-21** `timesheet_rates.client_id`, `.task_id` (`timesheets/rates.ts:38-39`).
- [ ] **C-22** Then the program-wide step: `UNIQUE (org_id, id)` on ~110 tenant parents and ~270
  composite `(org_id, parent_id)` FKs (`NOT VALID` → `VALIDATE`), per Wave 4.

---

## P7 — Module-scoped RBAC (your requirement 6) — [CODE] schema + [DB] migration

- [ ] **M-01** Add `modules` catalog table (north-star §3.2); FK `org_modules.module_key` → it.
- [ ] **M-02** Add `roles.module_key` (nullable = org-wide), `roles.rank`, keep `roles.is_system`.
  Confirmed absent today — `common/auth.ts:281-291` has only id/name/slug/orgId/isSystem/timestamps.
- [ ] **M-03** Add permission descriptor columns to `permissions`: `module_key`, `resource`,
  `action`, `risk_class`, `is_delegable`, `requires_resource_binding`.
- [ ] **M-04** Add `permission_supported_scopes(permission_key, scope)` child table — the scope list
  must not be an array.
- [ ] **M-05** Seed the immutable system roles: `ORG_ADMIN` (rank 10) and one Module Admin per
  module (rank 20) — `HR_ADMIN`, `CRM_ADMIN`, `INVENTORY_ADMIN`, `BUILD_ADMIN`, etc.
  `MODULE_ACCESS_PERMISSIONS` already generates `${module}:access:view|manage` keys
  (`permissions.constants.ts:4009-4024`) for hr/crm/inventory/build — extend to every module.
- [ ] **M-06** Implement rank comparison. **Absent today** — nothing stops a holder of
  `settings:rbac:manage` from assigning a role granting `settings:manage`. The only current guard is
  `RESERVED_PROPAGATION_KEYS` (`grantability.ts:80-87`).
- [ ] **M-07** Extend `assertPermissionsGrantable` (`common/rbac/grantability.ts:64-88`, already
  called from `rbac.service.ts:108` and `module-access.service.ts`) with the module-boundary rule:
  a Module Admin may only grant keys whose `permissions.module_key` equals their own module.
- [ ] **M-08** Enforce peer delegation: a Module Admin may appoint another Module Admin **only** in
  their own module, and only when the role descriptor allows it.
- [ ] **M-09** Reject unknown permission keys explicitly — never silently filter.
- [ ] **M-10** Switch permission resolution and the Redis cache key from `userId` to
  `membershipId` (`cache-keys.ts:9-10` is otherwise already correct — it includes `orgId` and a
  version stamp).
- [ ] **M-11** Server-filtered discovery endpoints: effective permissions, enabled modules, visible
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
- [ ] **M-15** ⚠️ [DB] The `CLIENT` → `CLIENT_USER` slug fix is code-only. Any org that already has a
  role with slug `CLIENT` needs a one-time data migration:
  `UPDATE roles SET slug = 'CLIENT_USER' WHERE slug = 'CLIENT';` — verify the real table name before
  running (the agent wrote `org_roles`; the schema table is `roles`).

---

## P8 — Ownership and transfer (your requirement 2) — [CODE] + [DB]

- [ ] **O-01** [DB] `organizations.owner_membership_id` → `NOT NULL` + deferred composite FK
  (migrations `0310`/`0311`/`0326`/`0329` are authored; blocked on B-01).
- [ ] **O-02** [DB] Drop `organization_members.is_owner` as an independent authority; derive it by
  comparing membership id to the org pointer. Keep the partial unique index until then.
- [ ] **O-03** [CODE][DB] Add `module_ownerships` (north-star §2).
- [ ] **O-04** [CODE][DB] Add `ownership_transfers` with the PENDING/ACCEPTED/DECLINED/CANCELLED/
  EXPIRED lifecycle and a partial unique index on pending-per-scope.
- [ ] **O-05** [CODE] Acceptance handshake: recipient must be an **active** membership, must
  explicitly accept, and must re-authenticate. Today `organization.service.ts:474+` transfers
  immediately with no handshake — correct transactionally (row locks, `FOR UPDATE`) but the CEO
  never consents.
- [ ] **O-06** [DB] Deferred constraint trigger: an owner membership cannot be suspended, removed,
  or leave while it holds a pointer. This is the orphaned-tenant guard.
- [ ] **O-07** [CODE] Org owner may force-reassign a module owner without handshake (they outrank
  it). Platform admin break-glass for org owner — time-bounded and audited.
- [ ] **O-08** [CODE] Org creation must preallocate the membership id to satisfy the circular FK
  before the pointer is `NOT NULL`. Never insert a null owner and repair later.
- [ ] **O-09** [CODE] Edge cases to cover with tests: last-owner-leaves; owner deactivated; owner is
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
- [ ] **X-04** Fold `features/module-access/module-access-page.tsx` into the per-module Access
  screen (`schema-change-plan.md` §7.2).
- [ ] **X-05** Build the one common module Access screen: visible only to Org Owner, Org Admin, or
  that module's Module Admin — enforced **server-side**, not by hiding. Non-entitled callers get
  403/404 from the API too.
- [ ] **X-06** In it: create a role group, name it, pick pages (page-level view access) and then the
  actions within each page — matching the interaction you described.
- [ ] **X-07** Add the module-ownership-transfer affordance to that screen (drives O-03/O-04).
- [ ] **X-08** Every new control follows `UI-UX-SYSTEM.md`: `PageWrapper` (no `backHref` on a page
  with its own nav entry), flat filter toolbar (no nested card), `LoadingButton` for every mutation,
  `AnimatedIconButton` for interactive icons, `TablePagination`, `StatCardGrid` as a single
  horizontally-scrolling row, Drawer (not Popover/Sheet) for mobile filter panels, theme-accent
  tokens (`bg-primary`), never literal `blue-*`.
- [ ] **X-09** Client progress view (your requirement 4): portal principals reach it only through
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

- [ ] **H-03** `backend/src/modules/signos/` → `e-sign/`. All its routes already use the `sign/*`
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
- [ ] **H-13** `organization/organization.service.ts` — 759. Deferred: holds the ownership-transfer
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

- [ ] **H-25** `csat` module: it is live at `@Controller("csat")` and overlaps substantially with
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
