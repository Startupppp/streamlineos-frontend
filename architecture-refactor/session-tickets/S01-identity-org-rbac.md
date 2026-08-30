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
- [ ] `pnpm scan:legacy-actors:check` reports **555/555 remaining, 0 migrated**. Expand is done (membership columns exist); contraction has not started. Produce the per-column plan: for each legacy user-FK actor column, name its membership replacement, its readers and its writers.
- [ ] Finish expansion + resumable backfill for any column still lacking a membership counterpart, reporting unmappable and duplicate rows before cutover.
- [ ] Prove every required writer and reader uses `organization_members.id` or the canonical organization-person seam.
- [ ] Produce **zero-use proof** for each legacy column before removal (§COMMON 9 — graph proof, not grep).
- [ ] Contract via additive → backfill → validate → cutover → drop migrations, with cold-bootstrap and upgrade proof.
- [ ] Historical/inactive actors stay renderable but carry no current authority.

### 2. Membership artifact inventory
- [ ] `membership-artifacts.spec.ts` derives membership-keyed tables from the schema and requires each to be inventoried. Confirm it passes. It drives suspension/removal cleanup: a table missing from the inventory is one nobody decided about, so a removed member can retain stale authority through it.
- [ ] For every entry, classify AUTHORITY (grants current capability) vs ATTRIBUTION (records who acted), and make `onRemoval`/`onSuspension` match what the schema and code **actually do**. If reality is wrong, fix `org-membership-access-revocation.ts` and flag it as a security finding.
- [ ] Confirm every AUTHORITY artifact is really cleared on removal. Session revocation needs the Redis tombstone `revoked:session:<id>` — a DB `isRevoked` flag alone logs nobody out.

### 3. Placement-bypass allowlist — known failing gate
- [ ] `pnpm check:placement-bypass` FAILS: **5 of 83 bypass sites not on the allowlist** — `auth/auth.service.ts:142`, `auth/auth.service.ts:190`, `organization/core/invitation-acceptance.service.ts:67`, `organization/core/org-membership-access-revocation.ts:273` `[context-exit]`, `:274` `[with-identity]`. For each, decide whether the bypass is legitimate (then allowlist it with a reason) or a real defect (then fix it). Do not blanket-allowlist.

### 4. Authority matrix (§12) — lock it in code and tests
- [ ] Transfer org ownership: **org owner only**. Archive/delete org: **org owner only**. Manage org membership / enable modules: owner + admin. Transfer module ownership: owner, admin, or that module's owner. Manage module membership and permissions: owner, admin, that module's owner or admin.
- [ ] Exactly **six standings**; no seventh, no runtime custom-role creation surface.
- [ ] Table-driven allow/deny tests for every row and every actor combination.

### 5. Module-access decomposition (§28.6)
- [ ] `module-access-groups.service.ts` (839 lines) → ownership, standing, roles/groups, direct grants, candidates, read-model, each with an explicit transactional seam. One public interface for callers; extracted parts stay internal, not a pass-through layer.
- [ ] `frontend/hooks/api/module-access.ts` (604 lines) → same responsibilities.
- [ ] Eliminate repeated standing/authority queries without creating shallow wrappers.
- [ ] Roster list → cursor pagination, cap 100. Replace leading-wildcard roster search with an indexed strategy or a documented bounded alternative — a leading-wildcard `ILIKE` is unusable under RLS.

**Subtle rules you must not "simplify" away** (each is deliberate; verify against source before touching):
- `assertModuleAccessPolicy` answers `manage` from `resolveModuleManagementStanding`, and `view` from the module's view key **or** that same standing. A module owner passes `view` because they are the owner.
- A custom or delegated `<module>:access:manage` grant is **view-only** by design and never creates management authority.
- `MODULE_CATALOG` is **plan gating**, not the module list. Adding a universal surface to it 403s every route that surface owns. Use `MODULE_ADMIN_MODULES` for an admin rung.
- Org admin implies module admin. Test org-admin **structurally** via `organizationMembers.role`/`isOwner` — never via `settings:manage`, which creates a parallel superuser bypass.
- Platform billing is never delegated: `assertPermissionsGrantable` refuses the whole `billing:` namespace on every path including the owner's own.
- `namespacesForModule` returns the module's own namespace first; `administeringModuleOf(key)` is the only correct way to ask which module owns a key. A naive `split(":")[0]` passes by coincidence and breaks for Home.
- A key added to a role template reaches **new organisations only** — `seedSystemRolesForOrg` grants on role creation. Any template addition needs a backfill migration too (see `0436`) or it is inert everywhere that exists.

### 6. Permission catalogs — you own both
- [ ] Keep `backend/src/modules/rbac/permissions/**` and `frontend/lib/rbac/permissions/**` aligned. Both directions are tested by `catalog-sync.test.ts`.
- [ ] Service every key request other sessions filed under `OUT-OF-OWNERSHIP`.
- [ ] Catalogs are folders, one file per module behind a barrel — never a monolith. A cohesive catalog may exceed 500 lines rather than split artificially.

### 7. Cache and revocation proof (§28.4)
- [ ] Prove a permission mutation invalidates the local snapshot, the Redis entry, session data, navigation and affected queries **across application instances** — not just in-process.
- [ ] Every role/permission mutation calls `bumpPermissionsVersion(tx, orgId)` in the same transaction.
- [ ] Cache lifetime never outlives the nearest grant, delegation, membership or token expiry.

### 8. Settings route ownership (§28.6)
- [ ] Global org/account administration under `/settings/*`; module configuration under `/<module>/settings/*`; operational work stays in its product.
- [ ] Platform billing is exactly `/settings/billing` and `/settings/billing/ai-credits`. `/billing`, `/billing/ai-credits`, `/settings/subscription`, `/billing/seats` are deleted — never resurrect them. `/billing/invoices` is Accounting's customer invoicing; leave it.
- [ ] Ordinary members reach personal account settings without inheriting org administration.
- [ ] Report duplicate/legacy Settings routes to S09 for deletion.

### 9. Tenant isolation coverage
- [ ] Cover every uncovered service in your trees (bucket B10, ~38 services). Each test needs a cross-tenant DENY case **and** a same-tenant CONTROL that returns the row — the control is what proves the test can fail.

## Validation

`pnpm typecheck` · `check:route-classification` · `check:permission-keys` · `check:owner-authority` · `check:placement-bypass` · `check:module-entitlement` · `check:module-lifecycle` · `check:tenant-isolation` · `verify:rbac-integrity` · `verify:rbac-integrity:self-test` · `check:navigation-permissions` · `scan:legacy-actors:check` · jest `--testPathPattern="auth|organization|rbac|access|module-access|settings|ownership|delegation"`.
Frontend: `pnpm type-check` · `check:query-scope`. If you changed routes or DTOs, regenerate and re-vendor OpenAPI.

## Definition of done

One organization membership is the authoritative login relationship; removing or switching it changes authorization immediately; no required runtime path reads a contracted actor field; cold and upgrade migrations agree; every authenticated route resolves to exact universal access or a declared permission; the authority matrix is enforced and tested; module access is testable through cohesive interfaces rather than one 839-line module; `check:placement-bypass` passes.

Report to `architecture-refactor/session-tickets/reports/S01-report.md`.
