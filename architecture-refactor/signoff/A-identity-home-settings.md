# Sign-off Audit A — Identity / Home / Settings / Shared Platform

**Auditor:** Sign-off Audit A (claude-sonnet-4-6)  
**Date:** 2026-09-01  
**Repo root:** `D:\projects\personal\Streamlineos`  
**Coverage:** Evidence gathered directly in this session; every code claim cites file:line or gate output.

---

## Inspection scope

| Surface | Files read | Gate scripts run |
|---|---|---|
| Org + RBAC | `organization.controller.ts`, `org-membership.service.ts`, `org-membership-access-revocation.ts`, `rbac.controller.ts`, `roles.controller.ts`, `jwt-auth.guard.ts`, `sessions.service.ts`, `sessions-revocation-tombstone.spec.ts`, `access-policy.ts`, `home-surfaces-universal.spec.ts`, `module-registry.ts`, `module-vocabulary.ts`, `entitlements.service.ts` (partial), `module-access.helpers.ts`, `is-structural-org-admin.ts` | `route-classification-report.mjs`, `check-permission-keys.mjs`, `check-scope-application.mjs`, `check-owner-authority.mjs`, `check-tenant-isolation-coverage.mjs`, `check-namespace-coverage.mjs`, `check-module-entitlement.mjs`, `check-module-di.mjs`, `check-navigation-permissions.mjs` |
| Home | `access-policy.ts:107-115`, `home-surfaces-universal.spec.ts` (full), `module-registry.ts:271-286` | same gate set |
| Settings | `settings.controller.ts` (full), `settings.service.ts:118-173` | same gate set |
| Shared platform | `storage.controller.ts` (full), `storage.service.ts:164-182`, `search.controller.ts`, `search.service.ts` (full), `ably.service.ts` (full), `realtime.controller.ts`, `outbox-publisher.service.ts` (full), `external-effect-ledger.ts` (full) | `check-unbounded-reads.mjs`, `check-record-access.mjs`, `check-cache-invalidation.mjs` |

---

## Surface 1 — Organization and Organization/Module RBAC

### Dimension table

| Dimension | Verdict | Evidence |
|---|---|---|
| Data model | PASS | `organizationMembers`, `role_assignments`, `role_permission_grants`, `module_ownerships`, `user_delegations`, `principal_group_members`, `group_role_assignments`, `access_versions` all present; every table scoped by `orgId`. `module-registry.ts` defines 22 modules with typed ladder/planGated/administrable fields. |
| Authorization | PASS | `route-classification-report.mjs` → 3,558 handlers, **0 undeclared**. OrganizationController: class-level `@UseGuards(JwtAuthGuard)`, per-handler `@UseGuards(PermissionGuard)` + `@RequirePermission` on all protected routes; `@Public()` on invitation validate/accept/decline, `@Universal()` on list/archived/leave, `@AuthorizedInService` on create/restore. `check-permission-keys.mjs` → all 622 `@RequirePermission` keys resolve in both backend (693) and frontend (691) catalogs. `isStructuralOrgAdminContext` reads `actor.role === ORG_ADMIN \|\| isOrgOwner` (structural), never a permission key. |
| CRUD lifecycle | PASS | Invitations: create, accept, decline, revoke with state machine (`invitations-state-machine.spec.ts`). Membership: list, update role, remove, suspend, reactivate — all scoped by `orgId + userId`. `updateMemberRole` re-fetches member with `eq(orgId)` before update (`org-membership.service.ts:170-183`). |
| List/search cost | PASS | `listMembers` uses `listMembersSchema` (paged). `check-unbounded-reads.mjs` ratchet tracks 1,074 actionable unbounded reads platform-wide; none in org/RBAC core paths reviewed. `check-record-access.mjs` → all `findFirst` calls exclude soft-deleted rows. |
| Caching/realtime | PASS | `bumpPermissionsVersion(tx, orgId)` called in same transaction on every role/permission mutation (`access-invalidate.ts`). Ably token revocation (`AblyService.revokeUserTokens`) called from `OrgMembershipAccessRevocation` on remove/suspend. Session revocation: `SessionsService.tombstone()` writes `revoked:session:<id>` (no TTL, `sessions-revocation-tombstone.spec.ts:52-60`) + ZADD index; `JwtAuthGuard` reads tombstone first, falls back to DB on Redis error (`jwt-auth.guard.ts:129-145`). |
| Module interface | PASS | `module-registry.ts` is single source of truth: 22 modules with `planGated`, `administrable`, `ladder`, `administersNamespaces`. `settings` is `platform-admin`, absent from `MODULE_CATALOG` (plan-gated list) and `ADMINISTRABLE_MODULES`. `check-module-di.mjs` → 216 modules, 0 DI violations. |
| UX/accessibility | KEEP | Frontend scope (not directly inspected). Sampled only. |
| Security | PASS | Owner-only operations: `check-owner-authority.mjs` → 9 declared, 9 enforced, 12 owner shortcuts all legitimate skips. Cross-tenant: `updateMemberRole` scopes `organizationMembers` by `orgId` (line 177-180); `revokeApiKey` checks `apiKeys.orgId === u.orgId` (settings.service.ts:167). No permission-key-as-org-admin-shortcut found (`isStructuralOrgAdminContext` is structural). |
| Operations | PASS | `org-lifecycle.service.ts`, `org-purge.service.ts` for archive/restore/delete. `OrgMembershipAccessRevocation` runs Ably revocation + session tombstones + cache bust on every membership change. |
| Tests | PASS | `organization.controller.e2e-spec.ts`, `rbac.controller.e2e-spec.ts`, `roles.controller.e2e-spec.ts`, `invitations.e2e-spec.ts`, `sessions-revocation-tombstone.spec.ts`, `org-membership-eviction.spec.ts`, `org-membership-tenant-join.spec.ts`. `check-tenant-isolation-coverage.mjs` → 895/895 tenant-owned services have declared isolation tests. |

