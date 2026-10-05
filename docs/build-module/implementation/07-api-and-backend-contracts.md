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

## Data retention schedule (Build)

(BT-d10af38c2f4e, added 2026-10-04 — Planned; requires implementation confirmation)

| Data class | Retention rule | Deletion trigger | Notes |
|---|---|---|---|
| Ticket free-text (title, description, comments) | Kept until project is hard-deleted + 30 days | Org deletion cascades; project hard-delete cascades | Soft-delete hides but retains; free-text never logged |
| AI context / session | Session lifetime only; not persisted to DB | Session expiry or explicit clear | Token/prompt content must never appear in application logs |
| File metadata (attachment records) | Until the attachment is deleted by an authorized actor | File owner delete or org deletion | Byte storage lifecycle is owned by Files module |
| Audit log rows | Immutable; no automated deletion | Legal hold; org deletion may anonymize actor references | Stores identifiers and field names only, not field values |
| Webhook secrets | Never stored as plaintext; stored as hash only | Secret rotation replaces hash | Secret must never appear in application or observability logs |
| Signed URLs | Never persisted to DB; generated on demand | Expiry encoded in URL | URL must never appear in application logs |
| Build permissions / membership grants | Kept for revocation audit; anonymized on org deletion | Org deletion | Membership grants carry audit timestamps |

Per-tenant deletion: deleting an organization row must cascade-delete or anonymize all Build data (tickets, projects, grants, audit rows, files metadata, webhooks). The cascade path is through the `org_id` foreign keys on every Build table. Verify the cascade is tested in the org-deletion spec before marking this row Current verified.

## Machine code registry (Build)

(BT-d524e518fbbf, reconciled 2026-10-04)

**Envelope note:** `BE-19` specifies `{ success: true, data }` added by `ResponseTransformInterceptor`; `BE-20` specifies `{ code, message, details?, correlationId? }` for errors. Collections nest inside `data`. No Build controller returns `success: false` — errors always use the error envelope. Deprecated endpoints use `410` with `code: "DEPRECATED"` and replacement URL in `details`.

| Code | HTTP | Source | Meaning |
|---|---|---|---|
| `PROJECTS_TICKET_CONFLICT` | 409 | `ProjectsTicketConflictException` / `common/http/api-exceptions.ts:135` | Ticket CAS version mismatch; caller must refresh |
| `PROJECTS_INVALID_TICKET_STATUS` | 400 | `ProjectsInvalidTicketStatusException` / `api-exceptions.ts:148` | Transition not permitted by project workflow |
| `PROJECTS_FORBIDDEN_TICKET` | 403 | `ProjectsForbiddenTicketException` / `api-exceptions.ts:59` | Caller lacks ticket-level reach |
| `PROJECTS_FORBIDDEN_PROJECT` | 403 | `ProjectsForbiddenProjectException` / `api-exceptions.ts:71` | Caller is not a project member |
| `PROJECTS_NOT_FOUND` | 404 | `ProjectsNotFoundException` / `api-exceptions.ts:84` | Project cross-tenant miss or not found |
| `PROJECTS_TICKET_NOT_FOUND` | 404 | `ProjectsTicketNotFoundException` / `api-exceptions.ts:93` | Ticket cross-tenant miss or not found |
| `PROJECTS_COMMENT_NOT_FOUND` | 404 | `ProjectsCommentNotFoundException` / `api-exceptions.ts:102` | Comment not found |
| `PROJECT_LOCKED` | 409 | `project-access.ts:73` | Project is locked; write operations denied |
| `FORM_RATE_LIMITED` | 429 | `submissions.controller.ts:121` | Public form submission rate limit exceeded |
| `MODULE_NOT_ENABLED` | 402 | `ModuleDisabledException` / `api-exceptions.ts:42` | Build not in plan or user-denied; `details.reason`: `not-in-plan` / `org-disabled` / `user-denied` |
| `INSUFFICIENT_CREDITS` | 402 | `InsufficientAiCreditsException` / `api-exceptions.ts:11` | AI credit balance exhausted |
| `CONFLICT` | 409 | `all-exceptions.filter.ts:120` | Generic NestJS `ConflictException`; prefer a domain-specific code |
| `VALIDATION_FAILED` | 400/422 | `all-exceptions.filter.ts:126` | Zod or NestJS validation error |
| `SERVICE_UNAVAILABLE` | 503 | `admission.guard.ts:62` / `all-exceptions.filter.ts:334` | Dependency unavailable; `Retry-After` present when safe to retry |
| `ORG_MEMBERSHIP_INACTIVE` | 401 | `jwt-auth.guard.ts:261` | Authenticated but org membership is inactive |
| `MFA_REQUIRED` | 401 | `mfa.guard.ts:61` | Request requires MFA step-up |
| `INTERNAL_ERROR` | 500 | `all-exceptions.filter.ts:364` | Unhandled server error; no stack trace or internal message exposed |

No compatibility adapters are needed at this time; all codes above are current. When a code is retired or renamed, a `410` endpoint at the old path with `code: "DEPRECATED"` and `details.replacement` is the correct compatibility path.

## Delivery checklist

Track completion in the [requirement ledger](REQUIREMENT-LEDGER.md) and [work claims](WORK-CLAIMS.md). An unchecked item stays open until evidence is recorded on the current branch.

- [x] Reconcile the proposed success/error envelopes and machine codes with current controllers, shared serializers, generated OpenAPI, and repository conventions; record compatibility adapters before changing callers.
- [x] Assign one command or query owner to every Build API family and eliminate duplicate write paths only after route and caller parity is demonstrated.
- [x] Define Zod/DTO validation, tenant and actor context, permission key, idempotency key, revision precondition, bounded pagination, and response fields for each changed endpoint.
- [x] Exercise negative and happy paths for access denial, stale revision, duplicate retry, rate limit, partial job, and dependency failure; compare browser network and generated client behavior.
- [x] Verify request and outbox correlation, query count, cache decision, and safe logs without recording credentials or unrestricted record bodies.
