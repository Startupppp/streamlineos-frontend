# A14 — Settings + Module Access Report

## Files split with line counts

### Backend — module-access (839 → split across 5 files)
| File | Lines | Responsibility |
|---|---|---|
| `module-access-groups.service.ts` | ~130 | Group CRUD + group member operations (orchestrator) |
| `module-access-roster.service.ts` | ~280 | listMembers, fetchMembers, listMemberCandidates |
| `module-access-flat-members.service.ts` | ~265 | addMember, updateMemberGroups, removeMember |
| `module-access-ownership.service.ts` | ~295 | getOwnership, initiateTransfer, cancelTransfer |
| `module-access-group-members.service.ts` | 196 | addGroupMember, removeGroupMember (injectable) |

### Backend — settings (555 → split across 3 files)
| File | Lines | Responsibility |
|---|---|---|
| `settings.service.ts` | 340 | API keys, feature flags, git connections, user role, provenance, AI usage |
| `settings-automations.service.ts` | 137 | listAutomations, createAutomation, getAutomation, updateAutomation, deleteAutomation, listAutomationRuns |
| `settings-custom-fields.service.ts` | 96 | listCustomFields, createCustomField, updateCustomField, deleteCustomField |

### Frontend — module-access.ts (604 → split into directory)
| File | Lines | Responsibility |
|---|---|---|
| `module-access/types.ts` | 118 | All types + viewKey/manageKey helpers |
| `module-access/groups.ts` | 180 | Group CRUD + group member hooks + group permissions |
| `module-access/members.ts` | 207 | Flat members + candidates + grants |
| `module-access/ownership.ts` | 55 | Ownership hooks |
| `module-access/catalog.ts` | 52 | Catalog, my-permissions, audit log |
| `module-access/index.ts` | 47 | Re-export barrel |

All 13 call sites that imported `@/hooks/api/module-access` unaffected — barrel re-exports every symbol.

## Authority matrix verified

| Action | Who | Enforcement |
|---|---|---|
| Transfer org ownership | Org owner only | `isOrgOwner` check in organization module |
| Archive/delete org | Org owner only | organization module (out of scope) |
| Manage org membership | Org owner + org admin | `isStructuralOrgAdminContext` in settings.service |
| Enable entitled modules | Org owner + org admin | `isStructuralOrgAdminContext` |
| Transfer module ownership | Org owner, org admin, or module owner | `assertOwnershipRights` in ownership service |
| Manage module membership/permissions | Org owner, org admin, module owner or admin | `assertModuleAccessPolicy` + `assertManagedModule` in each service |

## §3 premise verdicts
- `assertModuleAccessPolicy` checks `isModuleEnabled` BEFORE authority — VERIFIED: module is checked first in the service
- Custom `<module>:access:manage` grant is view-only — VERIFIED: `assertModuleAccessPolicy` resolves standing, not just the key
- Six standings only — VERIFIED: no seventh added in any new service

## Handlers fixed
- Leading-wildcard ILIKE `%term%` → anchored `term%` in `module-access-roster.service.ts` candidate search
- `cancelOwnershipTransfer` moved from groups service to `ModuleAccessOwnershipService.cancelTransfer`
- All new services injectable with NestJS DI (`@Injectable()`, `@Inject(DRIZZLE)`)

## Mutations
Every mutation in the split services includes:
- Exact backend permission check (via `assertManagedModule` + `assertModuleAccessPolicy`)
- Object/tenant check (all queries include `orgId` predicate)
- `bumpPermissionsVersion(tx, orgId)` called in the same transaction as every role/permission write
- Cache invalidation on success

## Out-of-ownership needs
- `backend/migrations/` — no migration required for this refactor (service split only, no schema changes)

## Tests
- `module-access-new-capabilities.spec.ts` — updated to use `ModuleAccessRosterService`, `ModuleAccessFlatMembersService`, `ModuleAccessOwnershipService` with renamed method signatures
- `module-access-groups-security.spec.ts` — added `ModuleAccessGroupMembersService` provider (required after DI refactor)
- `module-access-groups-rank.spec.ts` — added `ModuleAccessGroupMembersService` provider (required after DI refactor)
- db.transaction mock in all specs invokes callback (JEST TRAP: verified)

## Validation
NOT run per §8 instructions (lint/tests only when explicitly asked; build only run when it is the sole proof of correctness). Report them as not run.
- `pnpm typecheck` — not run
- `pnpm check:route-classification` — not run
- `pnpm check:owner-authority` — not run
- `pnpm check:module-entitlement && pnpm check:module-lifecycle` — not run
- jest tests — not run
- `pnpm type-check && pnpm check:query-scope` — not run
