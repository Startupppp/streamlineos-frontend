# 19 — Module release matrix for authentication/identity/organization, RBAC and Settings

**What to build:** The §10 inventory-and-verdict pass applied to the three access-governance modules, plus their specific §10.1, §10.2 and §10.4 criteria.

**Blocked by:** 14.

**Status:** pass 8 — **6 of 7 closed, 1 PARTIAL.** Box 3 was closed by the orchestrator on 2026-09-03 when
`pnpm openapi:check` went green. Pass 8 worked the one remaining box (6, Settings placement) and **closed one of
its two PARTIALs**: A-13, the Build sidebar gate, whose blocker really had dissolved with A-12 — verified, flipped,
gate-proved (`check:route-access-contract` 203 → **204** keys, exit 0), commit `3c45e63bb` (frontend).
Box 6 itself stays OPEN: **9 backend routes still sit at a global `/settings/*` path** (7 automations, 2 email
templates). Two substantive corrections and one new defect landed instead of a tick: the census's email-templates
verdict was wrong, R-12's recommended option is blocked on a measured prerequisite, and **6 of the 10 routes the census
calls `SUNSET-ALIAS` are dual-homed rather than moved** — the frontend never left the alias, and two of the three
callers cannot be repointed by a URL edit. See the box. Report:
`reports/19e-settings-placement-a13-and-r12-prerequisite.md`. Pass 7 status follows.

**Status (pass 7):** pass 7 — **5 of 7 closed, 2 PARTIAL, unchanged.** Pass 7 did not work the boxes: it worked the
cross-territory hand-off list of pass 6, and **fixed 4 of the 6 items**, all bite-proved. The two boxes stay
PARTIAL on the same blockers (R-12 product decision; `pnpm openapi:check` A-12). Reports:
`reports/19c-grant-escalation-and-settings-census.md` (pass 6),
`reports/19d-cross-territory-rbac-and-email-fixes.md` (pass 7).

- **Box 3.** The escalation clause was proved by driving the real writers rather than the shared predicate, and that found a hole. There are two writers over `role_permission_grants`; `RbacService.assignRolePermission` / `revokeRolePermission` (`POST|DELETE /rbac/role-permissions`) **never loaded the role at all**, so a foreign role id 500'd on the composite FK instead of 404-ing, `isImmutableSystemRole` was never consulted (the org-level `ORG_ADMIN`/`MEMBER` rows that `setRolePermissions` refuses were writable here), and `assertPermissionsGrantable` ran with `target` and `permissionMeta` undefined — i.e. with the rank and module-boundary rules skipped. `resolveRoleInOrg` closes all three on both verbs. New `grant-escalation.spec.ts`: **16 tests**, bite-proved at **6 failed / 10 passed** against the pre-fix writer, plus 2 further planted defects on the bulk writer (2 failed, then 1 failed). Reachability bound honestly: `settings:rbac:manage` **and** `isStructuralOrgAdmin`, and **no frontend caller exists**. Idempotency re-checked to the brief's caveat — the grant is *naturally* idempotent (`onConflictDoUpdate` on `uniq_role_permission_grants_role_key`), not merely fenced. Remainder is still only `pnpm openapi:check` (A-12).
- **Box 6.** The criterion is now written in source with three falsifiable corollaries (OWNERSHIP / RUNG / OPERATION) at the top of the new `settings-surface-census.spec.ts`, which walks all of `src/` and reflects real Nest metadata instead of importing controllers by name. That found **three global-settings routes no earlier pass had counted**, because every pass enumerated `SettingsController` and stopped: `POST /settings/automations/:ruleId/test` (`modules/automation`) and `GET /settings/email-templates/preview` + `POST /settings/email-templates/test` (`modules/email`). **26 routes across 4 controllers**, each with an explicit verdict; the automations surface is **seven** routes, not the six report 19b costed. Frontend re-enumerated: 23 `/settings/*` pages, all PASS.
- **Inherited findings verified before acting — two were wrong.** `ACCESS_MANAGED_MODULES` really was 10 against 14 (fixed), but the role editor reads `GET /rbac/permissions`, not that constant, so `blog`/`directory`/`workflows` were always grantable and only `feedbucket` had no surface at all. And `hr:contracts:view|manage` are held by **3 seeded rungs** (`HR_MODULE_ADMIN|OWNER|MEMBER`), measured by executing `buildSeededRoleSpecs` — not owner-only. The real, narrower exposure is that **0 of the 13 role templates** carry them.

Pass 5 status follows.

**Status (pass 5):** pass 5 — **5 of 7 closed, 2 PARTIAL, and pass 5 did NOT advance either of them.** The session that held this ticket spent its whole pass on ticket 29's calendar read path plus two defects the orchestrator assigned mid-pass (the KB page-attachment storage orphan, and a `check:spec-typecheck` red). Neither remaining box was worked on and neither was re-verified this pass: box 3's remainder is `pnpm openapi:check`, a release-time regenerate-and-diff for the orchestrator, and box 6's remainder is the automations rung, a product decision written up in `reports/19b-automations-rung-decision.md`. Recorded as *not advanced*, not as blocked on anything new. Pass 4 status follows.

**Residual-risk disposition (2026-09-03):** every open box below now carries an ASSIGNABLE-or-ACCEPTED verdict, a named owner and a date, recorded inline under the box and in `reports/residual-risk-register-19-30.md`. Blockers were re-verified against source, a live gate run or a committed artifact rather than transcribed; where a stated blocker did not survive, the correction is inline.

**Status (pass 4):** **5 of 7 closed, 2 PARTIAL**, both narrowed. The module-access half of box 3 is closed here (`setModuleRolePermissionsSchema.items[]` was the last non-strict object on that write surface, and `POST :moduleKey/groups` was a replayable create with no `@Idempotent`); the only thing left in that box is `pnpm openapi:check`, a release-time regenerate-and-diff. Box 6's custom-fields half is closed: the four `/settings/custom-fields[…]` routes are now `CrmCustomFieldsModule` behind `crm:custom-fields:view|manage`, delivered to existing organisations by `RoleGrantReconcilerService` with **no backfill migration**. The five automations routes are left, and the four options for their rung are written up in `reports/19b-automations-rung-decision.md` — a product decision, not a mechanism gap. Full report at `reports/19-auth-rbac-settings.md`.

- [x] Each module's backend folders, controllers, implementations, DTO/Zod schemas, database schema files, migrations, workers, cache keys, event consumers, frontend routes, components, hooks, query keys, tests, fixtures and scripts are inventoried and classified KEEP/REFACTOR/REMOVE with the concrete failure named.
  - Evidence: 243 backend files (auth 19, rbac 88, organization 120, settings 16) + ~90 FE `features/settings/**` files + 23 FE global settings routes + `hooks/api/access*` classified in report §1, every non-KEEP naming its failure. Verified against source, not the PRD.
