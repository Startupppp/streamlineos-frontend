# KB Core-APIs — Caching, DataScope & Hygiene — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Address the non-security backend findings that are self-contained and low-risk: scope the page-reviews list to the caller, add Redis caching to the per-request accessible-spaces hot path, and replace raw `throw new Error` with proper HTTP exceptions. Heavy query rewrites (recursive CTEs) and the 775-line file split are scoped to **Phase 2** (separate plan) because they require reading the full service files and carry more risk.

**Architecture:** Small NestJS service/controller edits. Reuse the existing `CacheService` (`common/cache/cache.service.ts`, Upstash Redis, no-op when Redis is absent). No schema changes, no API-shape changes (response arrays only shrink for non-privileged reviewers — an intended access fix).

**Tech Stack:** NestJS · Drizzle · Neon · `@upstash/redis` via `CacheService` · Jest.

**Pre-flight facts (verified against source 2026-07-25):**
- `CacheService` API (`cache.service.ts`): `cached<T>(key, fetcher, ttlSeconds=300)`, `set`, `invalidate`/`del`, `invalidatePattern(pattern)`. Injected via `@Inject(REDIS)`; safely no-ops when Redis is unconfigured.
- `KbAccessService.getAccessibleSpaceIds(user)` (`kb-access.service.ts:31-82`) runs 2–3 queries **plus N per-space `resourceGrants.hasGrant` calls** on **every** authenticated KB request (via `assertSpaceAccessible`, `list`, etc.) with **zero caching**.
- `KbPageReviewsService.list(orgId, status, type)` (`kb-page-reviews.service.ts:34-75`) returns **all** org reviews to any `kb:reviews:view` holder — no per-reviewer scoping. Controller `kb-page-reviews.controller.ts:33-41` passes only `u.orgId`.
- Raw `throw new Error(...)` (→ generic 500) at `kb-page-reviews.service.ts:143`, `kb-import-export.service.ts:169` (and `exportPage:67`), and per the audit also in `kb-pages.service.ts` / `kb-page-tree.service.ts` (addressed in Phase 2 alongside those files' reads).
- Post-security-hotfix, `PermissionGuard` hydrates `req.user.permissions` from the DB (`permission.guard.ts:52-55`) on all KB routes, so `user.permissions.includes(...)` in services is DB-authoritative for HTTP requests (the earlier §21 "stale permissions" concern is resolved for HTTP; async-job callers pass `permissions: []` → deny-safe).
- Backend `tsc --noEmit` needs `NODE_OPTIONS=--max-old-space-size=8192` in this sandbox.

---

## File Structure

| File | Change |
|---|---|
| `backend/src/modules/kb/kb-page-reviews.service.ts` | `list` accepts `CurrentUserContext`; scope to own reviews unless manage/owner |
| `backend/src/modules/kb/kb-page-reviews.controller.ts` | pass `u` to `reviews.list` |
| `backend/src/modules/kb/kb-page-reviews.service.spec.ts` | new — assert non-manager list is scoped |
| `backend/src/modules/kb/kb-access.service.ts` | inject `CacheService`; cache `getAccessibleSpaceIds`; add `invalidateAccessibleSpaceIds(orgId)` |
| `backend/src/modules/kb/kb-members.service.ts` | inject `KbAccessService`; invalidate on add/remove |
| `backend/src/modules/kb/kb-spaces.service.ts` | invalidate on create/remove/update (already has `access`) |
| `backend/src/modules/kb/kb.module.ts` | ensure `CacheService` is provided/imported |
| `backend/src/modules/kb/kb-import-export.service.ts` | `throw new Error` → `InternalServerErrorException` |

---

### Task 1: Scope the page-reviews list to the caller (DataScope)

**Files:** `kb-page-reviews.service.ts`, `kb-page-reviews.controller.ts`, new spec

- [ ] **Step 1: Write the failing unit test**

Create `backend/src/modules/kb/kb-page-reviews.service.spec.ts`:

```ts
import { KbPageReviewsService } from "./kb-page-reviews.service";
import type { Db } from "../../db/drizzle.module";
import type { AuditService } from "../../common/audit/audit.service";
import type { NotificationDispatchService } from "../notifications/notification-dispatch.service";
import type { CurrentUserContext } from "../../common/auth/backend-claims";

function buildChain(capture: (cond: unknown) => void) {
  const chain = {
    select: () => chain,
    from: () => chain,
    leftJoin: () => chain,
    where: (cond: unknown) => {
      capture(cond);
      return chain;
    },
    orderBy: () => chain,
    limit: async () => [],
  };
  return chain;
}

function makeUser(perms: string[]): CurrentUserContext {
  return {
    userId: "user-1",
    orgId: "org-A",
    role: "member",
    isOrgOwner: false,
    isPlatformAdmin: false,
    permissions: perms,
    enabledModules: ["kb"],
  } as unknown as CurrentUserContext;
}

describe("KbPageReviewsService.list scoping", () => {
  function makeService(capture: (cond: unknown) => void) {
    const db = buildChain(capture) as unknown as Db;
    return new KbPageReviewsService(
      db,
      { log: jest.fn() } as unknown as AuditService,
      { emit: jest.fn() } as unknown as NotificationDispatchService,
    );
  }

  it("adds an own-reviews predicate for a non-manager", async () => {
    let captured: unknown;
    const service = makeService((c) => (captured = c));
    await service.list(makeUser(["kb:reviews:view"]), undefined, undefined);
    // Non-managers get an extra OR(reviewerId, requestedById) condition.
    expect(JSON.stringify(captured)).toContain("reviewer_id");
    expect(JSON.stringify(captured)).toContain("requested_by_id");
  });

  it("does NOT add the own-reviews predicate for a manager", async () => {
    let captured: unknown;
    const service = makeService((c) => (captured = c));
    await service.list(makeUser(["kb:reviews:manage"]), undefined, undefined);
    expect(JSON.stringify(captured)).not.toContain("requested_by_id");
  });
});
```

- [ ] **Step 2: Run it — expect failure**

Run: `cd backend && NODE_OPTIONS=--max-old-space-size=6144 pnpm exec jest kb-page-reviews.service.spec --runInBand`
Expected: FAIL — `list` currently takes `(orgId, status, type)` and never scopes.

- [ ] **Step 3: Change `list` to accept the user and scope**

In `kb-page-reviews.service.ts`, add `or` to the drizzle import (L2):

```ts
import { and, asc, eq, isNotNull, isNull, lte, or, sql } from "drizzle-orm";
```

Replace the `list` signature + conditions (L34-49):

```ts
  async list(
    user: CurrentUserContext,
    status: string | undefined,
    type: string | undefined,
  ): Promise<ReviewWithContext[]> {
    const requester = alias(users, "requester");
    const reviewer = alias(users, "reviewer");

    const canSeeAll =
      user.isOrgOwner ||
      user.isPlatformAdmin ||
      user.permissions.includes("kb:reviews:manage");

    const conditions = [eq(kbPageReviews.orgId, user.orgId)];
    if (status && REVIEW_STATUSES.includes(status as ReviewRow["status"])) {
      conditions.push(eq(kbPageReviews.status, status as ReviewRow["status"]));
    }
    if (type && REVIEW_TYPES.includes(type as ReviewRow["type"])) {
      conditions.push(eq(kbPageReviews.type, type as ReviewRow["type"]));
    }
    if (!canSeeAll) {
      const ownOnly = or(
        eq(kbPageReviews.reviewerId, user.userId),
        eq(kbPageReviews.requestedById, user.userId),
      );
      if (ownOnly) conditions.push(ownOnly);
    }
```

(The rest of the method — the `.select(...).from(...)...where(and(...conditions))` — is unchanged.)

- [ ] **Step 4: Update the controller to pass the user**

In `kb-page-reviews.controller.ts`, replace `list` body (L40):

```ts
    return this.reviews.list(u, status, type);
```

- [ ] **Step 5: Run the test — expect pass; typecheck**

Run: `NODE_OPTIONS=--max-old-space-size=6144 pnpm exec jest kb-page-reviews.service.spec --runInBand`
Then: `NODE_OPTIONS=--max-old-space-size=8192 pnpm exec tsc --noEmit`
Expected: test passes; types clean.

- [ ] **Step 6: Commit**

```bash
git add src/modules/kb/kb-page-reviews.service.ts src/modules/kb/kb-page-reviews.controller.ts src/modules/kb/kb-page-reviews.service.spec.ts
git commit -m "feat(kb): scope page-reviews list to own reviews unless kb:reviews:manage

A kb:reviews:view holder saw every review in the org. Non-managers now see only reviews they requested or are assigned to; owners/platform-admins/kb:reviews:manage see all.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Cache the accessible-spaces hot path (Redis)

**Files:** `kb-access.service.ts`, `kb-members.service.ts`, `kb-spaces.service.ts`, `kb.module.ts`

- [ ] **Step 1: Confirm `CacheService` is available to the KB module**

Read `backend/src/modules/kb/kb.module.ts`. If `CacheService` (or the module that provides it — same one `AccessModule` uses) is not already importable, add its module to `imports`. (AccessService injects `CacheService`, so the provider exists; KB likely imports `AccessModule`/a shared cache module already — verify before editing.)

- [ ] **Step 2: Inject `CacheService` and cache `getAccessibleSpaceIds`**

In `kb-access.service.ts`, add the import:

```ts
import { CacheService } from "../../common/cache/cache.service";
```

Add to the constructor (after `resourceGrants`):

```ts
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly resourceGrants: ResourceGrantsService,
    private readonly cache: CacheService,
  ) {}
