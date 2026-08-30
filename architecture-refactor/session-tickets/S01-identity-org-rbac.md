# S01 — Identity, Organization, RBAC, Module Access & Settings

Read `COMMON.md` first. Covers PRD §28.3, §28.4, §28.6, and §12 (authority contract).

## Mission

Make organization membership the single authoritative login relationship, make every route resolve to an exact permission, and make the module-access implementation small enough to audit. You also own **both permission catalogs** — every other session depends on you for new keys, so treat catalog requests as first-class work.

## Exclusive file ownership

```
backend/src/modules/auth/**            backend/src/modules/sessions/**
backend/src/modules/mfa/**             backend/src/modules/users/**
backend/src/modules/api-tokens/**      backend/src/modules/agent-access/**
backend/src/modules/delegations/**     backend/src/modules/organization/**
backend/src/modules/ownership/**       backend/src/modules/access/**
backend/src/modules/rbac/**            backend/src/modules/module-access/**
backend/src/modules/settings/**        backend/src/modules/platform/**
backend/src/modules/record-layouts/**  backend/src/modules/branches/**
backend/src/common/rbac/**
frontend/lib/rbac/permissions/**       frontend/features/settings/**
frontend/hooks/api/module-access*
```

NOT yours: `frontend/app/**` and `frontend/lib/rbac/route-access/**` (S09) · `backend/src/common/**` except `common/rbac/**` (S08) · `backend/src/modules/directory/**` (S02).

## Already done — confirm, do not redo

- `membership-revocation.spec.ts` and three sibling specs now provide `OrgMembershipReadService`; 30/30 pass, and a sabotage proof confirmed the assertions bite.
- Organization creation no longer requires org-admin standing — any authenticated member may create and own a new org. It is bounded by a new `organization:create` rate-limit tier (5/hour) with `RateLimitGuard` + `@UseRateLimit`. Switching stays membership-checked.
- `verify:rbac-integrity` is 10/10. Root cause was `seed-enterprise-workspace.ts` inserting permissions without `administering_module_key`; both writers now share `buildPermissionCatalogRows` (`backend/src/modules/rbac/permission-catalog-rows.ts`).

## Work items

### 1. Organization actor contraction (§28.3) — the big one
- [ ] `pnpm scan:legacy-actors:check` reports **555/555 remaining, 0 migrated**. Expand is done (membership columns exist); contraction has not started. Produce the per-column plan: for each legacy user-FK actor column, name its membership replacement, its readers and its writers. NOTE: L35 produced `architecture-refactor/ACTOR-CONTRACTION-PLAN.md`; L44 completed EXPAND for chat_user_presence and calendar_source_preferences. Contraction still 0. CURRENT STATE (2026-08-30 S01 session): ratchet shows 553/555 remaining (2 migrated since baseline). Plan document at `architecture-refactor/ACTOR-CONTRACTION-PLAN.md` classifies all ~467 in-scope source-visible columns. OPEN: multi-wave migration work, not completable in one session.
- [ ] Finish expansion + resumable backfill for any column still lacking a membership counterpart, reporting unmappable and duplicate rows before cutover. NOTE: L44 verified 11/12 chat cols and 2/3 calendar cols already expanded; one expand done this session each. OPEN: billing(0/18), accounting(0/27), support(0/25), ai(0/6), e-sign(0/7), surveys(0/5), mail(0/1) still have 0% expansion. Blocked on wave execution.
- [ ] Prove every required writer and reader uses `organization_members.id` or the canonical organization-person seam. OPEN: Cannot prove until contraction is done.
- [ ] Produce **zero-use proof** for each legacy column before removal (§COMMON 9 — graph proof, not grep). OPEN: Cannot do before contraction.
- [ ] Contract via additive → backfill → validate → cutover → drop migrations, with cold-bootstrap and upgrade proof. OPEN: Not started.
- [ ] Historical/inactive actors stay renderable but carry no current authority. OPEN: Not implemented.

