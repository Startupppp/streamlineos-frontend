# Lane H — Cross-Cutting: RBAC, Identity, Security, PII/Encryption, Audit Trail, Tooling
> READ-ONLY audit. Phase-1 recon. Date: 2026-07-31.

---

## 1. Identity Model

### Tables and relationships

| Entity | File | Notes |
|--------|------|-------|
| `users` | `backend/src/db/schema/common/auth.ts:103` | Central identity. **No `orgId` column** — multi-tenancy is via join table. Has `lastActiveOrgId` pointer (FK nullable). |
| `organizationMembers` | `auth.ts:82` | Join table making org membership explicit. `uniqueIndex("uniq_org_members_user_org").on(userId, orgId)` confirms one row per user per org → multi-org is supported. `isOwner bool`, `status membershipStatusEnum`. |
| `hrPeople` | `backend/src/db/schema/hr/core-people.ts:67` | HR person entity per org. `userId` is **nullable** (FK `set null`) — candidates without platform accounts can exist. Owns personal PII (DOB, gender, nationality, address, emergency contact). |
| `hrEmployments` | `core-people.ts:103` | Employment contract record per (org, person). `employeeNumber` unique per org. Has full lifecycle status (`lifecycleStatus hrEmploymentLifecycleStatusEnum`). `isPrimary bool`. Supports multiple concurrent employments per person. |
| `hrEmployeeSensitiveFields` | `core-people.ts:137` | 1:1 with `hrEmployments`. Holds salary (cents integer), bank details (JSONB), `taxId`, `panNumber`, `nationalId`, `passportNumber`, passport expiry, visa, medical notes, BGV. All **PLAINTEXT** — no column encryption. |
| `hrEmploymentHistory` | `core-people.ts:177` | Transition audit log. Captures `fromStatus`, `toStatus`, `reason`, `effectiveDate`, `createdBy`. Append-only pattern. |
| `hrEffectiveDatedChanges` | `core-people.ts:194` | Scheduled future changes (department, manager, compensation, etc.) with `status draft/approved/applied`. |
| `hrReportingLines` | `core-people.ts:219` | Explicit manager graph (primary / matrix / dotted) with effectivity dates. |

### Key answers

- **Does `users` carry `orgId`?** No. Multi-tenancy is via `organizationMembers` join table. `users.lastActiveOrgId` is a UX pointer (last active org), not an access boundary.
- **Can one identity belong to multiple orgs?** Yes — `organizationMembers` is `(userId, orgId)` unique, allowing many orgs per identity.
- **Is there a separate `employees` record per org?** Yes — `hrPeople` + `hrEmployments` per org, linked to `users.id` via nullable FK.
- **Is there a dated `employments`/contract entity with lifecycle?** Yes — `hrEmployments` with `lifecycleStatus` + `hrEmploymentHistory` for transitions.
- **Is there a `legalEntities` table?** No separate `legalEntities` table exists. Legal entity hierarchy is modelled via `orgUnits` (`backend/src/db/schema/common/organization.ts:37`) with kinds `BUSINESS_UNIT / BRANCH / DEPARTMENT / TEAM / LOCATION / COST_CENTER`.

### Legacy PII in `users` table (pre-HR-schema fields)

`backend/src/db/schema/common/auth.ts:115–128`:
- `taxId text` — plaintext
- `bankDetails text` — plaintext
- `monthlySalary decimal(15,2)` — plaintext float (not integer cents — violates §19)
- `gender genderEnum`
- `dateOfBirth date`
- `emergencyContact jsonb`

These duplicate the newer `hrPeople`/`hrEmployeeSensitiveFields` fields and have no access gate beyond being in the same `users` row returned to the requesting user.

---

## 2. Lifecycle States

Modelled in `hrEmploymentLifecycleStatusEnum` at `core-people.ts:19`:
```
CANDIDATE | PRE_JOINING | ONBOARDING | ACTIVE | PROBATION | CONFIRMED | NOTICE | EXITED | ALUMNI | SUSPENDED
```

