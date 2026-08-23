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
**Status:** ready-for-agent

- [ ] `AccessSnapshot` exposes `scopes` and no `permissions`. The frontend `AccessResponse` matches exactly — a contract that drifts silently strips fields into no-ops.
- [ ] `AuthResult` is **unchanged**. `authorize.ts` is owned by R01 in this wave; if this ticket needs to edit it, stop and say so.
- [ ] `useCan(key: PermissionKey): boolean` keeps its exact signature. Its body reads `scopes`; the org-owner short-circuit stays.
- [ ] `useScope(key: PermissionKey): DataScope` is added, returning `"none"` when absent. Nothing is migrated onto it here — it exists so the next scoped list does not re-derive scope from a boolean.
- [ ] `requirePermission` reads the record and builds no `Set` per call.
- [ ] A `none` scope is treated as absent, matching what the resolver already excludes at build time.
- [ ] A test asserts a `team`-scoped key answers `true` from `useCan` and `"team"` from `useScope`.
- [ ] A test asserts an absent key answers `false` and `"none"`.
- [ ] A test asserts an org owner answers `true` for a key not present in `scopes` at all.
- [ ] A test pins the wire shape: the snapshot has no `permissions` field. **This is the mutation check** — put the array back and it fails.
- [ ] `lib/rbac/permissions/__tests__/catalog-sync.test.ts` passes unchanged. This ticket touches no permission key.
- [ ] Both repos typecheck. Note that the web `tsconfig.json` **excludes test files**, so a clean web `tsc --noEmit` does not prove the tests compile — run the web suite too.
- [ ] Nothing else on the snapshot changes: `modules`, `isOrgOwner`, `canManageOrganizationMembership`, `mfa` and `version` are untouched.

**Not in this ticket:** the gated-control flash. `useCan` answering `false` while `/me/access` is in flight is real and belongs in the shared gate component — changing `useCan` to a tri-state would touch all 1,062 sites for a benefit one component can deliver.