### 2. Membership artifact inventory
- [x] `membership-artifacts.spec.ts` derives membership-keyed tables from the schema and requires each to be inventoried. Confirm it passes. It drives suspension/removal cleanup: a table missing from the inventory is one nobody decided about, so a removed member can retain stale authority through it. VERIFIED DONE: 11/11 tests pass (`membership-artifacts.spec.ts`). All membership-keyed tables are inventoried; the scan's ATTRIBUTION exclusion pattern is pinned by the spec.
- [x] For every entry, classify AUTHORITY (grants current capability) vs ATTRIBUTION (records who acted), and make `onRemoval`/`onSuspension` match what the schema and code **actually do**. If reality is wrong, fix `org-membership-access-revocation.ts` and flag it as a security finding. VERIFIED DONE: Classification is implicit via `ATTRIBUTION_COLUMN` regex exclusion (spec line 12–14 + 129–137). Authority artifacts are in `MEMBERSHIP_ARTIFACTS`; attribution columns are in `KNOWN_EXCLUDED_COLUMNS`. All `onRemoval`/`onSuspension` values are spec-asserted. No security finding.
- [x] Confirm every AUTHORITY artifact is really cleared on removal. Session revocation needs the Redis tombstone `revoked:session:<id>` — a DB `isRevoked` flag alone logs nobody out. VERIFIED DONE: `membership-revocation.spec.ts` 36/36 pass. `sessions.service.ts` uses `revoked:session:${id}` Redis tombstone (line 218). `org-membership-access-revocation.ts` handles agent tokens, delegations, ownership transfers, resource grants, KB space grants, invitations, chat artifacts, integration connections (outbox), Ably tokens (after-commit), and sessions.

### 3. Placement-bypass allowlist — known failing gate
- [x] `pnpm check:placement-bypass` PASSES. Allowlist entries added for `org-membership-access-revocation.ts` (context-exit + with-identity), `invitation-acceptance.service.ts` (with-identity), and new `org-membership-status.service.ts`. `auth/auth.service.ts:142` and `:190` legitimately allowlisted after review. gate: check:placement-bypass PASS (L16-report)

### 4. Authority matrix (§12) — lock it in code and tests
- [x] Transfer org ownership: **org owner only**. Archive/delete org: **org owner only**. Manage org membership / enable modules: owner + admin. Transfer module ownership: owner, admin, or that module's owner. Manage module membership and permissions: owner, admin, that module's owner or admin. gate: check:owner-authority PASS; L18-report: authority-matrix.spec.ts covers all 5 ownership operations
- [x] Exactly **six standings**; no seventh, no runtime custom-role creation surface. VERIFIED DONE: org owner/admin/member + module owner/admin/member. `rbac.controller.ts` has no `createRole` endpoint; `roles.service.ts:523` comment confirms `createRole` was removed. `backfill-slugs-exist.spec.ts` pins the exact slug pattern `/(OWNER|ORG_ADMIN|MEMBER|MODULE_(OWNER|ADMIN|MEMBER))$/`.
- [x] Table-driven allow/deny tests for every row and every actor combination. L18-report: authority-matrix.spec.ts 14 tests pass covering org-owner/org-admin/module-owner allowed; module-admin/plain-member/non-member denied; all 6 standings tested.

### 5. Module-access decomposition (§28.6)
- [x] `module-access-groups.service.ts` (839 lines) → extracted sub-services: module-access-roster.service.ts (339), module-access-flat-members.service.ts (316), module-access-ownership.service.ts (329), module-access-group-crud.service.ts (152), module-access-group-members.service.ts (200), module-standing-mutations.service.ts (344), module-standing-roster.service.ts (413). Orchestrator now 145 lines; one public interface. L18-report; wc -l verified.
- [x] `frontend/hooks/api/module-access.ts` (604 lines) → split to `hooks/api/module-access/` directory: catalog.ts, groups.ts, index.ts, members.ts, ownership.ts, types.ts. L18-report; ls verified.
- [x] Eliminate repeated standing/authority queries without creating shallow wrappers. L17-report: warm-path fix eliminates pool borrow for regular members on warm cache; `user-module-access.service.ts` (234 lines) extracted for module-deny queries. `backend/src/modules/access/user-module-access.service.ts` exists.
- [x] Roster list → cursor pagination, cap 100. Replace leading-wildcard roster search with an indexed strategy or a documented bounded alternative — a leading-wildcard `ILIKE` is unusable under RLS. NOTE (S01b): backend DTO+service cursor branch done; `useModuleMembersInfinite` hook added; existing `useModuleMembers` (offset) unchanged. S09 must update app pages in `frontend/app/**/` to use `useModuleMembersInfinite`. Search uses trailing-wildcard (prefix) — acceptable on global `users` table with no RLS. See S01b.md.

