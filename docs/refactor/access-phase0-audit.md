# Access Control / RBAC — Phase 0 Audit (read-only)

**Scope:** platform-wide authorization — model, resolution, registry, enforcement, caching, audit.
**Date:** 2026-08-10 · **Repos:** `backend` (`streamlineos-api`), `frontend`
**Method:** source-of-truth reads + mechanical sweeps (`scripts/audit-endpoint-coverage.mjs`). No code changed.

---

## 0. The stated blocker does not exist

The brief instructs: *"`CLAUDE.md` states that AI features are out of scope for this platform … These
contradict. Do not proceed on an unresolved contradiction."*

**That premise is false.** `CLAUDE.md` does not bar AI; it governs it in four places — §15 (inline
contextual AI via `AiActionsMenu`), §16 (token-metered credit billing, `computeTokenCharge`), §20
(AI retrieval must filter in the SQL predicate), §23 (AI endpoint efficiency). The repo has an `ai`
permission namespace, an AI gateway, and a credit ledger. No amendment is required on those grounds,
and none was made.

The *real* question the brief is reaching for is narrower and is genuinely open: **may permission
data leave the platform to a model provider?** That is unresolved and gates Phase 5 only. It does not
block Phases 1–4. Recorded as decision **D-1**.

---

## 1. Environment (verified, not assumed)

| Question | Answer |
|---|---|
| `AccessService` | `backend/src/modules/access/access.service.ts` (1,185 lines) |
| Resolution primitive | `access/authorize.ts` — `authorize(access, ctx, permissionKey)` |
| Guard | `access/permission.guard.ts` — **not global** |
| Scope filter | `access/apply-scope.ts` — `applyScope(scope, orgId, userId, cols)` |
| Registry | `modules/rbac/permissions/` (34 files) → `catalog.ts` → `PERMISSIONS` |
| Frontend mirror | `frontend/lib/rbac/permissions/` + `PermissionKey` union in `types.ts` |
| Permission schema | `db/schema/common/access.ts` |
| Modules (entitlement) | 12: `hr crm build accounting inventory kb chat support surveys payroll sign timesheets` |
| Modules (permission namespaces) | **35** — the 12 above plus `ai audit-log billing blog branch calendar dashboard directory feedbucket integrations mail notifications onboarding ownership party payments reports sales self settings tasks workflows workforce` |
| Super-admin / platform staff | **None in-tenant.** `modules/platform/` is public marketing/status endpoints only. |
| Impersonation | **Does not exist.** Zero matches for `impersonat*` across the backend. |
| Multi-org users | **Yes** — `POST /organization/switch`, membership-checked |
| External / guest users | **Yes** — client portal (`PortalJwtAuthGuard`), agent tokens (`AgentTokenGuard`), public survey/sign/careers/feedbucket links |
| Module sold per-org | **Yes** — `org_modules` + `PlanLimitsService`, FREE/PAID/ENTERPRISE |
| Live production tenants | **No** — dev only (carried forward from `REFACTOR-STATE.md`) |
| LLM provider / budget | Not established — see D-1 |

**Counts.** 496 controllers · **3,357 endpoints** · 3,073 with `@RequirePermission` · 176 `@Public` ·
**117 with neither** · 628 catalogued permission keys (+20 generated = 648) · 588 keys actually enforced.

---

## 2. Resolution order — as implemented

Traced through `authorize.ts`, not as documented:

```
1. no ctx                        → UNAUTHENTICATED
2. personal-token scope filter   → FORBIDDEN if key not delegable/not in token scopes
3. entitlement gate              → NO_MODULE   (isPlanGatedModule(module) && !isModuleEnabled)
4. ctx.isOrgOwner                → ALLOW scope=all
5. resolveUserPermissions()      → Map<key, DataScope>
6. grantsOrgAdmin(resolved)      → ALLOW scope=all      ← holds settings:manage OR settings:rbac:manage
7. resolved.get(key)             → ALLOW at that scope, else FORBIDDEN
```

