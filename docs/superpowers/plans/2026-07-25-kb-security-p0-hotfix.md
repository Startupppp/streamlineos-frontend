# KB Security P0 Hotfix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close four confirmed, live authorization holes in the Knowledge Base backend (broken permission resolution, 15 unguarded endpoints, and a cross-tenant import reference) without changing any working behavior.

**Architecture:** Surgical NestJS controller/service edits. Mirror the repo's established module+permission pattern (`@RequireModule("kb")` at the class + `@UseGuards(JwtAuthGuard, PermissionGuard)` + `@RequirePermission` per method, as in `accounting-gl/periods.controller.ts`). One service-layer BOLA validation added to the import path. No schema, no API-shape, no frontend changes — this hotfix is additive authorization only.

**Tech Stack:** NestJS (REST) · Drizzle ORM (Neon/Postgres) · Jest (+ supertest) e2e · pnpm.

**Scope guardrails (do NOT do here):**
- No schema/migration changes (that is the separate Schema plan: HNSW, `fts`, indexes, normalization).
- No least-privilege redesign of `kb:spaces:manage` (org-wide vs space-scoped) — audited as a *hardening* item, deferred to the Core-APIs plan; the current model is tenant-scoped and not a cross-tenant hole.
- No refactors, renames, file splits, or dead-code removal — those live in later plans.

**Pre-flight facts (verified against source 2026-07-25):**
- `AccessService.resolveUserPermissions(orgId, userId)` — signature confirmed at `backend/src/modules/access/access.service.ts:136`; returns `Map<string, DataScope>`; every correct caller passes `(orgId, userId)`.
- `KbPagesController` (`backend/src/modules/kb/kb-pages.controller.ts`) class guard is `@UseGuards(JwtAuthGuard)` only; `PermissionGuard` is applied per-method on 21 routes and **missing on 13**.
- `PermissionGuard` (`backend/src/modules/access/permission.guard.ts`) is **not** global; only `JwtAuthGuard` is `APP_GUARD` (`app.module.ts:322`). A route with no `PermissionGuard` gets **auth-only** — no permission and no module check.
- The existing spec `backend/src/modules/kb/kb-pages.controller.e2e-spec.ts` already asserts `/kb/pages/tree` → 403 without permission and 404 when the kb module is disabled — assertions the current controller cannot satisfy (they are red). This plan makes the controller satisfy them.
- Catalog keys exist (`backend/src/modules/rbac/permissions.constants.ts`): `kb:pages:view`, `kb:pages:create`, `kb:pages:update`, `kb:pages:delete`, `kb:pages:purge`, `kb:pages:manage`, `kb:spaces:view`, `kb:spaces:manage`, `kb:templates:manage`. There is **no** `kb:templates:view` key — templates reads gate on `kb:pages:view`.
- The e2e harness OOMs when booting the full `AppModule` in the local sandbox (heap exhaustion loading email/notifications). Run e2e in CI or with raised heap + single worker (command in each task). Local gating relies on **build + lint + typecheck** (CLAUDE.md §26), which do run here.

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `backend/src/modules/kb/kb-pages.controller.ts` | KB page routes | Fix swapped args (L320); add `@RequireModule("kb")` + class `PermissionGuard`; add `@RequirePermission` to 13 routes; drop now-redundant per-method `@UseGuards(PermissionGuard)` |
| `backend/src/modules/kb/kb-page-templates.controller.ts` | Page-template routes | Add `@RequireModule("kb")` + class `PermissionGuard`; gate `GET /kb/page-templates` with `kb:pages:view` |
| `backend/src/modules/kb/kb-page-record-links.controller.ts` | Record-link routes | Add `@RequireModule("kb")` + class `PermissionGuard`; gate `GET pages/:pageId/record-links` and `GET record-links/by-record` with `kb:pages:view` |
| `backend/src/modules/kb/kb-import-export.service.ts` | Import/export | Validate every non-null `parentPageId` belongs to the caller's org before insert (BOLA) |
| `backend/src/modules/kb/kb-import-export.service.spec.ts` | Unit test (new) | Assert import rejects a cross-tenant `parentPageId` |
| `backend/src/modules/kb/kb-pages.controller.e2e-spec.ts` | Existing e2e | Extend `moduleCheckRoutes` to cover the newly-guarded reads; no rewrite |

Task order matches the security blast radius: privilege-resolution bug → unguarded write/read routes → import BOLA.

