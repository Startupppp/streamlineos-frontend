# 01: Remove stale global-user employment writes

**What to build:** Bulk employee updates write department, branch and manager data only to organization-scoped person/employment assignments, so migrated databases never receive removed global-user columns.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] Bulk department, branch and manager updates complete through organization-scoped records in one transaction.
- [x] The global user update contract cannot express organization employment fields.
- [x] Multi-organization and migrated-schema tests prove no cross-org write or removed-column runtime failure.
- [x] Backend typecheck and focused runtime tests pass with evidence recorded here.

## Finding

`user-ops.service.ts` `bulkUpdateUsers` built `const userUpdate: Record<string, unknown>` and set `orgDepartmentId`, `branchId` and `reportingTo` on it, then called `tx.update(users).set(userUpdate)`. The global `users` table has none of those columns. `Record<string, unknown>` satisfied drizzle's `.set()` signature, so this compiled; at runtime drizzle's `mapUpdateSet` looks each key up in the table's column map, gets `undefined`, and throws. **Every bulk update carrying a department, branch or manager crashed** — and the department write to `hr_employments` was nested *inside* that same block, so it never ran either.

## Change

`src/modules/users/user-ops.service.ts`
- Deleted the `users` update entirely.
- `departmentId` → `hr_employments.department_id`, `branchId` → `hr_employments.location_id` (the canonical branch column, confirmed against `user-profile.service.ts:343`), each on the primary, non-deleted employment of a person in this org.
- `managerUserId` → `syncCanonicalReportingLine(tx, orgId, userId, managerUserId, today, actorUserId)`.
- All three run in the existing single `db.transaction`.

`src/modules/users/users.service.ts`
- `updateUser`'s `updateData` is now `Partial<GlobalUserPatch>`, where `GlobalUserPatch = Pick<typeof users.$inferInsert, "firstName" | "lastName" | "name" | "phone" | "bio" | "linkedinUrl" | "twitterUrl" | "githubUrl" | "websiteUrl" | "emergencyContact">`. `updateData.orgDepartmentId = x` is now a compile error.

## Verification

`node ./node_modules/jest/bin/jest.js src/modules/users/user-ops-bulk-update.spec.ts --maxWorkers=1`

```
PASS src/modules/users/user-ops-bulk-update.spec.ts (82.45 s)
  √ users table has no orgDepartmentId, branchId, or reportingTo columns
  √ does not write to the global users table when department, branch, and manager are all supplied
  √ only processes members belonging to the target org and returns their count
  √ writes departmentId to hrEmployments
  √ writes locationId to hrEmployments for branch
  √ calls syncCanonicalReportingLine once per user for manager update
Tests: 6 passed, 6 total
```

The migrated-schema guard reads the real column map with `getTableColumns(users)` rather than asserting on a string, so it fails if the columns ever return. The pre-existing spec asserted that `.update(users)` **was** called — it encoded the defect, and was replaced.

Pre-existing specs under `src/modules/users/` re-run green: `dto/users.schemas.spec.ts` (2), `email-canonical.spec.ts` (40), `users-seat-limit.spec.ts` (2), `user-identity.view.spec.ts` (5).

Backend typecheck: see the session report (`NODE_OPTIONS=--max-old-space-size=8192 pnpm typecheck`).

## Known, accepted

`syncCanonicalReportingLine` is called once per affected user. `bulkUpdateUsersSchema` caps `userIds` at 200, so the loop is bounded; batching it would mean rewriting a shared helper in `common/hr/`, which is outside this ticket. Self-reference is already handled inside that helper, which returns `{status: "unmappable", reason: "self-reference"}` rather than writing a cycle.
