# 07 — API and backend contracts

Status: Current unverified controller inventory plus Planned interface consolidation

## Current shape

`backend/src/modules/build/build.module.ts` composes the Build submodules. The snapshot has 53 Build controllers and 354 HTTP verb decorators. Controllers validate/translate HTTP; they do not own domain transitions, reachability, transactions, cache policy, or provider behavior.

## Layer ownership

| Layer | Owns | Must not own |
|---|---|---|
| Controller | route, status code, DTO parse, principal extraction, response mapping | business state machine, raw cross-tenant query, provider retry |
| DTO/schema | field types, bounds, cross-field input rules, wire version | database lookup or authorization |
| Policy/reachability | capability, module, project/record/field scope | persistence side effects |
| Command module | transaction, lifecycle, CAS, idempotency, audit, outbox, invalidation intent | HTTP response objects |
| Query module | authorized projection, cursor/sort/filter bounds, freshness | mutation or hidden post-filtering |
| Repository/adapter | scoped persistence/provider transport | product policy duplicated from command/query module |
| Consumer/job | idempotent asynchronous effect, retry/dead-letter telemetry | silently changing committed domain intent |

## Wire envelope

Successful single-resource responses return `{ data, meta? }`; collections return `{ data: T[], page: { nextCursor, hasMore }, meta? }`. Errors use `{ code, message, details?, requestId }`. `details` is safe structured data, never a stack trace, SQL text, secret, or hidden record metadata.

Cursor format is opaque and signed/validated. Sort input is an allowlisted `{ field, direction }`; stable identity is the final tie-breaker. Default page size is 50 and maximum 100 unless a current endpoint has a stricter documented limit. `FilterEnvelope` v1 enforces depth 4, 50 conditions, `in` value count 100, scope IDs 50, and search length 500.

## Canonical interface families

| Interface family | Current/target routes | Permission/reach | Mutation/cache/event rules |
|---|---|---|---|
| Projects | `/build`, `/build/projects`, `/build/projects/:projectId`, templates/resources | `build:view/create/update/delete/restore/manage` plus project reach | Provision/archive/restore are idempotent where retryable; bump project/report revision and invalidate lists/nav. |
| Tickets | `/build/projects/:projectId/tickets/**`, search, bulk, transfer | `build:tickets:*` plus project/ticket reach | Status/update converges on `applyTicketChange`; CAS; activity/audit/outbox; analytics and ticket keys invalidated. |
| Cycles/workspace | current `build/:projectId/sprints`, milestone/workspace routes | cycle/workspace permissions | API storage identity remains Cycle; compatibility Sprint route must advertise deprecation and no new semantics. |
| Products/roadmap/goals | managed product and roadmap groups | product/roadmap permissions plus product scope | Version scoring inputs, outcome links; invalidate product/roadmap projections. |
| Governance | approvals, risks, decisions, change requests | family-specific permissions | Explicit state machines and decision audit; committed events drive notifications. |
| Client portal | portal management, visibility, grant entry | grant management or validated external grant | Never return internal-only fields; revoke/expiry checked every request; signed file URLs short lived. |
| Collaboration | updates, meetings, files, forms, whiteboards | family permission plus project reach | Files delegates bytes; public forms/boards use token scope and named limits. |
| Quality | releases, QA, bugs, incidents | family permission plus project reach | Completed evidence append-oriented; release publish event transactional. |
| Reports/workload/budget | reports, workload, project budget | view permission plus field policy | Bounded reads; versioned cache; finance/time values are projections. |
| Settings | fields, workflow, views, automations, webhooks, retention, access | manage permissions | Configuration revision, audit, immediate invalidation; secrets write-only. |
| Import/export | preview, commit, status, export | create/view/export policy | Durable job, source identity mapping, same command modules, row results, authorized artifact. |

Exact screen-to-interface mappings live in [screen data contracts](../architecture/screen-data-contracts.md). Current route strings remain defined by controllers/OpenAPI and must be captured in a generated contract diff during implementation; do not hand-create a competing client.

## Command request contract

```ts
type CommandMeta = {
  idempotencyKey?: string;
  expectedRevision?: number;
  source: "ui" | "ai" | "automation" | "import" | "webhook" | "system";
  correlationId: string;
};
```

The server binds `orgId` and actor from authenticated context. A client-supplied organization identifier is a selector only and must match the trusted context. Retryable commands persist the idempotency key, operation, actor/tenant scope, payload hash, status, and result reference.

## Status and errors

- `200/201/202/204`: successful read/create/job-accepted/no-content according to endpoint contract.
- `400/422`: malformed wire input or semantically invalid fields.
- `401`: missing/expired authentication or invalid public token.
- `403`: known scope without capability; do not use for hidden foreign record probes.
- `404`: missing, foreign-tenant, revoked/hidden record where existence must not leak.
- `409`: revision, uniqueness, lifecycle, idempotency, WIP, or plan conflict with a machine code.
- `410`: deliberately retired compatibility endpoint/token where caller action is required.
- `429`: named rate bucket exceeded with integer `Retry-After`.
- `503`: dependency/admission failure with safe retry metadata when retryable.

## Observability

Every command log/trace includes request/correlation ID, operation, tenant hash/ID under approved logging policy, actor type, project/record IDs, outcome code, duration, query count/budget, cache result, idempotency outcome, and outbox event IDs. Never log bodies, tokens, signed URLs, webhook secrets, OTPs, or unrestricted form/comment text.