`resolveUserPermissions` (union, broadest-scope-wins) = universal member grants + employee
self-service grants + direct role grants + permission-group role grants + unexpired delegations +
module-ownership grants, then `deriveAccessViewImplication`, then subtract per-user denied modules
(**skipped entirely for owner/org-admin**).

**Divergences from `CLAUDE.md` §21.** §21 says org-admin is the structural `organizationMembers.role`.
The runtime has **two** definitions: structural (`isOwnerOrAdmin`, used to skip module denies) and
permission-derived (`grantsOrgAdmin`, used to grant everything). They do not agree — see AC-04.

**Good, and worth preserving:** the entitlement gate is checked at step 3, *before* the owner bypass at
step 4. Entitlement and permission are genuinely separate, independently enforced concepts, and an
org owner is correctly denied a module the org has not bought. This is the single strongest property
of the current design.

---

## 3. Permission model findings

| ID | Location | Evidence | Problem | Layer | Sev | Fix |
|---|---|---|---|---|---|---|
| **AC-02** | `realtime/ably.service.ts:16–27` | `channelName() = chat:${orgId}:${channelId}`; capability = `` `chat:${orgId}:*` `` → `["subscribe","publish","history"]` | **Any active member can read and post to every private channel and DM in the org**, bypassing the REST membership check. `chat:messages:read` is a universal self-service grant, so every member gets this token. Same for `huddle-signal:${orgId}:*` (publish WebRTC signalling at any user). | Record / real-time | **P0** | Mint per-channel capabilities from `chat_channel_members`; re-mint on membership change |
| **AC-03** | `rbac/role-permission.service.ts:261–279` + `access.service.ts:808–820` | `setRolePermissions` deletes all grants then inserts only `if (deduped.size > 0)`; DTO allows `[]`. `computeUserPermissions` falls back to `ROLE_DEFAULT_PERMISSIONS[slug]` at scope `all` when a role has **zero** grants | **Stripping every permission from a role silently restores its full compile-time default set at scope `all`.** The revoke does the opposite of what the admin intended | Org / module | **High** | Distinguish "no grants" from "not configured" — a `configured_at` column or an explicit empty sentinel |
| **AC-01** | `app.module.ts:174–176` | Global guards are `JwtAuthGuard`, `MfaGuard`, `ModuleGuard`. `PermissionGuard` is **per-controller** | **Deny-by-default is not the platform default.** An endpoint with no `@RequirePermission` is open to every authenticated org member. 117 such endpoints exist today; a new one added tomorrow fails *open* | All | **High** | Register `PermissionGuard` globally; add explicit `@SelfService(reason)` for the legitimate ~100 |
| **AC-04** | `common/rbac/grantability.ts:12–26`, `authorize.ts:37–39` | `grantsOrgAdmin` returns true for `settings:manage` **or** `settings:rbac:manage` at any scope → `{allow:true, scope:"all"}` for *every* key | Two permission keys are a full org superuser. Because this is evaluated *after* module-deny subtraction but short-circuits the per-key lookup, it also **bypasses per-user module denial** (`user_module_access`). `settings` is not in `MODULE_CATALOG`, so no entitlement gate stops it | Org ↔ module precedence | **High** | Decide precedence explicitly (D-2); make the org-admin test structural, not permission-derived |
| **AC-06** | `common/rbac/module-vocabulary.ts:18` | `PLAN_GATED_MODULES = MODULE_CATALOG` (12) but 35 permission namespaces exist | **23 of 35 namespaces have no entitlement gate at all** — `billing`, `mail`, `sales`, `workflows`, `payments`, `directory`, `party`, `reports`, `blog`, `feedbucket`… Some are correctly core; none is *declared* either way | Entitlement | **Med** | Every namespace declares `core \| plan-gated \| platform` in the registry |
| **AC-10** | `build/core/projects-members.service.ts:82`, `projects-custom-states.service.ts:59`, `chat/*`, `kb_space_grants` | `membership[0]?.role === "ADMIN"` and `project_members.role` / `chat_channel_members.role` / `kb_space_grants` | A **second, undeclared authorization system** operates at record level with string-literal role comparisons. The registry does not know it exists, so it cannot be reviewed, tested or exported in a matrix | Record | **Med** | Model resource-grants as a declared layer; no role literals outside it |
| **AC-13** | grep: 0 matches for `impersonat*` | — | No impersonation and no in-tenant platform-staff role. The brief's impersonation controls are **N/A today**; the risk is adding support access later without them | Platform | Info | Decide D-3 before any support-access feature |

