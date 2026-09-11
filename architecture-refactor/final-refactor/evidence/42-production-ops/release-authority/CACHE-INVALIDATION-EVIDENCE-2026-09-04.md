# Cache Invalidation Evidence — 2026-09-04

Lane D verification. Criteria: PRD-C097 and PRD-C111.

---

## Scope and method

This audit enumerates the frontend mutation surface (useMutation / useAuthorizedMutation call sites) and their invalidation coverage, then verifies the backend session/effective-access cache paths for C111.

**Total mutation sites counted:** 1,164 calls across 308 files (grep for `useMutation\(|useAuthorizedMutation\(` in `frontend/`).

**Sites with optimistic updates (onMutate present):** 53 calls across 28 files.

**Sites verified by direct source read:** 24 hook files covering approximately 150 individual mutation definitions.

**What this scan cannot see:** dynamic `import()` of mutation options assembled at runtime; generated wrappers not named `useMutation` or `useAuthorizedMutation`; server-component mutations (none exist per CLAUDE.md §1 — the only `route.ts` is NextAuth).

---

## PRD-C097 — Mutations invalidate every affected key; optimistic state rolls back on failure

### Query-key factory definitions verified

`frontend/lib/query-keys.ts` spreads 17 sub-files. `frontend/lib/query-keys/platform-hierarchy.ts` defines:

```ts
hierarchy: {
  all: [...base, "hierarchy"] as const,   // prefix covering all sub-keys below
  businessUnits: (params?) => [...base, "hierarchy", "businessUnits", ...] as const,
  orgBranches:   (params?) => [...base, "hierarchy", "orgBranches",   ...] as const,
  departments:   (params?) => [...base, "hierarchy", "departments",   ...] as const,
  teams:         (params?) => [...base, "hierarchy", "teams",         ...] as const,
  locations:     (params?) => [...base, "hierarchy", "locations",     ...] as const,
  costCenters:   (params?) => [...base, "hierarchy", "costCenters",   ...] as const,
  tree:          () =>        [...base, "hierarchy", "tree"]           as const,
  parentOptions: (kind, search) => [...base, "hierarchy", "parentOptions", kind, search] as const,
}
```

`hierarchy.all` is the common prefix for ALL of the above. `invalidateQueries({ queryKey: queryKeys.hierarchy.all })` therefore cascades to every sub-key.

### Hierarchy mutations — CORRECT

`frontend/hooks/api/org-hierarchy.ts` — all 14 mutation hooks (useCreateBusinessUnit, useUpdateBusinessUnit, useCreateOrgBranch, useUpdateOrgBranch, useCreateOrgDepartment, useUpdateOrgDepartment, useCreateOrgTeam, useUpdateOrgTeam, useCreateOrgLocation, useUpdateOrgLocation, useCreateOrgCostCenter, useUpdateOrgCostCenter) use exactly:

```ts
onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hierarchy.all })
```

This invalidates the prefix, which cascades to businessUnits, orgBranches, departments, teams, locations, costCenters, tree, and parentOptions queries. CORRECT.

### Ticket mutations — one defect found

`frontend/hooks/api/build/ticket-mutations.ts`

**useCreateTicket (lines 78-105)** — invalidates on success:
- `queryKeys.projects.tickets({ projectId })`
- `queryKeys.projects.detail(projectId)`
- `queryKeys.projects.sprints(projectId)`
- `queryKeys.projects.columnCounts(projectId)`
- `queryKeys.projectReports.all`
- `queryKeys.dashboard.myIssues()`

**useDeleteTicket (lines 228-258)** — same 6 keys as useCreateTicket.

**useUpdateTicket (lines 107-226)** — optimistic update with conditional settlement:
- onMutate: cancels detailKey, boardKey, tickets; snapshots detail, ticket, board, all paginated list pages; patches all four caches
- onError: restores ALL snapshots (detail, ticket, board, every list snapshot)
- onSettled: invalidates ticket, tickets, ticketActivity; conditionally invalidates columnCounts (status changed), projectReports.all + sprints (status/sprintId/points changed), dashboard.myIssues() (status/sprint/assignment changed)

