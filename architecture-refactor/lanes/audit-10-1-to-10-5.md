# Audit: PRD-10-10 sections 10.1 – 10.5

Auditor: agent lane  
Audit date: 2026-09-02  
Backend HEAD examined: e0ab789c (recorded in PRD header)  
Frontend HEAD examined: b203575d5 (recorded in PRD header)

Coverage honesty statement: I read every controller, service and spec file cited below directly. For frontend-heavy bullets (TanStack/tests), directory search confirmed file existence and I sampled key files; I did not read every page component. Where I state STILL PENDING without a sample, I say so explicitly.

---

## Summary counts

| Classification | Count |
|---|---|
| VERIFIED DONE | 3 (spot-checked [x] bullets; all pass) |
| STILL PENDING | 22 (unchecked bullets in 10.1–10.5) |
| REGRESSED | 0 |
| NEW FINDING | 2 |

---

## New Findings (ranked by severity)

### NF-1 — P2: Dashboard section registry drifts from actual controller gates

**Concrete failure scenario:** `DASHBOARD_HOME_SECTIONS` in `backend/src/modules/dashboard/dashboard-section-registry.ts` classifies "active-sprint" as `kind: "permission", permission: "build:manage"` (line 61) and "recent-projects" as `kind: "permission", permission: "build:manage"` (line 60). The actual controller at `backend/src/modules/dashboard/dashboard.controller.ts` marks both as `@Universal() @RequireModule("build")` for active-sprint (line 58) and `@UseGuards(ModuleGuard, PermissionGuard) @RequirePermission("build:tickets:view")` for recent-projects (lines 168-174). Additionally, "crm-executive" (registry line 58) uses `permission: "crm:leads:view"`, but the controller endpoint `/dashboard/executive` uses `@RequirePermission("hr:analytics:read")` (line 113-116).

Cache scope computation that reads from the registry (e.g. `buildScopedDashboardCacheKey` callers) will scope the "active-sprint" cache as a permission section requiring `build:manage` data-scope, when the controller is actually universal. Cache invalidation and the cache key itself can diverge from actual access, potentially serving a scoped (wrong) cache entry or computing a cache key that is never the correct match.

**Location:** `backend/src/modules/dashboard/dashboard-section-registry.ts` lines 57-61 vs `dashboard.controller.ts` lines 58, 113, 168.

---

### NF-2 — P2: `settings-custom-fields` and `settings-automations` exist inside the global settings module

**Concrete failure scenario:** `backend/src/modules/settings/settings-custom-fields.service.ts` and `backend/src/modules/settings/settings-automations.service.ts` live inside the global `settings` NestJS module. CLAUDE.md §8 states: "Module-owned surfaces (custom fields, automations, integrations, data-hub import/export) live in each module's settings, never global `/settings/*`." If these services expose routes through `SettingsController` under the `/settings` prefix, they violate the product contract that puts module configuration in `/<module>/settings/*`. I cannot confirm route exposure without reading the full controller; this is a call-to-verify, not a confirmed finding. If the services are imported only into their respective module controllers and not `SettingsController`, this is a false alarm. The risk is that a future developer adds them to the global controller, as they already live in the wrong folder.

**Location:** `backend/src/modules/settings/settings-custom-fields.service.ts`, `backend/src/modules/settings/settings-automations.service.ts`.

---

## Spot-checks on already-checked [x] bullets

### [x] Token authority (10.1)

**Claim:** `POST /auth/session-exchange` derives identity from a `NEXTAUTH_SECRET`-signed session proof; `userId`/`sessionId` come only from the verified payload; `BACKEND_JWT_SECRET` is absent from frontend.