One `status` column on `hrEmployments` (not booleans, not separate tables). Transition log exists in `hrEmploymentHistory` (before/after, reason, actor, effectiveDate). No state-machine validation (no guard preventing invalid transitions) — a service could jump directly from CANDIDATE to EXITED with no code rejection.

Organisation-level membership status: `membershipStatusEnum` on `organizationMembers.status` — `ACTIVE | SUSPENDED | LEFT`. The `JwtAuthGuard` checks this on every request (`isMembershipActive`, `auth.ts:241`).

---

## 3. RBAC Engine

### Resolution path

1. Request arrives → `JwtAuthGuard` (global `APP_GUARD`, `app.module.ts:164`).
2. JWT payload decoded → `BackendClaims` extracted (`backend/src/common/auth/backend-claims.ts:1`). Claims carry `permissions: string[]` and `enabledModules: string[]` but **only `permissions` are placed in `req.user`** — `enabledModules` is set to `[]` at `jwt-auth.guard.ts:219`.
3. `PermissionGuard` (PER-CONTROLLER, not global) → `authorize()` (`access/authorize.ts:10`) → `access.isModuleEnabled(orgId, moduleKey)` (DB, cached) then `access.resolveUserPermissions(orgId, userId)` (DB, multi-layer cached).
4. On success, `req.user.permissions` is **overwritten** with the DB-resolved set (`permission.guard.ts:53–55`).

### Cache keys and TTL

| Layer | Key | TTL |
|-------|-----|-----|
| In-memory version cache | `orgId` → `{version, expiresAt}` | 5s (`VERSION_CACHE_TTL_MS`) |
| Redis perms cache | `access:perms:${orgId}:${userId}:v${version}` | 600s (`CACHE_TTL.LONG`) |
| In-memory perms cache | `${orgId}:${userId}:${version}` | 30s (`PERMS_CACHE_TTL_MS`) |
| Denied modules cache | `${orgId}:${userId}` | 15s (`DENIED_MODULES_TTL_MS`) |

### Invalidation

`bumpPermissionsVersion(tx, orgId)` at `backend/src/common/rbac/access-invalidate.ts:23` — increments `access_versions.permissionsVersion` and fires in-process listeners to clear the version cache. Redis perms cache is invalidated implicitly (version change makes the old key stale). Must be called inside the same transaction as any role/permission mutation.

### Permissions from JWT vs DB

The JWT carries a `permissions[]` array (populated at session creation by `AuthService.getSessionData()` at `auth.service.ts:221`). `JwtAuthGuard` places this stale array into `req.user.permissions`. Any handler that operates WITHOUT `PermissionGuard` will see **stale JWT permissions** on `req.user`. `PermissionGuard` overwrites it with the DB-resolved set — but only when applied.

### `enabledModules` source

`EntitlementsService.isModuleEnabled()` reads from `org_modules` table (DB via cache), NOT from the JWT claim. `ModuleGuard` at `module.guard.ts:28` calls `entitlements.isModuleEnabled(user.orgId, moduleKey)` — DB authoritative. The JWT `enabledModules` claim is stripped from `req.user` at guard time (`jwt-auth.guard.ts:219`).

---

## 4. Permission Catalog

### Structure

Backend: folder of per-module files behind a barrel — `backend/src/modules/rbac/permissions/` with 25+ files:
`hr.ts`, `shared.ts`, `crm.ts`, `build.ts`, `payroll.ts`, `timesheets.ts`, `onboarding.ts`, `module-access.ts` (generates `${module}:access:view/manage` for 10 modules), `role-defaults.ts` (ROLE_DEFAULT_PERMISSIONS), etc. Aggregated in `catalog.ts` → `PERMISSIONS[]`.

Frontend: similar structure at `frontend/lib/rbac/permissions/` with separate per-module files, aggregated in `roles.ts`.

### Action verbs in backend catalog