### Defects

None found.

**VERDICT: SIGNED OFF**

---

## Surface 2 — Home

### Dimension table

| Dimension | Verdict | Evidence |
|---|---|---|
| Data model | PASS | Home is `ladder: "universal"`, `planGated: false`, `administrable: false`, `schemaFolder: null` (`module-registry.ts:271-286`). No separate schema needed; Home administers `chat`, `mail`, `calendar`, `notifications` namespaces. |
| Authorization | PASS | `EMPLOYEE_SELF_SERVICE_GRANTS` is derived at module load from `ROLE_DEFAULT_PERMISSIONS["MEMBER"]` (`access-policy.ts:107-115`). `applyUniversalGrants()` merges them before any role resolution (`access-policy.ts:139-148`). Result: no role change or revocation can remove Home surfaces. `home-surfaces-universal.spec.ts:61-66` pins 10 specific keys as universal. `home-surfaces-universal.spec.ts:68-93` confirms a suspended member receives nothing. |
| CRUD lifecycle | KEEP | Home is a universal read surface, not a CRUD entity. Administration actions (chat settings, huddle moderation) are behind `@RequirePermission` in the `chat` module. |
| List/search cost | KEEP | No Home-specific list endpoints; search is handled by the shared search surface. |
| Caching/realtime | PASS | Cache namespace `dashboard` registered in registry. `home:access:manage` is excluded from universal grants so it remains delegatable. |
| Module interface | PASS | `home` not in `MODULE_CATALOG` → `assertModuleAccessPolicy` cannot 403 it. `namespacesForModule("home")` returns `["home","chat","mail","calendar","notifications"]` (registry:279). `administeringModuleOf("chat:org-settings:manage")` → "home" correctly. |
| UX/accessibility | KEEP | Frontend scope; not inspected. |
| Security | PASS | `chat:org-settings:manage` is NOT in the universal grant set AND is `isOrgOnlyPermission` (`home-surfaces-universal.spec.ts:112-116`). Module ownership of Home: `home-surfaces-universal.spec.ts:158-169` proves `chat:org-settings:manage` is withheld from a Home module owner even after full namespace expansion. `chat:huddles:moderate` and `home:access:manage` confirmed absent from universal set (`spec:105-110`). |
| Operations | PASS | Home has no background workers or sweep logic of its own. |
| Tests | PASS | `home-surfaces-universal.spec.ts` covers all 10 Home surfaces, suspended-member isolation, module-owner expansion, and the org-settings-manage barring. |

### Defects

None found.

**VERDICT: SIGNED OFF**

---

## Surface 3 — Settings

### Dimension table

