# L36 — OpenAPI Contract Coverage: Identity & Platform-Ops Trees

**Lane:** L36 | **Date:** 2026-08-30 | **Status:** COMPLETE

---

## Scope

Closed generated-contract coverage for the identity and platform-operations module trees by migrating handlers from named `@Query("x")` / `@Body("x")` params (invisible to `scanOperationContracts`) to `@Validate({ body, query, params })`.

**Exclusive ownership:** controllers and `dto/` files in:
- `modules/auth/**`
- `modules/sessions/**`
- `modules/mfa/**`
- `modules/users/**`
- `modules/organization/**`
- `modules/announcements/**`
- `modules/api-tokens/**`
- `modules/agent/**`
- `modules/settings/**`
- `modules/platform/**`
- `modules/storage/**`
- `modules/audit-log/**`
- `modules/activities/**`
- `modules/public/**`
- `modules/portal/**`
- `modules/integrations/**`
- `modules/record-layouts/**`

---

## Root Cause of Coverage Gap

`scanOperationContracts` in `common/openapi/zod-operation-contracts.ts` has two readers:
- `readPipeSchemas` — picks up `ZodValidationPipe` only from **unnamed** param decorators (where NestJS metadata `data === undefined`)
- `readValidationSchemas` — picks up `@Validate({ body, query, params })` metadata

Named params (`@Body("field")`, `@Query("name")`, `@Param("id")`) have `data !== undefined` so they are **skipped** by `readPipeSchemas`. This is why handlers that validate at runtime still had no published contract.

---

## Findings — per controller

| Controller | Handler | Gap | Fix |
|---|---|---|---|
| `auth.controller.ts` | all | ZodValidationPipe on unnamed @Body | ✅ already covered |
| `sessions.controller.ts` | all | no payload | ✅ no-payload classified |
| `mfa.controller.ts` | all | ZodValidationPipe on unnamed @Body | ✅ already covered |
| `users.controller.ts` | all | ZodValidationPipe on unnamed @Body | ✅ already covered |
| `organization/core/organization.controller.ts` | `validateInvitationToken` | `@Query("token")` named → not published | ✅ FIXED — `@Validate({ query: validateInvitationTokenQuerySchema })` |
| `organization/setup/org.controller.ts` | `listMembers` | `@Query("search")`, `@Query("limit")` named | ✅ FIXED — `@Validate({ query: listOrgMembersQuerySchema })` |
| `organization/hierarchy/org-hierarchy.controller.ts` | `moveBusinessUnit`, `moveBranch`, `moveDepartment` | `@Body()` without schema → not published | ✅ FIXED — `@Validate({ body: move*Schema })` on each |
| `announcements.controller.ts` | all | ZodValidationPipe on unnamed @Body/Query | ✅ already covered |
| `workspace-onboarding.controller.ts` | all | ZodValidationPipe on unnamed @Body | ✅ already covered |
| `ownership.controller.ts` | all | no payload or ZodValidationPipe | ✅ already covered |
| `delegations.controller.ts` | all | ZodValidationPipe on unnamed @Body | ✅ already covered |
| `api-tokens/core` | all | ZodValidationPipe on unnamed @Body | ✅ already covered |
| `api-tokens/user` | all | ZodValidationPipe on unnamed @Body | ✅ already covered |
| `agent-tokens.controller.ts` | all | ZodValidationPipe on unnamed @Body | ✅ already covered |
| `agent.controller.ts` | all | ZodValidationPipe on unnamed @Body | ✅ already covered |
| `branches.controller.ts` | all | ZodValidationPipe on unnamed @Body | ✅ already covered |
| `module-access.controller.ts` | all | ZodValidationPipe on unnamed @Param/@Body | ✅ already covered |
| `user-permission-grants.controller.ts` | all | ZodValidationPipe on unnamed @Body | ✅ already covered |
| `settings.controller.ts` | all | ZodValidationPipe on unnamed @Body | ✅ already covered |
| `platform.controller.ts` | `visit` | raw `safeParse` + custom `{ok: false}` error format | ❌ DELIBERATE NO-CHANGE — changing to ZodValidationInterceptor would alter error response shape |
| `record-layouts.controller.ts` | all | `@Param("id", pipe)` named → runtime validated but not published | ❌ DELIBERATE NO-CHANGE — params-only schemas have minimal contract value; behavioral risk of strict() |
| `storage/storage.controller.ts` | `download`, `image` | `@Query("url")`, `@Query("key")`, etc. named | ✅ FIXED — `@Validate({ query: downloadQuerySchema })` and `@Validate({ query: imageQuerySchema })` |
| `storage/storage.controller.ts` | `upload` | multipart/form-data via FileInterceptor | ❌ DELIBERATE NO-CHANGE — not standard JSON body |
| `storage-kb.controller.ts` | all | ZodValidationPipe on unnamed @Body | ✅ already covered |
| `storage-onboarding.controller.ts` | all | multipart upload | ❌ DELIBERATE NO-CHANGE — multipart, no JSON schema |
| `storage-vault.controller.ts` | all | no payload | ✅ no-payload classified |
| `audit-log.controller.ts` | all | ZodValidationPipe on unnamed @Query | ✅ already covered |
| `activities.controller.ts` | all | already uses `@Validate` | ✅ already covered |
| `public.controller.ts` | all | ZodValidationPipe on unnamed @Body/Query | ✅ already covered |
| `portal-access.controller.ts` | all | ZodValidationPipe on unnamed @Body | ✅ already covered |
| `portal-auth.controller.ts` | all | ZodValidationPipe on unnamed @Body | ✅ already covered |
| `portal-client.controller.ts` | all | ZodValidationPipe on unnamed @Body | ✅ already covered |
| `integrations.controller.ts` | all | ZodValidationPipe on unnamed @Body | ✅ already covered |
| `integrations/git/integrations-git.controller.ts` | `webhook` | `@Query("connectionId")` named | ✅ FIXED — `@Validate({ query: webhookQuerySchema })` |

