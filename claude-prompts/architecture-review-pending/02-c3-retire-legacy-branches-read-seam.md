> **DONE 2026-09-10.** Legacy `/branches` retired: `modules/branches/` deleted, both HR dropdowns moved to
> `GET /org-hierarchy/branches/options` (`branch:view`) via `useBranchOptions`. The card's literal
> instruction was NOT followed — `branch:view` is an employee-self-service grant every member holds while
> the hierarchy list needs `settings:view`, so a direct repoint was a privilege regression; a read-only
> adapter on the canonical owner was built instead. Evidence, accepted behaviour changes and the two
> cache/baseline orphans it surfaced:
> `architecture-refactor/PRD-ARCHITECTURE-REVIEW-2026-09-10.md` § "C3 deepened 2026-09-10".

# Complete C3: retire the remaining legacy branches read seam

Work directly in the StreamlineOS repository and complete the implementation, not just an audit. Read the applicable `CLAUDE.md` files before editing, preserve unrelated working-tree changes, and do not commit or push unless explicitly requested.

## Source and objective

The source requirement is candidate C3 in:

`C:/Users/Aditya_Lappy/AppData/Local/Temp/architecture-review-20260909-233331.html`

The duplicate branch mutation routes and service have already been retired. The remaining HTML requirement is to move the two form/dropdown readers off the legacy `GET /branches` seam and onto the canonical organization-hierarchy read owner.

Known starting points:

- `frontend/hooks/api/branches.ts`
- `frontend/hooks/api/branches-schema.ts`
- `frontend/hooks/api/org-hierarchy.ts`
- `frontend/hooks/api/org-hierarchy-schema.ts`
- `frontend/features/hr/announcements/use-announcement-form.ts`
- `frontend/features/hr/recruitment/jobs/create-job-form/job-basics-sections.tsx`
- the backend `BranchesController` GET route and `BranchesReadService`
- the backend organization-hierarchy branch read controller/service

## Required behavior

1. Re-run a repository-wide search for every caller of `GET /branches`, `useBranches`, the legacy branch query key, and the legacy response schema. Include frontend, backend, jobs, scripts, tests, generated clients, and runtime string construction.
2. Provide one canonical branch-list read interface owned by organization hierarchy.
3. Migrate the HR announcement form and recruitment job form to that interface.
4. Preserve the minimal dropdown data shape, loading behavior, errors, cancellation signal, stale time, and tenant-scoped query key.
5. Preserve least privilege. These HR forms must not acquire `settings:organization:manage` merely to load branch choices. If the current hierarchy endpoint is administration-only, add or reuse a read-only hierarchy adapter with the correct existing branch-view permission instead of weakening an administrative endpoint.
6. Preserve tenant isolation and archived/deleted-branch exclusion.
7. Reuse the canonical hierarchy runtime schema. Do not create another parallel branch contract.
8. When production callers reach zero, delete the legacy frontend hook/schema/query-key entries.
9. Remove the backend `GET /branches` route and read facade only if exhaustive caller evidence proves they are dead. If another legitimate caller remains, migrate it or document the concrete blocker and keep only the smallest necessary compatibility adapter.
10. Update route classification, OpenAPI, permission binding, cache invalidation documentation, and generated/vendored frontend contracts if route removal changes them.

## Tests that must bite

Add or update tests proving:

- Both forms obtain branch choices from the canonical hierarchy seam.
- An HR user with the form permission but without organization-settings management can load choices.
- A user without branch-view authority cannot trigger the query.
- Cross-tenant and archived branches are excluded.
- Query keys include the organization/request scope required by repository conventions.
- Reverting either form to `useBranches` fails an architecture test.
- Removing the canonical runtime contract or changing its response shape fails a hook/component test.

## Verification and completion

Run focused frontend hook/form tests, backend branch/hierarchy tests if the route changes, both typechecks when both repositories change, route/OpenAPI/contract checks, permission-key checks, and dependency-cycle checks required by the repo. Inspect the final diff for permission widening and stale route/schema references.

The task is complete only when the two known consumers use one canonical hierarchy read seam and every deletable legacy artifact is removed with evidence. Report remaining callers, deleted files/routes, permissions preserved, and exact verification results.
