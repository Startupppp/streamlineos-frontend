# Build API Contracts

## Evidence

- Controllers: `backend/src/modules/build/**/*.controller.ts`.
- DTO schemas: `backend/src/modules/build/**/dto/*.schemas.ts`.
- Client hooks: `frontend/hooks/api/build/`.
- Query keys: the domain module `frontend/lib/query-keys/build-work.ts`. Production code must never import the `frontend/lib/query-keys.ts` aggregate (FE-18).
- Pagination: `backend/src/common/pagination/cursor.schema.ts` and `list-query.schema.ts`.

## Naming and transport

- Base: `/build` for authenticated internal APIs; public and portal APIs have separate authentication interfaces.
- Resources are plural nouns. Commands that are not CRUD use explicit verbs, e.g. `/merge`, `/publish`, `/complete`, `/rotate-token`.
- Parent identity appears in the URL and is revalidated against the child: `/build/:projectId/tickets/:ticketId`.
- `GET` is side-effect free. Mutations use an idempotency key for retriable commands.
- Collection reads never return unbounded arrays.

## Envelopes

These are live and load-bearing. Build must consume them as they are; do not introduce a second envelope.

```ts
// BE-19, common/interceptors/response-transform.interceptor.ts:13
// A payload already carrying `success` passes through unchanged.
type ApiSuccess<T> = { success: true; data: T };

// BE-20, common/http/all-exceptions.filter.ts:10 — flat, not nested under `error`.
type ApiError = { code: string; message: string; details?: unknown; correlationId?: string };
```

Two cursor page shapes exist. Pick by key type; do not add a third.

```ts
// common/pagination/cursor.ts:130 — opaque cursor, from buildCursorPage / buildTupleCursorPage.
interface CursorPage<T> {
  data: T[];
  pagination: { limit: number; nextCursor: string | null; hasMore: boolean };
}

// common/pagination/cursor.ts:187 — monotonic integer id, from buildIdCursorPage.
interface IdCursorPage<T> {
  data: T[];
  hasMore: boolean;
  nextCursor: number | null;
}
```

Live error codes come from `defaultCode` (`all-exceptions.filter.ts:18`) unless the thrower supplies its own: `BAD_REQUEST`, `UNAUTHORIZED`, `PAYMENT_REQUIRED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `PAYLOAD_TOO_LARGE`, `UNSUPPORTED_MEDIA_TYPE`, `UNPROCESSABLE_ENTITY`, `RATE_LIMITED`, `SERVICE_UNAVAILABLE`, falling back to `HTTP_<status>`. A Zod failure is `VALIDATION_FAILED` with `details: Array<{ path: string; message: string }>` (`:184`). Module denial is `MODULE_NOT_ENABLED` at 402 (`common/http/api-exceptions.ts:46`, BE-23).

`VALIDATION_ERROR`, `UNAUTHENTICATED`, `VERSION_CONFLICT` and `DEPENDENCY_UNAVAILABLE` do not exist in this repo. Do not branch on them.

Cross-tenant and inaccessible records return the same `NOT_FOUND` interface (BE-91).

## List query contract

Extend `baseListQuerySchema` (`common/pagination/list-query.schema.ts:45`). Sort is one enum-constrained field plus a direction, not a comma-separated list.

```text
?cursor=<opaque>&limit=50&page=1&sortField=updatedAt&sortDir=desc
&q=<search>&status=a,b&assigneeId=...&projectId=...
&from=YYYY-MM-DD&to=YYYY-MM-DD
```

- Maximum `limit` is `PAGE_SIZE_CAP` = 100, default 50. Import it; never redeclare it (BE-24).
- An over-large `limit` is **clamped, not rejected** (`list-query.schema.ts:22`). A bookmarked link gets the largest allowed page.
- Declare `sortField` per endpoint with `withSortField([...])` so the enum rejects unknown columns.
- The opaque cursor encodes **position only** — no tenant, no permission, no filter state (`cursor.schema.ts:20`).
- A malformed, stale or mismatched cursor **degrades to the first page**; it does not 400. This is a deliberate decision recorded at `cursor.schema.ts:4-25`, and it is the one behavior both cursor implementations agree on. Do not reintroduce the 400.
- Because the cursor carries no filter state, the server must re-apply the authorization predicate on every page. Never trust a cursor to have narrowed the result.
- Counts required by filter chips are server aggregates over the same authorization predicate, returned alongside the page (FE-33).

## Command contract

```ts
type CommandHeaders = {
  "Idempotency-Key": string;
  "If-Match"?: string;
};
type Patch<T> = Partial<{ [K in keyof T]: T[K] | null }>;
```

`Idempotency-Key` is live: apply `@Idempotent()` on retriable mutations, which replays the first result and 409s while in flight (BE-34). The frontend `apiClient` generates the header automatically — do not hand-set it.

**`If-Match` optimistic concurrency is a target, not current behavior.** No handler reads it and `VERSION_CONFLICT` exists nowhere in the repo. A slice that needs it must introduce the header, the `version` column, the 409 code and its tests together, and say so in its acceptance criteria. Until then, do not write a client that sends it or a contract that expects `version` back.

Mutations return the complete projection needed to patch current caches (FE-35), plus `updatedAt`. Async work returns `202` with a durable run ID and status URL.

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