```

Rename the existing method body to a private `computeAccessibleSpaceIds` and wrap the public method in the cache. Replace the current `async getAccessibleSpaceIds(user)` (L31) header with:

```ts
  private accessibleSpacesKey(orgId: string, userId: string): string {
    return `kb:acc-spaces:${orgId}:${userId}`;
  }

  async getAccessibleSpaceIds(user: CurrentUserContext): Promise<number[]> {
    return this.cache.cached(
      this.accessibleSpacesKey(user.orgId, user.userId),
      () => this.computeAccessibleSpaceIds(user),
      60,
    );
  }

  async invalidateAccessibleSpaceIds(orgId: string): Promise<void> {
    await this.cache.invalidatePattern(`kb:acc-spaces:${orgId}:*`);
  }

  private async computeAccessibleSpaceIds(user: CurrentUserContext): Promise<number[]> {
```

(Everything from the original method body onward stays as the `computeAccessibleSpaceIds` body — only the method name/header changed. The result is a `number[]`, JSON-serializable for Redis.)

Rationale: 60s TTL matches permission-ish volatility (§11/§22); the whole result — including the N `hasGrant` round-trips — is cached, so repeated same-request access checks hit Redis, not Neon. Mutations bust the org's keys (Step 3–4).

- [ ] **Step 3: Invalidate on space-member mutations**

In `kb-members.service.ts`, inject `KbAccessService`:

```ts
import { KbAccessService } from "./kb-access.service";
```
```ts
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly access: KbAccessService,
  ) {}