---

## 4. Enforcement gaps

| ID | Surface | Evidence | Unenforced layer | Exploit path | Sev |
|---|---|---|---|---|---|
| **AC-02** | Ably chat/huddle | above | Record, real-time | Member calls `GET /chat/ably-token`, subscribes to `chat:<org>:*` directly | **P0** |
| AC-07 | `permission.guard.ts:46–50` | Denials throw with no log; only *unexpected errors* are logged | Observability | Enumeration and broken deploys are both invisible | Med |
| AC-08 | `access-invalidate.ts:9–21`; `access.service.ts:85–86, 389–394` | `subscribeVersionBump` is an in-process `Set`. `versionCache` TTL 5s; `membershipAccessCache` is keyed **without** the version, TTL 15s | Revocation | Deactivation/revocation stays effective up to **5s (perms) / 15s (membership)** on other nodes | Med |
| AC-08b | `access-invalidate.ts:33` | `notifyVersionBump` fires **inside** the transaction, before commit | Revocation | A concurrent read can repopulate the local cache with pre-commit state; nothing clears it again until TTL | Med |
| AC-09 | `module-access/module-access.controller.ts` (21 endpoints) | Class has only `JwtAuthGuard`; authorization is real but *inside* the service (`assertModuleAccessPolicy`), because the key is derived from `:moduleKey` | Registry | **Not a live hole** — but the registry cannot express dynamic keys, so CI can never verify these | Med |
| AC-11 | 64 `applyScope` sites; 44 `scopable` keys; `rbacScope` read in 4 places | `REFACTOR-STATE.md` SEC-002 already documents Build: 1 scoped service / 70 collection endpoints | Record | Scoped permissions that are never applied silently behave as `all` | Med |
| AC-14 | `hr-safety.controller.ts:143`, `service-delivery-inbox.service.ts:76`, vs `@RequirePermission("hr:sensitive:view")` on whole controllers | Field restrictions are implemented by *splitting endpoints* and by ad-hoc `perms.has()` in services — there is **no serialization-layer redaction** | Field | Any endpoint returning a broad entity carries restricted fields in the body. Needs per-endpoint verification to name a specific leak | Med |
| AC-05 | `crm-inbox.controller.ts:32,39`; `feedbucket.controller.ts:109,175` | `const scope = req.rbacScope ?? "all"` | Record | **Latent, not live** — both controllers do mount `PermissionGuard` with `@RequirePermission`, so `rbacScope` is always set. It fails *open* the moment a guard is dropped | Low |
| AC-12 | `rbac/role-lockout.service.ts:13` | `wouldLockOutLastAdmin` reads `this.db`, outside the mutating transaction | Concurrency | TOCTOU: two concurrent demotions can both pass and remove the last admin | Low |
| AC-15 | `role-lockout.service.ts:30–45` | Lockout scans `role_permission_grants` for `settings:rbac:manage` only — it does not model the AC-03 defaults fallback | Consistency | Over-restrictive (safe direction), but the two paths disagree about what "is an admin" means | Low |

---

## 5. Registry coverage