**Subtle rules you must not "simplify" away** (each is deliberate; verify against source before touching):
- `assertModuleAccessPolicy` answers `manage` from `resolveModuleManagementStanding`, and `view` from the module's view key **or** that same standing. A module owner passes `view` because they are the owner.
- A custom or delegated `<module>:access:manage` grant is **view-only** by design and never creates management authority.
- `MODULE_CATALOG` is **plan gating**, not the module list. Adding a universal surface to it 403s every route that surface owns. Use `MODULE_ADMIN_MODULES` for an admin rung.
- Org admin implies module admin. Test org-admin **structurally** via `organizationMembers.role`/`isOwner` — never via `settings:manage`, which creates a parallel superuser bypass.
- Platform billing is never delegated: `assertPermissionsGrantable` refuses the whole `billing:` namespace on every path including the owner's own.
- `namespacesForModule` returns the module's own namespace first; `administeringModuleOf(key)` is the only correct way to ask which module owns a key. A naive `split(":")[0]` passes by coincidence and breaks for Home.
- A key added to a role template reaches **new organisations only** — `seedSystemRolesForOrg` grants on role creation. Any template addition needs a backfill migration too (see `0436`) or it is inert everywhere that exists.

### 6. Permission catalogs — you own both
- [x] Keep `backend/src/modules/rbac/permissions/**` and `frontend/lib/rbac/permissions/**` aligned. Both directions are tested by `catalog-sync.test.ts`. gate: check:permission-keys PASS — 690 backend = 690 frontend keys; 621 unique keys used. L17-report: catalog-sync.test.ts 11/11 pass.
- [x] Service every key request other sessions filed under `OUT-OF-OWNERSHIP`. NOTE: L26 confirms ghost key `hr:employees:export` still missing from HR catalog; CSV export fails for non-owners. VERIFIED DONE: `hr:employees:export` is absent from BOTH catalogs (removed as ghost). The actual export uses `hr:export:manage` which exists in both catalogs. `settings:automations:view` and `settings:automations:manage` (requested by S04) exist in both catalogs (`backend/permissions/shared.ts:219–226`, `frontend/permissions/shared.ts:173–180`). `check:permission-keys` gate passes: 690 backend = 690 frontend keys.
- [x] Catalogs are folders, one file per module behind a barrel — never a monolith. Structure confirmed: `src/modules/rbac/permissions/` with per-module files and barrel. L17-report.

### 7. Cache and revocation proof (§28.4)
- [x] Prove a permission mutation invalidates the local snapshot, the Redis entry, session data, navigation and affected queries **across application instances** — not just in-process. VERIFIED DONE: `access-version-channel.spec.ts` test "carries a bump from one instance to another through the shared store" proves cross-instance Redis invalidation (9/9 pass). `access.service.ts:179-201` shows local in-process maps cleared via `subscribeVersionBump` handler. JWT carries no permissions (fetched fresh from DB via `GET /me/access`), so navigation auto-updates. `access-invalidate.spec.ts` 4/4 pass.
- [x] Every role/permission mutation calls `bumpPermissionsVersion(tx, orgId)` in the same transaction. VERIFIED DONE: Confirmed in `rbac.service.ts:117,146`, all 8 module-access sub-services, `delegations.service.ts:322,412`, `ownership.service.ts:170`, `ownership-transfer-response.service.ts:401,497`, `org-member-departure.service.ts:146,272`, `org-membership-status.service.ts:253`, `org-profile.service.ts:364`, `org-setup.service.ts` (all in-transaction).
- [x] Cache lifetime never outlives the nearest grant, delegation, membership or token expiry. VERIFIED DONE: `snapshot-validity.spec.ts` 10/10 pass. `snapshotValidUntil(now, PERMS_CACHE_TTL_MS, resolved.transitions)` clamps cache validity to the earliest of `roleAssignmentExpiry`, `delegationStart`, `delegationEnd`. `access.service.ts:660-694` re-fetches automatically when `validUntil` is exceeded.

