# Complete C1: one full per-request authorization context

Work directly in the StreamlineOS repository and finish this task end to end. Do not stop after analysis or a plan. Read the applicable `CLAUDE.md` files before editing, preserve unrelated working-tree changes, and do not commit or push unless the user explicitly asks.

## Source and objective

The source requirement is candidate C1 in:

`C:/Users/Aditya_Lappy/AppData/Local/Temp/architecture-review-20260909-233331.html`

The existing backend `AuthContext` memoizes module availability, but the HTML calls for a single request-owned answer for membership, module availability, and MFA. Complete that remaining scope without weakening authentication or authorization.

Start with these files and follow their callers:

- `backend/src/common/auth/auth-context.ts`
- `backend/src/common/auth/jwt-auth.guard.ts`
- `backend/src/common/auth/mfa.guard.ts`
- `backend/src/common/auth/membership-state.service.ts`
- `backend/src/modules/access/access-permission.resolver.ts`
- `backend/src/modules/access/access-snapshot.resolver.ts`
- `backend/src/modules/access/authorize.ts`
- `backend/src/common/rbac/module.guard.ts`
- `backend/src/modules/access/permission.guard.ts`

## Required behavior

1. Extend the request-scoped context so it owns or memoizes:
   - the authenticated actor;
   - authoritative membership/liveness state for the actor and organization;
   - module availability by canonical module key;
   - MFA policy state by actor and organization.
2. Make the guard chain and request-path access resolution consume that context instead of independently re-querying the same facts.
3. Reuse `MembershipStateService.resolve()` as the membership authority. Its user-active, deleted-user, organization-lifecycle, membership-status, owner, role, and membership-ID semantics must remain intact.
4. Remove the duplicate request-path membership resolution in `AccessPermissionResolver.getMembershipAccessState()` when an authenticated HTTP context already provides the authoritative answer.
5. Preserve a safe fallback for detached/background callers that have no HTTP request context. Their resolution must check user, organization, and membership liveness rather than reading only `organizationMembers.status`.
6. Make `MfaGuard` and access snapshot resolution share one MFA result within the same request.
7. Continue memoizing module availability by trimmed, lowercase module key. Concurrent callers must share the same in-flight promise.
8. Keep session-revocation/tombstone behavior, account-only routes, `@Public()`, `@AllowNoOrg()`, personal access tokens, and portal-token rejection behavior unchanged.
9. Bind every context to exactly one actor and organization. No cache or context value may cross a user, organization, request, or test case.
10. Keep fail-closed behavior when an authorization dependency fails.

Prefer a deep interface with a small request-facing API. Avoid adding a second request cache beside `AuthContext`.

## Tests that must bite

Add or update focused tests proving:

- JWT authentication plus permission resolution performs one authoritative membership resolution for the same actor/org.
- `MfaGuard` plus access-snapshot resolution performs one MFA-policy resolution in the same request.
- `ModuleGuard` plus `authorize()` performs one module-availability lookup for the same canonical module.
- Different modules resolve independently; differently cased forms of one module share a result.
- A rejected in-flight lookup stays fail-closed and cannot become an allow result.
- Inactive/deleted users, inactive organizations, suspended memberships, missing memberships, unsatisfied MFA, and unavailable modules remain denied.
- Background permission resolution denies a deactivated or deleted user and does not depend on an HTTP context.
- Account-only and no-organization flows retain their existing response semantics.

A test is not sufficient if it only asserts implementation text or mocks away the duplicate lookup. At least one composition test must execute the real guard/resolver boundary and assert call counts.

## Verification and completion

Run the smallest focused tests while iterating, then run the backend typecheck and the repository-prescribed auth/access architecture checks. Run broader relevant tests when the focused suite is green. Inspect the final diff for forced casts, duplicated policy, altered exception status/code, and unrelated changes.

The task is complete only when all four consumers—module guard, permission authorization, MFA guard, and access snapshot/membership resolution—share request-owned answers where applicable, detached callers remain safe, and all verification is green. Report changed files, removed duplicate calls, exact tests/commands, and any residual risk.