---

### Task 1: Fix swapped `resolveUserPermissions(orgId, userId)` arguments

**Files:**
- Modify: `backend/src/modules/kb/kb-pages.controller.ts:318-322`

- [ ] **Step 1: Read the current `resolveCanManage` to confirm the exact text**

Run: open `backend/src/modules/kb/kb-pages.controller.ts`, lines 318-322. Confirm it reads:

```ts
  private async resolveCanManage(u: CurrentUserContext): Promise<boolean> {
    if (u.isOrgOwner || u.isPlatformAdmin) return true;
    const perms = await this.access.resolveUserPermissions(u.userId, u.orgId);
    return perms.has("kb:pages:manage");
  }
```

- [ ] **Step 2: Swap the arguments to `(orgId, userId)`**

Replace line 320 exactly:

```ts
    const perms = await this.access.resolveUserPermissions(u.orgId, u.userId);
```

Rationale: signature is `resolveUserPermissions(orgId: string, userId: string)`. Passing `(userId, orgId)` resolves permissions for a non-existent `(orgId=userId, userId=orgId)` tuple → the cache key `${orgId}:${userId}:${version}` never matches, so `perms` is empty and `canManage` is always `false`. That silently breaks locked-page enforcement in `update`/`restoreVersion` and visibility management in `setVisibility`/`get` for every non-owner.

- [ ] **Step 3: Typecheck**

Run: `pnpm -C backend exec tsc --noEmit`
Expected: no new errors (identical types; only argument order changed).

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/kb/kb-pages.controller.ts
git commit -m "fix(kb): resolveCanManage passed (userId, orgId) to resolveUserPermissions — swap to (orgId, userId)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Guard the 13 unguarded KbPages endpoints (RBAC + module)

**Files:**
- Modify: `backend/src/modules/kb/kb-pages.controller.ts` (imports L1-40; class decorators L42-43; methods L51-316)

- [ ] **Step 1: Add the `RequireModule` import**

After line 16 (`import { RequirePermission } ...`), add:

```ts
import { RequireModule } from "../../common/rbac/require-module.decorator";
```

- [ ] **Step 2: Make the class fail-closed — module-gated + PermissionGuard at class level**

Replace lines 42-43:

```ts
@Controller("kb")
@UseGuards(JwtAuthGuard)
```

with:

```ts
@Controller("kb")
@RequireModule("kb")
@UseGuards(JwtAuthGuard, PermissionGuard)
```

Consequence (intended): `PermissionGuard` now runs on **every** method. Per `permission.guard.ts:24-31`, a guarded method **without** `@RequirePermission` is **denied** — so Step 3 must add `@RequirePermission` to every currently-unguarded method, and Step 4 removes the now-redundant per-method `@UseGuards(PermissionGuard)`.

- [ ] **Step 3: Add `@RequirePermission` to the 13 unguarded methods**

Add the decorator directly under each method's HTTP decorator. Exact placements:

```ts
  @Get("pages/tree")
  @RequirePermission("kb:pages:view")
  async getTree(
```
```ts
  @Get("pages/recent")
  @RequirePermission("kb:pages:view")
  async getRecent(
```
```ts
  @Get("pages/favorites")
  @RequirePermission("kb:pages:view")
  async getFavorites(
```
```ts
  @Get("pages/trash")
  @RequirePermission("kb:pages:view")
  async getTrash(
```
```ts
  @Get("pages/search")
  @RequirePermission("kb:pages:view")
  async search(
```
```ts
  @Post("pages")
  @HttpCode(201)
  @RequirePermission("kb:pages:create")
  async create(
```
```ts
  @Get("pages/:pageId")
  @RequirePermission("kb:pages:view")
  async get(
```
```ts
  @Post("pages/:pageId/favorite")
  @HttpCode(200)
  @RequirePermission("kb:pages:view")
  async addFavorite(
```
```ts
  @Delete("pages/:pageId/favorite")
  @RequirePermission("kb:pages:view")
  async removeFavorite(
```
```ts
  @Post("pages/:pageId/visit")
  @HttpCode(200)
  @RequirePermission("kb:pages:view")
  async recordVisit(
```
```ts
  @Get("pages/:pageId/backlinks")
  @RequirePermission("kb:pages:view")
  async backlinks(
```
```ts
  @Get("pages/:pageId/versions")
  @RequirePermission("kb:pages:view")
  async listVersions(
```
```ts
  @Get("pages/:pageId/versions/:versionNumber")
  @RequirePermission("kb:pages:view")
  async getVersion(
```

