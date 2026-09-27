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
| Products/teams | `managed-products/`, `teams/` |
| Build members | `build/core/` member-roster service backing `/build/members`; the underlying table is `build.build_members` |
| Portal/change requests | `client-portal/` |
| Meetings/files/updates/workflow | matching folders under `backend/src/modules/build/` |

Each `10-*.md` lists the exact subset used by that page and its payload fields.

## PM Workspace removal

All 9 `/build/workspaces*` endpoints are deleted, along with `src/modules/build/pm-workspaces/` (controller, module, `PmWorkspacesService`, `PmWorkspaceMembershipsService`, DTOs, response schemas). Permission keys `build:workspaces:view|create|update|delete|members:view|members:manage` no longer exist. Do not reintroduce a workspace-scoped endpoint, DTO field, or permission key.

`/build/members` survives and is unrelated to the removal: it is the organization-level Build member roster, backed by `build.build_members` (renamed from `build.project_workspace_members`; PM Workspace relationship dropped, org/membership/role/added-at kept). `build:members:view` and `build:members:manage` remain live permission keys. Client naming follows the rename: `hooks/api/build/build-members.ts` and Build-member-named contracts, not `workspace-members`/`workspaceMemberPageContract`.

## Realtime

- Realtime is justified for comments, presence, issue field changes, approval decisions, incident events, and durable run status.
- Events contain org, scope, record ID, version, event type, and minimal patch; consumers refetch when a version gap occurs.
- Realtime never substitutes for an authorized initial read.

## Acceptance criteria

- [ ] Every collection is cursor/page bounded and sorted deterministically. **2026-09-27 (re-run):** `check:unbounded-reads` self-test PASS. Gate: FAIL — 21 unclassified paths (20 unbounded, 1 offset) and 1 regression. Build-territory unclassified (2, in fenced source; cannot fix this lane): `/build/core/tickets/build-ticket-bulk-mutation.ts`, `/build/updates/updates.service.ts`. Out-of-lane unclassified (19): KB (7), accounting, expenses, HR, invoices, notifications, timesheets. Regression out of lane: `/timesheets/core/lib/billing-export.ts` (was KEYSET-MIGRATED). `check:route-budgets` self-test PASS. Gate: FAIL — 4 structural violations, all out of Build territory: 3 stale KB budget entries (`GET /kb/wiki/analytics/{page-stats,stale-pages,contributors}`); 1 exceeded: `GET /inventory/stock/transactions` (measuredBufferBlocks=377 > maxBufferBlocks=60); 62 cron batches above watermark of 42; 7 critical routes with null measuredLatencyP95Ms. Box unticked: two Build-territory unclassified files in fenced source and out-of-lane failures remain.
- [x] Every mutation has Zod validation, permission checks, tenant-safe lookup, and idempotency where retriable. **2026-09-27:** `check:params-schema-completeness` PASS — 638 controllers, 1940 routes, all params declared. `check:record-access` PASS — every record read excludes soft-deleted rows. `check:idempotent-commands` — Build-territory violation fixed: `POST build/:projectId/client-portal/publish` now carries `@Idempotent("build.portal.publish")`; 2 residual unfenced handlers are `chat-assistant.controller.ts:240` (AI) and `kb-research-brief.controller.ts:109` (KB) — both out of lane.
- [x] Error codes are machine-readable and route/page states preserve backend detail. **2026-09-27:** Error code table verified from `backend/src/common/http/all-exceptions.filter.ts`. `check:page-state-usage` PASS — no self-closing `<PageState />` found; FE-41 (`error` passed to `usePageState`) is enforced by the gate.
- [ ] Response projections are sufficient for precise optimistic cache updates. **2026-09-27 OWNER-DECISION:** Ticket mutation projections verified: `ticket-cache.ts:281-348` matrix covers status, title, assignee, rank, points, cycle, dependency, delete. Q: Is this sufficient, or must governance/forms/QA/meeting mutations also be verified? Options: (A) Ticket scope — accept the matrix as covering the highest-frequency mutations; governance/forms/QA/meetings are lower-frequency and may refetch rather than optimistically patch. (B) Full scope — enumerate every Build mutation and verify its response includes the fields needed to patch every rendered cache. Recommended: A — the optimistic path is documented and implemented for the highest-traffic surfaces; lower-frequency mutations can refetch without UX impact. Settling evidence: examine `performance-followup/cache-policy.md` box 1 for the per-mutation matrix scope declaration.
- [ ] Public, employee-preview, and external-client authentication interfaces remain separate. **2026-09-27 OWNER-DECISION:** Structural separation verified: `backend/src/modules/build/client-portal/` (portal), `backend/src/modules/public/` (public), `backend/src/modules/portal/` (portal auth) are distinct modules. Q: Is structural separation sufficient, or must a gate verify no `@Public()` routes were accidentally added to the authenticated Build module? Options: (A) Structural is sufficient — module registration enforces the split; `check:route-classification` gate ensures every route has exactly one exposure. (B) Add a guard — extend `check:route-classification` to assert no Build-module controller carries `@Public()`. Recommended: A — `check:route-classification` already runs and fails at boot for misconfigured routes; the module boundary is machine-enforced. Settling evidence: `check:route-classification` self-test passes; gate: 4111 handlers, RESULT: ALL ROUTES CLASSIFIED. Two `@Public()` controller classes ARE present in `backend/src/modules/build/**`: `PublicWhiteboardLinksController` at `build/execution/whiteboard-sharing.controller.ts:112` and `SubmissionsController` at `build/forms/submissions.controller.ts:107`. Both are intentional public-facing endpoints (shared whiteboard viewer and public form submission via token); both are correctly classified by the gate. The claim "no `@Public()` found" was false and is corrected.
