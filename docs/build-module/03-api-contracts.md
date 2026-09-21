# Build API Contracts

## Evidence

- Controllers: `backend/src/modules/build/**/*.controller.ts`.
- DTO schemas: `backend/src/modules/build/**/dto/*.schemas.ts`.
- Client hooks: `frontend/hooks/api/build/`.
- Query keys: `frontend/lib/query-keys.ts`.
- Pagination: `backend/src/common/pagination/cursor.schema.ts` and `list-query.schema.ts`.

## Naming and transport

- Base: `/build` for authenticated internal APIs; public and portal APIs have separate authentication interfaces.
- Resources are plural nouns. Commands that are not CRUD use explicit verbs, e.g. `/merge`, `/publish`, `/complete`, `/rotate-token`.
- Parent identity appears in the URL and is revalidated against the child: `/build/:projectId/tickets/:ticketId`.
- `GET` is side-effect free. Mutations use an idempotency key for retriable commands.
- Collection reads never return unbounded arrays.

## Envelopes

```ts
type ApiSuccess<T> = { data: T; meta?: { requestId: string; revision?: string } };
type CursorPage<T> = {
  data: T[];
  pageInfo: { nextCursor: string | null; hasMore: boolean };
  aggregates?: Record<string, number>;
};
type ApiError = {
  error: { code: string; message: string; details?: unknown; requestId: string };
};
```

Canonical codes include `VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `VERSION_CONFLICT`, `RATE_LIMITED`, `MODULE_NOT_ENABLED`, and `DEPENDENCY_UNAVAILABLE`. Cross-tenant and inaccessible records return the same `NOT_FOUND` interface.

## List query contract

```text
?cursor=<opaque>&limit=50&sort=-updatedAt,title
&q=<search>&status=a,b&assigneeId=...&projectId=...
&from=YYYY-MM-DD&to=YYYY-MM-DD
```

- Maximum `limit` is 100; default 50.
- Cursor includes normalized filters, sort, scope, access revision, and stable tie-breaker.
- Invalid/expired/mismatched cursors return `VALIDATION_ERROR`, never silently restart.
- Counts required by filter chips are server aggregates over the same authorization predicate.

## Command contract

```ts
type CommandHeaders = {
  "Idempotency-Key": string;
  "If-Match"?: string; // entity version for conflict detection
};
type Patch<T> = Partial<{ [K in keyof T]: T[K] | null }>;
```

Mutations return the complete projection needed to patch current caches, plus `version` and `updatedAt`. Async work returns `202` with a durable run ID and status URL.

## Auth and permissions

- Session authentication establishes user and active organization.
- Backend permission guards are authoritative; route gating is UX only.
- Every record read rechecks tenant, membership, parent, module entitlement, and external grant where applicable.
- Role names are fixed standings; individual permissions and record scope are separate.
- Public tokens are random opaque capabilities, hashed at rest, expiring/revocable, and rate-limited.

## Rate limits

| Interface | Default |
|---|---|
| Authenticated reads | 300 requests/minute/user/org with burst allowance |
| Search/typeahead | 60/minute, 150–250 ms client debounce |
| Mutations | 120/minute plus idempotency |
| Imports/exports/AI | low concurrency, durable queue, explicit quota |
| Public forms/roadmaps/boards | IP + token + abuse controls |
| Webhook tests/secret rotation | strict actor/project limits and audit |

## Core endpoint families

| Family | Verified controllers |
|---|---|
| Projects/work items | `backend/src/modules/build/core/projects.controller.ts`, `projects-by-id.controller.ts`, `projects-tickets.controller.ts` |
| Board/resources/comments | `project-resources.controller.ts`, `projects-ticket-comments.controller.ts`, `projects-ticket-associations.controller.ts` |
| Iterations/execution | `backend/src/modules/build/execution/iterations.controller.ts`, `workspace.controller.ts` |
| Reports/budget/releases | `projects-reports.controller.ts`, `projects-budget.controller.ts`, `projects-releases.controller.ts` |
| Governance | `backend/src/modules/build/governance/` |
| Forms/intake | `backend/src/modules/build/forms/` |
| QA/bugs | `backend/src/modules/build/qa/` |
| Products/workspaces/teams | `managed-products/`, `pm-workspaces/`, `teams/` |
| Portal/change requests | `client-portal/` |
| Meetings/files/updates/workflow | matching folders under `backend/src/modules/build/` |

Each `10-*.md` lists the exact subset used by that page and its payload fields.

## Realtime

- Realtime is justified for comments, presence, issue field changes, approval decisions, incident events, and durable run status.
- Events contain org, scope, record ID, version, event type, and minimal patch; consumers refetch when a version gap occurs.
- Realtime never substitutes for an authorized initial read.

## Acceptance criteria

- [ ] Every collection is cursor/page bounded and sorted deterministically.
- [ ] Every mutation has Zod validation, permission checks, tenant-safe lookup, and idempotency where retriable.
- [ ] Error codes are machine-readable and route/page states preserve backend detail.
- [ ] Response projections are sufficient for precise optimistic cache updates.
- [ ] Public, employee-preview, and external-client authentication interfaces remain separate.
