# Audit L4 — Build Backend
**Scope:** `backend/src/modules/build/**` · `backend/src/db/schema/build/` (index definitions)
**Rules base:** BE-07, BE-24/25, BE-44, BE-47, BE-49, BE-119–126, BE-158, BE-159, BE-160

---

## Summary Counts

| Category | Findings |
|---|---|
| Cat 1 — Alias / duplicate keys | 2 |
| Cat 2 — Inefficient DB access | 5 |
| Cat 3 — Caching gaps | 3 |
| Cat 4 — Pagination gaps | 1 |
| Cat 5 — Dead code | 1 |
| Cat 6 — Missing indexes (coordinator) | 3 |
| **Total** | **15** |

---

## Cat 1 — Alias / Duplicate Keys (BE-158)

- [ ] `backend/src/modules/build/core/dto/project-core.schemas.ts:27-42` — `listProjectMembersQuerySchema` declares both `q` and `search` for the same search string; the transform folds `q` into `search` at runtime. Two names, one concept. — **Fix:** delete the `q` field from the `z.object({})` and the transform; update any frontend caller that sends `?q=` to send `?search=` instead.

- [ ] `backend/src/modules/build/core/tickets/projects-tickets-read.query.ts:94-95` — ticket list response emits both `storyPoints: row.points ?? null` and `estimate: row.points ?? null` — same value under two keys. — **Fix:** drop `storyPoints`; keep `estimate` (matches the DB column intent). **Frontend must mirror:** remove reads of `storyPoints` from ticket list consumers.

---

## Cat 2 — Inefficient DB Access (BE-160)

- [ ] `backend/src/modules/build/core/roadmap/projects-roadmap.service.ts:283-292` — **N+1**: `loadRoadmapDeliveryProgress()` is called inside `Promise.all(page.data.map(...))` — one DB query per roadmap item; with `PAGE_SIZE_CAP = 100` this fires up to 100 queries per list request. — **Fix:** rewrite `loadRoadmapDeliveryProgress` to accept an array of item IDs and a link-predicate set; run a single aggregated query with `GROUP BY roadmap_item_id`; fan-out results into a Map keyed by item ID.

- [ ] `backend/src/modules/build/core/project-crud/projects-query.service.ts:427→478` — inside `getProject()`, `resolveProjectAccess()` is awaited (line 427) and then `findCrmClient()` is awaited sequentially (line 478) after the project row is already in hand. `findCrmClient` is a separate DB hit to `clientPartyMap + businessParties` that has no dependency on the access-check result. — **Fix:** move the `findCrmClient` call into a `Promise.all` with any other independent lookups that run after the project row is loaded.

- [ ] `backend/src/modules/build/execution/modules.service.ts:99` — `count(sql\`CASE WHEN ${tickets.status} = 'DONE' THEN 1 END\`)` hardcodes the literal string `'DONE'` instead of joining `projectStatuses` and filtering on `type = 'completed'`. If an org renames or replaces the done-status, the completed count is silently wrong. — **Fix:** left-join `projectStatuses` on `(orgId, projectId, name = tickets.status)` and filter the CASE on `projectStatuses.type = 'completed'`.

- [ ] `backend/src/modules/build/core/members/build-members.service.ts:65-68` — leading-wildcard `ILIKE('%search%')` on four user columns (`name`, `email`, `firstName`, `lastName`); none of these columns has a GIN pg_trgm index. Every member-search performs a full seq-scan on `users` rows for the org. (BE-49) — **Fix:** coordinator to add GIN trigram indexes (see Cat 6); application code can stay as-is once indexes exist.

- [ ] `backend/src/modules/build/execution/cycles.service.ts:70` — leading-wildcard `ILIKE('%search%')` on `cycles.name`; no GIN trigram index on `cycles.name`. (BE-49) — **Fix:** coordinator to add index (see Cat 6); application code can stay.

---

## Cat 3 — Caching Gaps (BE-119, BE-159)

- [ ] `backend/src/modules/build/core/analytics/projects-analytics.service.ts:30` — namespace passed to `cachedVersioned` is the inline string `\`build:analytics:${orgId}\`` rather than `` `${BUILD_ANALYTICS_CACHE_NAMESPACE}:${orgId}` `` using the exported constant from `metric-definitions.ts`. If the constant ever changes the analytics namespace and this inline string diverge silently. (BE-158 applied to cache keys) — **Fix:** import `BUILD_ANALYTICS_CACHE_NAMESPACE` and replace the literal.

- [ ] `backend/src/modules/build/core/project-crud/projects-query.service.ts:425-481` — `getProject()` is called on every project detail page load; it runs `resolveProjectAccess` + a project row fetch + `findCrmClient` with no cache layer. This is a hot read with no protection. — **Fix:** wrap the project-row-plus-crmClient fetch inside `cachedVersioned` keyed by `build:project:${orgId}:${projectId}`; invalidate the namespace on any project mutation via `deferAfterCommit`.

- [ ] `backend/src/common/cache/cache-keys.ts:54` (CACHE_KEYS.ticketsList factory) — the ticket list is the highest-traffic read in the Build module and is completely uncached. The `ticketsList` factory is defined but never called by any service (documented in `cache-invalidation-matrix.ts:228-232` as a dead factory). The factory cannot be safely activated with only `(orgId, projectId)` in the key because `queryTickets` applies DataScope (own / all / none) per caller — an org-or-project-only key would serve one member's filtered view to another (cross-user DataScope leak). — **Fix (coordinator task):** activate the factory only after adding `userId`, `permissionHash`, and `filterHash` segments; safe key template: `build:tickets:${orgId}:${projectId}:${userId}:${permHash}:${filterHash}`; every ticket writer must call `invalidateNamespace` for all affected keys.