`view` | `create` | `update` | `delete` | `manage` | `assign` | `export` | `approve` | `reject` | `import` | `read` | `write` | `use` | `generate` | `lock` | `reopen` | `publish` | `send` | `complete` | `respond` | `regularize` | `transfer` | `report` | `schedule`

Note: `read`/`write` (non-standard per §21 which specifies only `view/create/update/delete/manage/assign/export/approve/reject/import`) are used in several modules.

### Catalog drift: Backend keys absent from Frontend

The following HR permission keys exist in the backend catalog (`hr.ts`) but have **no equivalent in the frontend HR file** — meaning `useCan("hr:sensitive:view")` etc. permanently return `false`, the UI cannot gate these controls:

**CRITICAL (sensitive data gates):**
- `hr:sensitive:view` — View unmasked salary, bank, PAN, national ID, passport
- `hr:sensitive:manage` — Write sensitive fields

**HIGH (HR operations):**
- `hr:audit:view` | `hr:automations:view` | `hr:automations:manage`
- `hr:policies:view` | `hr:policies:manage`
- `hr:workflows:view` | `hr:workflows:manage` | `hr:workflows:approve`
- `hr:templates:view` | `hr:templates:manage`
- `hr:interviews:view` | `hr:interviews:manage`
- `hr:offers:view` | `hr:offers:manage` | `hr:offers:approve`
- `hr:compliance:manage` | `hr:contracts:view` | `hr:contracts:manage`
- `hr:email-templates:manage`
- `hr:exit:manage` | `hr:exit:view` | `hr:exit:create` | `hr:exit:approve`
- `hr:helpdesk:view` | `hr:helpdesk:create` | `hr:helpdesk:manage`
- `hr:communications:send`
- `hr:attendance:regularize`
- `hr:probation:view` | `hr:probation:manage`
- `hr:succession:view` | `hr:succession:manage`
- `hr:engagement:view` | `hr:engagement:manage`
- `hr:cases:view` | `hr:cases:manage` | `hr:cases:confidential`
- `hr:safety:view` | `hr:safety:manage`
- `hr:feedback:manage` | `hr:feedback:view`
- `hr:workforce:manage`
- `hr:forms:view` | `hr:forms:manage`
- `hr:legalhold:view` | `hr:legalhold:manage`
- `hr:retention:manage`
- `hr:positions:view` | `hr:positions:manage`
- `hr:labor:view` | `hr:labor:manage`
- `hr:compensation:manage`
- `hr:equity:view` | `hr:equity:manage`
- `hr:accommodations:view` | `hr:accommodations:manage`
- `hr:emergency:manage`
- `hr:identity:view` | `hr:identity:manage`
- `hr:eventstream:view`
- `hr:shifts:view` | `hr:shifts:manage`
- `hr:geofencing:manage` | `hr:biometric:manage`
- `hr:kpis:view` | `hr:kpis:manage`
- `hr:announcements:view` | `hr:announcements:manage`
- `hr:requisitions:view` | `hr:requisitions:manage`
- `hr:onboarding:manage`
- `hr:leaves:read` | `hr:leaves:manage`
- `hr:analytics:read` | `hr:headcount:read`
- `hr:import:manage` | `hr:export:manage`

**Total backend-only HR keys (approximate): ~58**

### Catalog drift: Frontend keys absent from Backend

The frontend has separate files for `audit-log`, `branch`, `self`, `calendar`, `reports`, `settings`, `tasks`, `workflows`, `timesheets`, `ownership` — but these all map to keys that DO exist in the backend `shared.ts` file (e.g. `audit-log:read`, `branch:view`, `self:attendance`, `calendar:read`, etc.). No confirmed frontend-only phantom keys after cross-check — the CI test (`catalog-sync.test.ts`) also verifies this. Prior drift (`branch:read` phantom) appears resolved.

### `ROLE_DEFAULT_PERMISSIONS`