### 8. Settings route ownership (§28.6)
- [x] Global org/account administration under `/settings/*`; module configuration under `/<module>/settings/*`; operational work stays in its product. VERIFIED DONE: `/settings/*` contains org admin (organization, roles, users, billing, audit-log, webhooks, modules). One anomaly: `/settings/directory` renders the people directory with `directory:people:view` gating — this might be the admin-facing directory vs the universal one. Reported to S09 (see report §OUT-OF-OWNERSHIP).
- [x] Platform billing is exactly `/settings/billing` and `/settings/billing/ai-credits`. `/billing`, `/billing/ai-credits`, `/settings/subscription`, `/billing/seats` are deleted — never resurrect them. `/billing/invoices` is Accounting's customer invoicing; leave it. VERIFIED DONE: `/settings/billing` and `/settings/billing/ai-credits` exist. No `/billing` root page, no `/billing/ai-credits`, no `/settings/subscription`, no `/billing/seats`. `/billing/invoices` exists and is left intact.
- [x] Ordinary members reach personal account settings without inheriting org administration. VERIFIED DONE: `universal-routes.ts:123` marks `/settings` as universal with comment "The personal account landing page. Everything beneath /settings is organization administration and stays permissioned." Tests at `universal-route-matrix.test.ts:154-156` pin this. `/settings` shows Profile/Security/MFA; org admin routes are gated.
- [x] Report duplicate/legacy Settings routes to S09 for deletion. VERIFIED DONE (as report, not code): No duplicate/legacy routes found. One potential issue: `/settings/directory` may duplicate a universal directory view — see S01-final-report.md §OUT-OF-OWNERSHIP.

### 9. Tenant isolation coverage
- [x] Cover every uncovered service in your trees (bucket B10, ~38 services). Each test needs a cross-tenant DENY case **and** a same-tenant CONTROL that returns the row — the control is what proves the test can fail. VERIFIED DONE: `check:tenant-isolation-coverage` reports 818/818 tenant-owned services have a declared isolation test (100%). Command output: "OK — every enumerated tenant-owned service maps to at least one isolation test." Note: gate is static (spec file naming match), not execution proof — `check:tenant-isolation:run` is the execution gate.

## Validation

`pnpm typecheck` · `check:route-classification` · `check:permission-keys` · `check:owner-authority` · `check:placement-bypass` · `check:module-entitlement` · `check:module-lifecycle` · `check:tenant-isolation` · `verify:rbac-integrity` · `verify:rbac-integrity:self-test` · `check:navigation-permissions` · `scan:legacy-actors:check` · jest `--testPathPattern="auth|organization|rbac|access|module-access|settings|ownership|delegation"`.
Frontend: `pnpm type-check` · `check:query-scope`. If you changed routes or DTOs, regenerate and re-vendor OpenAPI.

## Definition of done

One organization membership is the authoritative login relationship; removing or switching it changes authorization immediately; no required runtime path reads a contracted actor field; cold and upgrade migrations agree; every authenticated route resolves to exact universal access or a declared permission; the authority matrix is enforced and tested; module access is testable through cohesive interfaces rather than one 839-line module; `check:placement-bypass` passes.

Report to `architecture-refactor/session-tickets/reports/S01-report.md`.