| Dimension | Verdict | Evidence |
|---|---|---|
| Data model | PASS | `settings` module: `ladder: "platform-admin"`, `planGated: false`, `administrable: false`. Never in `MODULE_CATALOG` or `ADMINISTRABLE_MODULES`. Custom fields and automations stored in `custom_field_definitions` and `automation_rules` tables. |
| Authorization | PASS | `SettingsController` carries `@UseGuards(JwtAuthGuard, PermissionGuard)` at class level (`settings.controller.ts:58`). Every handler has `@RequirePermission`. No handler is `@Universal()` or unclassified. `revokeApiKey` adds structural-admin check at service level (`settings.service.ts:162-163`) in addition to the permission gate — defense in depth, not bypass. |
| CRUD lifecycle | PASS | API keys: create, list, revoke (`settings:api-tokens:read/write`). Automations: list, get, create, update, delete, run-history (`settings:automations:view/manage`). Custom fields: list, create, update, delete (`settings:custom-fields:manage`). Git connections: list, create, update, delete (`settings:manage`). Feature flags: get, update (`settings:view/manage`). |
| List/search cost | PASS | `listAutomationsQuerySchema` is paginated. `listCustomFields` filtered by `entityType`. `check-record-access.mjs` confirms soft-delete exclusion everywhere. |
| Caching/realtime | PASS | `check-cache-invalidation.mjs` → 0 documentation gaps. `check-namespace-coverage.mjs` → 73 reads, 73 bumps (PASS). |
| Module interface | PASS | `SettingsModule` at `settings.module.ts`. `SettingsController` at `/settings`. Sub-modules (automations, custom fields) colocated in `settings/`. Note: automations and custom fields are global-settings managed (not per-module); this is the current design, not a drift. |
| UX/accessibility | KEEP | Frontend scope; not inspected. |
| Security | PASS | BOLA: `revokeApiKey` scopes by `eq(apiKeys.orgId, u.orgId)` before update (`settings.service.ts:166-168`). No impersonation path: `createApiKey` uses `createdBy: u.userId` from token, not request body. `check-owner-authority.mjs` → 0 accidental owner fabrications. |
| Operations | PASS | No background sweeps. Settings mutations invalidate caches through `bumpPermissionsVersion` where applicable. |
| Tests | PASS | `settings.controller.e2e-spec.ts`, `settings-automations-plan-limits.spec.ts`, `settings-automations-tenant-isolation.spec.ts`, `settings-custom-fields-tenant-isolation.spec.ts`, `settings-member-role-authority.spec.ts`. |

### Defects

None found.

**VERDICT: SIGNED OFF**

---

## Surface 4 — Shared Platform (storage, search, realtime, workers, outbox)

### Dimension table

| Dimension | Verdict | Evidence |
|---|---|---|
| Data model | PASS | Outbox: `outbox_events`, `external_effect_ledger`. Storage: org-namespaced by placement/bucket. Search: queries scoped by `orgId` through tenant transaction. Realtime: channels namespaced `<cell>:<type>:<orgId>:<...>` (`ably.service.ts:32-65`). |
| Authorization | PASS | Storage upload: `@AuthorizedInService("assertUploadAllowed")` → `assertUploadAllowed` called in handler (`storage.controller.ts:146`); checks sensitive folders via `GENERIC_SENSITIVE_UPLOAD_PERMISSIONS`. Storage download: `resolveFileOwner` always called; org check for all tracked files (`storage.controller.ts:207-214`). Search: `@Universal()` + in-service `resolveSearchAccess` checks CRM/Build module permissions per entity type (`search.service.ts:81-100`). Realtime controller: `@Universal()` for ICE servers only. Ably capabilities scoped to `orgId` in every token request. |
| CRUD lifecycle | PASS | Storage: upload, download, image stream, delete, purge-org-prefix. Outbox: flush, mark DELIVERED/DEAD/RETRY, prune. ExternalEffectLedger: execute with lease, finish with token fence. |
| List/search cost | PASS | `check-unbounded-reads.mjs` ratchet tracks issues but 0 gate violations. `BATCH_SIZE = 50` in outbox publisher (`outbox-publisher.service.ts:17`). Search caps: `PARTY_SEARCH_CAP = 500`, `TICKET_ID_CAP = 1000` with fallback to ILIKE when exceeded (`search.service.ts:55-57`). |
| Caching/realtime | PASS | Search results cached per `(orgId, userId, queryHash)` with version key (`search.service.ts:121-128`). `AblyService.revokeUserTokens` called on membership changes. Ably token TTL 1 hour (`CHAT_TOKEN_TTL_MS = 3_600_000`). |
| Module interface | PASS | `storage.module.ts`, `search.module.ts`, `realtime.module.ts`, `outbox.module.ts` — each a proper NestJS `@Module`. `check-module-di.mjs` → 0 violations. |
| UX/accessibility | KEEP | Frontend scope for storage/search UI; not inspected. |
| Security | **DEFECT (see D-1 below)** | Storage image endpoint skips cross-tenant ownership check for non-sensitive, non-namespaced keys. |
| Operations | PASS | Outbox: `forEachOrg` used for all sweeps (`outbox-publisher.service.ts:125,151,229`). `ExternalEffectLedger` uses `forEachOrg` for reports and `runInNewTenantTransaction` per event. No `void something(...)` post-handler pattern in reviewed outbox code. SSRF: uses `common/security/ssrf-guard.ts` for user-supplied URLs (not verified in storage as no URL fetch here). |
| Tests | PASS | `storage.controller.e2e-spec.ts`, `storage.controller.spec.ts`, `storage-av-gate.spec.ts`, `storage-onboarding.controller.spec.ts`, `storage-purge-org-prefix.spec.ts`, `storage-region.spec.ts`, `search.controller.e2e-spec.ts`, `search.service.spec.ts`, `search-tenant-isolation.spec.ts`, `ably.service.spec.ts`, `outbox-publisher.service.spec.ts`, `sessions-revocation-tombstone.spec.ts`. |

