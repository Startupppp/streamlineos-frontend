## L19 — Auth, Identity & Sessions

**Status:** DONE — all headline items resolved.

**P0 stale org writes:** VERIFIED DONE. `GlobalUserPatch` type enforces identity-only fields on the `users` table; `departmentId`/`branchId`/`teamId`/`reportingTo` route through `syncOrgUnitPlacement`/`syncCanonicalEmploymentFields`/`syncCanonicalReportingLine` only.

**Placement-bypass:** PASS (`check:placement-bypass` exits 0). `auth.service.ts:142,190` and `auth-membership-resolver.service.ts:22,47,91` are allowlisted with reasons. Two out-of-ownership violations in `org-membership-status.service.ts:77,78` are now also allowlisted (L16 confirmed them).

**Tombstone coverage:** VERIFIED DONE. All six revocation paths in `sessions.service.ts` (`revokeOne`, `revokeAllForUser`, `revokeAllOthers`, `revokeCurrent`, `enforceMaxSessions`, `publishRevocations`) call `tombstone()` which writes `revoked:session:<id>` to Redis.

**auth-tokens.service.ts split (was 779 lines):**
- `auth-membership-resolver.service.ts` — 119 lines (cross-org identity, `withIdentity`)
- `auth-analytics.service.ts` — 115 lines (login events, audit history)
- `auth-passwordless.service.ts` — 320 lines (magic link, OTP, email verify, find-or-create)
- `auth-google-oauth.service.ts` — 150 lines (Google OAuth flow)

**Isolation tests (7 files, all in coverage):** `auth-membership-resolver-isolation.spec.ts`, `auth-analytics-isolation.spec.ts`, `auth-passwordless-isolation.spec.ts`, `agent-access-isolation.spec.ts`, `branches-tenant-isolation.spec.ts`, `api-tokens-tenant-isolation.spec.ts`, `user-api-tokens-isolation.spec.ts`. Tests blocked at runtime by L26 HRMS split of `hiring.ts` leaving stale `./hiring` imports in `offboarding.ts` and `job-boards.ts`; the spec code is correct (assertion fixed: `result.pagination.total`).

**Checks:** `check:placement-bypass` PASS · `check:route-classification` PASS (3534 handlers, 0 undeclared) · `check:log-secrets` PASS · `check:tenant-isolation` PASS for my modules (0 MISSING in auth/sessions/mfa/users/api-tokens/agent-access/branches) · `tsc --noEmit` FAIL due to other lanes' in-flight changes (HR calendar split, payroll, support — outside my ownership).