**Verification:** Read `backend/src/modules/auth/auth.controller.ts` lines 249-334 in full.
- Line 264: `const proofJwt = req.headers["x-session-proof"]` — identity proof in header, not body.
- Lines 278-296: `jwtVerify` against NEXTAUTH_SECRET; `userId = sub`, `sessionId = sid` from verified payload only.
- Lines 300-304: `isNonceFirstUse(nonce, 90)` — single-use nonce stored in Redis `SET NX`.
- Lines 308-313: Redis tombstone check `revoked:session:${sessionId}`.
- Lines 320-326: `membershipState.resolve(userId, orgId)` — membership check before minting.
- Line 332: `keyring.signToken({ sub: userId, orgId, sessionId })` — asymmetric JWT, no `BACKEND_JWT_SECRET`.
- Grep of `BACKEND_JWT_SECRET` in `frontend/` returned zero matches.
- `backend/src/modules/auth/auth-session-exchange.spec.ts` tests are present.

**Result: SPOT-CHECK PASSES.** The implementation matches the claimed behavior.

---

### [x] Access locality (10.3)

**Claim:** `home-manifest.generated.json` (16 sections) is derived from the backend controller and consumed by `home-sections.ts`; no hand-maintained parallel registry may remain.

**Verification:** Read `frontend/lib/home/home-manifest.generated.json` in full (23 lines). The file carries `"generatedFrom": "backend/src/modules/dashboard/dashboard.controller.ts"` and 16 endpoint entries. Cross-checked all 16 entries against the controller (`dashboard.controller.ts` read in full at lines 1-213):
- `/dashboard/stats` → `@Universal()` ✓
- `/dashboard/personal` → `@Universal()` ✓
- `/dashboard/announcements` → `@Universal()` ✓
- `/dashboard/my-issues` → `@Universal() @RequireModule("build")` ✓
- `/dashboard/active-sprint` → `@Universal() @RequireModule("build")` ✓ (manifest: universal:true, module:build — MATCHES controller)
- `/dashboard/recent-projects` → `@RequireModule("build") @RequirePermission("build:tickets:view")` ✓ (manifest permission: "build:tickets:view" — MATCHES)
- `/dashboard/recent-activity` → `@RequireModule("build") @RequirePermission("build:tickets:view")` ✓
- `/dashboard/today-activities` → `@RequireModule("crm") @RequirePermission("crm:leads:view")` ✓
- `/dashboard/leaves-today` → `@RequireModule("hr") @RequirePermission("hr:leaves:view")` ✓
- `/dashboard/pending-approvals` → `@RequireModule("hr") @RequirePermission("hr:leaves:approve")` ✓
- `/dashboard/team-attendance` → `@RequireModule("hr") @RequirePermission("hr:attendance:view")` ✓
- `/dashboard/team-availability` → `@RequireModule("hr") @RequirePermission("hr:attendance:view")` ✓
- `/dashboard/executive` → `@RequirePermission("hr:analytics:read")` ✓
- `/dashboard/birthdays` → `@Universal() @RequireModule("hr")` ✓
- `/dashboard/upcoming-holidays` → `@Universal() @RequireModule("hr")` ✓
- `/dashboard/my-leave-balance` → `@Universal() @RequireModule("hr")` ✓

All 16 manifest entries match the controller. The manifest is correct.

NOTE on NF-1: The separate `DASHBOARD_HOME_SECTIONS` registry (19 entries) does NOT need to match the manifest — it is used for internal caching classification, not for frontend route exposure. However, it contains stale permission strings for "active-sprint", "recent-projects" and "crm-executive" that diverge from the controller (see NF-1 above).

**Result: SPOT-CHECK PASSES** for the manifest-vs-controller claim. NF-1 is a separate drift in the internal registry.

---

### [x] Home section isolation tests (10.3)

**Claim:** The eight failing tests were repaired; tests prove membership lookup cannot bypass disabled-section gating or escalate a single-section failure into full Home failure.