`backend/src/modules/rbac/permissions/role-defaults.ts:52`:
```ts
OWNER: ALL_PERMISSION_NAMES   // all catalog keys
ORG_ADMIN: ALL_PERMISSION_NAMES  // all catalog keys
MEMBER: [...EMPLOYEE_SELF_SERVICE]  // ~23 keys
```
Only 3 entries. HR_ADMIN is in `ROLE_TEMPLATES` (role-templates.constants.ts:83), not in `ROLE_DEFAULT_PERMISSIONS`. A fresh org gets system roles seeded (`seed-system-roles.ts`) but HR_ADMIN is template-only — must be explicitly cloned.

---

## 5. Role Templates vs Defaults

HR-relevant templates in `role-templates.constants.ts`:
- `HR_ADMIN` (slug `HR_ADMIN`, moduleKey `hr`): ~45 keys including hr:*, payroll:*, directory:*, workforce:*
- `BRANCH_HR` (slug `BRANCH_HR`, moduleKey `hr`): subset of HR_ADMIN

Keys enforced on backend endpoints (with `@RequirePermission`) that are absent from the `HR_ADMIN` template (representative sample):
- `hr:sensitive:view` / `hr:sensitive:manage` — the sensitive fields controller uses these but template doesn't include them
- `hr:succession:view/manage`, `hr:legalhold:view/manage`, `hr:retention:manage`, `hr:equity:view/manage`, `hr:compensation:manage`, `hr:cases:confidential`

Count of enforced keys absent from HR_ADMIN template: approximately 25–30 (exact count would require full endpoint grep vs template list comparison — these are the clearly missing ones based on backend hr.ts catalog).

---

## 6. HR Role Orthogonality

HR role is NOT a separate dimension — it uses the same general role engine with `moduleKey = "hr"` scoping. No separate ESS/MSS/HR-admin/payroll-admin dimension table exists. HR-specific roles are `HR_ADMIN` and `BRANCH_HR` templates cloned per org.

DataScope (`own` / `team` / `all` / `none`) is applied IN the WHERE clause at the DB layer via `applyScope()` at `backend/src/modules/access/apply-scope.ts:29`. Implementation uses SQL: `own` → `eq(ownerColumn, userId)`, `team` → subquery through `org_unit_members` for TEAM-type units, `all` → `sql\`true\``, `none` → `sql\`false\``. Applied in the handler by reading `req.rbacScope` (set by `PermissionGuard`).

---

## 7. Global Pipeline

### Registered globally in `app.module.ts`

| Token | Class | File |
|-------|-------|------|
| `APP_GUARD` | `JwtAuthGuard` | `common/auth/jwt-auth.guard.ts` |
| `APP_INTERCEPTOR` | `ZodValidationInterceptor` | `common/validation/zod-validation.interceptor.ts` |
| `APP_INTERCEPTOR` | `DeprecationInterceptor` | `common/deprecation/deprecation.interceptor.ts` |

### Registered globally in `main.ts`

| Mechanism | Class |
|-----------|-------|
| `useGlobalFilters` | `AllExceptionsFilter` |
| `useGlobalInterceptors` | `ResponseTransformInterceptor` |

### NOT global (per-controller)

- `PermissionGuard` — applied via `@UseGuards(JwtAuthGuard, PermissionGuard)` per controller/method
- `ModuleGuard` — applied via `@UseGuards(ModuleGuard)` per controller, requires `@RequireModule` metadata
- `RateLimitGuard` — applied via `@UseRateLimit(tier)` decorator per handler

### Validation mechanism

`ZodValidationInterceptor` (global) + `@Validate({ body, query, params })` decorator for new-style handlers. Legacy style: `ZodValidationPipe` applied per-parameter (`@Body(new ZodValidationPipe(schema))`). The `ZodValidationPipe` appears 2178 times across 437 files. The `@Validate` decorator appears in a handful of newer files. Both coexist — the interceptor is a pass-through when no `@Validate` metadata is present.

---

## 8. Error Envelope