| Dimension | Result |
|---|---|
| Endpoints with `@RequirePermission` | 3,073 / 3,357 (91.5%) |
| `@Public` | 176 |
| **Undeclared (neither)** | **117** — 21 module-access (dynamic key, authorized in-service), ~80 legitimate self-service (`/me`, notifications, sessions, MFA, push, dashboard-personal, onboarding-self), and a residue needing per-endpoint review: `search`, `storage`, `storage-vault`, `hr-document-types`, `announcements`, `emergency/respond`, `portal-client` |
| Ghost keys (enforced, not catalogued) | **0** — the single hit was a comment in a spec file |
| Orphan keys (catalogued, never enforced) | 41 |
| **Frontend ↔ backend catalog drift** | **0** — 648 = 648, exact parity, already covered by `frontend/lib/rbac/permissions/__tests__/catalog-sync.test.ts` |
| CI gate on undeclared endpoint | **None** |

The frontend `PERMISSIONS` array carries 411 of the 648 keys in its own `PermissionKey` union; the
role UI reads the backend catalog via `GET /rbac/permissions`, so this is a labelling gap, not a
gating gap. Confirm before relying on the frontend array for any listing.

---

## 6. Performance findings

| ID | Location | Checks/req | Queries/check | Note |
|---|---|---|---|---|
| AC-P1 | `authorize.ts` | 1 per guarded endpoint | 0 on cache hit | Resolution is **not** a pure function — `authorize` is `async` and may hit Redis/PG. Meets the spirit (cached), not the letter (no I/O) |
| AC-P2 | `access.service.ts:663–856` | on cache miss | ~6 sequential-ish round trips (3 parallel + roles + grants + delegations) | Acceptable at 30s Redis + 30s local TTL; unmeasured at scale |
| AC-P3 | `apply-scope.ts:16–32` | per scoped list query | correlated subquery over `org_unit_members` ×2 | `team` scope is a **non-materialised** recursive-ish lookup on every request, exactly what Phase 3 forbids |
| AC-P4 | `access.service.ts:918–1184` | `membersWithPermission` | up to 6 queries **per 100-member page**, looped | Fan-out notification paths pay this repeatedly |

No p95 attribution exists. The Build baseline in `docs/refactor/baseline/` does not isolate
authorization cost — a Phase 3 prerequisite.

---

## 7. Permission matrix — status

**Cannot be produced with zero undefined cells today, and that is itself the finding.**

Structural roles are exactly three (`OWNER`, `ORG_ADMIN`, `MEMBER`) and `ROLE_DEFAULT_PERMISSIONS`
covers only those three slugs. Every other role is **tenant data** (`roles` table, per-org), so a
static role × module × action matrix does not exist at the platform level — it exists per tenant.

What can be stated platform-wide:

| Principal | Resolution | Undefined cells |
|---|---|---|
| `OWNER` | entire catalog at `all`, minus un-entitled modules | 0 |
| `ORG_ADMIN` (structural) | entire catalog at `all`; module denies **not** applied | 0 |
| holder of `settings:manage` / `settings:rbac:manage` | entire catalog at `all` via `grantsOrgAdmin`; module denies **bypassed** | 0 — but this is AC-04 |
| `MEMBER` | 60 self-service + 4 universal keys | 0 |
| any custom/tenant role | union of grants; **falls back to slug defaults when emptied** | **AC-03 makes this undefined** |
| module owner (`module_ownerships`) | all keys in that namespace at `all` | 0 |
| delegatee | listed keys at `all` (scope not delegable) | scope is undefined-by-design — always widens to `all` |

The genuine undefined cells are: (a) AC-03's zero-grant state, (b) delegation scope, (c) the 23
namespaces with undeclared entitlement status (AC-06), (d) the record-level system in AC-10.
A per-tenant matrix export is a Phase 4 deliverable and needs AC-03 fixed first to be truthful.

---

## 8. Verified non-findings — do not re-raise

