# Step 5 — Data, Interface, Search, Security, and Retention Contracts

## Data ownership

`kb_pages` is the canonical editable page record. `kb_articles` remains a temporary help-centre model during migration; new Wiki behavior must not write it. Project pages are `kb_pages` with a project scope, not copied records.

## Target schema changes

### Required additions

#### `kb_page_grants`

| Field | Purpose |
|---|---|
| `id`, `org_id`, `page_id` | tenant-safe identity |
| one of `membership_id`, `group_id`, `public_token_id` | grantee |
| `access` (`view`, `comment`, `edit`, `manage`) | explicit capability |
| `granted_by_membership_id`, `created_at`, `revoked_at` | audit/lifecycle |
| `expires_at` | nullable; add only when product ships expiry |

Unique live grant per page/grantee. Index `(org_id, membership_id, revoked_at, page_id)` and group equivalent. Page, membership, and group references are tenant-composite.

#### `kb_page_owners`

If one owner is sufficient, keep `owner_membership_id` on `kb_pages`. Add a separate table only when owner groups or multiple accountable owners are approved. Do not create a flexible ownership model in advance.

#### `kb_health_items`

Materialized workflow state only, not every computed signal. Fields: tenant, page, kind, evidence JSON with a versioned schema, impact, state, assignee, due, detected/resolved/dismissed times, rule version. Unique active `(org_id, page_id, kind, rule_version)`.

#### `kb_ai_interactions`

Store cost and audit metadata: tenant, actor membership, conversation/message, provider/model, prompt policy version, source ids+revisions, token counts, latency, result state, feedback, cost. Retain raw prompt/answer only according to tenant policy; do not duplicate chat bodies by default.

### Existing schema repairs

- Remove persisted review status `expired`; derive overdue from pending + due date.
- Add tenant-leading sort indexes matching actual keyset queries.
- Add `(org_id, space_id)` live-page index and appropriate partial live/deleted indexes.
- Add source list index `(org_id, created_at DESC, id DESC)`.
- Add conversation indexes `(org_id, user_membership_id, updated_at DESC, id DESC)` and message `(org_id, conversation_id, created_at, id)`.
- Ensure chunk source has exactly one owner reference using a database check constraint.
- Ensure public tokens are stored hashed, revocable, versioned, and never logged.

## Page model

Keep current page metadata normalized:

- stable id and tenant;
- parent, space, optional project;
- title/icon/cover;
- structured content plus `content_text` projection;
- status, visibility, owner membership;
- content revision and ACL revision;
- verification/review metadata;
- created/updated/deleted/archive timestamps and actor memberships.

Versions are append-only. The current page row is the read projection and points to the latest revision. A restore creates a new version. Links, backlinks, record links, comments, reviews, favorites, visits, attachments, and grants reference page id and tenant.

## Interface conventions

### List request

```json
{
  "cursor": "opaque",
  "limit": 50,
  "q": "onboarding",
  "filters": {
    "spaceId": 12,
    "status": ["published"],
    "owner": "me",
    "verified": true
  },
  "sort": "updated_desc"
}
```

### List response

```json
{
  "data": [],
  "pageInfo": { "nextCursor": null, "hasMore": false },
  "facets": null,
  "meta": { "requestId": "...", "revision": "...", "indexFreshnessMs": 4200 }
}
```

Rules:

- cursor is opaque, signed/versioned, ≤ 512 bytes, and encodes stable order fields plus access/filter revision when needed;
- limit defaults 25 or 50 and never exceeds 100;
- a query never silently truncates;
- exact totals are omitted unless cheap or asynchronously aggregated;
- client and server schemas share fixtures and contract tests;
- errors preserve stable code, HTTP status, retryability, request id, and safe details.

### Mutation conventions

- Retriable creates and bulk commands require `Idempotency-Key`.
- Content updates require `expectedContentRevision`; tree moves use an expected tree/record revision.
- Bulk max is 100 ids and returns per-id `succeeded`, `denied`, `conflict`, `notFound`, or `invalid` without leaking hidden existence.
- Mutation response returns the complete projection needed to patch detail and visible lists.
- Destructive/access/publication commands are pessimistic in the client.

