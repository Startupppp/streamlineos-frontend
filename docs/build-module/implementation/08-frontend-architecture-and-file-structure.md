# 08 — Frontend architecture and file structure

Status: Planned target using Current unverified Next.js architecture

## Repository rules

`frontend/CLAUDE.md` and `frontend/UI-KIT.md` are authoritative. Use Server Components by default, validate awaited route params, keep business handlers out of Next `route.ts`, route client I/O through the shared API client and TanStack Query, and use the canonical UI kit.

## Current canonical files

| Concern | Canonical source |
|---|---|
| Build pages | `frontend/app/(authenticated)/**/build/**/page.tsx` and colocated loading/error/not-found files |
| Route manifest | `frontend/lib/build/build-route-manifest.ts` |
| Scope/navigation | `frontend/lib/build/build-scope.ts`, `build-nav-model.ts`, `frontend/lib/build/nav/*` |
| Route normalization | `frontend/lib/build/normalize-build-deep-link.ts`, route builders in canonical nav/files |
| Query keys | `frontend/lib/query-keys/build-work.ts` |
| API hooks/schemas | `frontend/hooks/api/build/*` |
| Cross-tab/cache sync | `frontend/lib/build-cache-sync.ts` |
| Permissions | `frontend/lib/rbac/permissions/*`, `require-permission.ts`, route-access helpers |
| UI primitives | `frontend/components/ui/*` described by `frontend/UI-KIT.md` |
| Feature UI | existing Build/Projects feature folders under `frontend/features` and shared components |

## Target locality

```text
frontend/
  app/(authenticated)/build/             route composition only
  features/build/
    command-center/                       screen module
    projects/                             list/create/overview module
    work/                                 My Work/All Work/board/list module
    tickets/                              detail, editor, activity module
    discovery/                            product feedback-to-outcome module
    client-delivery/                      grant/intake/approval module
    planning/ quality/ reporting/ settings/
    shared/                               Build-semantic wrappers only
  hooks/api/build/                        DTO parse, queries, mutations
  lib/build/                              route, scope, nav, view semantics
  lib/query-keys/build-work.ts             only Build query-key factory
  lib/rbac/                               shared permission infrastructure
```

Do not move current files just to match this tree. A vertical slice may consolidate an existing cluster when the change reduces duplicate behavior and tests remain at the new module interface.

## File responsibilities

| File kind | Inputs/outputs | Must contain | Must not contain |
|---|---|---|---|
| `page.tsx` | validated params/search → screen module | server permission gate, initial composition/metadata | domain mutation, literal query keys, provider calls |
| Screen module | projection + commands → rendered page | layout, screen states, URL-controlled view | raw fetch, permission invention |
| Hook | typed parameters → parsed query/mutation result | shared API client, central key, enabled gate, retry/error policy | JSX or duplicate DTO type |
| Schema | unknown wire data → typed value | Zod validation and compatible transforms | fetch, navigation, authorization |
| Route builder | typed IDs/search → same-origin href | encoding and canonical path | permission decision |
| Feature component | typed view model/events | Build-specific presentation/interaction | global token definitions, hidden data fetch |
| Query key factory | scope/params → readonly key | stable serializable identity | functions, Dates, unnormalized undefined values |

## State ownership

- URL owns shareable view, filter reference, sort, grouping, selected record, and pagination cursor where deep-linking matters.
- TanStack Query owns server state; mutations patch only when the full invariant is known, then invalidate the narrow canonical keys.
- Local component state owns ephemeral open/hover/input state.
- Durable drafts live in a server draft record or approved offline buffer, not an unversioned global store.
- Access/module/org changes clear or partition server state; stale cache cannot grant visibility.

## Canonical registries

Permission keys come from the RBAC catalog, query keys from `build-work.ts`, view types from `frontend/lib/build/view-types.ts`, destinations from nav catalogs, validation from hook/backend DTO schemas, date/currency formatting from shared utilities, analytics names from the central analytics registry, and feature flags from the shared flag system. A new literal duplicating any of these is rejected in review.

## Required tests per new file

Route: cold-load permission and param validation. Hook: key identity, enabled gate, DTO parse, error/retry, invalidation. Component: states, keyboard, focus, permission-hidden actions, mobile. Route builder: encoding and compatibility. Screen: populated/empty/error/denied/offline/conflict plus pane/history behavior.