File: `backend/src/common/http/all-exceptions.filter.ts`

```
ZodError   → 400  { error: "Validation failed: <path>: <msg>; ..." }
HttpException (string body)  → <status>  { error: "<string>" }
HttpException (obj w/ code)  → <status>  { code: "<code>", message/error: "...", details?: ... }
HttpException (obj w/ message string) → <status>  { error: "<message>" }
HttpException (obj w/ message array)  → <status>  { error: "<joined>" }
Transient DB error → 503  { error: "The service is temporarily unavailable. Please try again." }
Unhandled → 500  { error: "An unexpected error occurred" }
```

- **Machine-readable `code`**: Only if the `HttpException` body includes a `code` field — not present by default; no enum of codes.
- **`requestId` in response**: Not included. The correlation ID middleware (`correlation-id.middleware.ts`) exists and likely sets a request header, but it is NOT reflected in the error JSON body.
- **Stack traces in production**: No — the filter never includes `error.stack` in the JSON response.
- **Raw DB errors**: No — transient DB errors return a generic 503. Other DB errors fall to the unhandled 500 path with a generic message (full error logged server-side only).

---

## 9. PII / Encryption / Classification

### What exists

`backend/src/common/security/secret-encryption.util.ts`: AES-256-GCM (`aes-256-gcm`), key derived via SHA-256 of `ENCRYPTION_KEY` env var. Format: `enc:v1:<base64(iv|tag|ciphertext)>`. Used for **payment provider secrets only** (Razorpay/payment provider API keys). NOT applied to HR PII.

### PII fields and their storage

| Field | Table | Column | Encrypted? |
|-------|-------|--------|-----------|
| PAN number | `hr_employee_sensitive_fields` | `pan_number text` | **NO — plaintext** |
| National ID (Aadhaar) | `hr_employee_sensitive_fields` | `national_id text` | **NO — plaintext** |
| Passport number | `hr_employee_sensitive_fields` | `passport_number text` | **NO — plaintext** |
| Bank account / IFSC | `hr_employee_sensitive_fields` | `bank_details jsonb` | **NO — plaintext JSON** |
| Salary (cents) | `hr_employee_sensitive_fields` | `salary_amount_cents integer` | **NO** |
| Medical notes | `hr_employee_sensitive_fields` | `medical_notes text` | **NO — plaintext** |
| Tax ID (legacy) | `users` | `tax_id text` | **NO — plaintext** |
| Bank details (legacy) | `users` | `bank_details text` | **NO — plaintext** |
| Salary (legacy float) | `users` | `monthly_salary decimal(15,2)` | **NO** |
| Emergency contact | `users` / `hr_people` | `emergency_contact jsonb` | **NO** |
| TOTP secret | `users` | `totp_secret text` | **NO — plaintext** (MFA seed) |
| DOB | `hr_people` | `date_of_birth date` | **NO** |
| Gender | `hr_people` | `gender text` | **NO** |

### Column classification

No `PII`, `SENSITIVE_PII`, `COMP`, `BIOMETRIC` column classification annotations exist anywhere in the schema. No `pgcrypto` column encryption. No KMS integration. No field-level access audit policy at the DB layer.

### `ENCRYPTION_KEY` required?

No. `env.validation.ts:53`: `ENCRYPTION_KEY: z.string().optional()` — startup does NOT fail if absent. `encryptSecret()` will throw at runtime only when a payment provider secret is first stored.

---

## 10. Audit Trail

### Two audit systems

**1. General audit** (`common/audit/audit.service.ts`):
- Table: `audit_logs` (referenced via `common/audit/audit.service.ts:38`)
- Schema fields: `action`, `userId`, `orgId`, `targetId`, `targetType`, `actorUserId`, `resourceType`, `resourceId`, `metadata jsonb`, `ipAddress`, `result`, `requestId`, `userAgent`, `before`, `after`
- **Write mechanism: fire-and-forget** (`void this.db.insert(...).catch(logger.error)`) — entries can silently drop on DB failure. No retry, no outbox.
- Call sites: ~241 total in HR module alone, system-wide.

