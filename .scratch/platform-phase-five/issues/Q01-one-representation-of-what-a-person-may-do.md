# Q01 — One representation of what a person may do

**What to build:** `AccessSnapshot` carries `scopes` and stops carrying `permissions`, and `useCan` reads the record.

`access-snapshot.resolver.ts:57` builds the redundancy in one line: `permissions: Object.keys(scopes)`. The other branch pushes to both in the same loop. The array is always the keys of the record, and it is the copy everything reads.

`useCan` does `data.permissions.includes(key)` at **1,062 call sites**, including table-row renderers where it runs per row per key. `requirePermission` builds a fresh `Set` from the array on every server-side call. The `O(1)` record is on the same object and already carries the `DataScope` that every scoped list endpoint needs and currently re-derives.

This is the smallest edit in the review and the widest reach: one function body, one type, one wire field. No call site changes.

**Owns (exclusive):**
- `backend/src/modules/access/access.types.ts`
- `backend/src/modules/access/access-snapshot.resolver.ts`
- `frontend/hooks/api/access.ts`
- `frontend/lib/rbac/require-permission.ts`
- `frontend/types/access.ts`

**Blocked by:** nothing
**Wave:** 1
**Status:** DONE

- [x] `AccessSnapshot` exposes `scopes` and no `permissions`. The frontend `AccessResponse` matches exactly — a contract that drifts silently strips fields into no-ops.
- [x] `AuthResult` is **unchanged**. `authorize.ts` is owned by R01 in this wave; if this ticket needs to edit it, stop and say so.
- [x] `useCan(key: PermissionKey): boolean` keeps its exact signature. Its body reads `scopes`; the org-owner short-circuit stays.
- [x] `useScope(key: PermissionKey): DataScope` is added, returning `"none"` when absent. Nothing is migrated onto it here — it exists so the next scoped list does not re-derive scope from a boolean.
- [x] `requirePermission` reads the record and builds no `Set` per call.
- [x] A `none` scope is treated as absent, matching what the resolver already excludes at build time.
- [x] A test asserts a `team`-scoped key answers `true` from `useCan` and `"team"` from `useScope`.
- [x] A test asserts an absent key answers `false` and `"none"`.
- [x] A test asserts an org owner answers `true` for a key not present in `scopes` at all.
- [x] A test pins the wire shape: the snapshot has no `permissions` field. **This is the mutation check** — put the array back and it fails.
- [x] `lib/rbac/permissions/__tests__/catalog-sync.test.ts` passes unchanged. This ticket touches no permission key.
- [x] Both repos typecheck. Note that the web `tsconfig.json` **excludes test files**, so a clean web `tsc --noEmit` does not prove the tests compile — run the web suite too.
- [x] Nothing else on the snapshot changes: `modules`, `isOrgOwner`, `canManageOrganizationMembership`, `mfa` and `version` are untouched.

## Verified

- Backend `tsc --noEmit` exit 0; web `tsc --noEmit` exit 0 **and** the web suite run (its tsconfig excludes tests, so a clean typecheck proves nothing about them): **79 suites / 453 tests**.
- Backend access + module-access + rbac + kb: 59 suites / 556 tests, exit 0.
- **Wire-shape mutation check holds**: `expect(snapshot).not.toHaveProperty("permissions")` — restoring the field fails it.
- Six new client tests cover `useCan` and `useScope` across held / absent / org-owner, run three times for stability.

## Wider than the owned list, and why

Eight files beyond the five owned had to change: they read `access.permissions` **directly** rather than through `useCan`, so the type change forced them. The spec's "no calling code changes" held for `useCan` call sites, not for direct array reads — worth knowing that those eight existed at all.

`usePermissions` still returns a `string[]`, now derived via `Object.keys(access.scopes)`. The redundant field is gone from the **wire**; a derived local list survives for that hook's existing consumers. Deliberate, and the hook is memoised on `access?.scopes`.

`types/access.ts` also lost `dataScopes?: Record<string, string>` — a ghost field with **zero readers** that never matched the backend's `scopes` and would always have been `undefined`. Removing it was not asked for; leaving a second, misnamed, dead representation of the same fact while deleting the first would have been worse.

## Not verified

- Nothing was exercised through a booted application.

**Not in this ticket:** the gated-control flash. `useCan` answering `false` while `/me/access` is in flight is real and belongs in the shared gate component — changing `useCan` to a tri-state would touch all 1,062 sites for a benefit one component can deliver.