## Proposed interfaces

| Method | Purpose | Required filters/guards |
|---|---|---|
| `GET /kb/pages` | canonical page list | authorized scope; `q`, space, project, owner, sharedWithMe, status, verified, deleted, cursor |
| `GET /kb/pages/:id` | page detail | canonical record access; 404 on hidden |
| `POST /kb/pages` | create | create permission + target space/project access + idempotency |
| `PATCH /kb/pages/:id/content` | content edit | update + expected content revision |
| `PATCH /kb/pages/:id/metadata` | metadata edit | field-specific permission |
| `POST /kb/pages/:id/move` | move | source and destination access + cycle guard + revision |
| `POST /kb/pages/bulk` | bounded repair | max 100, per-record auth, partial result |
| `GET/POST/DELETE /kb/pages/:id/grants` | real sharing | manage-share + grantee validation + audit |
| `GET /kb/search` | full discovery | canonical visible scope + facets + cursor |
| `GET /kb/spaces` | space list | q/audience/status/cursor + server counts |
| `POST /kb/spaces/:id/archive|restore` | reversible lifecycle | manage + impact/outbox |
| `GET /kb/reviews` | queue | visible pages only + filters/cursor |
| `POST /kb/reviews/bulk-decide` | decision | manage + per-record results + idempotency |
| `GET /kb/health` | governance work | manage + canonical visibility + cursor |
| `GET /kb/analytics/*` | decision metrics | time/space + minimum cohort + visibility |

Avoid a proliferation of action-specific thin controllers. Controllers validate and translate; deep modules own invariants and transactions.

## Authorization model

Evaluation order:

1. Valid authenticated tenant/membership or valid public token.
2. Tenant placement/version is current.
3. Route permission permits the action class.
4. Project scope, if any, is accessible.
5. Space scope and inherited role are accessible.
6. Page visibility/ownership/grant permits the record action.
7. Page state permits the mutation (not purged/locked/archived unless action handles it).
8. Field-specific rules permit the requested change.

The result is deny-by-default. Route denial can be 403/NoPermission. A hidden/missing record is 404. Lists/search/analytics omit hidden content without revealing counts. Exports, attachments, citations, notifications, and audit views reapply authorization appropriate to their data.

### ACL revision

Increment `acl_revision` for page visibility, grant, space membership/policy, project membership, public token, or parent policy changes that alter access. Index chunks and caches with the relevant revision. An asynchronous projection can be stale only if the final authoritative disclosure check rejects mismatches.

## Search and ranking

### Retrieval pipeline

1. Normalize language/query but preserve exact identifiers and quoted phrases.
2. Obtain canonical actor scope and permission fingerprint.
3. Lexical candidate search: title > heading > body > tag, with freshness/trust as bounded boosts.
4. Semantic candidates when configured and useful.
5. Reciprocal-rank or learned fusion with offline evaluation.
6. Current ACL/content revision recheck.
7. Snippet generation from authorized current content.
8. Stable pagination token that includes ranking/query version.

Do not use semantic search for an empty query, exact id navigation, or when provider/budget is unavailable.

### Chunking

- Split by heading/block boundaries with controlled overlap.
- Store heading path and exact block/character range.
- Maximum token size is tested against retrieval quality, not chosen once globally.
- Hash normalized content per chunk to reuse embeddings.
- One chunk points to one source record and current revision.
- Attachment extraction records file hash, parser version, scan state, language, and page/source access.

### Evaluation

Maintain a versioned, tenant-safe offline set of representative queries with relevance judgments. Track precision/recall/nDCG for lexical, semantic, and fused search; citation correctness; minority-tenant recall; exact-code queries; stale/deleted/access-revoked exclusions. Online A/B tests cannot replace leakage tests.

## Ask and AI safety