**2. HR-specific audit** (`backend/src/modules/hr/core/hr-audit.service.ts`):
- Table: `hr_audit_logs` (`hr/core-audit.ts:13`)
- Schema: `orgId`, `actorId`, `entityType`, `entityId`, `action`, `before jsonb`, `after jsonb`, `ipAddress`, `userAgent`
- Write mechanism: **awaited** (`await this.db.insert(...)`) — synchronous, will surface DB errors.
- Sensitive field reads (`HrSensitiveService.get()`): audited with action `sensitive.viewed` ✓
- Sensitive field writes: audited with action `sensitive.updated`, before/after redacted (only `hasSalary/hasBankDetails/hasTaxId` boolean) ✓

### Compensation data reads

`hr_audit_logs` captures every `GET /hr/employments/:id/sensitive` call with actor + IP. Salary reads ARE audited.

### Gap

The general `AuditService.log()` is fire-and-forget — if the DB is under load or has a transient error, audit entries silently disappear. No outbox/WAL-based audit durability.

---

## 11. Security Posture

### Helmet

`main.ts:31`: `app.use(helmet())` — default helmet headers applied (CSP, HSTS, X-Frame-Options, etc.).

### CORS

`main.ts:36–49`: `corsOrigins` from env, `credentials: true`. In development, allows localhost/127.0.0.1/[::1] + configured origins. In production, strict allowlist only.

### Rate limiting

Per-controller, opt-in via `@UseRateLimit(tier)` decorator. Not applied globally — endpoints without the decorator have no rate limit. Auth endpoints and public routes should be verified separately.

### Password hashing

No `password` column in `users` table — the system uses NextAuth OAuth + email OTP/magic links (passwordless). No user password is bcrypt-hashed. Bcrypt (cost 12) is used for API token hashing (`user-api-tokens.service.ts:21`) and bcrypt (cost 10) for MFA backup codes (`mfa.service.ts:76`). These are acceptable for token hashing (Argon2id requirement applies to passwords — no passwords stored here).

### JWT

HS256 algorithm enforced (`jwtVerify` with `algorithms: ["HS256"]`, `jwt-auth.guard.ts:140`). Minimum 44-char secret enforced at startup (`env.validation.ts:27`). Session revocation checked per request (Redis `revoked:session:${sessionId}`, 5s local cache).

### Cookie / Session

SessionToken table in auth schema. `userSessions` table for device tracking. JWT delivered as Bearer token (not cookie) for API calls — no CSRF risk on the API. Frontend uses NextAuth cookie-based session; proxy.ts adds CSP header with nonce.

### CSRF

Not applicable to the NestJS backend (Bearer token auth). Frontend NextAuth sessions use `SameSite` cookies (default NextAuth behaviour).

### Swagger

`main.ts:60`: Swagger enabled at `/api/docs` in all environments (including production). This exposes full API schema in prod — should be disabled or auth-gated in production.

### proxy.ts authorization

The Next.js proxy (`frontend/proxy.ts`) makes UX-level redirect decisions (unauthenticated → /signin, MFA required → /settings, etc.). It correctly reads JWT claims for UX only and makes NO authorization decisions that the backend doesn't re-enforce. Per CLAUDE.md §17, this is correct. No authorization decision rests on proxy.ts alone.

---

## 12. Secrets & Config

### Startup validation

`backend/src/config/env.validation.ts`: Zod schema validated at `validateEnv()` called in `main.ts:18`. Fails fast if required vars missing. Required: `DATABASE_URL`, `BACKEND_JWT_SECRET` (min 44 chars), `PORTAL_JWT_SECRET` (min 44 chars), `CORS_ORIGINS`, `APP_URL`. In production additionally: `CRON_SECRET`, `INTERNAL_API_SECRET`, `CONTACT_NOTIFICATION_EMAIL`.

