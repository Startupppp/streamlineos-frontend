# c25 · Authorization cannot be omitted

**Status: the resolver is deep; route classification is optional.** Verified at source 2026-08-26. Nest registers `JwtAuthGuard`, `MfaGuard` and `ModuleGuard` globally, but not `PermissionGuard`. Across 521 controller files, 476 mention `PermissionGuard`, 39 are public, and 12 authenticated non-public files carry only `JwtAuthGuard`. Several are intentionally self-service and some enforce standing inside their implementation. The interface does not say which is which.

## Problem Statement

A forgotten guard is a silent widening. Type checking passes, Nest boots, the route appears, and any authenticated member can reach the implementation. At millions of users the probability is not theoretical: hundreds of controllers and thousands of route/verb pairs make review memory the mechanism.

The existing report proposed a CI coverage scan. That is useful but not sufficient: a route deployed outside that CI path or dynamically registered remains open. The runtime must refuse an unclassified route.

Object access is separately correct in most sampled modules, but the predicate is repeated. A permission key alone does not prove the caller may read the identified record. Tenant, soft-delete, DataScope and record visibility must enter the SQL predicate together so fetch-then-check cannot appear.

## Solution

Deepen authorization behind one global classification module. Every route declares exactly one mode: public, universal authenticated, or permissioned. Missing or contradictory metadata denies before the implementation runs. Permission resolution remains database-authoritative and cached; universal does not mean unscoped.

Then deepen tenant record access behind domain-owned query predicates that compose organisation, lifecycle, DataScope and record ACL before the query executes. The interface returns a row or not-found; it never returns an unfiltered row for a caller to check later.

This contradicts the current `backend/CLAUDE.md` §2 placement of `PermissionGuard`, but the friction is real enough to reopen because the current design cannot satisfy “forgot to check is structurally impossible.” Update that rule only in the implementation ticket.

## Implementation Decisions

**KEEP**

- `AccessService`, versioned permission caching, scope ceilings and per-person grants.
- Org owner/admin semantics, module standing and universal employee grants.
- SQL-level `applyScope` behavior and cross-tenant 404 semantics.

**REPLACE**

- Opt-in route authorization with a global classifier that denies missing metadata.
- Ad hoc record lookup followed by a check with a single scoped query seam per domain.

Public, universal and permissioned are mutually exclusive. A universal route still derives the subject from the authenticated actor and applies tenant/record ACLs. The global classifier performs no per-row filtering; the data module does.

Permission snapshots stay cached per `(orgId, membershipId, accessVersion)` with TTL bounded by the nearest expiry. One request resolves once and passes the snapshot through context, avoiding a database round trip per check.

## Testing Decisions

- Enumerate every route from Nest metadata and assert exactly one exposure mode.
- Boot with an intentionally unclassified route and assert runtime denial.
- For each protected record family, assert same-tenant allow, same-tenant deny, cross-tenant not-found and soft-deleted not-found.
- Assert one permission snapshot resolution for a request with multiple checks.
- Assert a version bump revokes access across two application instances.

## Out of Scope

- Replacing the role, grant or scope model.
- Encoding permissions in JWT claims.
- A generic repository interface over unrelated domains.