---

## Cat 4 — Pagination Gaps (BE-24 / BE-25)

- [ ] `backend/src/modules/build/core/tickets/projects-ticket-checklists.service.ts:86` — checklist items fetched with a hard `limit(100)` and no cursor. If a ticket has more than 100 checklist items, items beyond position 100 are invisible. — **Fix:** add cursor-based pagination using `id` as the tie-breaker; expose `cursor` / `nextCursor` in the response envelope; or document the 100-item hard cap as an explicit product decision and add a guard that rejects checklist creation beyond 100 items.

---

## Cat 5 — Dead Code

- [ ] `backend/src/modules/build/execution/sprints.service.ts` — every public method (5 total, lines 9, 13, 17, 27, 31) throws `GoneException("Sprints are frozen. Use /build/:projectId/cycles...")`. The service is a pure stub kept for API backwards compat. — **Fix:** verify that no active route registration or frontend caller hits any sprint endpoint; if confirmed, delete the service and its controller/module wiring in one commit. If a route still exists and must return 410, keep only the minimum controller returning 410 directly; remove the service class.

---

## Cat 6 — Missing Indexes (Coordinator-Owned)

These require new migration files. No application-code changes needed unless the index type changes the query shape.

- [ ] **`modules` table** — `listModules` sorts by `(modules.name ASC, modules.id ASC)` for cursor pagination but the only index is `idx_modules_project(projectId)`. With org-level RLS active, the sort cannot use that index.
  ```sql
  -- proposed migration SQL
  CREATE INDEX CONCURRENTLY idx_modules_org_project_name
    ON build.modules (org_id, project_id, name, id)
    WHERE deleted_at IS NULL;
  ```

- [ ] **`cycles` table** — `cycles.service.ts:70` applies `ILIKE('%text%')` on `cycles.name` with no trigram support.
  ```sql
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  CREATE INDEX CONCURRENTLY idx_cycles_name_trgm
    ON build.cycles USING gin (name gin_trgm_ops)
    WHERE deleted_at IS NULL;
  ```

- [ ] **`ticketLabelMappings` table** — batch-fetch by `inArray(ticketLabelMappings.ticketId, ticketIds)` is common in work-query; the unique index is on `(ticketId, labelId)` which serves the uniqueness constraint but the leading column is `ticketId` so it does cover this pattern — no new index needed here. However `workItemRelations` table has only `idx_work_item_relations_related` on `relatedWorkItemId` with no org-led composite; cross-tenant RLS will defeat it.
  ```sql
  CREATE INDEX CONCURRENTLY idx_work_item_relations_org_source
    ON build.work_item_relations (org_id, work_item_id);
  CREATE INDEX CONCURRENTLY idx_work_item_relations_org_related
    ON build.work_item_relations (org_id, related_work_item_id);
  ```

---

## Fix Lanes (Disjoint File Groups)

### Lane A — DTO / Schema / Response cleanup (Cat 1 + Cat 2 modules hardcode)
Files exclusively owned by this lane:
- `backend/src/modules/build/core/dto/project-core.schemas.ts`
- `backend/src/modules/build/core/tickets/projects-tickets-read.query.ts`
- `backend/src/modules/build/execution/modules.service.ts`

### Lane B — Query efficiency (Cat 2 N+1 + sequential await + ILIKE)
Files exclusively owned by this lane:
- `backend/src/modules/build/core/roadmap/projects-roadmap.service.ts`
- `backend/src/modules/build/core/roadmap/roadmap-delivery.ts` (new batch helper here)
- `backend/src/modules/build/core/project-crud/projects-query.service.ts`
- `backend/src/modules/build/core/members/build-members.service.ts` (no-op until index exists)
- `backend/src/modules/build/execution/cycles.service.ts` (no-op until index exists)

### Lane C — Caching + dead code (Cat 3 + Cat 5)
Files exclusively owned by this lane:
- `backend/src/modules/build/core/analytics/projects-analytics.service.ts`
- `backend/src/modules/build/execution/sprints.service.ts` (deletion candidate)
- `backend/src/modules/build/core/tickets/projects-ticket-checklists.service.ts`

---

## Coordinator-Owned Items

| Item | Notes |
|---|---|
| Index migration SQL above (Cat 6) | Requires migration file + journal entry; apply with `CONCURRENTLY` to avoid table lock on production |
| Activate `CACHE_KEYS.ticketsList` | Must extend key to include `userId + permHash + filterHash`; coordinate with auth team on permission hash derivation |
| Sprint controller route removal | Verify no active route registration before deleting `sprints.service.ts`; check frontend for any `GET /build/:id/sprints` calls |
| GIN extension guard | Confirm `pg_trgm` extension exists on production Neon before creating trigram indexes |

---

## Frontend Contract Changes

| Change | FE Impact |
|---|---|
| Drop `storyPoints` from ticket list response (`projects-tickets-read.query.ts:94`) | All ticket-list consumers must read `estimate` instead of `storyPoints`; grep FE for `.storyPoints` and `["storyPoints"]` |
| Drop `q` param from project member list query (`project-core.schemas.ts:27-42`) | Any FE caller sending `?q=` must switch to `?search=`; grep FE for `q=` on project member list endpoints |
| Checklist pagination (if cursor added) | FE checklist loader must handle `nextCursor` and paginate rather than assuming all items arrive in one response |