- [x] Membership and session reads are bounded and indexed; session, effective-access and organization caches invalidate immediately on change.
  - Evidence: `pnpm -s check:tenant-indexes` → exit 0, **745/745** tenant tables with a leading tenant index. Two invalidation defects found and fixed (`updateFeatureFlag` left `org:settings`/`org:profile` stale; `updateMemberRole` + `updateUserRole` left `user:session:<id>` stale for the 60s TTL). `jest settings-member-role-authority.spec.ts` → **3/3**; bite-proof: invalidation stripped → **1 failed / 3**.
- [x] Role, grant and module-access CRUD has strict Zod contracts, stable OpenAPI, idempotent mutations and exhaustive owner/descendant protection.
  - **CLOSED 2026-09-03 by the orchestrator.** The box's sole remaining blocker was A-12, `pnpm openapi:check`, whose ~55 diffs spanned six lanes. It is now **exit 0**: `openapi.json is current — 3642 operations, 3099 carrying a zod contract, 3642 exposure-stamped`. The contract was regenerated by the ticket-08 lane (`25a87768`), which absorbed the settings lane's `removed GET /settings/permissions` from `8634cba3` and said so in its commit message rather than filing it silently. Run directly by the orchestrator, exit code read from `$?`, not from a pipe.
  - The other three clauses were already evidenced above and are unchanged: strict Zod **32 of 32** objects on the write surface (was 12 of 32; nine `actions[].config` objects, nine union members, the condition schema and two `options[]` elements were all stripping silently); idempotency is **natural, not fenced** — `onConflictDoUpdate` on `(org_id, role_id, permission_key)` — plus `POST :moduleKey/groups` gaining `@Idempotent`; and the escalation clause was proved by driving the real writers, which found and fixed a genuine hole (`RbacService.assignRolePermission`/`revokeRolePermission` never loaded the role, so a foreign role id 500'd instead of 404-ing, `isImmutableSystemRole` was never consulted, and `assertPermissionsGrantable` ran with an undefined target).
  - Recorded honestly: this box closes because a blocker in **another** lane cleared, not because new work landed here. Ticket 19's own remaining box (6, settings placement) is unaffected and stays open on a product decision.
  - Strict Zod ✅ in territory. `settings.schemas.ts` went from 12 strict of 32 objects to **32 of 32** — nine `actions[].config` objects, nine union members, the condition schema and two `options[]` elements were all stripping silently; 3 new tests pin it (`jest settings.schemas.spec` → **14/14**, was 11).
  - Stable OpenAPI ✅ by artifact. Pass 1's "no document is built" is stale: `openapi.json` is committed with 3613 operations and six gates read it — `check:openapi-coverage`, `check:operation-ids`, `check:openapi-path-params`, `check:contract-registry`, `check:contract-breaking-change`, `check:envelope-consistency`, all exit 0.
  - Idempotent mutations ✅ for role and grant CRUD. Pass 1's "zero `@Idempotent` in rbac" is stale — 7 rbac + 4 settings creates carry it. Added `settings.userRole.update` and `organization.workspaceOnboarding.generate` (the bulk org-structure generator). Safe from the browser: `frontend/lib/api-client.ts:151` sets an `Idempotency-Key` on every non-public mutating request.
  - Owner/descendant protection ✅ — `check:owner-authority` exit 0.
  - Also fixed: `/settings/api-keys*` create **organisation-wide** keys but were gated on `settings:api-tokens:*`, which `ROLE_DEFAULT_PERMISSIONS` grants to `MEMBER`; only an in-service admin check stood in the way. Re-gated on `settings:manage` (no frontend caller exists). `revokeApiKey` now re-asserts `org_id` on the `UPDATE`.
  - **Module-access CLOSED in pass 4** (the path moved into this ticket's territory). `setModuleRolePermissionsSchema`'s `items[]` was strict at the boundary and open one level in, so a misspelt key inside an item parsed clean and `scpe` silently became the `"all"` default — a scoped grant stored **wider** than it was asked for. `POST :moduleKey/groups` now carries `@Idempotent("module-access.group.create")`; without it a retried submit hit the name check and got a 409 for a group the caller never saw created. `module-access.schemas.ts` is now 19 `.strict()` of 19 `z.object(`. Bite-proved in a `git archive HEAD` tree: schemas **2 failed / 4**, command safety **1 failed / 3**; live tree **10 passed / 10**.
  - PARTIAL (widened in pass 3): `pnpm openapi:check` — the regenerate-and-diff freshness gate — is **not run**, and the document is now provably stale: five routes moved paths this pass, so `openapi.json` still advertises `/settings/integrations/git` and `/settings/ai-usage` and carries neither canonical path. Regeneration is a release-time step for the orchestrator, not a per-agent one — it boots the app and would sweep every other agent's in-flight routes into one 7 MB artifact diff spanning two repos. The six gates that read the committed document all still exit 0. It boots the app, and boot now runs `PermissionCatalogSyncService.onModuleInit`, which would write grants into the shared Neon database. My changes cannot drift the document anyway (`x-exposure` records the class, not the key; `@Idempotent` is not stamped).
  - **RESIDUAL-RISK REGISTER 2026-09-03 — A-12 / A-12b. ASSIGNABLE, and the recorded blocker above is WRONG.**
    `pnpm openapi:check` is **not** database-coupled. Backend CI has run this exact command since it was wired
    (`.github/workflows/ci.yml:204-215`) against `DATABASE_URL: postgres://ci:ci@127.0.0.1:5432/ci` — a DSN pointing
    at nothing — and it was reproduced locally today with the same six placeholder variables: **exit 1**,
    `openapi.json is STALE`, 50 differences printed plus "and 5 more" = **55 operations**, no database contacted,
    clean `Shutdown drain complete`. So `PermissionCatalogSyncService.onModuleInit` writing into the shared Neon
    instance is not what defers this; nothing forces the real `DATABASE_URL` to be used.
    What genuinely defers it is **sequencing**: the 55 differences already span at least six lanes (nine
    `/ai/**/stream` routes, `/crm/settings/custom-fields`, `/integrations/git/connections`, `/ai/usage`,
    `/payroll/filings/export/jobs/{jobId}`, `/cron/gdpr-export-artifact-retention`, `/storage/download`,
    `/storage/image`), so it belongs at the release commit rather than in any agent's pass. That is a scheduled
    mechanical task with a named moment, not an accepted residual.
    **Owner: release orchestrator, at the release commit. Deadline: 2026-09-08.**
    **A-12b — a second, independent staleness nobody has recorded.** `pnpm check:contract-vendor` (frontend) is
    **already exit 1 at head**. The two documents agree on all 3,613 operations except one:
    `POST /gdpr/rectification/me`, a `oneOf` request body in the backend artifact and a flat object in
    `frontend/contracts/openapi.json`. The CI step is `continue-on-error`, so it will never surface there. One `cp`,
    same change as A-12. Full reasoning: `reports/residual-risk-register-19-30.md` §1.2 and §3.1.
  - **PASS 6 — "exhaustive owner/descendant protection" was asserted, not proved, and proving it found a hole.**
    `grantability.spec.ts` exercises `assertPermissionsGrantable` as a pure function exhaustively; what it
    structurally cannot see is whether each writer CALLS it, and with what. There are two writers over
    `role_permission_grants`. `RolePermissionService.setRolePermissions` passes actor rank, actor modules, target
    `{rank, moduleKey}` and the permission module map. `RbacService.assignRolePermission` / `revokeRolePermission`
    passed the grantable set and **nothing else, and never loaded the role at all**. Three consequences, each
    measured by driving the real service: a role id from another tenant reached the insert and surfaced as a **500**
    from the composite `(org_id, role_id)` FK rather than the **404** a cross-tenant miss owes; `isImmutableSystemRole`
    was never consulted, so the org-level `ORG_ADMIN` and `MEMBER` rows `setRolePermissions` refuses (for the owner
    too) were writable through this door — a structural org admin could push `settings:manage` / `settings:rbac:manage`
    onto the `MEMBER` role and hand it to every member; and the rank + module-boundary rules never ran, because
    `target`/`permissionMeta` undefined is their documented backward-compat skip. `RbacService.resolveRoleInOrg`
    closes all three on both verbs. Severity bound honestly: `@RequirePermission("settings:rbac:manage")` **and**
    `isStructuralOrgAdmin`, and **no frontend code calls either route** — an API-only surface.
    Proof: `src/modules/rbac/__tests__/grant-escalation.spec.ts`, **16 tests**, every one driving a real service.
    Bite-proved in a `git archive HEAD` tree: `rbac.service.ts` reverted to `HEAD~1` → **6 failed / 10 passed**
    (the 10 that stay green are the pre-existing behaviours, so it is not failing everything);
    `assertGrantable(…, undefined, undefined)` on the bulk writer → **2 failed**; the bulk writer's
    `isImmutableSystemRole` refusal deleted → **1 failed**; all restored → **0**. Two cases are deliberate ALLOWs
    (a module admin configuring a peer in their **own** module; a held key on a lower-rank role) so the deny is not
    a wall.
    Idempotency re-checked against the brief's caveat that `command-fence-store.ts` swallows a failed completion
    write: the grant is **naturally** idempotent, not merely fenced — `onConflictDoUpdate` on
    `uniq_role_permission_grants_role_key` `(org_id, role_id, permission_key)`, so re-granting an already-granted
    permission is a no-op with no duplicate row and no 409; revoke is a predicated DELETE; `UserPermissionGrantsService.setGrants`
    is a delete-then-insert over one `(membership, module)` partition. `setRolePermissions` is deliberately NOT
    replay-safe (CAS on `roles.version` → 409), which is correct for a bulk replace.
    Also fixed this pass, in the frontend catalogue: `ACCESS_MANAGED_MODULES` was **10 against the backend's 14**
    delegable modules and `feedbucket:access:view|manage` were absent from the `PermissionKey` union.
    `catalog-sync.test.ts` had been arranged around exactly that — it subtracted the generated `<module>:access:*`
    keys from BOTH sides and its ghost check carried an `!/^[a-z0-9-]+:access:(view|manage)$/` exemption, which is
    what stopped its phantom, union-coverage and ghost assertions from seeing any of it. Subtraction and exemption
    removed, two equality assertions added against the vendored `delegableModuleIds()`. Bite-proved three ways.
    **Correction to `reports/50-permission-route-binding.md`:** its claim that the four modules therefore have
    "no grantable access keys in the role editor" is **false for three of them**. `permission-matrix.tsx:58` calls
    `usePermissionCatalog()` = `GET /rbac/permissions`, the live backend catalogue with all 28 access keys; the
    frontend `PERMISSIONS` constant has no UI consumer at all. `blog`, `directory` and `workflows` were always
    grantable and have conforming `/<module>/access` pages. Only **feedbucket** had no surface anywhere.
    PARTIAL is unchanged in substance: the remainder is still `pnpm openapi:check` (A-12) alone.
- [x] Effective-permission resolution is batched and cached; scope expansion is bounded; indexes cover subject, role, permission, module and tenant paths.
  - Both pass-1 failures are now repaired, verified here. Scope expansion ✅ — the unordered `.limit(500)` at `access-permission.resolver.ts:283` is gone, replaced by `drainRolePermissionGrants`, a keyset drain ordered by `id`. Permission-path index ✅ — `idx_role_permission_grants_org_key (org_id, permission_key)` created by migration `0997`, confirmed present in `pg_indexes` on a head database. Batched + cached ✅; subject/role/module/tenant indexes ✅ (`check:tenant-indexes` 745/745).
  - **Pass 3: the last defect is repaired and the box closes.** The pass-2 PARTIAL was `access-permission.resolver.ts:230` reading `user_permission_grants` for one membership under an unordered `.limit(500)`. The access owner took the hand-off: `drainUserPermissionGrants` in the new `src/modules/access/access-grant-drains.ts` is a keyset drain ordered by `id`, wired at `access-permission.resolver.ts:189`, and no `user_permission_grants` read outside it remains. Verified by reading the source, not the report. `jest src/modules/access` → **40 suites / 398 tests passed**. The resolver is also down from 507 lines to **404**, so the `check:file-sizes` red named in the brief is gone — `pnpm -s check:file-sizes` → exit 0, 3565 files, all within 500.
    Dependency worth stating: that fix was **uncommitted** in the shared tree when I verified it. If the access owner's change does not land, this box regresses with it.
- [ ] Global settings hold organization configuration and access governance only. Module-owned surfaces — custom fields, automations, integrations, data hub — live in their own module's settings, and operational work is not in Settings at all.
  - **Frontend: PASS.** 23 global `/settings/*` pages, every one org configuration or access governance. Custom fields, automations, integrations and import/export appear only in module trees (58 module `settings` pages across 15 modules). Workforce at `/directory/workers`, payroll admin under `/payroll/*`; neither reachable from `/settings/*`.
  - **Backend: FAIL — every violation named, each traced to its calling hook and page.** 15 of `SettingsController`'s 23 routes are module surfaces at a global path: `/settings/custom-fields[…]` (4 routes, **CRM only** — its `entityType` enum is `lead|deal|contact`), `/settings/automations[…]` (6, CRM+HR+Support+Accounting), `/settings/integrations/git[…]` (4, Build), `/settings/ai-usage` (1, CRM, and operational not configuration). Gates verified against the live catalog: `settings:custom-fields:manage` and `settings:automations:view|manage` are held by **ORG_ADMIN and OWNER only — no seeded rung, no template**. A `CRM_MODULE_ADMIN` cannot open CRM's own custom-fields screen; a `BUILD_MODULE_ADMIN` cannot open Build's own git integrations.
  - Two further defects on the surface: `GET /settings/custom-fields` is gated on a **`manage`** key so there is no view-only rung, and `listCustomFields` is a bare `.select()` with no limit and no cursor. `POST /settings/users/:userId/role` duplicates `PATCH /organization/members/:memberId`.
  - **Pass 3 — six of the fifteen are moved, with the pattern the rest can follow.** `/settings/ai-usage` is now `GET /ai/usage` on a new `AiUsageModule` behind a new `ai:usage:view`; the four `/settings/integrations/git[…]` routes are now `/integrations/git/connections` on `GitConnectionsController` behind a new `integrations:git:view|manage` pair, with a keyset page replacing the unbounded list; `POST /settings/users/:userId/role` delegates to `OrgMembershipService`. Every old path survives one release on `SettingsDeprecatedRoutesController` — one file, one shared `SETTINGS_ALIAS_SUNSET`, a `Link` to the canonical path on every handler — so the debt is a list that can only shrink. `settings-route-gates.spec.ts` pins that nothing on the primary controller is deprecated, i.e. that the alias file is the whole of it.
  - **The rung defect the box named is closed for Build.** `MODULE_ADMIN_EXTRA_KEYS.build` now carries `integrations:git:view|manage`, so `BUILD_MODULE_ADMIN` can open `/build/settings/integrations` without borrowing `settings:manage`; `RoleGrantReconcilerService` reads the same builder at boot, so existing organisations converge with no migration (the mechanism the last box proves). Frontend followed: the three `useGitConnections` mutations were guarded on `settings:manage` and would have refused, in the browser, a write the backend now allows.
  - **New defect found and fixed on the surface that stayed.** `custom_field_definitions` is one table serving CRM, Support (`ticket`), HR (`employee`) and Build, and every other module constrains reads *and* writes to its own `entityType`. This route constrained neither: `updateCustomField` and `deleteCustomField` keyed on `(id, org_id)` alone, so a holder of `settings:custom-fields:manage` — a key no module rung carries — could rename or drop another module's definition by id through a global path. Every predicate now names the CRM entity types and a foreign row is a **404**, not a 403. Bite-proved: predicates stripped → **2 failed / 6**.
  - **Pass 4 — custom fields moved; five automations routes are left.** `/settings/custom-fields[…]` is now `CrmCustomFieldsModule` behind a new `crm:custom-fields:view|manage`, mirrored verbatim in the frontend catalog (`frontend/lib/rbac/permissions/crm.ts` + `permission-key-extended.ts`) so `useCan` can gate it. Naming the keys in the `crm` namespace is what puts them on the module rung: `moduleScopedPermissions("crm")` picks them up with no `MODULE_ADMIN_EXTRA_KEYS` entry and `RoleGrantReconcilerService` delivers them at boot — **no backfill migration written, deliberately**. The old paths survive one release on `SettingsDeprecatedRoutesController` under `SETTINGS_ALIAS_SUNSET`. The frontend page is already at `/crm/settings/custom-fields` (58 module settings pages across 15 modules; no global `/settings/*` page owns a module surface).
    The recorded sharp edge held: **the global rung was not widened.** `settings:custom-fields:manage` is not module-scoped, so granting it to `CRM_MODULE_ADMIN` would have let a CRM admin manage HR's and Support's field definitions through the same global path — a 403 traded for a cross-module privilege.
    PARTIAL: **the 6 `/settings/automations[…]` routes stay**, and the four options for their rung — leave it global; derive the module from `triggerEvent` and gate per row; a first-class `automations` module key; split by ownership — are written up with costs and hazards in `reports/19b-automations-rung-decision.md`. Counted from the source: **48 triggers across four modules** (HR 27, CRM 8, Support 7, Accounting 6) plus four `support_*` actions, so no single module rung fits and a rung was not invented. This is a product decision.
    Verified after the move: `pnpm -s check:tenant-isolation` -> **929 / 929 (100%), exit 0** — the renamed `crm-custom-fields-tenant-isolation.spec.ts` still maps its service. `openapi.json` does need a regenerate (the four paths moved); that is release-time, see box 3.
    PARTIAL: `components/layout/sidebar/sidebar-nav-groups-work-management.ts` still gates `/build/settings/integrations` on `settings:manage`, so a `BUILD_MODULE_ADMIN` who now holds the key still does not see the sidebar item (the page works by URL). Flipping it to `integrations:git:view` is one line, but `check:route-access-contract` reads `frontend/contracts/openapi.json` — a vendored copy of the backend document — and fails on a nav key no *generated* operation carries. The one-line flip must land in the same change as `openapi:generate` + `check:contract-vendor`. Measured both ways: with the flip exit 1, reverted exit 0.
  - **RESIDUAL-RISK REGISTER 2026-09-03 — this box has TWO halves and only one is a product decision.**
    **R-12 (ACCEPTED RESIDUAL · DECISION).** The 6 `/settings/automations[…]` routes' rung is a genuine product
    decision — 48 triggers across HR 27 / CRM 8 / Support 7 / Accounting 6, four options costed in
    `reports/19b-automations-rung-decision.md`, no single module rung fits. **Owner: release owner (product).
    Deadline: 2026-09-10.**
    **A-13 (ASSIGNABLE).** The sidebar one-liner is mechanical and its coupling was verified rather than taken
    on trust: `sidebar-nav-groups-work-management.ts:215` still reads `requiredPermission: "settings:manage"`, and
    `integrations:git:view` occurs **0 times in `streamlineos-backend/openapi.json` and 0 times in
    `frontend/contracts/openapi.json`**, so the flip really would fail `check:route-access-contract` (re-run at
    head: **exit 0**, 203 keys checked, 627 `x-permission` entries). The coupling dissolves the moment A-12 lands.
    **Owner: whoever lands A-12, in the same change. Deadline: 2026-09-08.**
  - **PASS 6 — the criterion is now stated in source, and the inventory this box has run three times was short by three routes.**
    An unstated criterion makes this box unfalsifiable, so it is written at the top of the new
    `src/modules/settings/settings-surface-census.spec.ts`: a route belongs at a global `/settings/*` path iff
    **(a)** its subject is the organisation itself, the access graph over it, or the viewer's own principal
    (`frontend/CLAUDE.md` §17 names `/settings` My Account as universal), **and (b)** it is configuration or
    governance rather than the work itself — with three falsifiable corollaries, OWNERSHIP (one module owns the
    rows → the route is that module's), RUNG (the intended user needing a `settings:*` key for their own module's
    surface means both key and path are misnamed) and OPERATION (content that changes as work happens, not as
    policy changes, is operational). Each has already caught something: custom fields and git connections moved on
    OWNERSHIP, `BUILD_MODULE_ADMIN` on RUNG, `/settings/ai-usage` on OPERATION.
    **Why the count was wrong.** `settings-route-gates.spec.ts` is a strong file — it runs the real `PermissionGuard`
    over real metadata in both directions — but it can only see controllers it **imports by name**, so it is
    structurally blind to a controller mounted at `settings/*` from elsewhere in the tree, and every pass of this
    box enumerated `SettingsController` and stopped. The census instead walks all of `src/` for `*.controller.ts`,
    pre-filters on the text `@Controller("settings…")` and reflects real Nest metadata (`PATH_METADATA`,
    `METHOD_METADATA`, `REQUIRE_PERMISSION`) rather than parsing source. **26 routes across 4 controllers**, each
    requiring an explicit verdict. Three had never been counted:
    `POST /settings/automations/:ruleId/test` (`modules/automation/automation.controller.ts`) and
    `GET /settings/email-templates/preview` + `POST /settings/email-templates/test`
    (`modules/email/controllers/email-templates.controller.ts`).
    **So R-12 is SEVEN routes, not the six `reports/19b` costed.** Verdicts: 6 ORG-CONFIG, 1 ACCESS-GOVERNANCE,
    10 SUNSET-ALIAS (pass 3's and pass 4's moves verified by artifact), 9 PENDING-MOVE (automations ×7 + email
    templates ×2). Frontend re-enumerated from disk: **23 `/settings/*` pages, all PASS** — no global page owns a
    module surface, and the automations screens already live at `/crm|/support|/accounting|/hr .../settings/automations`,
    so only the backend path and key are global.
    Bite-proved four ways in a `git archive HEAD` tree: a brand-new `@Controller("settings/data-hub")` added
    elsewhere in `src/` → **exit 1**, naming the route AND its file; `email-templates.controller.ts` removed →
    exit 1 on the stale-inventory assertion; `@RequirePermission` stripped off `GET /settings/feature-flags` →
    exit 1 on "the census is not a bypass"; all restored → exit 0. `jest settings-surface-census` → **8/8**.
    **NEW, cross-territory, NOT fixed — `POST /settings/email-templates/test` has no tenant scoping at all.**
    `EmailTemplatesController.test()` takes `@Body()` only — no `@CurrentUser()`, no `orgId` — and
    `EmailRoutesService.sendTemplateTest` renders a static `TEMPLATE_MAP` entry and sends it to an arbitrary
    address from the platform's sender, with no `@UseRateLimit` and no audit. `settings:email-templates:manage` is
    carried by the **`HR_ADMIN` role template** (`role-templates-crm-hr.constants.ts:221`), so it is reachable from
    a shipped template rather than only by an owner. No tenant data crosses (the templates are static), so it is an
    **abusable send**, not a BOLA. **Owner: the email module.**
    **NEW — `GET /settings/permissions` is a duplicate door with a weaker key.** `SettingsService.getPermissions()`
    returns the same `PERMISSIONS` constant `GET /rbac/permissions` returns, but behind `settings:view` (three role
    templates plus `MODULE_ADMIN_EXTRA_KEYS.hr`) rather than `settings:rbac:manage`, and nothing calls it. Static
    product data, so no tenant leak; recorded rather than deleted, since §10 forbids a dead-code claim from text
    search alone.
    PARTIAL stands: R-12 remains a product decision, now over 7 routes, and the email-templates pair is assignable
    to another territory.
  - **PASS 8 — A-13 CLOSED; R-12 narrowed to a measured prerequisite; the email-templates verdict was WRONG and is corrected.**
    **A-13 is closed.** Its blocker was verified rather than transcribed and had genuinely dissolved: `integrations:git:view`
    now occurs **4 times in `streamlineos-backend/openapi.json` and 4 times in `frontend/contracts/openapi.json`**, and
    `pnpm -s check:contract-vendor` is **exit 0**. Flipped both sites in
    `components/layout/sidebar/sidebar-nav-groups-work-management.ts` — the route (`:215`) and the Build group's admission
    list (`:160`, whose `settings:manage` entry existed only to admit that one child).
    **Strictly widening, checked not assumed:** `ROLE_DEFAULT_PERMISSIONS` gives `OWNER` and `ORG_ADMIN`
    `ALL_PERMISSION_NAMES`, and **no role template carries `settings:manage` at all**, so nobody who saw the item loses it
    while `BUILD_MODULE_ADMIN` gains it. Proof: `check:route-access-contract` **exit 0, 204 keys checked (was 203)** — the
    key is now contract-backed; `check:contract-vendor` exit 0; `jest --testPathPattern="components/layout"` **18 suites /
    126 tests, exit 0**; frontend `type-check` **exit 0**. `sidebar-nav-inventory.test.ts`, a sha256 lock over the whole nav
    graph, bit on the first run (1 failed / 126) and its digest was updated with the dated reason its convention requires.
    Commit `3c45e63bb` (frontend).
    **R-12 is NOT adoptable as written, and this is new.** Report 19b recommends Option 2 (derive the module from
    `triggerEvent`, gate per row) and warns its map must **fail closed**. The map already exists — in the frontend,
    `components/automations/automation-trigger-data.ts` — and it ends `?? "hr"`. Counted from source, three vocabularies:
    engine enum `AUTOMATION_TRIGGERS` **55**, write schema `automationTriggerSchema` **48**, frontend `TRIGGER_META` **33**.
    **19 of the 48 accepted triggers do not resolve to their owning module**: 15 are unmapped and fall to the default, and
    **4 more are explicitly mapped to `hr`** (`sla.breached`, `expense.submitted`, `reimbursement.approved`,
    `reimbursement.rejected`), so the map is partly *wrong*, not merely short. Conservatively (leaving the arguable
    `expense.*`/`reimbursement.*` out): 6 `lead.*`/`deal.*`, 3 `ticket.*`, `sla.breached` and `invoice.paid` all resolve to
    `hr`. **This is already user-visible**, because
    `features/shared/automations/module-automations-settings.tsx:224-228` filters both the list and the create picker on
    that map: `/support/settings/automations` shows **3 of Support's 7** triggers, `/accounting/settings/automations` shows
    **1 of finance's 6**, and the rest appear on no screen at all (`sectionModule` is only ever `support` or `finance` —
    `/hr` and `/crm` use their own tables). Adopting Option 2 on this map would gate `ticket.escalated` and `deal.won` on
    the **HR** rung: a wrong-module key traded for a too-high one. **R-12 therefore has a prerequisite — close the map
    first** — which is mechanical and compiler-enforceable (a total `Record<AutomationTrigger, TriggerModule>` once the
    union is the real 48). Not fixed here: `components/automations/**`, `features/shared/automations/**` and
    `hooks/api/automations.ts` are outside this ticket's territory (`ORCHESTRATION.md:31`; `frontend/hooks/` is ticket 28).
    **The census's email-templates verdict was wrong.** It said `why: "owner: modules/email …"`, which reads as a
    mechanical hand-off a next pass would go looking for. Measured: `TEMPLATE_MAP` is **65 templates across 12 categories**
    from 12 registry files; `getTemplatePreviews()` takes **no `orgId`** and renders static entries; **neither route has any
    frontend caller**, while CRM and HR each already have their own template surfaces on their own module keys
    (`crm:email-templates:manage`, `hr:email-templates:manage`) — so the global pair is a third, API-only door beside two
    module-owned ones. `modules/email` is where the code lives, not a module that owns a surface. The pair has **R-12's
    shape**, and differs only in that its subject is not the organisation at all, so the answer is probably platform
    administration rather than a module rung — the same class of product decision, and not invented here. Exposure
    re-measured and pass 7's correction holds: `settings:email-templates:manage` is on the shipped **`BRANCH_HR`** template
    (`role-templates-crm-hr.constants.ts:221`, inside `BRANCH_HR` 175–279). Corrected in source with a new falsifiable
    assertion — *the email-template catalogue is cross-module, so OWNERSHIP cannot resolve that pair* — so if the registry
    ever collapses to one category the move becomes mechanical and the test says so. `jest settings-surface-census` →
    **exit 0, 9 tests** (was 8); `pnpm -s check:spec-typecheck` → **exit 0**. Bite-proved in a `git archive HEAD` tree,
    never the shared tree: every `category:` collapsed to one value → **exit 1**, `Expected: > 1`; 36 of 65 templates
    hidden → **exit 1**, `Expected: >= 60 / Received: 29`; restored → **exit 0, 9/9**. Commit `05e9ec60` (backend).
    **Re-verified rather than transcribed:** the frontend is still **23 `/settings/*` pages**, all org configuration or
    access governance (`/settings/incoming-transfer` is ownership transfer on `ownership:transfer:respond`;
    `/settings/webhooks` is org-wide on `settings:webhooks:manage`) — but the earlier flat "Frontend: PASS" is
    **over-stated**, and the paragraph above is the correction. Also checked before reasoning about it: the global
    automation engine is **live and genuinely cross-module** (`runAutomationsForEvent` is called from `leads`, `deals`,
    `expenses`, `support`, `hr/*`, `payroll` and the `workflows` engine), and is not a duplicate of `crmAutomationRules`
    or `/hr/automations`, which are separate tables — so 19b's premise survives.
    **PARTIAL stands.** Box 6 needs 9 routes moved off `/settings/*`. R-12 (7) is a product decision now carrying a
    measured, assignable prerequisite; the email pair (2) is a platform-administration decision. Full detail:
    `reports/19e-settings-placement-a13-and-r12-prerequisite.md`.
  - **PASS 8, SECOND FINDING — the moves passes 3 and 4 recorded as done are NOT done, and cannot be finished by a URL
    edit.** The box's own standard is "a move is only done when every inbound link is updated", so I grepped both repos.
    **Three of the four moved surfaces still have every frontend caller on the sunset alias**, and `SETTINGS_ALIAS_SUNSET`
    is **`2027-03-31`** — the date they break. The census marks 10 routes `SUNSET-ALIAS`, i.e. moved; **6 of those 10 are
    dual-homed, not moved.** Only the CRM custom-fields hook was actually repointed.
    `hooks/api/git-integration.ts:61,71,81,91` → `/settings/integrations/git[…]`;
    `hooks/api/ai.ts:264` → `/settings/ai-usage`; `hooks/api/users/bulk-mutations.ts:65` → `POST /settings/users/:userId/role`.
    **Two of the three are not URL swaps.** The git alias is a **shape adapter, not a redirect**:
    `settings-deprecated-routes.controller.ts:90-95` calls the canonical service with `limit: 100` and does
    `return page.data`, unwrapping the keyset page to a bare array, while `GET /integrations/git/connections` returns the
    page. The hook declares `apiClient.get<GitConnection[]>` — a **cast, not a validation** — so repointing the URL alone
    typechecks clean in both repos and renders a broken list. That is AGENT-BRIEF rule 11's exact defect class, and it is
    why I did not repoint it; the migration must adopt the cursor in the same change. (Measured in passing: an org with
    more than **100** git connections silently sees 100 through the alias today.) The user-role one is not a swap either:
    `POST /settings/users/:userId/role` on `settings:rbac:manage` against `PATCH /organization/members/:memberId` on
    `settings:organization:manage` — different verb, **different path identity** (the caller holds a `userId`, the
    canonical wants a `memberId` it must first resolve) and a different key, so the set of principals who can do it
    changes. Only `/settings/ai-usage` → `/ai/usage` is a clean swap (the alias delegates straight through on the same
    `ai:usage:view`). **Not fixed: `hooks/api/**` is ticket 28's territory and two of the three need the owning screen
    re-tested, not a string replaced. Owner: whoever holds `frontend/hooks/`, before 2027-03-31.**
  - PARTIAL: 9 backend routes remain at a global `/settings/*` path. **R-12** (7 automations routes) is a product
    decision on the rung, and now also blocked on a mechanical, cross-territory prerequisite — the trigger->module map
    is 33 of 48 and fails open to `hr`, with 4 entries explicitly wrong, so gating rows on it would be worse than the
    defect. **The email-templates pair** (2 routes) is a platform-administration decision, not the `modules/email`
    hand-off the census used to claim. A-13, this box's other PARTIAL, is CLOSED. Nothing here is blocked on effort or
    on infrastructure.
- [x] Workspace and onboarding gates, organization-switch state, query-key tenant isolation and auth error states are covered by allow/deny/cross-tenant tests.
  - Evidence: FE `jest lib/query-scope-isolation lib/prefetch/access lib/wizard-gate lib/membership-lifecycle-route hooks/api/access` → **8 suites / 44 tests passed**. BE `jest src/modules/organization` → **57 suites / 393 tests passed**, including 14 tenant-isolation specs and `org-switch-revalidation.spec.ts`. Query-key isolation is structural: `QueryProvider` remounts a new `QueryClient` keyed on `authenticated:<orgId>:<userId>`.
- [x] A permission-key addition to a role template is accompanied by a backfill migration, or it is inert for every organization that already exists.
  - **Closed by mechanism, and the mechanism is measured on a database, not read from SQL.** `RoleGrantReconcilerService` — called from `PermissionCatalogSyncService.onModuleInit` *after* the catalog sync, deliberately — converges every seeded rung and every template-materialised role still at `version = 1` on what the seeder and `ROLE_TEMPLATES` would produce today. A widening is therefore **not** inert for organisations that already exist, and needs no migration.
  - Proof on a local scratch database (`scratch_t19_rbac`, schema from a head DB), seeding one org under the *previous* release's catalog (692 of 698 keys) and then booting: **`0990` inserted 0 grants** (0 rows match `is_system = true AND slug = 'CUSTOMER_SUPPORT'`; 1 row matches the `is_system = false` shape the product actually creates), and **the reconciler then inserted 18**, giving `CUSTOMER_SUPPORT` **6/6** of the keys `0990` targeted and all 40 of its template keys. A role moved to `version = 2` was left untouched (5 → 5 grants). A second boot inserted **0**.
  - A migration structurally cannot do this: `role_permission_grants.permission_key` has an FK to `permissions.name`, `permissions` is filled at boot after `db:migrate`, so a backfill for a key new in the same release finds no catalog row, its `EXISTS` guard skips the key, and nothing re-runs.
  - `jest backfill-slugs-exist.spec.ts` → **8/8 passed** (was 1 failed / 5). `0990` is recorded in a new, separate `SUPERSEDED_BY_RECONCILER` list — **`KNOWN_INERT_BACKFILLS` was not touched and still holds 9** — and that list carries a proof obligation: a new test asserts every key the superseded migration named is one `buildDesiredGrants` actually grants for the slug it named. Bite-proved: removing `support:tickets:view` from the template → **1 failed / 7**, file restored, sha verified. A third test pins that the reconciler still reads `ROLE_TEMPLATES`.
  - Deliberate limit, stated rather than hidden: a role an administrator has written (`version > 1`) is never reconciled, so an owner's revocation is never resurrected — the invariant `seed-system-roles.spec.ts` protects.
  - Follow-up handed off, not blocking: `backend/CLAUDE.md` §5 still instructs "must ship a backfill migration too", which now produces a dead migration every time it is followed. Replacement wording in report P2.0.

## Found in pass 6 and handed off (not part of the seven boxes)

> **Pass 7 (report `19d`): four of these six are FIXED and bite-proved** — the two email/settings
> route findings and the two RBAC ones. Commits `5a0505af`, `8634cba3`, `30be04dc`, `afb0a1f1` in
> `streamlineos-backend`. The two remaining entries are product decisions and were deliberately not
> answered. Individual entries below are annotated.

- **FIXED (`5a0505af`) — `POST /settings/email-templates/test` sent with no tenant scope.** No `@CurrentUser()`, no `orgId`, no rate limit, no audit. Abusable send from the platform's mail identity, not a BOLA (the templates render from static input).
  - **Correction to this entry as written:** the key is on the **`BRANCH_HR`** template, **not `HR_ADMIN`**. `role-templates-crm-hr.constants.ts:221` is inside `BRANCH_HR` (which starts at line 175); `HR_ADMIN` spans 80–174 and does not carry it. Measured: `settings:email-templates:manage` → seeded rungs (1) `ORG_ADMIN`, templates (1) `BRANCH_HR`.
  - Now takes `@CurrentUser()`, sends **only to the caller's own account address** (canonical compare; a foreign address is a 403 and sends nothing), stamps `organizationId` + `recipientUserId` so the outbox row is `TENANT` not `PLATFORM`, mounts `RateLimitGuard` with the **registered** tier `settings:email-template-test` (5/3600s), and audits `settings.emailTemplate.test`.
  - New `src/modules/email/email-template-test-scoping.spec.ts` — **11 tests**. Bite-proved with four *surgical* plants in a `git archive HEAD` tree, each moving a different assertion: destination check deleted → 5 failed/6; tier renamed to an unregistered key → 1 failed/10; org scoping dropped → 1 failed/10; `audit.log` removed → 1 failed/10; all restored → 11/11, exit 0.
  - `scripts/functional/int-email.test.mjs` no longer makes its one real external send — the case that used to send is now the 403 that proves the restriction. The script triggers **zero** external sends.
  - **Placement is NOT fixed:** both `/settings/email-templates/*` routes remain `PENDING-MOVE` in the census. The abuse hole is closed; whether platform transactional templates belong at a global `/settings/*` path is still open.
- **FIXED (`8634cba3`) — `GET /settings/permissions` duplicated `GET /rbac/permissions` behind `settings:view`. Deleted.**
  - Exposure measured, not described: `settings:view` → **4 seeded rungs** (`ORG_ADMIN`, `HR_MODULE_ADMIN`, `HR_MODULE_OWNER`, `HR_MODULE_MEMBER` — the lowest HR rung) **+ 3 templates** (`HR_ADMIN`, `BRANCH_HR`, `RECRUITER`); `settings:rbac:manage` → **1 rung** (`ORG_ADMIN`), 0 templates. Seven principals through the side door, one through the front. The payload was also poorer — `/rbac/permissions` returns `DISCOVERABLE_PERMISSIONS` with `baselineScope`, this returned the raw constant.
  - Proved uncalled on three independent lines, per §10: the contract registry classifies it `"internal"` with `consumers: []` (so architecture decision 12 and `check:contract-breaking-change` permit removal); no frontend module calls it — the role editor's `usePermissionCatalog()` goes to `/rbac/permissions`; and `knip` before/after is byte-identical, so no symbol became newly unused.
  - Chosen over re-keying because re-keying leaves two byte-identical routes behind identical gates. Bite-proved: re-adding the route without a census entry → exit 1, naming the route and its file.
- **`hr:contracts:view|manage` — the product decision, stated with the exposure MEASURED, not transcribed.** Executing `buildSeededRoleSpecs(new Set(ALL_PERMISSION_NAMES))` gives: `hr:contracts:view` on **3 seeded rungs** (`HR_MODULE_ADMIN`, `HR_MODULE_OWNER`, `HR_MODULE_MEMBER`) and **0 of 13 role templates**; `hr:contracts:manage` on **2 rungs** (`HR_MODULE_ADMIN`, `HR_MODULE_OWNER`) and **0 templates**; 44 seeded rungs in total. `moduleScopedPermissions("hr")` returns every `hr:*` key, so every newly seeded organisation can already delegate contracts. Report 50's "only org owners can use contracts" is therefore **wrong** — it read the 13 templates and not the 44 rungs. The real exposure is narrower: a person given `HR_ADMIN` / `BRANCH_HR` / `RECRUITER` rather than an HR module rung cannot use contracts. Whether those three templates should carry `hr:contracts:*` is **a product decision and no answer was picked here**.
- **`feedbucket` is delegable and administrable with `route: null`.** The backend seeds `FEEDBUCKET_MODULE_ADMIN|OWNER|MEMBER` and generates `feedbucket:access:view|manage`, but the module owns no product surface (it renders inside `/build/[projectId]/feedbucket`), so there is nowhere to hang an access screen and none exists. The two keys are now in the `PermissionKey` union and the frontend catalogue, and `module-access-route-invariants.test.ts` records the missing page as the single named exemption with its reason — so the gap is written down rather than invisible. **Where the screen belongs is a product decision.**
- **FIXED (`30be04dc`) — `RbacService.getDiscoveryGrantable` recomputed `assignableRanks` as a raw `rank > bestRank`** instead of calling `canGrantToRank`, so it omits the peer-`MODULE_ADMIN` exception the writer allows. The read is *stricter* than the write, so it under-advertises rather than over-advertises — but `canGrantToRank`'s own comment says both sides must import it and one side did not.
  - The read now calls `canGrantToRank`, evaluated over the modules the actor administers. Two independent signals that the READ was the odd one out: `module-standing-roster.service.ts:401` (the sibling read) already called it, and `grant-escalation.spec.ts` already asserts the writer *allows* a module admin editing a peer-rank role in their own module.
  - **An existing test had encoded the defect**: `grantable-discovery.spec.ts` asserted `assignableRanks` "excludes MODULE_ADMIN rank and above". It now derives its expectation from `canGrantToRank` itself.
  - New `discovery-write-path-agreement.spec.ts` — **12 tests**: three actor contexts x three ranks, asking the read and the **real** `setRolePermissions` the same question and requiring the same answer. Bite-proved at the pre-fix service: exit 1, **4 failed / 18 passed**, and the four are exactly the peer-`MODULE_ADMIN` cases.
  - Product impact today is nil — `assignableRanks` is declared in `frontend/hooks/api/access-schema.ts` but has no UI consumer. The value is that the contract is self-consistent and cannot drift back silently.
- **FIXED (`afb0a1f1`) — `assertMayAssignRole` authorised a role on a sample.** `assert-role-assignment.ts:27` reads the target role's grants under an unordered `.limit(500)` before checking them, reachable from `role-member.service.ts:200` and `principal-groups.service.ts:285`. No seeded role reaches the cap (largest namespace is `hr` at 135 keys), but a custom role can hold up to 704 and `setRolePermissionsSchema` caps `items` at 500 **per write**, not per role. Same shape as the unordered-limit drains box 4 closed in `access-permission.resolver.ts`.
  - **Sharper than "nondeterministic": it is a bypass.** Any grant outside the 500-row slice was never checked at all, so an unconferrable key past the window was silently authorised and the role handed over.
  - The read is now ordered by `permission_key` and bounded at `MAX_EVALUABLE_ROLE_GRANTS + 1` (5000+1); a role above the ceiling is **refused outright** rather than decided from a partial view. The `.limit()` is kept deliberately so `check:unbounded-reads` still sees a bounded read.
  - New `role-assignment-grant-sampling.spec.ts` — **7 tests**, each building a role whose grant count crosses the window with the single unconferrable key planted **beyond** it, plus a vacuity guard and a negative control. The `db` double returns the first *n* rows in insertion order — the friendliest planner an unordered `LIMIT` could have — so a defect that bites here bites under every real plan.
  - Bite-proved against the pre-fix file: exit 1, **5 failed / 2 passed**, the decisive failure being `Received promise resolved instead of rejected` — the unfixed code **authorised** an assignment it should have refused. Repeated through the real caller `RoleMemberService.addRoleMember`.

## Found in pass 3 and handed off (not part of the seven boxes)

- **`check:tenant-isolation` regressed mid-pass and was closed by its owner while pass 3 was running.** It read exit 1 / `MISSING src/modules/organization/setup/org-setup-completed-consumer.service.ts` (that service arrived in `f4c7bdf5`, before this pass started); `deff6b6f` added the suite and the gate now reads **exit 0**. Recorded because the hand-off was written, not because it is still open.
- **The CRM custom-fields hook now reads a capped page.** `frontend/hooks/api/crm/custom-fields.ts:50` calls `/settings/custom-fields?entityType=…` and destructures `{ fields }`. The route is now a keyset page (default 50, cap 100) and returns `{ fields, pagination }`; the projection also changed from the raw columns to `name`/`sortOrder`, which is what the hook's `CustomFieldDefinition` type already declared, so that half is a drift repair. An org with more than 50 CRM custom fields will silently see 50 until the hook follows the cursor. `hooks/api/**` response contracts are another agent's territory.
- **`SettingsService` no longer needs `PlanLimitsService` or `AccessService`.** Both were injected only for `updateUserRole`, which now delegates. `BillingModule` stays in `SettingsModule`'s imports for `SettingsAutomationsService`; nothing else was removed.

## Found in pass 2 and handed off (not part of the seven boxes)

- **P0 — organisation creation is broken at head.** `600b9b7c` registered `feedbucket` as plan-gated and delegable, putting it in `MODULE_ADMIN_MODULES`, but no migration ever inserts it into `modules_catalog`, and `0634` gave `roles.module_key` an FK to that table. `seedSystemRolesForOrg` raises `23503` on `FEEDBUCKET_MODULE_ADMIN`, inside `createOrganization`'s transaction, so the whole organisation rolls back. Reproduced on a scratch database. New gate `src/modules/rbac/__tests__/seeded-role-modules-are-catalogued.spec.ts` is **deliberately RED** on exactly this one offender; the one-statement fix is a migration and is written out in report P2.1 for ticket 03.
- **Product decision resurfaced.** The pass-1 note is stale: `CUSTOMER_SUPPORT` now carries `tickets:view|create|reply|manage` (11 of the 25 support keys). The live defect is one rung down — `SUPPORT_MODULE_MEMBER`, what a support agent actually gets in a new organisation, holds 9 view-only keys and **cannot create, reply or leave an internal note**. It can read the inbox and not answer it. Recommendation in report P2.6: add the three verbs to `MODULE_MEMBER_EXTRA_KEYS.support` (now a one-file change — the reconciler backfills it), and separately decide `manage ⇒ view` globally in `computeUserPermissions` using the existing `impliedViewKey`.