- **Entitlement precedes permission, including for owners** (`authorize.ts:29` before `:33`). Correct.
- **Frontend/backend catalogs are in exact parity** (648/648), test-enforced.
- **Zero ghost permission keys.**
- **`POST /public/kb/ask` is sound** despite being `@Public`: predicates are `status='published' AND
  visibility='public'` bound in SQL (`kb-rag.service.ts:73–75`), and `hasPublishedPublicArticles`
  short-circuits **before** embedding, satisfying the §20 denial-of-wallet rule.
- **Cron controllers are `@Public` but assert a shared secret** (`assertCronSecret`).
- **`GET /auth/session-data/:userId` is `@Public` but requires `INTERNAL_API_SECRET`** and fails closed when the env var is unset.
- **`AgentController` is `@Public` at class level but mounts `AgentTokenGuard` + `PermissionGuard`** and declares `@RequirePermission` per handler.
- **Optimistic locking exists on role edits** (`roles.version` CAS, `ConflictException`) — the brief's concurrency requirement is already met for role permission edits.
- **Last-admin protection exists** (`RoleLockoutService`) — weakened only by AC-12/AC-15, not absent.
- **Temporal bounds exist**: `role_assignments.expires_at`, `user_delegations.starts_at/ends_at` + status, both filtered at resolution time.
- **Permission storage is normalised** — `role_assignments`, `role_permission_grants`, `principal_group_members`, `group_role_assignments`, `module_ownerships`, `user_delegation_permissions`, all with composite tenant FKs and unique constraints. **No permission arrays, no JSONB, no bitmasks.** The brief's "single most important change" is already done.
- **`rbacScope ?? "all"` sites are latent**, not live — guards are mounted (AC-05).

---

## 9. Prioritised fix order

**Exploitable today — report and fix first**
1. **AC-02** Ably org-wide chat capability (P0, within-tenant confidentiality breach)

**Correctness of the security model**
2. **AC-03** zero-grant → defaults restoration
3. **AC-01** make `PermissionGuard` global + `@SelfService` marker
4. **AC-04** one definition of org-admin; settle org↔module precedence (D-2)

**Structural**
5. AC-06 declare entitlement class for all 35 namespaces
6. AC-09 dynamic-key declaration so CI can cover module-access
7. AC-14 field-level redaction at serialization
8. AC-11 scope coverage sweep
9. AC-07 denial logging · AC-08/08b invalidation correctness

**Then** Phase 1 schema work, Phase 3 materialised hierarchy (AC-P3), Phase 4 matrix export, Phase 6 registry-generated tests.

---

## 10. Decisions taken (2026-08-10)

| ID | Decision |
|---|---|
| **D-1** — AI and permission data | Permission data (role names, group membership, org hierarchy, grant history) must not egress to a model provider. AI is barred from the authorization decision path; may never write a permission table; explanations render the deterministic resolution trace, not reason about policy. Tenant free-text (custom role names, grant justifications) is data, never instruction. |
| **D-2** — Org ↔ module precedence | Org admin implies module admin; per-user module denies do not override an org-level grant. The org-admin test must be structural (`organizationMembers.role` / `isOwner`), not permission-derived — the current divergence between structural `isOwnerOrAdmin` (used to skip module denies) and `grantsOrgAdmin()` in `grantability.ts` (permits scope `all` for `settings:manage` or `settings:rbac:manage`) is AC-04. |
| **D-3** — Support staff in-tenant access | Impersonation controls (time-boxed, requires reason, visually unmistakable, blocked from sensitive actions, separately audited to an immutable log) must be designed before that feature ships. No impersonation code exists today. |
| **D-4** — `team` DataScope | Approved to go live once materialised. The correlated `org_unit_members` subquery in `apply-scope.ts` (AC-P3) must be replaced with a materialised view before exposure; until then `team` scope must not be surfaced to callers. |