Note on `favorite`/`visit`: these are personal actions available to anyone who can view the page; `kb:pages:view` is the correct gate (they are not `kb:pages:update`).

- [ ] **Step 4: Remove the now-redundant per-method `@UseGuards(PermissionGuard)`**

The class-level guard covers all methods. Delete the standalone `@UseGuards(PermissionGuard)` line from each of the 21 already-guarded methods (`update`, `move`, `duplicate`, `remove`, `restore`, `emptyTrash`, `hardDelete`, `restoreVersion`, `lock`, `setVisibility`, `publish`, `archive`, `unarchive`, `verify`, `markStale`). Keep each method's existing `@RequirePermission(...)` untouched. Example — before:

```ts
  @Patch("pages/:pageId")
  @UseGuards(PermissionGuard)
  @RequirePermission("kb:pages:update")
  async update(
```

after:

```ts
  @Patch("pages/:pageId")
  @RequirePermission("kb:pages:update")
  async update(
```

- [ ] **Step 5: Typecheck + lint**

Run: `pnpm -C backend exec tsc --noEmit && pnpm -C backend lint`
Expected: clean. (`PermissionGuard` is still imported and used at class level; `UseGuards` still imported.)

- [ ] **Step 6: Extend the e2e regression net**

In `backend/src/modules/kb/kb-pages.controller.e2e-spec.ts`, add the newly-guarded reads to `moduleCheckRoutes` (currently lines 89-95) so both the 404-module-disabled and 403-no-permission `it.each` blocks cover them:

```ts
  const moduleCheckRoutes: ReadonlyArray<[Method, string]> = [
    ["get", "/kb/pages/tree"],
    ["get", "/kb/pages/recent"],
    ["get", "/kb/pages/favorites"],
    ["get", "/kb/pages/search"],
    ["get", "/kb/pages/1"],
    ["get", "/kb/pages/1/backlinks"],
    ["get", "/kb/pages/1/versions"],
    ["post", "/kb/pages"],
    ["patch", "/kb/pages/1"],
    ["delete", "/kb/pages/1"],
    ["patch", "/kb/pages/1/lock"],
  ];
```

- [ ] **Step 7: Run the e2e spec (raised heap, single worker — harness OOMs at default)**

Run:
```bash
node --max-old-space-size=8192 ./node_modules/jest/bin/jest.js \
  --config ./jest-e2e.json --runInBand --testPathPattern=kb-pages.controller
```
(run from `backend/`.) Expected: PASS — every `moduleCheckRoutes` entry returns 403 without permission and 404 when `enabledModules: []`; the `kb:pages:view`/`kb:pages:create` happy-path cases still pass.
If the sandbox still OOMs, record that and rely on build+lint+typecheck locally; run this spec in CI where heap is sufficient. Do not mark the task done on an OOM — mark it "verified in CI".

- [ ] **Step 8: Commit**