```
At the end of `add` (before `return member;`) and `remove` (before `return { success: true };`), add:

```ts
    await this.access.invalidateAccessibleSpaceIds(orgId);
```

- [ ] **Step 4: Invalidate on space create/remove/update**

In `kb-spaces.service.ts` (already injects `KbAccessService` as `access`), after the successful insert in `create` (before `return space;` inside the transaction's caller — place it after the `db.transaction(...)` resolves), and at the end of `update` and `remove` (before their returns), add:

```ts
    await this.access.invalidateAccessibleSpaceIds(orgId);
```
(In `create`, `orgId` is the param; in `update`/`remove` it is the `orgId` param.)

- [ ] **Step 5: Typecheck + lint**

Run: `NODE_OPTIONS=--max-old-space-size=8192 pnpm exec tsc --noEmit && pnpm exec eslint src/modules/kb/kb-access.service.ts src/modules/kb/kb-members.service.ts src/modules/kb/kb-spaces.service.ts`
Expected: clean. (Watch for a DI cycle: `KbMembersService` → `KbAccessService`; `KbAccessService` does not depend on `KbMembersService`, so no cycle.)

- [ ] **Step 6: Commit**

```bash
git add src/modules/kb/kb-access.service.ts src/modules/kb/kb-members.service.ts src/modules/kb/kb-spaces.service.ts src/modules/kb/kb.module.ts
git commit -m "perf(kb): cache getAccessibleSpaceIds in Redis (60s) with invalidation on space/member mutations

Accessible-space resolution ran 2-3 queries + N per-space hasGrant calls on every authenticated KB request with zero caching. Now cached per (org,user) via CacheService; busted on member add/remove and space create/update/remove.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Replace raw `throw new Error` with proper HTTP exceptions