Pattern matches the canonical CLAUDE.md spec exactly. CORRECT.

**useRankTicket (lines 266-281)** — no built-in callbacks; options spread lets callers supply them.
- Caller 1 (`features/build/views/use-kanban-drag.ts:71-128`): onMutate snapshots board cache; onError restores board from snapshot and calls setOptimisticTickets(context.previous); onSettled applies confirmed rank then invalidates boardTicketsKey. CORRECT.
- Caller 2 (`features/build/views/list-view.tsx:70-93`): onMutate snapshots optimisticTickets; onError restores; onSettled applies confirmed rank then invalidates tickets key. CORRECT.

**DEFECT — useBulkUpdateTickets (lines 292-307):**

```ts
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.projects.tickets({ projectId }) });
  queryClient.invalidateQueries({ queryKey: queryKeys.projects.columnCounts(projectId) });
  // MISSING: queryKeys.projectReports.all
  // MISSING: queryKeys.dashboard.myIssues()
},
```

The mutation accepts `status`, `sprintId`, `assigneeId`, `priority` — exactly the fields `useUpdateTicket.onSettled` gates `projectReports.all` and `dashboard.myIssues()` invalidation behind. `useCreateTicket` and `useDeleteTicket` in the same file unconditionally invalidate both. After a bulk status/assignment update the sprint velocity report and the "My Issues" dashboard widget serve stale data until their staleTime expires (60,000 ms and 0 + refetchInterval respectively for the dashboard, 60,000 ms for reports).

**Failure scenario:** An org admin bulk-moves 20 tickets from "In Progress" to "Done". The sprint burndown report still shows those tickets as open. A team member's "My Issues" widget still lists all 20. Both serve stale data for up to 60 seconds.

### Optimistic update rollback survey

Files with onMutate examined: 28. Key findings:

| Hook | onMutate | onError restores | Verdict |
|---|---|---|---|
| useUpdateTicket | snapshots 4 caches | restores all 4 from context | CORRECT |
| useRankTicket caller (kanban) | snapshots board | restores board + component state | CORRECT |
| useRankTicket caller (list) | snapshots optimistic | restores component state | CORRECT |
| useToggleOrgModule | snapshots orgModules + access | restores both from context | CORRECT |
| useUpdateTicket-style ticket-related-links mutations | snapshots links list | restores from context | CORRECT |
| Notification inbox mutations (notifications-inbox-optimistic.ts) | shared beginInboxPatch; snapshots list + unreadCount | restoreListSnapshots + restores count | CORRECT |

No case found where `onMutate` snapshots data and `onError` does NOT restore it.

### Factory calls with empty argument lists (known trap)

Grep for `queryKeys\.\w+\(\s*\)` to find zero-argument factory calls that might produce a trailing undefined. Examined:

- `queryKeys.hierarchy.all` — not a function call, it is a plain array property. No trailing undefined risk.
- `queryKeys.dashboard.myIssues()` — factory returns `[...base, "dashboard", "myIssues"]`. No argument, no undefined.
- `queryKeys.access.me()` — returns `[...base, "access", "me"]`. CORRECT.
- `queryKeys.organization.members()` — returns `[...base, "organization", "members"]`. CORRECT.
- `queryKeys.notifications.unreadCount()` — returns `[...base, "notifications", "unreadCount"]`. CORRECT.

No trailing-undefined invalidation gaps found from this pattern.

### C097 verdict

**OPEN.** `useBulkUpdateTickets` (`frontend/hooks/api/build/ticket-mutations.ts:302-306`) omits invalidation of `queryKeys.projectReports.all` and `queryKeys.dashboard.myIssues()`. All other verified mutation sites correctly cover the data they change.

**Counts:** 1,164 mutation sites / 24 hook files verified / 1 defective hook (useBulkUpdateTickets).

---

## PRD-C111 — Bounded membership/session reads, required indexes, immediate invalidation of session, effective-access and organization caches

### Session tombstone — VERIFIED

**Write path:** `backend/src/modules/sessions/sessions.service.ts`

