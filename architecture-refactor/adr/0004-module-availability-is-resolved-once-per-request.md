# ADR 0004 — Module availability is resolved once per request

**Status:** Accepted · extended by [ADR 0006](0006-the-request-context-owns-membership-and-mfa-too.md), which adds membership and MFA to the same context and corrects the finding below that the membership pair was not a duplicate
**Date:** 2026-09-10

## Context

`ModuleGuard` (`common/rbac/module.guard.ts:42`) and `authorize()` (`modules/access/authorize.ts:26`) each resolved module availability for the same `(user, org, moduleKey)` on the same request through two independent code paths:

| Path | Map source | Degrade branch |
|---|---|---|
| `ModuleGuard` → `AccessService.moduleAvailabilityFor` | `entitlements.getModuleMap(orgId)` — org-module map | none — falls through to plan-lock check |
| `authorize()` → `access.getModuleState(orgId, key)` | same `getModuleMap`, via `entitlements.service.ts:173` | `entitlements.service.ts:181-185`: returns `true` when `moduleTableUnavailable && RBAC_MIGRATION_MODE === "degrade"` |

The two paths agreed in steady state. They diverged in degrade mode: with the `org_modules` table unavailable, `authorize()` returned available while `ModuleGuard` fell through to the plan-lock check. One request, two answers, depending on which path was hit first.

Two duplicated lookups were closed: `module.guard.ts:42` and `authorize.ts:26`. No other module-availability duplications were found; the membership-state pair investigated in parallel was verified not to be a duplicate.

**Why the carrier is the request object.** No `Scope.REQUEST` provider exists anywhere in the backend. No CLS package is installed. The tenant `AsyncLocalStorage` is entered by `TenantContextInterceptor` (`common/tenant/tenant-context.interceptor.ts`), which is an interceptor. Interceptors run after guards, so a guard that reads ALS at dispatch time would read the wrong context. The request object (`req.authContext`) is the only per-request carrier available to a guard at resolution time.

## Decision

One `AuthContext` per actor per unit of work, constructed by `JwtAuthGuard` and carried on `req.authContext`. `AuthContext` (`common/auth/auth-context.ts`) wraps `CurrentUserContext` and memoizes module availability in a `Map<string, Promise<ModuleAvailabilityResult>>`, keyed on the normalized module key (`moduleKey.trim().toLowerCase()`). The first call for a given key calls the lookup once; every subsequent call in the same request returns the cached promise.

The memo adopts the org-module-map semantics used by `ModuleGuard` — **no degrade fail-open**. When `org_modules` is unavailable, the lookup returns unavailable; resolution failure denies.

`authorize()` (`modules/access/authorize.ts`) takes `AuthContext | null` rather than `CurrentUserContext | null` and calls `ctx.moduleAvailable(...)` directly. It no longer holds an `AccessResolver` reference for module-state resolution; its `access` parameter narrows to `AccessScopeResolver` (a subset interface exposing only `scopeFor`).

`ModuleGuard` reads `req.authContext` and calls `authContext.moduleAvailable(moduleKey)` — it no longer injects `AccessService`.

Detached callers that never pass a guard (`HrExportWorkerService`, workflow cron) construct an `AuthContext` via `createAuthContext(actor, lookup)` from the same factory, providing one code path for both in-request and background contexts.

## Consequences

**What is now NOT protected:** In degrade mode with `org_modules` unavailable, a request whose module was previously treated as available by `getModuleState`'s fail-open branch (`entitlements.service.ts:181-185`) will now be denied. Callers receive `NO_MODULE` and the guard throws `ModuleDisabledException`. This is a deliberate trade of availability for fail-closed behaviour, consistent with `PermissionGuard`'s own deny-on-resolution-failure at `permission.guard.ts:41-47`.

The degrade branch was a short-lived escape hatch for a specific RBAC migration period, not a permanent entitlement. That migration is complete. Removing its effect in the unified resolver is correct; re-enabling it requires an explicit feature flag with a stated expiry, not a change to this resolver.

The change also closes a consistency gap: previously `PermissionGuard` could deny (via `ModuleGuard`'s semantics) a request that `authorize()` would have allowed (via the degrade branch). The two paths now agree in every case.

## What would reverse this decision

- A new RBAC migration phase that again requires a period of `org_modules` unavailability and in which user-visible module access must be preserved. The fail-open branch should be re-introduced as a named, time-bounded feature flag, not as a resolver change.
- Adoption of NestJS `Scope.REQUEST` providers or a CLS library that makes per-request injectable scope safe for guards; `req.authContext` could then be replaced by an injected `AuthContext` provider.
- Discovery of a second verified module-availability duplication that the `AuthContext` memo does not address; that duplication should be brought here rather than repaired independently.