**Files:** `kb-page-reviews.service.ts`, `kb-import-export.service.ts`

- [ ] **Step 1: reviews service**

In `kb-page-reviews.service.ts`, add `InternalServerErrorException` to the `@nestjs/common` import (L1) and replace L143:

```ts
    if (!review) throw new InternalServerErrorException("Failed to create review");
```

- [ ] **Step 2: import-export service**

In `kb-import-export.service.ts`, add `InternalServerErrorException` to the L1 import and replace the two raw errors:

L67: `if (!job) throw new InternalServerErrorException("Failed to create export job");`
L169: `if (!job) throw new InternalServerErrorException("Failed to record import job");`

- [ ] **Step 3: Typecheck**

Run: `NODE_OPTIONS=--max-old-space-size=8192 pnpm exec tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/modules/kb/kb-page-reviews.service.ts src/modules/kb/kb-import-export.service.ts
git commit -m "fix(kb): raw throw new Error -> InternalServerErrorException on insert-null paths

Raw Errors surfaced as generic 500s through the exception filter; use the typed Nest exception for a consistent envelope.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: PAGES.md

- [ ] Append to the KB Wiki section (working tree only; do not commit the root repo):

```md
> 2026-07-25 — core-APIs pass: page-reviews list scoped to own reviews unless kb:reviews:manage; getAccessibleSpaceIds cached in Redis (60s) with invalidation on space/member mutations; raw throw new Error -> InternalServerErrorException. Recursive-CTE rewrites (ancestors/subtree), list-endpoint column projection, unbounded getTree/emptyTrash caps, and the 775-line kb-pages.service split are Phase 2.
```

---

## Deferred to Core-APIs Phase 2 (separate plan — requires reading the full `kb-pages.service.ts` (775 LOC) + `kb-page-tree.service.ts`)

Each needs the exact current loop code to write a correct no-placeholder rewrite:
1. **`buildAncestors` (`kb-pages.service.ts:651-666`) → single recursive CTE** — one query per ancestor level today.
2. **`collectSubtreeIds` / `buildSubtreeMap` (`kb-page-tree.service.ts:451-493`) → recursive CTE** — one query per tree level on delete/restore/duplicate.
3. **`getTree` (`kb-page-tree.service.ts:55-93`) unbounded** — add a defensive cap / lazy subtree loading.
4. **`emptyTrash` (`kb-page-tree.service.ts:227-254`)** — replace select-then-delete with a bounded direct `DELETE`.
5. **`getRecent` / `getFavorites` (`kb-pages.service.ts:357-413`)** — project columns; drop the heavy `content` JSONB from list reads.
6. **`fireMentionNotifications` (`kb-pages.service.ts:756-774`) + `duplicate` per-node queries** — `Promise.all` / batch set-based queries.
7. **Split `kb-pages.service.ts` (775 → ≤300)** — extract `KbPageVersionsService` / `KbPageVisitsService` / mention helpers (§9).
8. **Least-privilege decision (product):** should `kb:spaces:manage` be org-wide (current) or require space-admin membership for `spaces.update/remove` + `members.add/remove`? Not a cross-tenant hole today (org-scoped); needs Aditya's call before changing behavior.

---

## Self-Review

**Spec coverage:** reviews-list-not-scoped → Task 1 ✓. getAccessibleSpaceIds zero-cache + N+1 → Task 2 (cache the whole result, invalidate on mutation) ✓. raw Error → 500 → Task 3 ✓. Recursive CTEs / column projection / unbounded caps / file split / least-privilege → Phase 2, each with the exact source location ✓.

**Type consistency:** `or` added to drizzle imports where first used; `CacheService.cached/invalidatePattern` signatures match `cache.service.ts`; `InternalServerErrorException` from `@nestjs/common`. `user.permissions` is DB-hydrated by `PermissionGuard` (verified), so the reviews-manage check is authoritative on HTTP paths.

**Risk:** Task 1 shrinks the reviews array for non-managers — an intended access fix (frontend already renders whatever the API returns). Task 2's cache is no-op-safe when Redis is absent and busts on every relevant mutation; the only staleness window is ≤60s for grant changes not routed through the invalidation points (acceptable; TTL-bounded). Task 3 is envelope-only.

**Placeholder scan:** none — Tasks 1–3 carry exact edits + a test; Phase 2 items are explicitly out of scope with source anchors, not placeholders.