**Verification:** Read `backend/src/modules/dashboard/dashboard-section-isolation.spec.ts` in full (465 lines).
- `organizationMembers.findFirst` mock is correctly wired in every test fixture at lines 86 and 128 (returns `{ id: "member-iso-1" }`).
- GUARANTEE I tests at lines 149-204: three "BITE" tests with explicit removal-proof comments; build/timesheets/hr module gates are tested independently.
- GUARANTEE II tests at lines 210-235: section failure produces a degraded list and leaves `unreadNotifications` intact.
- CRITERION 6/CRITERION 8 tests at lines 387-463: `findFirst` called exactly once; `selectCallCount <= 6`; section bypass regression tests.
- All test adapters implement `organizationMembers.findFirst` — the original regression (the adapter didn't implement it) is fixed.

**Result: SPOT-CHECK PASSES.** Tests are genuine with working bite proofs.

---

## Section 10.1 — Authentication, identity, sessions and organization

### 10.1-1 — Architecture/schema: global identity separated from tenant membership; organization, invitation, membership, session and organization-switch relationships have correct keys, uniqueness, lifecycle and revocation data

**Classification: STILL PENDING**

I did not read the DB schema files for `organizations`, `organization_members`, `sessions`, `invitations` or the account-organization index. The auth service (`auth.service.ts` lines 85-163) shows `users`, `organizationMembers`, `organizations`, `subscriptions`, and `accountOrganizationIndex` tables exist and are used correctly in the registration flow. The session revocation path writes Redis tombstones (`revoked:session:<id>`) as required.

**What is missing:** Schema-level verification of composite FK constraints, unique indexes, lifecycle columns (status, expiresAt, revokedAt) and the cross-tenant composite foreign key structure for membership and invitation tables. These require reading `backend/src/db/schema/common/auth.ts` and the organization schema files.

---

### 10.1-2 — Routes/contracts: signup, login, logout, refresh, recovery, MFA, invitation and organization switching use Zod/OpenAPI contracts and never trust client actor/current-org fields

**Classification: STILL PENDING**

Sampled and verified for all major flows:
- `register`: `registerSchema` applied via `@Validate({ body: registerSchema })` (auth.controller.ts line 121).
- `logout`: `@BodylessAction()` + derives session/userId from `@CurrentUser()` (lines 129-136) — no client body.
- session-exchange (refresh proxy): `sessionExchangeSchema` applied; identity from verified proof not body (lines 249-334).
- magic link (login/recovery): `magicLinkRequestSchema`, `magicLinkVerifySchema` applied.
- email OTP: `requestEmailOtpSchema`, `verifyEmailOtpSchema` applied.
- MFA setup/verify/disable: Zod schemas applied in `mfa.controller.ts` lines 34-77; all derive from `@CurrentUser()`.
- invitation accept/decline: `acceptInvitationSchema`, `declineInvitationSchema` applied; public routes with rate limiting (organization.controller.ts lines 268-289).
- org switch: `switchOrgSchema` applied; `u.userId` from `@CurrentUser()`, `body.orgId` used as membership selector (lines 161-172) — legitimate per CLAUDE.md §5.

No client-supplied `userId`/`actorId` fields were found in any of the sampled request bodies that could be used to impersonate another user.

**What is missing:** I have not exhaustively checked every invitation management route (send, resend, cancel), the `getSessionData` route (lines 169-182) which takes a URL `userId` param gated by `x-internal-secret`, or the internal admin MFA reset route. The `getSessionData` route (`@Public() @Get("session-data/:userId")`) accepts a user ID in the URL but gates it with `INTERNAL_API_SECRET` — this is a server-to-server route. The full OpenAPI alignment (operation IDs, error envelopes, status codes) is not checked.

---

### 10.1-3 — Authorization/security: test account enumeration, fixation/replay, lockout, invitation takeover, revoked membership, cross-org switching and last-owner/owner-transfer invariants

**Classification: STILL PENDING**

Implementation evidence found:
- Anti-enumeration: `resendVerification` returns "If an account exists, a verification email has been sent" regardless (auth.controller.ts line 159).
- Rate limiting: all sensitive auth endpoints call `enforceRateLimit` at correct tiers (auth:register, auth:verify-email, auth:magic-link, auth:email-otp, invite:validate, invite:accept).
- Replay prevention: nonce-based single-use check in session-exchange (lines 300-304).
- Session revocation check: Redis tombstone consulted before minting tokens (lines 308-313).
- Membership check on org switch: `membershipState.resolve` called before org access (lines 320-326).

**What is missing (tests):** I did not read the auth e2e spec (`auth.controller.e2e-spec.ts`) or the RBAC e2e spec to verify tests exist for: invitation takeover, last-owner protection during member removal, cross-org switching denial, revoked-membership session rejection, or account lockout semantics. Without reading the test files, I cannot confirm these scenarios are covered.

---

### 10.1-4 — Queries/cache: bounded membership/session reads, required indexes, immediate invalidation of session, effective-access and organization caches

**Classification: STILL PENDING**

Implementation evidence found:
- Access service (`access.service.ts` lines 70-84) uses: in-memory `permsCache` (30s TTL), `membershipAccessCache` (15s TTL), `versionCache` (1s TTL), Redis-backed version via `AccessVersionChannel`.
- `subscribeVersionBump` is called in `onModuleInit` to receive cross-process invalidation.
- `bumpPermissionsVersion` is used in permission mutation paths (`access-invalidate.ts`).
- User session cache keyed by `userId` in Redis with explicit invalidation.

**What is missing:** I have not verified: (1) that EVERY session-affecting mutation calls `bumpPermissionsVersion`, (2) that the session cache TTL does not outlive the nearest role/delegation expiry, (3) that the `accessVersions` table has correct indexes, (4) that cross-node Redis pub/sub revocation is actually wired (I see `subscribeVersionBump` is called but didn't read its implementation).

---

### 10.1-5 — Frontend/TanStack/tests: verify workspace/onboarding gates, organization switch state, query-key tenant isolation, auth error states and allow/deny/cross-tenant E2E

**Classification: STILL PENDING**

Implementation evidence found:
- `resolveWizardGate` (`frontend/lib/wizard-gate.ts` read in full): implements `/access-suspended`, `/org-setup`, `/employee-onboarding` gates correctly. Suspended check comes first. Cookie-based completion tracking used. The gate does NOT read JWT claims for routing (correct per CLAUDE.md §1).
- `onboarding-gate.ts` exists at `frontend/lib/onboarding-gate.ts`.
- `wizard-gate.test.ts` exists at `frontend/lib/wizard-gate.test.ts`.
- Query scope isolation: `scopedQueryKeyHashFn` is referenced in CLAUDE.md as the mechanism, but I did not read the implementation.

**What is missing:** The org-switch state invalidation, auth error states across loading/error/revoked-session UI paths, and E2E tests have not been read.

---

## Section 10.2 — Organization RBAC and module RBAC

### 10.2-1 — Architecture/schema: permission catalog, six fixed standings, fixed role templates, per-person grants, delegations, scopes and assignments normalized and tenant-correlated; customization must not create a seventh standing or parallel authority source

**Classification: STILL PENDING**

Implementation evidence found:
- Permission catalog is organized as per-module files under `backend/src/modules/rbac/permissions/` (confirmed: accounting, ai, build, billing, calendar, chat, directory, hr, hr-foundation, hr-workforce, hr-enterprise, kb, mail, notifications, onboarding, payments, payroll, shared, storage, support, timesheets, workflows, etc.).
- `backend/src/modules/rbac/__tests__/prd-s6-10-2-invariants.spec.ts` (read lines 1-100): proves `materializeTemplate` rejects unknown template IDs with `NotFoundException`; the only accepted IDs are those in `ROLE_TEMPLATES`; the route schema rejects arbitrary name/slug fields (lines 53-99).
- `role-templates.constants.ts` exports `ROLE_TEMPLATES` (confirmed to exist, not read).
- `user_permission_grants` table and `user_delegations` table exist per CLAUDE.md.

**What is missing:** I did not read `backend/src/db/schema/common/access.ts` to verify composite FK structure for `role_assignments`, `role_permission_grants`, `principal_group_members`, or `user_permission_grants`. The six-standing schema constraint (preventing a seventh) is tested at the application layer but not verified at the DB schema level.

---

### 10.2-2 — Routes/contracts: role/grant/module-access CRUD has strict Zod contracts, stable OpenAPI, idempotent mutations and exhaustive owner/descendant protections

**Classification: STILL PENDING**

I confirmed the existence of `backend/src/modules/rbac/rbac.controller.ts`, `roles.controller.ts`, `role-permission.service.ts`, and their e2e specs. I did not read any of these files.

---

### 10.2-3 — Authorization/cache: data-layer enforcement, deny-by-default classification and revocation invalidation without a database round trip per permission check

**Classification: STILL PENDING**

Implementation evidence found:
- `bumpPermissionsVersion(tx, orgId)` is called inside role/permission mutations in the same transaction.
- `AccessVersionChannel` test (`revocation-negative-control.spec.ts` read lines 1-80): proves that `store.clear()` is required for cross-process invalidation; the negative control shows that a neutered clear leaves stale cache. The positive test at lines 26-53 proves that after `publish("org-p")`, instance B re-reads from DB.
- In-memory `permsCache` is keyed by org/user. Deny-by-default is enforced by `PermissionGuard` and `AccessService.scopeFor` returning `"none"` for unknown keys.

**What is missing:** Not verified that every permission mutation path calls `bumpPermissionsVersion` in its transaction. Not verified that `MfaGuard` and `ModuleGuard` also respect revocation. The bullet requires proof — not just implementation evidence.

---

### 10.2-4 — Queries/performance: effective-permission resolution is batched/cached, scope expansion is bounded and indexes cover subject, role, permission, module and tenant access paths

**Classification: STILL PENDING**

Implementation evidence found:
- `AccessService` uses `permResolveInFlight` map to deduplicate concurrent resolution requests for the same `(userId, orgId)` pair (access.service.ts line 81).
- In-memory `permsCache` avoids repeated DB reads within the TTL window.
- Index verification would require reading the schema and migration files.

---

### 10.2-5 — Frontend/TanStack/tests: verify routes, navigation, queries and buttons consume one effective-access contract and test all role scenarios

**Classification: STILL PENDING**

`useCan`, `useModuleEnabled`, and `useAccess` are referenced in CLAUDE.md as the canonical hooks. I did not read the hooks or any role-scenario tests.

---

## Section 10.3 — Home and dashboard composition

### 10.3-1 — Architecture/schema: Home owns composition/preferences only and does not duplicate Chat, Calendar, Inbox or Notification domain tables or implementation

**Classification: STILL PENDING**

The dashboard controller imports are all from dashboard services (dashboard-stats, dashboard-availability, dashboard-birthdays, dashboard-personal, dashboard-leave, dashboard-announcements, dashboard-crm, dashboard-project) — no Chat/Calendar/Inbox/Notifications service imports seen in the controller. The `dashboard-personal.service.ts` reads from `calendarEvents`, `leaveBalances`, `timesheets`, `notifications`, `tickets` tables directly (lines 1-25 of imports), which are domain tables — this is a bounded read of cross-domain data for summarization, not ownership of those tables.

**What is missing:** Not confirmed that the dashboard module does NOT register or import any Chat/Calendar/Notifications `@Module` class. Not confirmed that no separate SCHEMA TABLE is defined inside the dashboard module folder.

---

### 10.3-2 — Routes/contracts: bounded per-section dashboard contract with independent success/error metadata and permission-safe projections

**Classification: STILL PENDING**

The `getPersonalDashboard` endpoint returns a single aggregated object with a `degraded: string[]` field for partial failure isolation. Each failed section is captured by the `settle()` wrapper and added to `degraded` while the overall request still resolves (confirmed in dashboard-personal.service.ts lines 53-68). This provides independent success/error reporting within a single response, but it is not per-section independent HTTP responses.

**What is missing:** The response DTO schema is not documented or Zod-validated at the controller boundary — `personalService.getPersonalDashboard` returns an inferred TypeScript type, not a declared Zod schema. The "bounded per-section dashboard contract" requires verifying that each field in the response has an explicit projection and that sensitive data is not included. Not verified.

---

### 10.3-3 — Authorization/privacy: derive each section from caller identity and effective access; prove calendar, people, payroll and communication data cannot leak through summaries/counts

**Classification: STILL PENDING**

Implementation evidence found:
- Module gating: `resolvePersonalDashboardModules` checks `access.moduleAvailability` for build, timesheets, hr modules.
- Calendar events query filters by `orgId` and attendance (attendee/creator check for `userId`).
- Notifications count filters by `userId`.

**What is missing:** Not verified that the leave-balance query filters to the requesting user's own data only. Not verified that the timesheet-sum query is scoped to the requesting user. Not verified that team-level HR data (leaves-today, team-attendance) cannot be requested through the `personal` endpoint for unauthorized users.

---

### 10.3-4 — Queries/cache: parallel bounded aggregation, no N+1/fetch-all behavior, per-section cache ownership and mutation invalidation from source modules

**Classification: STILL PENDING**

Implementation evidence found:
- `Promise.all` used in `getPersonalDashboard` (lines 71-77) — parallel aggregation.
- Hard limits: tickets with `limit: 10` (line 95), calendar events with `.limit(3)` (line 73 in outer chain spec), notifications as a single `count()`.
- Per-section cache namespaces defined in `DASHBOARD_HOME_SECTIONS` registry.
- Cache key builder at `dashboard-cache-key.ts` scopes by userId, permissions version, and scope.

**What is missing:** Mutation invalidation from source modules (e.g., when a ticket changes, does the dashboard cache invalidate?) — not verified. The DashboardStatsService caching path not read.

---

### 10.3-5 — Frontend/TanStack/tests: independent Suspense/error/loading/empty states, stable query keys, partial failure isolation, responsive rendering and widget-level allow/deny E2E

**Classification: STILL PENDING**

The home manifest and section registry provide the backend contract. I did not read any frontend Home component files.

---

## Section 10.4 — Settings and module-access administration

### 10.4-1 — Architecture/schema: global settings contain organization configuration/access governance only while operational and module-owned settings remain with their modules

**Classification: STILL PENDING**

Settings routes confirmed at `backend/src/modules/settings/settings.controller.ts`: `settings:view/manage` for org settings, api-keys, git connections, feature flags, user-role updates, automations (via `SettingsAutomationsService`), and custom fields (via `SettingsCustomFieldsService`).

**CONCERN:** `settings-automations.service.ts` and `settings-custom-fields.service.ts` live in the global `settings` NestJS module. If they are exposed through `SettingsController` under `/settings/`, they violate CLAUDE.md §8 which requires module-owned surfaces in `/<module>/settings/*`. The first 100 lines of `settings.controller.ts` show `createAutomationSchema`, `updateAutomationSchema`, `createCustomFieldSchema` — confirming these are exposed through the global settings controller. The type imports at lines 32-47 confirm automations and custom fields routes ARE present in the global settings controller. This is the same as NF-2 above but now confirmed: automations and custom fields are in global `/settings/`.

**What is missing:** Verification of where module settings (e.g., Build-specific custom fields) live. It is possible the global settings endpoint provides a cross-module unified custom fields view while individual modules have their own settings — this would require reading the downstream callers.

---

### 10.4-2 — Routes/contracts: organization profile, hierarchy, security, members, roles, module access and billing settings expose canonical non-duplicated routes and strict contracts

**Classification: STILL PENDING**

Routes confirmed: `GET/PATCH /organization/settings`, `PATCH /organization/security`, `GET/POST/DELETE /organization/holidays`, `GET /organization/members`, `PATCH/DELETE /organization/members/:memberId`, suspend/reactivate member routes — all Zod-validated.

**What is missing:** Hierarchy routes (branches, departments, etc.), module-access routes, and billing settings routes were not read. Not verified that these are non-duplicated with each other or with module-specific routes.

---

### 10.4-3 — Authorization: test owner/admin/member visibility and mutations, last-owner protection, hierarchy scope, module owner administration and record-level denial

**Classification: STILL PENDING**

The controller enforces `settings:view` for read routes and `settings:manage` for mutations. Self-removal is blocked (`if (memberId === u.userId) throw BadRequestException`). Last-owner protection: not verified — I see `removeMember` does not check if this removes the last owner, and the `assertOwnerOnly` import is present but I didn't see it called in the member-removal path.

**CONCERN:** The `@Delete("members/:memberId")` route at lines 202-212 checks `memberId !== u.userId` but does NOT visibly call `assertOwnerOnly` or any last-owner guard. If `memberId` is the organization owner, this could orphan the organization. This requires reading `OrgMemberDepartureService.removeMember` to confirm it protects against last-owner removal.

---

### 10.4-4 — Queries/cache: bounded settings reads, tenant-leading indexes and invalidation of organization, hierarchy, access, navigation and entitlement caches

**Classification: STILL PENDING**

Not read.

---

### 10.4-5 — Frontend/TanStack/tests: canonical routes, form-schema parity, dirty/error/conflict states, permission-backed navigation and mutation invalidation

**Classification: STILL PENDING**

Frontend settings pages exist at `frontend/app/(authenticated)/settings/` (confirmed via glob: 55+ files). Content not read.

---

## Section 10.5 — Directory, Me and universal self-service

### 10.5-1 — Architecture/schema: preserve one organization-person identity with membership, worker and employment facets; resolve subjects through the person seam without cross-tenant inference

**Classification: STILL PENDING**

Implementation evidence found:
- `backend/src/modules/directory/person-seam.ts` exists (confirmed by glob).
- CLAUDE.md backend section explicitly describes the person seam: `organization_people` (person), `organization_members` (login), `workers` (payability), `hr_people`/`hr_employments` (employment).
- `person-seam.ts` takes a `PersonSubject` (`user | worker | person`) and returns a discriminated `PersonResolution`; a cross-tenant subject resolves to `{ status: "unresolved" }` — surfaced as 404, not 403.
- `person-seam.spec.ts`, `person-seam-batch.spec.ts` exist.

**What is missing:** The actual schema definition (`organization_people` table structure, composite FKs for worker/employment facets) not read.

---

### 10.5-2 — Routes/contracts: use `/me/*` for self operations, derive subject from authentication and separate directory projections from sensitive HR/payroll projections

**Classification: STILL PENDING**

Implementation evidence found:
- `backend/src/me/me.controller.ts` (read in full): `GET /me`, `GET /me/access`, `GET /me/org-display`, `GET/PATCH /me/profile`, `GET /me/login-history`, `GET /me/auth-analytics` — all derive from `@CurrentUser()`, all `@Universal()`.
- `backend/src/modules/hr/time/employee-attendance.controller.ts` and `employee-time-off.controller.ts` also use `/me/` route prefixes (confirmed by grep).
- Directory controller: `GET /directory/people` and `GET /directory/people/:id` are `@Universal()`, returning organization-level projections.

**CONCERN:** HR self-service controllers (`employee-attendance.controller.ts`, `employee-time-off.controller.ts`) are in the HR module but expose routes under `/me/`. This is the correct pattern (HR module owns the implementation, exposed via `/me/` path), but it creates multiple NestJS controllers targeting the `/me/` prefix. NestJS resolves these by controller registration order — if two controllers both declare `@Controller("me")` and have overlapping routes, only the first registered wins silently. This requires verifying that these HR controllers use sub-path registration (e.g., `@Controller("me/time-off")`) rather than `@Controller("me")`. Not verified.

---

### 10.5-3 — Authorization/privacy: prove universal member access only to allowed self-service/directory records and separate HR/payroll administrative widening through DataScope

**Classification: STILL PENDING**

Implementation evidence found:
- Directory reads (`GET /directory/people`, `GET /directory/people/:id`) are `@Universal()` — every member can access.
- Admin mutations (`POST /directory/people`, `PATCH`, `DELETE`) require `directory:people:create/update/delete`.
- Person seam returns `{ status: "unresolved" }` for cross-tenant subjects → 404.
- `/me/*` routes are scoped to `u.userId` from `@CurrentUser()`.

**What is missing:** Not verified that `DirectoryService.listPeople` does not expose sensitive HR/payroll data (salary, bank, tax) in its projection. Not verified DataScope gating for HR administrative widening. Not verified that the directory projection is minimal (explicit column selection).

---

### 10.5-4 — Queries/cache: minimal projections, bounded directory search, tenant-safe person resolution and invalidation across membership/worker/employment changes

**Classification: STILL PENDING**

`backend/src/modules/directory/dto/directory.schemas.ts` exists (confirmed). `directory.service.spec.ts` exists. Content not read. `listPeopleQuerySchema` is used as Zod query validation in the controller — confirms schema-validated queries. Bounded search: the query accepts a `search` param, gated with `@Validate({ query: listPeopleQuerySchema })` — schema likely includes a limit. Not confirmed.

---

### 10.5-5 — Frontend/TanStack/tests: verify self and administration keys never collide, universal navigation survives disabled paid modules and cross-person/cross-org denial tests pass

**Classification: STILL PENDING**

`frontend/app/(authenticated)/me/` exists (confirmed: `onboarding/` sub-pages). Full route inventory not read. Hook collision between self-keys and admin keys not verified.

---

## Coverage statement

I directly read the following files:
- `backend/src/modules/auth/auth.controller.ts` (full, 343 lines)
- `backend/src/modules/auth/dto/auth.schemas.ts` (full, 61 lines)
- `backend/src/modules/auth/auth.service.ts` (lines 1-249)
- `backend/src/modules/auth/auth-session-exchange.spec.ts` (lines 1-80)
- `backend/src/modules/dashboard/dashboard.controller.ts` (full, 213 lines)
- `backend/src/modules/dashboard/dashboard-section-registry.ts` (full, 63 lines)
- `backend/src/modules/dashboard/dashboard-section-isolation.spec.ts` (full, 465 lines)
- `backend/src/modules/dashboard/dashboard-personal.service.ts` (lines 1-100)
- `backend/src/modules/dashboard/dashboard-cache-key.ts` (full, 29 lines)
- `backend/src/modules/mfa/mfa.controller.ts` (full, 79 lines)
- `backend/src/modules/access/access.service.ts` (lines 1-100)
- `backend/src/modules/access/__tests__/revocation-negative-control.spec.ts` (lines 1-80)
- `backend/src/modules/rbac/__tests__/prd-s6-10-2-invariants.spec.ts` (lines 1-100)
- `backend/src/modules/organization/core/organization.controller.ts` (lines 1-370)
- `backend/src/modules/settings/settings.controller.ts` (lines 1-100)
- `backend/src/modules/directory/directory.controller.ts` (lines 1-100)
- `backend/src/me/me.controller.ts` (full, 81 lines)
- `frontend/lib/home/home-manifest.generated.json` (full, 23 lines)
- `frontend/lib/wizard-gate.ts` (full, 43 lines)

I used directory listing (glob/grep) to confirm existence of 60+ additional files without reading their content. The 10.1-4 Frontend, 10.2-5, 10.3-5, 10.4-2 through 10.4-5, and 10.5-4 through 10.5-5 bullets are marked STILL PENDING entirely based on file existence; actual behavior is not verified.