- `kb:ai:generate` plus read access is required; billing permission is not inferred from view.
- Retrieval scope is visible and editable before send.
- Provider context contains only authorized passages required for the question.
- System records provider/model/policy/source revisions/cost and outcome.
- The renderer accepts citations only when they map to a retrieved passage and remain authorized.
- Prompt injection inside documents is content, never an instruction to the system.
- Tool calls are allowlisted and require separate authorization; default Ask has no mutating tools.
- Generated edits are previewed as a diff and applied via normal revision-guarded content mutation.
- Tenant quotas cover requests, tokens, concurrent streams, indexed bytes, and research jobs.

## Cache and invalidation matrix

| Projection | Key dimensions | Invalidated by |
|---|---|---|
| Page detail | tenant, page, content rev, ACL rev | content/metadata/access/lifecycle/version restore |
| Page list | tenant, permission fingerprint, normalized filters, cursor | create, relevant metadata, move, grant, lifecycle, owner, import |
| Tree children | tenant, scope, parent, cursor, ACL rev | create/move/delete/restore/access |
| Search | tenant, permission fingerprint, query/filter/ranking rev, cursor | source revisions or short TTL + event invalidation |
| Space list | tenant, actor standing, filters, cursor | space/member/page-count changes |
| Reviews/Health | tenant, actor scope, filters, cursor | review, page, signal, assignment changes |
| Public render | hashed token id + token rev + page rev | token/page/access/attachment change |
| Embedding | model rev + tenant-safe content hash | model/chunker revision |

Every cache has a source of truth, TTL, maximum value size, invalidation writers, degraded behavior, and stampede control. Cache failure never changes authorization.

## Privacy, retention, and deletion

### Suggested defaults subject to legal/product approval

- Current pages: tenant lifecycle.
- Trash: configurable 1–365 days; default 30.
- Versions: tenant-configurable only after legal/audit requirements are defined; do not silently delete history.
- Chat: short default retention (for example 30–90 days) with tenant setting; usage aggregates separate from body.
- AI raw prompts/answers: minimum necessary retention; metadata may outlive body according to audit policy.
- Search chunks/embeddings: delete promptly after source purge; checkpoints expire after successful indexing.
- Import files/export archives: expire automatically; show expiry to the user.
- Audit events: append-only retention by plan/policy; sensitive payloads minimized.

### Purge fan-out

A purge ledger tracks database record, versions/comments/grants, attachments/object keys, chunks/vector index, cache keys, public tokens/CDN, analytics identifiers, notifications/webhooks, connector projections, and search aliases. Each step is idempotent and resumable. Completion is claimed only when every required store acknowledges deletion or records a policy-governed backup exception.

## Observability

Required dimensions are tenant bucket/placement, route/module, result code, actor standing (not identity), cache outcome, primary/replica, queue lane, job kind, provider/model, and source kind. Never put page title/body, query text, token, or attachment name into metrics labels.

Dashboards and alerts:

- page read/write/search/Ask latency and errors;
- DB connections, locks, slow queries, replica lag, cache hit and dropped invalidations;
- queue age, retries, dead letters, lease recovery, index freshness;
- ACL denial/not-found anomalies and revocation lag;
- vector/lexical candidate counts, rerank latency, no-answer rate, citation coverage;
- storage/index/embedding/AI cost by tenant tier;
- purge backlog and oldest incomplete ledger.

## Required test classes

- cross-tenant and same-tenant-hidden record equivalence;
- space/project/grant revocation on detail, list, search, Ask, citation, attachment, export, analytics;
- stale content and ACL revision rejection;
- cursor stability under concurrent insert/update/delete;
- idempotency and partial bulk retry;
- move cycle, restore, purge resumption, and outbox redelivery;
- cache unavailable, replica lag, provider failure, queue backlog, and object-store failure;
- SQL plans at production-like cardinality and load tests at the planning envelope;
- property/fuzz tests for ACL predicate and cursor codecs;
- backup restore and tenant export/delete drills.
