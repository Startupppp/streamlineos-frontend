# ADR 0006 — The request context owns membership and MFA too

**Status:** Accepted
**Date:** 2026-09-10
**Extends:** [ADR 0004](0004-module-availability-is-resolved-once-per-request.md)

## Context

ADR 0004 gave the request one answer for module availability. Two facts were left outside it, and each was resolved twice per request by two different code paths:

| Fact | Guard chain | Second, independent resolution |
|---|---|---|
| Membership | `JwtAuthGuard` → `MembershipStateService.resolve` | `AccessPermissionResolver.computeUserPermissions` and `.getMembershipAccessState`, each reading `organizationMembers` directly |
| MFA | `MfaGuard` → `MFA_POLICY.resolve` | `AccessSnapshotResolver` → `MfaPolicyService.resolve` |

The membership pair was not merely a duplicated *lookup*. It was a duplicated *definition*. `MembershipStateService.resolve` joins `users.isActive`, `users.deletedAt`, `organizations.status` and `organizations.deletedAt`; the resolver's own read consulted `organizationMembers.status` alone. In-request that was masked, because `JwtAuthGuard` had already applied the stronger rule and would have rejected the request. It was not masked for a caller that passes no guard: a queued HR export or a cron-triggered workflow resolved the permissions of a deactivated or deleted user as if the account were live.

ADR 0004 §Context recorded that "the membership-state pair investigated in parallel was verified not to be a duplicate." That finding was about the *lookup*, and it was too narrow — the pair is one question answered by two rules.

## Decision

`AuthContext` owns three facts, not one: `moduleAvailable(key)`, `membership()` and `mfa()`. Each is resolved at most once per request, with the in-flight promise shared, and each rejection is preserved rather than downgraded to an allow.

`AuthContextFactory` (`common/auth/auth-context.factory.ts`) assembles the three lookups from `MODULE_AVAILABILITY_LOOKUP`, `MembershipStateService` and `MFA_POLICY`. Guards and detached callers construct through it instead of hand-wiring a seam.

`JwtAuthGuard` **seeds** the membership it has already resolved, on both the JWT and the personal-token path. The context then answers from that value and the request costs one authoritative resolution rather than two.

`MembershipStateService` is the only definition of a live membership. `AccessPermissionResolver` takes a `MembershipReader` and no longer queries `organizationMembers`; `evaluateMembershipGate`, the weaker rule, is deleted. A detached caller therefore inherits user liveness, user deletion and organization lifecycle without doing anything.

**The context is consulted only when it is bound to the pair being resolved.** `AccessService` checks `ctx.actor.orgId === orgId && ctx.actor.userId === userId` before reading `ctx.membership()` or `ctx.mfa()`. A snapshot computed for another member, or for another tenant, falls through to the authority. `MfaGuard` and the snapshot resolver each keep a direct call for requests that carry no context at all.

## Consequences

An actor with no organization reads no membership: `membership()` short-circuits to an inactive state rather than querying with an empty tenant. Account-only and `@AllowNoOrg()` flows keep their existing status codes.

Because the resolver now denies on the authority's stronger rule, a background job for a user who was deactivated after the job was queued fails where it previously ran. That is the point of the change, and it is what `HrExportJobsService` and `WorkflowRunnerService` already asserted at their own call sites; the rule now holds one level lower, so a third detached caller inherits it without remembering to ask.

`MfaState` moved to `common/auth/mfa-policy.token.ts`. `common/auth` must not import `modules/access` for a type the policy token already owns; `modules/access/access.types.ts` re-exports it, as it already does for `DataScope`.

## What would reverse this decision

- A per-request injectable scope (`Scope.REQUEST` or a CLS library) that is safe to read from a guard. `req.authContext` would then be replaced by an injected provider and the identity check above would become structural rather than asserted.
- A membership fact that legitimately differs between the guard chain and access resolution. There is none today; if one appears, it belongs to a named second question, not to a second rule for the same one.