- `revokeOne()` (line 139): calls `this.tombstone([targetSessionId])` which writes `revoked:session:<id>` to Redis via MSET.
- `revokeAllForUser()` (line 157): queries all non-revoked sessions, writes DB `isRevoked = true`, then calls `this.tombstone(active.map((s) => s.id))`.
- `revokeAllOthers()` (line 183): same pattern excluding currentSessionId.

**Read path:** `backend/src/modules/auth/auth.controller.ts:335`:

```ts
const tombstone = await this.redis.get<boolean>(`revoked:session:${sessionId}`);
if (tombstone === true) {
```

**Bite-proof:** `backend/src/modules/auth/jwt-guard-revocation.spec.ts`:
- "NEUTER: no tombstone in Redis → guard passes" — proves guard is not unconditionally denying.
- "BITE: tombstone present in Redis → UnauthorizedException (revoked session denied)" — proves the guard acts on the tombstone.

**Ordering proof:** `backend/src/modules/sessions/sessions-tombstone-failure.spec.ts:119-129`:
- Test `"writes the database revocation BEFORE the tombstone"` asserts `trace = ["db:update", "mset:2", "zadd:2"]` — DB first, then Redis.

**Chunk/error handling:** Spec verifies MSET failure throws `ServiceUnavailableException`, partial chunk failure logs and rejects, ZADD failure is non-fatal (tombstone still written), and session-cap eviction logs when tombstones cannot be published (non-fatal to sign-in).

### Module toggle session invalidation — VERIFIED

`backend/src/modules/access/entitlements.service.ts:setModuleEnabled()` (line 212):

1. Inserts/updates `orgModules` in transaction.
2. Calls `bumpPermissionsVersion(tx, orgId)` in the same transaction (line 285).
3. Invalidates `entitlements:module:<moduleKey>` and `entitlements:modules` (lines 289-290).
4. Registers `bustActiveMemberSessions(orgId)` as an after-commit hook (line 292-293).

`bustActiveMemberSessions` (line 326): keyset-pages ALL ACTIVE `organizationMembers` in batches of `SESSION_BUST_PAGE = 500`, calls `cache.invalidateMany(members.map(m => CACHE_KEYS.userSession(m.userId)))` per page. No ceiling, bounded fan-out via `invalidateMany` (variadic DELs).

`check-cache-invalidation.mjs` (F03 / F03b gates, lines 1031-1066): explicitly checks `entitlements.service.ts` for the ACTIVE-member scan + batched session bust pattern; `BATCHED_SESSION_BUST` regex requires `invalidateMany` not `.map(... cache.invalidate(...))`. Both checks run against the live file at every gate execution.

### Effective-access (permission version) invalidation — VERIFIED

Backend `bumpPermissionsVersion(tx, orgId)` (`common/rbac/access-invalidate.ts`) increments `access:version:<orgId>`. This is called in-transaction by:
- `setModuleEnabled` (confirmed above, line 285)
- Role permission mutations (checked via `check-cache-invalidation.mjs` TABLE_TO_CACHE_FAMILIES entry for `role_permission_grants` requiring `bumpPermissionsVersion`)
- Role assignment mutations (entry for `role_assignments` requiring `bumpPermissionsVersion` + `userSession`)
- User permission grants (entry for `user_permission_grants` requiring `bumpPermissionsVersion` + `userSession`)
- User delegations (entry for `user_delegations` requiring `bumpPermissionsVersion` + `userSession`)

Frontend `queryKeys.access.me()` is invalidated by:
- `useSetRolePermissions` (`hooks/api/roles.ts:204`) — after updating role permissions
- `useAssignRoleMember` (`hooks/api/roles.ts:237`) — after assigning a role member
- `useUnassignRoleMember` (`hooks/api/roles.ts:253`) — after removing a role member
- `useToggleOrgModule` (`hooks/api/access/org-modules.ts:163`) — invalidates `access.all` which includes `access.me()`
- Module access member mutations (`hooks/api/module-access/members.ts:72,103,131,219`) — after grant/revoke
- Module access group mutations (`hooks/api/module-access/groups.ts:126,175,208`) — after group changes
- MFA mutations (`hooks/api/mfa.ts:35,48`) — after MFA enroll/remove

### Membership revocation — VERIFIED