---

## Files Changed

### New schemas
- `backend/src/modules/organization/setup/dto/org.schemas.ts` — added `listOrgMembersQuerySchema`, `ListOrgMembersQueryInput`
- `backend/src/modules/organization/hierarchy/dto/org-hierarchy.schemas.ts` — added `moveBusinessUnitSchema`, `moveBranchSchema`, `moveDepartmentSchema` and their inferred types; removed duplicate declarations
- `backend/src/modules/organization/core/dto/organization.schemas.ts` — added `validateInvitationTokenQuerySchema`, `ValidateInvitationTokenQuery`
- `backend/src/modules/storage/dto/storage.schemas.ts` — **CREATED** with `downloadQuerySchema`, `imageQuerySchema`
- `backend/src/modules/integrations/git/dto/integrations-git.schemas.ts` — **CREATED** with `webhookQuerySchema`

### Updated controllers
- `backend/src/modules/organization/setup/org.controller.ts` — `listMembers`: replaced named `@Query("search")` / `@Query("limit")` with `@Validate({ query: listOrgMembersQuerySchema })` + `@Query() query`
- `backend/src/modules/organization/hierarchy/org-hierarchy.controller.ts` — `moveBusinessUnit`, `moveBranch`, `moveDepartment`: added `@Validate({ body: ... })` to each
- `backend/src/modules/organization/core/organization.controller.ts` — `validateInvitationToken`: added `@Validate({ query: validateInvitationTokenQuerySchema })`, removed manual `if (!token)` check
- `backend/src/modules/storage/storage.controller.ts` — `download`, `image`: added `@Validate({ query: ... })` to each
- `backend/src/modules/integrations/git/integrations-git.controller.ts` — `webhook`: added `@Validate({ query: webhookQuerySchema })`

---

## Schema Design Notes

- `downloadQuerySchema` intentionally **no `.strict()`** — `expiresIn` and `attachment` remain as permissive strings; the handler retains its own clamping/coercion logic to avoid behavioral change
- `imageQuerySchema` uses `.strict()` and requires `key: z.string().min(1).max(1024)` — the handler already rejected absent/invalid keys, Zod now does it earlier with a 400
- `webhookQuerySchema` **no `.strict()`** — GitHub/GitLab webhook senders may append their own query params
- Move schemas use `.strict()` and `UUID | null` to tighten previously unchecked body fields
- `listOrgMembersQuerySchema` **no `.strict()`** — query params should be permissive to avoid rejecting CDN/proxy additions
- `validateInvitationTokenQuerySchema` uses `.strict()` + `.max(512)` — public endpoint, token is the only param

---

## Deliberate No-Changes

| Handler | Reason |
|---|---|
| `platform.controller.ts visit` | Manual `safeParse` returns `{ok: false, error}` — switching to ZodValidationInterceptor changes error shape to ZodError |
| `storage/upload` | `multipart/form-data` via `FileInterceptor` — no JSON body schema applicable |
| `storage-onboarding/upload` | `multipart/form-data` — same |
| `record-layouts` `@Param("id", pipe)` | Runtime-validated; adding params-only `@Validate` has minimal contract value and risks `.strict()` rejecting descriptive params from other layers |

---

## Validation

- `tsc --noEmit` — exit 0 (no errors in modified files; pre-existing errors in other lanes' spec files are unrelated)
- `pnpm openapi:generate` — **1979 / 3546 operations** carry Zod contracts (55.8%, up from 54.1% before this session; +62 total across all active parallel lanes)
- `@Validate` count: 8 new decorators across 5 controllers (L36 contribution)
- No `@Idempotent` added to existing routes
- No runtime behavior changed for `download`, `image`, `webhook` handlers (named `@Query("x")` params still read from the interceptor-replaced `req.query`)
- `moveBusinessUnit/Branch/Department` tightening: `parentId/businessUnitId/branchId` now must be explicit `UUID | null` (previously could be absent/undefined, defaulting to `?? null`)