### Defects

**D-1 [HIGH] — Storage image endpoint skips cross-tenant ownership for non-sensitive files**

**File:line:** `backend/src/modules/storage/storage.controller.ts:249-261`

**Failure scenario:**
- Org A uploads an expense receipt to a non-sensitive folder (e.g., `uploads/uuid-receipt.jpg`); URL is stored in `expenses.receiptUrl`.
- Attacker (active member of org B) discovers the key (e.g., from a leaked URL, a log, or another org's member).
- Attacker calls `GET /storage/image?key=uploads/uuid-receipt.jpg`.
- `isSensitiveKey("uploads/uuid-receipt.jpg")` → `false` (not in `SENSITIVE_KEY_PREFIXES`).
- `orgFromNamespacedKey("uploads/uuid-receipt.jpg")` → `null` (not in `ORG_NAMESPACED_KEY_FOLDERS`).
- Ownership resolution block is skipped entirely — `resolveFileOwner` is **never called**.
- `openStream(orgB.orgId, "uploads/uuid-receipt.jpg")` is called.
- In a single-bucket deployment (no region registry, or same-cell orgs), `placementFor(orgB.orgId)` returns the same S3 client and bucket as org A.
- Org A's file is returned to org B.

The download endpoint does NOT share this flaw for tracked files because it calls `resolveFileOwner` unconditionally and checks `fileOwner.orgId !== orgId` for all non-null resolutions (`storage.controller.ts:207-211`). The image endpoint's conditional check creates an inconsistency where the same file is protected on one endpoint and exposed on the other.

**Root cause:** The `if (isSensitiveKey(keyParam) || orgFromNamespacedKey(keyParam))` guard at `storage.controller.ts:249` was written to restrict the ownership check to known-sensitive paths, but it also excludes tracked-but-non-sensitive files from the check. The `@AuthorizedInService("resolveFileOwner")` annotation is misleading — it claims authorization always goes through `resolveFileOwner`, but for this class of keys it does not.

**Smallest correct fix** (storage.controller.ts image handler):
```typescript
// Remove the conditional; always resolve ownership for tracked files.
const fileOwner = await this.resolveFileOwner(keyParam);
if (fileOwner !== null) {
  if (fileOwner.orgId !== u.orgId) throw new NotFoundException("Not found");
  if (requiresDedicatedAccess(fileOwner)) throw new ForbiddenException("Access denied");
}
// Proceed to stream only when: (a) file not tracked (generic untracked upload, key-secret protected),
// OR (b) tracked and ownership confirmed.
```

This brings the image endpoint's authorization logic in line with the download endpoint, without changing the behavior for untracked generic uploads.

**VERDICT: BLOCKED BY 1 DEFECT**

---

## Cross-surface findings

| Check | Result |
|---|---|
| Route classifier: undeclared handlers | 0 of 3,558 (confirmed by `route-classification-report.mjs`) |
| Permission key catalog drift | 0 violations (`check-permission-keys.mjs`: 622 unique keys, all in backend+frontend catalogs) |
| Scope application | 129/129 resolved scopes reach a predicate (`check-scope-application.mjs`) |
| Owner authority fabrication | 0 violations (`check-owner-authority.mjs`) |
| Tenant isolation tests | 895/895 (100%) declared (`check-tenant-isolation-coverage.mjs`) |
| Cache namespace coverage | 0 stale namespaces, 73 reads = 73 bumps (`check-namespace-coverage.mjs`) |
| Module DI violations | 0 (`check-module-di.mjs`) |
| Session revocation | Redis tombstone (`revoked:session:<id>`) confirmed in `jwt-auth.guard.ts:129` + `sessions.service.ts:212-219`; no-TTL confirmed by spec |
| `forEachOrg` in background sweeps | Confirmed in `outbox-publisher.service.ts:125,151,229` and `external-effect-ledger.ts:152` |
| `void something()` post-commit anti-pattern | Not found in reviewed outbox/realtime code |

---

## Surface verdicts

| Surface | Verdict |
|---|---|
| 1. Organization and Organization/Module RBAC | **SIGNED OFF** |
| 2. Home | **SIGNED OFF** |
| 3. Settings | **SIGNED OFF** |
| 4. Shared platform (storage, search, realtime, workers, outbox) | **BLOCKED BY 1 DEFECT** |