```bash
git add backend/src/modules/kb/kb-pages.controller.ts backend/src/modules/kb/kb-pages.controller.e2e-spec.ts
git commit -m "fix(kb)!: gate 13 unguarded KbPages endpoints with @RequireModule(kb) + @RequirePermission

Class is now fail-closed (PermissionGuard at class level); every route carries an explicit kb:pages:* permission. Closes RBAC bypass where any authenticated user could create/read/search/list-versions KB pages regardless of role.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Guard the unguarded page-templates and record-links reads

**Files:**
- Modify: `backend/src/modules/kb/kb-page-templates.controller.ts`
- Modify: `backend/src/modules/kb/kb-page-record-links.controller.ts`

- [ ] **Step 1: page-templates — import `RequireModule`**

After line 14 in `kb-page-templates.controller.ts`, add:

```ts
import { RequireModule } from "../../common/rbac/require-module.decorator";
```

- [ ] **Step 2: page-templates — class fail-closed + gate the list read**

Replace lines 24-25:

```ts
@Controller("kb")
@UseGuards(JwtAuthGuard)
```

with:

```ts
@Controller("kb")
@RequireModule("kb")
@UseGuards(JwtAuthGuard, PermissionGuard)
```

Add `@RequirePermission` to `list` (currently unguarded, L29-30):

```ts
  @Get("page-templates")
  @RequirePermission("kb:pages:view")
  async list(@CurrentUser() u: CurrentUserContext): Promise<unknown> {
```

Remove the now-redundant per-method `@UseGuards(PermissionGuard)` from `create` (L35) and `remove` (L45), keeping their `@RequirePermission("kb:templates:manage")`.

- [ ] **Step 3: record-links — import `RequireModule`**

After line 15 in `kb-page-record-links.controller.ts`, add:

```ts
import { RequireModule } from "../../common/rbac/require-module.decorator";
```

- [ ] **Step 4: record-links — class fail-closed + gate the two reads**

Replace lines 27-28:

```ts
@Controller("kb")
@UseGuards(JwtAuthGuard)
```

with:

```ts
@Controller("kb")
@RequireModule("kb")
@UseGuards(JwtAuthGuard, PermissionGuard)
```

Gate `list` (L32-33) and `listByRecord` (L62-63):

```ts
  @Get("pages/:pageId/record-links")
  @RequirePermission("kb:pages:view")
  list(
```
```ts
  @Get("record-links/by-record")
  @RequirePermission("kb:pages:view")
  listByRecord(
```

Remove the redundant per-method `@UseGuards(PermissionGuard)` from `add` (L41) and `remove` (L53), keeping their `@RequirePermission("kb:pages:update")`.

- [ ] **Step 5: Typecheck + lint**

Run: `pnpm -C backend exec tsc --noEmit && pnpm -C backend lint`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/kb/kb-page-templates.controller.ts backend/src/modules/kb/kb-page-record-links.controller.ts
git commit -m "fix(kb): gate page-templates + record-links reads with @RequireModule(kb) + kb:pages:view

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Validate cross-tenant `parentPageId` on import (BOLA)

**Files:**
- Modify: `backend/src/modules/kb/kb-import-export.service.ts` (imports L1-2; `importPages` L90-120)
- Create: `backend/src/modules/kb/kb-import-export.service.spec.ts`

- [ ] **Step 1: Add the failing unit test**

Create `backend/src/modules/kb/kb-import-export.service.spec.ts`:

```ts
import { BadRequestException } from "@nestjs/common";
import { KbImportExportService } from "./kb-import-export.service";
import type { CurrentUserContext } from "../../common/auth/backend-claims";

function makeUser(): CurrentUserContext {
  return {
    userId: "user-1",
    orgId: "org-A",
    role: "member",
    isOrgOwner: false,
    isPlatformAdmin: false,
    permissions: ["kb:pages:import"],
    enabledModules: ["kb"],
  } as CurrentUserContext;
}

describe("KbImportExportService.importPages parent validation", () => {
  it("rejects a parentPageId that does not belong to the caller's org", async () => {
    const select = jest.fn().mockReturnValue({
      from: () => ({ where: async () => [] }), // no rows -> parent 999 not in org
    });
    const planLimits = { assertWithinLimit: jest.fn().mockResolvedValue(undefined) };
    const db = { select } as unknown as ConstructorParameters<typeof KbImportExportService>[0];
    const service = new KbImportExportService(
      db,
      { log: jest.fn() } as never,
      planLimits as never,
    );

    await expect(
      service.importPages(makeUser(), {
        sourceType: "markdown",
        items: [{ title: "X", contentText: "y", parentPageId: 999 }],
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(planLimits.assertWithinLimit).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run it — expect failure (no validation yet)**

Run: `pnpm -C backend exec jest kb-import-export.service.spec --runInBand`
Expected: FAIL — currently `importPages` never throws `BadRequestException` for an unknown parent; it inserts it.

- [ ] **Step 3: Add `inArray` + `BadRequestException` imports**

In `kb-import-export.service.ts` line 1, add `BadRequestException`:

```ts
import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
```

Line 2 — add `inArray`:

```ts
import { and, desc, eq, inArray, isNull, max } from "drizzle-orm";
```

- [ ] **Step 4: Validate parents belong to the org before building sort offsets**

In `importPages`, immediately after line 103 (the `const parentIds = [...]` block) and before the `sortOffsets` loop (line 105), insert:

```ts
    const nonNullParentIds = parentIds.filter((id): id is number => id !== null);
    if (nonNullParentIds.length > 0) {
      const ownedParents = await this.db
        .select({ id: kbPages.id })
        .from(kbPages)
        .where(
          and(
            eq(kbPages.orgId, orgId),
            inArray(kbPages.id, nonNullParentIds),
            isNull(kbPages.deletedAt),
          ),
        );
      const ownedParentIds = new Set(ownedParents.map((r) => r.id));
      const foreignParentIds = nonNullParentIds.filter((id) => !ownedParentIds.has(id));
      if (foreignParentIds.length > 0) {
        throw new BadRequestException(
          `Unknown parent page(s): ${foreignParentIds.join(", ")}`,
        );
      }
    }
```

This runs one bounded `IN` query (org-scoped) and rejects the whole import if any `parentPageId` is not an existing, non-deleted page in the caller's org — closing the cross-tenant parent reference. It fails fast before the transaction, so no partial writes.

- [ ] **Step 5: Run the unit test — expect pass**

Run: `pnpm -C backend exec jest kb-import-export.service.spec --runInBand`
Expected: PASS.

- [ ] **Step 6: Typecheck + lint**

Run: `pnpm -C backend exec tsc --noEmit && pnpm -C backend lint`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/kb/kb-import-export.service.ts backend/src/modules/kb/kb-import-export.service.spec.ts
git commit -m "fix(kb): reject cross-tenant parentPageId on page import (BOLA)

Import trusted item.parentPageId verbatim; a foreign-org parent id could be written as a parent reference. Now validated against org-owned, non-deleted pages before insert; whole import 400s on any unknown parent.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Full verification + PAGES.md

**Files:**
- Modify: `PAGES.md` (KB Wiki section)

- [ ] **Step 1: Backend build + lint + typecheck (green gate, CLAUDE.md §26)**

Run: `pnpm -C backend build && pnpm -C backend lint && pnpm -C backend exec tsc --noEmit`
Expected: all pass.

- [ ] **Step 2: KB test suites**

Run:
```bash
node --max-old-space-size=8192 ./node_modules/jest/bin/jest.js --config ./jest-e2e.json --runInBand --testPathPattern=kb-pages.controller
pnpm -C backend exec jest kb-import-export.service.spec --runInBand
```
Expected: PASS. If the e2e OOMs in the sandbox, note "verified in CI" and confirm the unit test + build/lint/types locally.

- [ ] **Step 3: Update PAGES.md**

Under the "Knowledge Base Wiki" section, append a dated line:

```md
> 2026-07-25 — security hotfix: fixed resolveCanManage arg-swap (locked-page/visibility enforcement); gated 13 KbPages + page-templates(list) + record-links(list/by-record) endpoints with @RequireModule("kb") + @RequirePermission (fail-closed class guard); import now rejects cross-tenant parentPageId (BOLA). e2e moduleCheckRoutes extended.
```

- [ ] **Step 4: Commit**

```bash
git add PAGES.md
git commit -m "docs(kb): record KB security P0 hotfix in PAGES.md

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage vs the four confirmed P0s:**
1. Swapped `resolveUserPermissions` args → Task 1. ✓
2. 13 unguarded KbPages endpoints → Task 2 (fail-closed class guard + explicit permissions + e2e). ✓
3. Unguarded page-templates/record-links reads → Task 3. ✓
4. Cross-tenant import `parentPageId` → Task 4 (test-first). ✓

**Deliberately excluded (documented, deferred):** `kb:spaces:manage` org-wide-vs-space-scoped hardening (Core-APIs plan); `KbAccessService.isAdmin()` reading stale `user.permissions` instead of DB-resolved perms (Core-APIs plan, §21); N+1/caching/pagination (Core-APIs plan); `fts` column + HNSW (Schema plan). None are cross-tenant holes today.

**Type/name consistency:** `RequireModule` import path `../../common/rbac/require-module.decorator` matches `accounting-gl/periods.controller.ts`. Permission keys all exist in the catalog. `inArray`/`BadRequestException` imports added where first used. `resolveUserPermissions(orgId, userId)` order matches `access.service.ts:136`.

**Placeholder scan:** none — every code step shows exact before/after text and exact decorator placement.

**Risk / blast radius:** Additive authorization only. The one behavioral change users could notice: clients calling KB read endpoints without `kb:pages:view` (or with the kb module disabled) now correctly receive 403/404 instead of data — which is the intended fix. Frontend must gate these queries with `enabled: useCan("kb:pages:view")` (covered in the Data-layer plan); until then, unpermissioned roles will see 403s instead of silent success — acceptable and correct, but sequence the Data-layer `enabled`-gating soon after to avoid console noise.