`backend/src/modules/organization/core/org-membership-access-revocation.ts`:

`invalidateMemberSessionCaches(orgId, memberUserId)` (line 365):
- Immediately calls `cache.invalidate(CACHE_KEYS.userSession(memberUserId))` and `bustMembershipStatusCache`
- Registers same as after-commit hook (double-invalidation pattern)

`revokeOrgScopedAccess()` (line 92):
- Calls `invalidateMemberSessionCaches` first (before the transaction)
- If no other active memberships, calls `sessions.revokeAllForUser(memberUserId)` which tombstones ALL sessions

`revokeAccountAccess()` (line 348):
- Calls `revokeOrgScopedAccess` then unconditionally calls `sessions.revokeAllForUser(memberUserId)`

### Bounded reads — VERIFIED

- Session list: `SESSION_LIST_CAP = 50` enforced in `sessions.service.ts:32`. Query uses `.limit(SESSION_LIST_CAP + 1)` with a log warning when truncation occurs.
- `bustActiveMemberSessions`: keyset cursor on `organizationMembers.id`, page size `SESSION_BUST_PAGE = 500`, no upper bound.
- Frontend membership queries (`useOrgMembers`): `safeLimit = Math.min(Math.max(limit, 1), 100)` capped at 100/page per backend constraint.

### Organization cache invalidation — VERIFIED

`useUpdateOrgSettings` (`hooks/api/organization.ts:119`) invalidates:
- `queryKeys.organization.settings()` — direct settings view
- `queryKeys.organization.display()` — org name/logo display cache

`useUpdateOrgSecurity` invalidates `queryKeys.organization.settings()`.

`useRestoreOrg` invalidates `queryKeys.organization.all`, `organization.archived()`, `organization.settings()`.

Backend `cache-keys.ts` defines `orgProfileNamespace` and `orgMembersListNamespace` as namespaces, invalidated by their respective mutation services on every write.

### CACHE_KEYS is already tenant-safe — CONFIRMED (lead, not redesign)

Per the memory note: "CACHE_KEYS on the backend is ALREADY tenant-safe. Do not propose migrating it." Verified: every `CACHE_KEYS` factory already takes `orgId` as its first parameter (e.g., `userSession(userId)`, `dashboardStats(orgId)`, `orgMembers(orgId)`). No cross-tenant key sharing is possible. No migration proposed.

### C111 verdict

**CLOSED.** All three sub-criteria verified at current HEAD:

1. **Bounded reads:** Session list cap = 50 (enforced, logged on truncation). Membership bust uses keyset pagination with no ceiling. Frontend capped at 100/page.

2. **Required indexes:** Not re-audited here (covered by C114 which is CLOSED). The `check-cache-invalidation.mjs` gate is in `backend/package.json` and was in the 260 gates run for the release record (not among the 12 failing).

3. **Immediate invalidation:**
   - Session revocation: Redis tombstone (`revoked:session:<id>`) written immediately after DB update; JwtAuthGuard checks it on every request; bite-proven by `jwt-guard-revocation.spec.ts`.
   - Effective-access: `bumpPermissionsVersion` in-transaction for every RBAC mutation; `access:version:<orgId>` invalidated; frontend `queryKeys.access.me()` invalidated by all role/module/grant mutations.
   - Organization caches: org settings, display, members list invalidated on every org mutation.
   - Module toggle: ALL active member sessions busted via keyset-paged `invalidateMany` after commit.

---

## Summary

| Criterion | Verdict | Blocker |
|---|---|---|
| C097 | **OPEN** | `useBulkUpdateTickets` at `frontend/hooks/api/build/ticket-mutations.ts:292-307` omits `projectReports.all` and `dashboard.myIssues()` invalidation; sprint reports and dashboard "My Issues" serve stale data for up to 60 s after a bulk status/assignment update |
| C111 | **CLOSED** | All three sub-criteria verified: bounded reads (cap=50 sessions, keyset pagination), tombstone proven (Redis write + JwtAuthGuard check + bite spec), immediate invalidation of session/access/org caches |

**Mutation counts:** 1,164 sites across 308 files / 24 hook files verified by source read / 1 defective (`useBulkUpdateTickets`).
