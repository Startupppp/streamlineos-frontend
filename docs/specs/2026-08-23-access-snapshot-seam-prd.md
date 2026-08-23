# PRD — One representation of what a person may do

Status: **ready**
Date: 2026-08-23
Stream: Q
Source: architecture review 2026-08-23, candidate 3

## Problem

`AccessSnapshot` carries the same fact twice. `access-snapshot.resolver.ts:57` builds it literally: `permissions: Object.keys(scopes)`. The other branch pushes to both in one loop. The array is always the keys of the record.

Every consumer reads the redundant copy. `useCan` (`hooks/api/access.ts:43`) does `data.permissions.includes(permissionKey)` — a linear scan — at **1,062 call sites**, including table-row renderers where it runs per row per key. The server path builds a fresh `Set` from the array on every `requirePermission` call. The `O(1)` record is on the same object, already keyed, already carrying the `DataScope` that list endpoints need.

Two further costs follow from the shape rather than the size. `useCan` returns `false` while `/me/access` is in flight, so every gated control in the product renders hidden and then appears — one decision, made wrong 1,062 times. And a caller that needs the scope, not just the boolean, has no hook to reach for.

## Solution

Delete the array. `useCan` reads `scopes`; `useScope(key)` returns the `DataScope` beside it; the loading state becomes part of the seam instead of a `false` that means two different things.

This is the smallest edit in the review with the widest reach: one function body, one type, one wire field.

## Goals

- `AccessSnapshot` carries `scopes` and not `permissions`.
- `useCan` is `O(1)` and unchanged at every call site.
- A caller can ask for the scope without re-deriving it.
- "Not yet known" is distinguishable from "not permitted".

## Non-Goals

- Changing what resolves into the snapshot. `computeUserPermissions` is untouched.
- Changing any permission key, template or grant path.
- Changing the `/me/access` cache keying or its staleTime.

## Implementation decisions

**`scopes` is the wire format.** `permissions` comes off `AccessSnapshot`, off the frontend `AccessResponse`, and off the JSON. A `none` scope is already excluded at build time, so `key in scopes` is the membership test.

**`useCan` keeps its signature.** `(key: PermissionKey) => boolean`. Its body changes; no call site does. The org-owner short-circuit stays.

**`useScope(key)` is added, not retrofitted.** It returns `DataScope`, defaulting to `"none"`. Nothing is migrated to it in this stream — it exists so the next list surface does not re-derive scope from a boolean.

**Loading is expressed once.** `useAccess` already exposes `isLoading`. `useCan` continues to answer `false` while loading, and the gated-control flash is fixed where it belongs — in the shared gate component — rather than by changing what `useCan` means. Changing `useCan`'s return type to a tri-state would touch all 1,062 sites for a benefit the shared component can deliver at one.

**The server path reads the record.** `lib/rbac/require-permission.ts:49` stops building a `Set` per call.

## Testing decisions

The catalog-direction tests (`lib/rbac/permissions/__tests__/catalog-sync.test.ts`) are the regression net and must pass unchanged — this stream does not touch keys.

New coverage: a snapshot with a `team`-scoped key answers `true` from `useCan` and `"team"` from `useScope`; a key absent from `scopes` answers `false` and `"none"`; an org owner answers `true` for a key not in `scopes` at all.

Mutation check: put `permissions` back and have `useCan` read it — the wire-shape test must fail.

## Out of scope

- The `DataScope` `team` branch and its correlated subquery in `apply-scope.ts`. Separate, and already recorded.
- Server-side prefetch of `/me/access`, which belongs to stream V.
