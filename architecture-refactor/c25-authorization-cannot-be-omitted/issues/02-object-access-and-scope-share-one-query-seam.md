# 02 — Object access and DataScope share one query seam

**Status:** in-progress

## Acceptance criteria

- [ ] Record-by-id reads and writes compose `org_id`, soft-delete, DataScope and domain ACL in SQL.
- [ ] No protected row is fetched and then rejected in application code.
- [ ] Cross-tenant and invisible records both return not-found.
- [ ] Each domain owns its predicate; no generic dynamic table abstraction is introduced.
- [ ] Bulk operations apply the predicate once to the set, not once per row.

## Precise implementation plan

### Problem

Object-level access and DataScope are decided in two places:
1. `PermissionGuard` resolves the scope and stores it in `req.rbacScope`.
2. Individual service methods then apply that scope (or not) to their queries.

A service that calls `findById(orgId, resourceId)` without threading `req.rbacScope` into the predicate passes one check (PermissionGuard) and skips the other (DataScope). **That part of the problem is real and still open.**

> ⚠️ **The chat example below is obsolete — verified 2026-08-26.** This plan asserts a live defect in chat where `resolve(db, type, id, orgId)` takes no `actor` parameter. **That signature does not exist anywhere in the repo**: `resolve\s*\(\s*(db|tx)\s*[,:]` across `backend/src` returns zero matches, and `EntityReferenceService.resolve()` already takes `(actor: EntityActor, references: EntityReference[])`. It was fixed and this plan went stale. Ignore Step 3 entirely. The general principle — grep *signatures* rather than call sites, because a missing actor parameter makes the check unwritable rather than merely forgotten — is why the fix took the shape it did, and still applies to any new resolver.

### The seam interface

Create `backend/src/modules/access/object-access.ts` (new file, in scope):

```ts
export interface ObjectAccessContext {
  orgId: string;
  actorId: string;
  scope: DataScope;
}

export type ObjectQuery<T> = (ctx: ObjectAccessContext) => Promise<T | null>;
```

This is a **type-only interface**, not a runtime service. Each domain module implements `ObjectQuery<T>` for its own resource type, embedding `org_id = ctx.orgId`, soft-delete filter, and DataScope predicate in one SQL call.

### Step-by-step

**Step 1 (in scope — `backend/src/modules/access/object-access.ts`):**
Define `ObjectAccessContext` and `ObjectQuery<T>`. Export from the access module barrel.

**Step 2 (each domain, out of scope for this agent — report to orchestrator):**
For each domain named in the ticket (chat channels, KB pages, module-access mutations):
- Locate the service method that does `findById(orgId, resourceId)` without DataScope.
- Replace the two-step (fetch + application-code check) with a single SQL query that ANDs `org_id = ctx.orgId`, `deleted_at IS NULL`, and the DataScope predicate in the WHERE clause.
- Return `null` for both cross-tenant and invisible records; callers surface that as 404.

**~~Step 3 (chat resolver)~~ — WITHDRAWN.** The described signature does not exist; `EntityReferenceService.resolve()` already takes the actor. See the warning above. Nothing to do here.

**Step 4 (test matrix):**
For each domain seam, add two allow/deny cases in the controller e2e spec:
- `orgA_actor` + `orgB_resource_id` → 404 (cross-tenant)
- `orgA_actor` + soft-deleted `orgA_resource_id` → 404 (invisible)

### Why not a generic seam

A generic `ObjectAccessService.resolve(table, id, ctx)` introduces dynamic table references and defeats per-domain FK integrity. The interface stays a type; each domain's SQL query owns its own predicate — composition, not abstraction.

## Todo

- [x] Create `backend/src/modules/access/object-access.ts` with `ObjectAccessContext` and `ObjectQuery<T>` — `object-access.ts:1-9`. **Two type declarations, no runtime code, zero importers** — a declaration of intent, not the seam. It satisfies "the file exists" and none of the five acceptance criteria above.
- [x] ~~Fix the chat resolver signature~~ **Not a violation — the premise is false.** Verified 2026-08-26: `resolve(db, type, id, orgId)` exists nowhere in `backend/src`, and `EntityReferenceService.resolve()` already takes `(actor, references)` — `entity-reference.service.spec.ts:64` calls `service.resolve(ACTOR, […])`, with `actorOf(CurrentUserContext)` in `entity-actor.ts`.
- [ ] Apply seam to KB pages service (exact: `backend/src/modules/kb/**`)
- [ ] Apply seam to module-access mutations (exact: `backend/src/modules/module-access/**`)
- [ ] Add allow/deny test matrices for each domain

**Audit note (2026-08-26):** `object-access.ts` confirmed at source (`backend/src/modules/access/object-access.ts`). Chat module grep for the described `resolve(db, type, id, orgId)` signature returned zero results — the entity reference resolver currently has an actor parameter. The remaining four todos are genuinely open; the chat item needs re-investigation before any code change.