### Optional secrets that should arguably be required in production

- `ENCRYPTION_KEY`: `optional()` — AES encryption fails at runtime without it, but startup succeeds. Payment secrets stored without this key will cause a runtime crash.
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`: optional — without Redis, session revocation checking is skipped (revocation cache falls through).
- `ABLY_API_KEY`: optional — realtime disabled silently.

### `.env` gitignore

`backend/.gitignore`: `.env`, `.env.*` excluded, `!.env.example` retained. ✓

### `.env` and `.env.production` in repo root check

`backend/.env` and `backend/.env.production` were found by glob — these files are present in the working tree. Git tracks them only if they were committed before the gitignore rule was added. **This must be verified** — if committed, all secrets in them are exposed in git history.

### Hardcoded credentials

None found in the audited source files. CI workflow (`backend.yml:24–27`) contains a test-only `BACKEND_JWT_SECRET` value (`ci-only-backend-jwt-secret-with-at-least-44-characters`) — this is intentional test fixture, not a production secret.

---

## 13. Tooling

### Dead-code scanning

No `knip`, `ts-prune`, or `depcheck` configuration found in either repo.

### Test runner

Backend: Jest (`pnpm test -- --runInBand`). Frontend: Jest (`pnpm test --runInBand`). Frontend has `catalog-sync.test.ts` for permission drift detection.

### CI (`.github/workflows/`)

| Workflow | Triggers | Steps |
|----------|----------|-------|
| `frontend.yml` | push to main (frontend/** paths), all PRs | install → lint → type-check → test → build |
| `backend.yml` | push to main (backend/** paths), PRs to main (backend/** paths) | install → lint → typecheck → unit tests → build → docker build |

**Gap**: Backend CI does NOT run on PRs that touch non-backend paths. A frontend-only PR gets no backend CI run.

### Commands

**Backend:**
- `pnpm lint` (ESLint)
- `pnpm typecheck` (tsc)
- `pnpm test` (Jest)
- `pnpm build` (nest build)
- `pnpm -C backend db:generate` / `db:push` / `db:migrate`

**Frontend:**
- `pnpm run lint`
- `pnpm run type-check`
- `pnpm test`
- `pnpm run build`

---

## 14. Top Findings

| SEV | Location | Finding |
|-----|----------|---------|
| P0 | `backend/src/db/schema/hr/core-people.ts:137–175` | PAN, national ID, passport number, bank account/IFSC stored as **plaintext** in `hr_employee_sensitive_fields`. `secret-encryption.util.ts` exists (AES-256-GCM) but is not applied to HR PII. |
| P0 | `backend/src/db/schema/common/auth.ts:115–128` | Legacy HR PII on `users` table: `tax_id`, `bank_details`, `monthly_salary`, `emergency_contact`, `date_of_birth` — all plaintext, no encryption, no per-field access gate. |
| P0 | `backend/src/common/audit/audit.service.ts:37` | General `AuditService.log()` is fire-and-forget (`void db.insert().catch(logger.error)`) — audit entries can silently drop on DB failure. No outbox or durability guarantee. |
| P0 | `frontend/lib/rbac/permissions/hr.ts` | `hr:sensitive:view` and `hr:sensitive:manage` missing from frontend catalog — `useCan("hr:sensitive:view")` always false, making it impossible to properly gate the unmasked PAN/bank/salary UI. |
| P0 | `backend/src/common/auth/jwt-auth.guard.ts:219` | `enabledModules` stripped to `[]` in `req.user`, but `permissions` from JWT is set first. Handlers without `PermissionGuard` see stale JWT permissions on `req.user.permissions`. |
| P1 | `backend/src/app.module.ts:164–166` | `PermissionGuard` is NOT a global provider. Any endpoint decorated only with `@UseGuards(JwtAuthGuard)` has NO permission check — only authentication. Must audit all controllers for this gap. |
| P1 | `backend/src/main.ts:58–61` | Swagger enabled at `/api/docs` in ALL environments. Full API schema exposed in production with no authentication gate. |
| P1 | `backend/src/config/env.validation.ts:53` | `ENCRYPTION_KEY` is `optional()` — startup succeeds without it, deferring the crypto failure to the first payment-secret write operation. |
| P1 | `frontend/lib/rbac/permissions/hr.ts` | ~58 backend HR permission keys absent from frontend catalog — all `useCan()` calls for these always return false silently, leaving those features ungated in the UI for non-owners. |
| P1 | `backend/src/db/schema/hr/core-people.ts:137` | `medicalNotes text` stored plaintext — health/medical data. No column encryption, no access classification. |
| P2 | `backend/src/modules/rbac/permissions/role-defaults.ts:52` | Only 3 roles in `ROLE_DEFAULT_PERMISSIONS` (OWNER, ORG_ADMIN, MEMBER). HR_ADMIN is template-only — a fresh org without explicit template cloning has no HR admin role. |
| P2 | `backend/src/modules/rbac/role-templates.constants.ts:83–171` | HR_ADMIN template missing ~25–30 enforced backend permission keys (e.g. `hr:sensitive:view`, `hr:succession:view`, `hr:legalhold:view`, `hr:compensation:manage`, `hr:equity:view`, `hr:cases:confidential`). HR admins assigned this template cannot reach those endpoints. |
| P2 | `backend/src/common/rbac/module.guard.ts` | `ModuleGuard` is per-controller, not global. Endpoints with `@RequireModule` guard only work if `ModuleGuard` is explicitly in `@UseGuards` — easy to forget. |
| P2 | `backend/src/db/schema/hr/core-people.ts:103` | No state-machine guard on `lifecycleStatus` transitions — a service can write CANDIDATE → EXITED without any code-level validation of valid transition paths. |
| P2 | `backend/src/modules/access/access.service.ts:47` | Redis permissions cache TTL is 600s (10 min). After `bumpPermissionsVersion` the Redis key becomes stale but is not proactively deleted — users may see old permissions for up to 10 min after role changes (version bump makes new key, old key TTLs out). |
| P2 | `backend/.env` and `backend/.env.production` | Both files exist on disk. If they were ever committed to git before the gitignore rule, all secrets are in git history. Requires `git log -- backend/.env` verification. |
| P2 | `backend/src/db/schema/common/auth.ts:141` | `totp_secret text` stored plaintext — TOTP seed is a long-lived credential; should be encrypted at rest. |
| P3 | `backend/src/modules/rbac/permissions/hr.ts:453` | `hr:cases:confidential` uses `action: "manage"` despite being described as a view-level confidential gate — misleading action label for a read control. |
| P3 | `backend/src/common/ratelimit/rate-limit.guard.ts` | Rate limiting is per-controller opt-in. No global default rate limit — unauthenticated or lightly-protected endpoints may be unthrottled. |
| P3 | No knip/ts-prune configured | Dead code accumulates undetected; no automated dead-symbol detection in CI. |
| P3 | `frontend/lib/rbac/permissions/__tests__/catalog-sync.test.ts:23` | `KNOWN_PHANTOM_KEYS = new Set<string>()` — the test enforces zero phantom keys but has no reciprocal backend-only key check. The 58 backend-only HR keys are invisible to the test. |

---

## Coverage Gaps (areas not fully audited)

- Per-controller `@UseGuards` audit: requires full grep of every controller to confirm `PermissionGuard` presence on protected endpoints.
- RLS: no Postgres Row-Level Security policies deployed — no DB-layer backstop for tenant isolation.
- Multi-org data isolation: `resolveUserPermissions` uses `organizationMembers.orgId` scope ✓ but individual service-layer `WHERE org_id = ?` discipline requires per-service review.
- `users.bankDetails` and `users.taxId` column consumers: need grep to find all read paths to confirm gating.
- Biometric template storage: `hr_biometric` schema not reviewed in detail.
