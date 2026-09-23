# S08 Page Document & S09 History — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the authorization seam into the page-document get path, prove the content/metadata contract and history append semantics with paired tests, fix the ConfirmDialog violation in the history surface, and add static proof that no page body reaches Web Storage.

**Architecture:** The backend `get()` method is extended to resolve per-page edit authorization via `resolvePageAccess` and return `canEdit: boolean` alongside the page. Helper methods are extracted from the service to keep it under its 566-line ceiling. The frontend replaces the global-permission `useCan` check with the server-resolved `page.canEdit`. Five backend spec files and two frontend spec files provide the required paired behavioral coverage.

**Tech Stack:** NestJS 11 · TypeScript 5.6 strict · Drizzle 0.45 · Jest · Next.js 16 · TanStack Query 5 · React 19 · shadcn/ui

**Spec:** `docs/specs/knowledge-base/02-page-component-spec.md` §12 (Page Document) and §13 (History)

## Global Constraints

- `kb-pages.service.ts` is 566 lines and must not grow — new logic goes in `kb-page-edit.util.ts` or a new file
- No `any`, no `as X`, no `@ts-ignore` — hard zero enforced by gate
- `db.transaction` mock must invoke its callback (BE-136)
- Never repair a failing spec by making an auth mock unconditionally resolve — derive from harness flags
- `expectedContentRevision` is required when `content` is written; metadata writes never touch `content` or `content_revision`
- `restoreVersion` appends (never rewrites); reindex is via `OutboxWriter.emit` inside the transaction (outbox pattern, BE-83); the actual index update runs in the outbox consumer outside the request
- No file over 500 lines; files already over 300 are ratcheted (gate: check:file-sizes)
- Do not edit `kb-pages.controller.ts`, `kb-wiki.module.ts`, or `lib/query-keys/knowledge-and-surveys.ts`
- Do not hand-edit `frontend/contracts/openapi.json`
- `page-types.ts` addition (`canEdit?: boolean` on `KbPageDetail`) is required but not in the explicit ownership list — flag it in the report

---

## Task 1: Extract private helpers from `kb-pages.service.ts` into `kb-page-edit.util.ts`

**Why first:** The service is at its line ceiling. Extracting helpers makes room for the `canEdit` addition without violating the gate.

**Files:**
- Modify: `backend/src/modules/kb/wiki/kb-page-edit.util.ts`
- Modify: `backend/src/modules/kb/wiki/kb-pages.service.ts`

**Interfaces:**
- Produces: `buildPageAncestors(db: Db, orgId: string, parentId: number | null): Promise<Array<{ id: number; title: string }>>` (exported from util)
- Produces: `describeLatestPageEdit(tx: KbTransaction, orgId: string, pageId: number): Promise<KbPageConflictDetails>` (exported from util)

- [ ] **Step 1: Add imports and exports to `kb-page-edit.util.ts`**

Append after the last `export` in `backend/src/modules/kb/wiki/kb-page-edit.util.ts`:

```typescript
import { eq, and, sql } from "drizzle-orm";
import { kbPages, kbPageVersions, users } from "../../../db/schema";
import type { Db } from "../../../db/drizzle.module";

export async function buildPageAncestors(
  db: Db,
  orgId: string,
  parentId: number | null,
): Promise<Array<{ id: number; title: string }>> {
  if (parentId === null) return [];
  const rows = await db.execute(sql`
    WITH RECURSIVE ancestors AS (
      SELECT id, title, parent_page_id, 1 AS depth
      FROM kb_pages
      WHERE id = ${parentId} AND org_id = ${orgId}
      UNION ALL
      SELECT p.id, p.title, p.parent_page_id, a.depth + 1
      FROM kb_pages p
      INNER JOIN ancestors a ON p.id = a.parent_page_id AND a.depth < 100
      WHERE p.org_id = ${orgId}
    )
    SELECT id, title FROM ancestors ORDER BY depth DESC
  `);
  return rows.map((row) => ({
    id: Number(row.id),
    title: String(row.title ?? ""),
  }));
}

export async function describeLatestPageEdit(
  tx: KbTransaction,
  orgId: string,
  pageId: number,
): Promise<KbPageConflictDetails> {
  const [latest] = await tx
    .select({
      contentRevision: kbPages.contentRevision,
      updatedAt: kbPages.updatedAt,
      editorName: users.name,
    })
    .from(kbPages)
    .leftJoin(users, eq(kbPages.lastEditedById, users.id))
    .where(and(eq(kbPages.id, pageId), eq(kbPages.orgId, orgId)))
    .limit(1);
  if (!latest) return NO_KB_PAGE_CONFLICT_DETAILS;
  return {
    currentContentRevision: latest.contentRevision,
    lastEditedByName: latest.editorName,
    lastEditedAt: latest.updatedAt.toISOString(),
  };
}
```

Note: `kbPageVersions` import may already exist — remove the duplicate if so.

- [ ] **Step 2: Update `kb-pages.service.ts` to use the extracted helpers**

In `kb-pages.service.ts`:
1. Add import: `import { buildPageAncestors, describeLatestPageEdit, ... } from "./kb-page-edit.util";`
2. Delete the `buildAncestors` private method (~22 lines)
3. Delete the `describeLatestEdit` private method (~22 lines)
4. Replace `this.buildAncestors(...)` call with `buildPageAncestors(this.db, ...)`
5. Replace `this.describeLatestEdit(...)` call with `describeLatestPageEdit(...)`

Net: file shrinks by ~40 lines (removes ~44 lines, adds ~4 lines for imports and updated call sites).

- [ ] **Step 3: Run typecheck**

```
cd D:/projects/personal/Streamlineos/backend && pnpm typecheck
```

Expected: 0 errors. If `pnpm typecheck` reports errors in notification files, note them as pre-existing (they are in `src/modules/notifications/` and belong to another lane).

---

## Task 2: Add `canEdit` to the `get()` response and update schemas

**Files:**
- Modify: `backend/src/modules/kb/wiki/kb-pages.service.ts`
- Modify: `backend/src/modules/kb/wiki/dto/kb-wiki-response.schemas.ts` (additive)
- Modify: `frontend/hooks/api/kb/kb-pages-schema.ts` (additive)
- Modify: `frontend/hooks/api/kb/page-types.ts` (additive — FLAG in report: not in ownership list)

**Interfaces:**
- Consumes: `resolvePageAccess(user, pageId, "edit")` from `KnowledgeAuthorizationService`
- Produces: `get()` returns `PageRow & { ancestors; isFavorite; canEdit: boolean }`
- Produces: `kbPageWithAncestorsSchema` includes `canEdit: z.boolean()`
- Produces: `kbPageWithAncestorsContract` includes `canEdit: z.boolean().optional()`
- Produces: `KbPageDetail` includes `canEdit?: boolean`

- [ ] **Step 1: Write the failing test (from Task 3, but the contract change enables it)**

Skip for now — add the code change first. Tests are in Task 3.

- [ ] **Step 2: Update `get()` in `kb-pages.service.ts`**

Change the `get` method signature and body:

```typescript
async get(
  user: CurrentUserContext,
  pageId: number,
  canManage: boolean,
): Promise<
  PageRow & {
    ancestors: Pick<PageRow, "id" | "title">[];
    isFavorite: boolean;
    canEdit: boolean;
  }
> {
  const orgId = user.orgId;
  const predicate = await this.auth.visiblePagePredicate(user, "view");
  const page = await this.db.query.kbPages.findFirst({
    where: and(
      eq(kbPages.id, pageId),
      eq(kbPages.orgId, orgId),
      isNull(kbPages.deletedAt),
      predicate,
    ),
    columns: { fts: false },
  });
  if (!page) throw new NotFoundException("Page not found");

  const editDecision = await this.auth.resolvePageAccess(user, pageId, "edit");
  const canEdit = editDecision.outcome === "allowed" && (!page.isLocked || canManage);

  const ancestors = await buildPageAncestors(this.db, orgId, page.parentPageId);

  const fav = await this.db.query.kbPageFavorites.findFirst({
    where: and(
      eq(kbPageFavorites.pageId, pageId),
      eq(kbPageFavorites.userId, user.userId),
      eq(kbPageFavorites.orgId, orgId),
    ),
    columns: { id: true },
  });

  return {
    ...page,
    publicToken: this.withoutUnsharedToken(user, page, canManage).publicToken,
    ancestors,
    isFavorite: !!fav,
    canEdit,
  };
}
```

- [ ] **Step 3: Update `dto/kb-wiki-response.schemas.ts` (additive)**

Change:
```typescript
export const kbPageWithAncestorsSchema = kbPageSchema.extend({
  ancestors: z.array(z.object({ id: z.number().int(), title: z.string() })),
  isFavorite: z.boolean(),
});
```
To:
```typescript
export const kbPageWithAncestorsSchema = kbPageSchema.extend({
  ancestors: z.array(z.object({ id: z.number().int(), title: z.string() })),
  isFavorite: z.boolean(),
  canEdit: z.boolean(),
});
```

- [ ] **Step 4: Update `hooks/api/kb/kb-pages-schema.ts` (additive)**

Change:
```typescript
export const kbPageWithAncestorsContract = kbPageBaseContract.extend({
  ancestors: z.array(z.object({ id: z.number().int(), title: z.string() })),
  isFavorite: z.boolean(),
});
```
To:
```typescript
export const kbPageWithAncestorsContract = kbPageBaseContract.extend({
  ancestors: z.array(z.object({ id: z.number().int(), title: z.string() })),
  isFavorite: z.boolean(),
  canEdit: z.boolean().optional(),
});
```

- [ ] **Step 5: Update `hooks/api/kb/page-types.ts` (additive — FLAG)**

Change:
```typescript
export type KbPageDetail = KbPage & {
  ancestors: Array<{ id: number; title: string }>;
  isFavorite: boolean;
};
```
To:
```typescript
export type KbPageDetail = KbPage & {
  ancestors: Array<{ id: number; title: string }>;
  isFavorite: boolean;
  canEdit?: boolean;
};
```

- [ ] **Step 6: Run typechecks**

```
cd D:/projects/personal/Streamlineos/backend && pnpm typecheck
cd D:/projects/personal/Streamlineos/frontend && pnpm type-check
```

Expected: 0 new errors.

---

## Task 3: Backend spec — page document service (kb-page-document.service.spec.ts)

**Files:**
- Create: `backend/src/modules/kb/wiki/kb-page-document.service.spec.ts`

**Interfaces:**
- Consumes: `KbPagesService` from `./kb-pages.service`
- Consumes: `KnowledgeAuthorizationService` mock
- Consumes: `OutboxWriter` mock

**Tests covered:**
1. Metadata-only write does not touch `content` or bump `content_revision` (paired: content write does both)
2. Content write with stale `expectedContentRevision` → 409 `STALE_REVISION` (paired: current revision succeeds)
3. Caller with `view` but not `edit` cannot write (paired: `edit` can)
4. Page in another org is 404, never 403

- [ ] **Step 1: Write the full spec file**

Create `backend/src/modules/kb/wiki/kb-page-document.service.spec.ts`:

```typescript
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { KbPagesService } from "./kb-pages.service";
import type { Db } from "../../../db/drizzle.module";
import type { CurrentUserContext } from "../../../common/auth/backend-claims";

jest.mock("../../../common/outbox/outbox-writer", () => ({
  OutboxWriter: { emit: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock("./kb-page-edit.util", () => ({
  staleRevisionConflict: jest.requireActual("./kb-page-edit.util").staleRevisionConflict,
  snapshotIfNeeded: jest.fn().mockResolvedValue(undefined),
  resyncPageLinks: jest.fn().mockResolvedValue(undefined),
  NO_KB_PAGE_CONFLICT_DETAILS: jest.requireActual("./kb-page-edit.util").NO_KB_PAGE_CONFLICT_DETAILS,
  buildPageAncestors: jest.fn().mockResolvedValue([]),
  describeLatestPageEdit: jest.fn().mockResolvedValue({
    currentContentRevision: 5,
    lastEditedByName: null,
    lastEditedAt: null,
  }),
}));

const BASE_PAGE = {
  id: 1,
  orgId: "org-1",
  title: "My page",
  content: { type: "doc", content: [] },
  contentText: "hello",
  contentRevision: 5,
  aclRevision: 1,
  isLocked: false,
  trustState: "unverified",
  status: "draft",
  visibility: "org",
  spaceId: null,
  parentPageId: null,
  ownerUserId: null,
  createdById: "u-1",
  createdByMembershipId: 3,
  lastEditedById: "u-1",
  lastEditedByMembershipId: 3,
  updatedAt: new Date(),
  createdAt: new Date(),
  deletedAt: null,
  publicToken: null,
  publicSlug: null,
  icon: null,
  coverImage: null,
  sortOrder: 100,
  projectId: null,
  sourceArticleId: null,
  ownerMembershipId: null,
  verifiedByMembershipId: null,
  deletedByMembershipId: null,
  deletedById: null,
  ownerMembershipId: null,
  verifiedById: null,
  verifiedUntil: null,
  nextReviewAt: null,
  contentType: "note",
};

function makeUser(over: Partial<CurrentUserContext> = {}): CurrentUserContext {
  return {
    userId: "u-1",
    orgId: "org-1",
    role: "member",
    isOrgOwner: false,
    principal: { kind: "human-session", membershipId: 3, isOrgOwner: false },
    ...over,
  } as unknown as CurrentUserContext;
}

function makeHarness(opts: {
  canEdit?: boolean;
  currentPage?: Partial<typeof BASE_PAGE> | null;
  updatedPage?: Partial<typeof BASE_PAGE> | null;
} = {}) {
  const canEdit = opts.canEdit !== false;
  const currentPage = opts.currentPage === null
    ? undefined
    : { ...BASE_PAGE, ...(opts.currentPage ?? {}) };
  const updatedPage = opts.updatedPage === null
    ? undefined
    : { ...BASE_PAGE, ...(opts.updatedPage ?? {}) };

  const auth = {
    assertPageAccess: canEdit
      ? jest.fn().mockResolvedValue({ orgId: "org-1", pageId: 1, action: "edit", via: "admin" })
      : jest.fn().mockRejectedValue(new ForbiddenException("Not allowed")),
    resolvePageAccess: jest.fn().mockResolvedValue({
      outcome: canEdit ? "allowed" : "denied",
    }),
    visiblePagePredicate: jest.fn().mockResolvedValue(sql`true`),
  };

  const capturedSetValues: Record<string, unknown>[] = [];
  const returning = jest.fn().mockResolvedValue(updatedPage ? [updatedPage] : []);
  const whereClause = jest.fn().mockReturnValue({ returning });
  const set = jest.fn().mockImplementation((vals: Record<string, unknown>) => {
    capturedSetValues.push(vals);
    return { where: whereClause };
  });
  const updateBuilder = jest.fn().mockReturnValue({ set });

  const tx = {
    update: updateBuilder,
    insert: jest.fn().mockReturnValue({ values: jest.fn().mockResolvedValue([{}]) }),
    delete: jest.fn().mockReturnValue({ where: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([]) }) }),
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        leftJoin: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([]),
        }),
      }),
    }),
    query: {
      kbPageVersions: { findFirst: jest.fn().mockResolvedValue(null) },
    },
  };

  const db = {
    query: {
      kbPages: { findFirst: jest.fn().mockResolvedValue(currentPage) },
      kbPageFavorites: { findFirst: jest.fn().mockResolvedValue(null) },
      kbSpaces: { findFirst: jest.fn().mockResolvedValue({ id: 1 }) },
      organizationMembers: { findFirst: jest.fn().mockResolvedValue(null) },
    },
    update: updateBuilder,
    transaction: jest.fn().mockImplementation(async (cb: (tx: typeof tx) => Promise<unknown>) => cb(tx)),
    select: tx.select,
  } as unknown as Db;

  const notifications = { create: jest.fn().mockResolvedValue(undefined) } as never;
  const planLimits = { assertWithinLimit: jest.fn().mockResolvedValue(undefined) } as never;

  const service = new KbPagesService(db, notifications, planLimits, auth as never);
  return { service, auth, capturedSetValues, db };
}

describe("KbPagesService.update — metadata vs content separation", () => {
  it("a metadata-only write (title change) does not set content or bump content_revision on the page row", async () => {
    const { service, capturedSetValues } = makeHarness({
      updatedPage: { title: "New title" },
    });
    const user = makeUser();

    await service.update(user, 1, { title: "New title" }, false);

    expect(capturedSetValues.length).toBeGreaterThan(0);
    const setCall = capturedSetValues[0];
    expect(setCall).not.toHaveProperty("content");
    expect(setCall).not.toHaveProperty("contentRevision");
  });

  it("a content write updates content and increments content_revision (control: metadata path is skipped)", async () => {
    const { service, capturedSetValues } = makeHarness({
      updatedPage: { contentRevision: 6 },
    });
    const user = makeUser();

    await service.update(user, 1, {
      content: { type: "doc", content: [{ type: "paragraph" }] },
      contentText: "updated text",
      expectedContentRevision: 5,
    }, false);

    const setCall = capturedSetValues[0];
    expect(setCall).toHaveProperty("contentRevision");
    expect(setCall).toHaveProperty("content");
  });
});

describe("KbPagesService.update — optimistic-concurrency guard", () => {
  it("a content write with the wrong expectedContentRevision returns 409 STALE_REVISION", async () => {
    const { service } = makeHarness({ updatedPage: null });
    const user = makeUser();

    await expect(
      service.update(user, 1, {
        content: { type: "doc" },
        contentText: "x",
        expectedContentRevision: 4,
      }, false),
    ).rejects.toMatchObject({ status: 409, response: { code: "STALE_REVISION" } });
  });

  it("a content write with the correct expectedContentRevision succeeds (control)", async () => {
    const { service } = makeHarness({ updatedPage: { contentRevision: 6 } });
    const user = makeUser();

    const result = await service.update(user, 1, {
      content: { type: "doc" },
      contentText: "updated",
      expectedContentRevision: 5,
    }, false);

    expect(result).toBeDefined();
  });
});

describe("KbPagesService.update — authorization", () => {
  it("a caller that the authorization seam denies edit on cannot write the page", async () => {
    const { service } = makeHarness({ canEdit: false });
    const user = makeUser();

    await expect(
      service.update(user, 1, { title: "Attempt" }, false),
    ).rejects.toThrow(ForbiddenException);
  });

  it("a caller that the authorization seam allows edit on can write the page (control)", async () => {
    const { service } = makeHarness({ canEdit: true });
    const user = makeUser();

    await expect(
      service.update(user, 1, { title: "Success" }, false),
    ).resolves.toBeDefined();
  });
});

describe("KbPagesService.get — cross-tenant isolation", () => {
  it("a page that belongs to a different org is a 404, never a 403", async () => {
    const { service } = makeHarness({ currentPage: null });
    const attacker = makeUser({ orgId: "org-attacker" });

    await expect(service.get(attacker, 1, false)).rejects.toThrow(NotFoundException);
    await expect(service.get(attacker, 1, false)).rejects.not.toThrow(ForbiddenException);
  });

  it("a page that belongs to the correct org is returned (control)", async () => {
    const { service } = makeHarness({ currentPage: {}, updatedPage: {} });
    const owner = makeUser({ orgId: "org-1" });

    await expect(service.get(owner, 1, false)).resolves.toHaveProperty("id", 1);
  });
});
```

- [ ] **Step 2: Run the failing tests**

```
cd D:/projects/personal/Streamlineos/backend && npx jest src/modules/kb/wiki/kb-page-document.service.spec.ts --no-coverage
```

Expected: some fail (confirm they fail for the right reason — not `TypeError: service.update is not a function`).

- [ ] **Step 3: Fix any mock setup issues and re-run until green**

Common issues:
- `db.transaction` not invoking callback — fix: `jest.fn().mockImplementation(async (cb) => cb(tx))`
- `capturedSetValues` still empty — ensure the `set` mock captures before chaining `where`

- [ ] **Step 4: Run the wiki enclosing suite**

```
cd D:/projects/personal/Streamlineos/backend && npx jest src/modules/kb/wiki/ --no-coverage
```

Any failures in files you do not own: name them and state they are pre-existing.

---

## Task 4: Backend spec — version service (kb-page-version.service.spec.ts)

**Files:**
- Create: `backend/src/modules/kb/wiki/kb-page-version.service.spec.ts`

**Tests covered:**
1. Restore appends a new version row — version count strictly increases
2. Two sequential restores produce two new versions (never rewrites)
3. Reindex event is emitted through `OutboxWriter.emit` (deferred, not inline)

- [ ] **Step 1: Write the spec file**

Create `backend/src/modules/kb/wiki/kb-page-version.service.spec.ts`:

```typescript
import { NotFoundException } from "@nestjs/common";
import { KbPageVersionsService } from "./kb-page-versions.service";
import { OutboxWriter } from "../../../common/outbox/outbox-writer";
import type { Db } from "../../../db/drizzle.module";
import type { CurrentUserContext } from "../../../common/auth/backend-claims";
import { kbPageVersions } from "../../../db/schema";

jest.mock("../../../common/outbox/outbox-writer", () => ({
  OutboxWriter: { emit: jest.fn().mockResolvedValue(undefined) },
}));

const CURRENT_PAGE = {
  id: 1,
  orgId: "org-1",
  title: "Title",
  content: { type: "doc", content: [] },
  contentText: "hello world",
  contentRevision: 5,
  aclRevision: 1,
  isLocked: false,
  status: "draft",
  visibility: "org",
  trustState: "unverified",
  spaceId: null,
  parentPageId: null,
  sortOrder: 100,
  projectId: null,
  publicToken: null,
  publicSlug: null,
  icon: null,
  coverImage: null,
  createdById: "u-1",
  createdByMembershipId: 3,
  lastEditedById: "u-1",
  lastEditedByMembershipId: 3,
  ownerUserId: null,
  ownerMembershipId: null,
  verifiedByMembershipId: null,
  deletedByMembershipId: null,
  deletedById: null,
  verifiedById: null,
  verifiedUntil: null,
  nextReviewAt: null,
  sourceArticleId: null,
  contentType: "note",
  updatedAt: new Date(),
  createdAt: new Date(),
  deletedAt: null,
};

const TARGET_VERSION = {
  id: 10,
  orgId: "org-1",
  pageId: 1,
  versionNumber: 3,
  title: "Title v3",
  content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "restored" }] }] },
  contentText: "restored",
  changeSummary: null,
  authorId: "u-1",
  authorMembershipId: 3,
  createdAt: new Date(),
};

function makeUser(): CurrentUserContext {
  return {
    userId: "u-1",
    orgId: "org-1",
    role: "member",
    isOrgOwner: false,
    principal: { kind: "human-session", membershipId: 3, isOrgOwner: false },
  } as unknown as CurrentUserContext;
}

function makeVersionHarness() {
  const auth = {
    assertPageAccess: jest.fn().mockResolvedValue({ orgId: "org-1", pageId: 1, action: "edit", via: "admin" }),
  };

  // Track every table that receives an insert
  const insertedInto: unknown[] = [];
  const returning = jest.fn().mockResolvedValue([{ ...CURRENT_PAGE, contentRevision: 6 }]);
  const whereUpdate = jest.fn().mockReturnValue({ returning });

  const tx = {
    update: jest.fn().mockReturnValue({ set: jest.fn().mockReturnValue({ where: whereUpdate }) }),
    insert: jest.fn().mockImplementation((table: unknown) => {
      insertedInto.push(table);
      return { values: jest.fn().mockResolvedValue([{}]) };
    }),
    delete: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([]) }),
    }),
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue([]) }),
        leftJoin: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue([]) }),
        }),
      }),
    }),
    query: {
      kbPageVersions: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    },
  };

  const db = {
    query: {
      kbPages: { findFirst: jest.fn().mockResolvedValue(CURRENT_PAGE) },
      kbPageVersions: { findFirst: jest.fn().mockResolvedValue(TARGET_VERSION) },
    },
    transaction: jest.fn().mockImplementation(async (cb: (tx: typeof tx) => Promise<unknown>) => cb(tx)),
  } as unknown as Db;

  const service = new KbPageVersionsService(db, auth as never);
  return { service, insertedInto, tx, db };
}

describe("KbPageVersionsService.restoreVersion — append semantics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("inserts at least one new version row on restore (version count strictly increases)", async () => {
    const { service, insertedInto } = makeVersionHarness();

    await service.restoreVersion(makeUser(), 1, 3, false);

    const versionInserts = insertedInto.filter((t) => t === kbPageVersions);
    expect(versionInserts.length).toBeGreaterThanOrEqual(1);
  });

  it("does not delete any existing version rows during restore", async () => {
    const { service, tx } = makeVersionHarness();

    await service.restoreVersion(makeUser(), 1, 3, false);

    const deleteCalls = (tx.delete as jest.Mock).mock.calls;
    const deletedVersions = deleteCalls.some((args: unknown[]) => args[0] === kbPageVersions);
    expect(deletedVersions).toBe(false);
  });

  it("two sequential restores each produce at least one new version row (never rewrites)", async () => {
    const { service, insertedInto, db } = makeVersionHarness();
    const user = makeUser();

    await service.restoreVersion(user, 1, 3, false);
    const countAfterFirst = insertedInto.filter((t) => t === kbPageVersions).length;

    await service.restoreVersion(user, 1, 3, false);
    const countAfterSecond = insertedInto.filter((t) => t === kbPageVersions).length;

    expect(countAfterSecond).toBeGreaterThan(countAfterFirst);
  });
});

describe("KbPageVersionsService.restoreVersion — reindex is deferred via outbox", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("emits the reindex event through OutboxWriter (outbox pattern = deferred, never inline inside the DB transaction logic)", async () => {
    const { service } = makeVersionHarness();

    await service.restoreVersion(makeUser(), 1, 3, false);

    expect(OutboxWriter.emit).toHaveBeenCalledTimes(1);
    expect(OutboxWriter.emit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ eventType: "kb.content.index" }),
    );
  });
});
```

- [ ] **Step 2: Run the failing tests**

```
cd D:/projects/personal/Streamlineos/backend && npx jest src/modules/kb/wiki/kb-page-version.service.spec.ts --no-coverage
```

Expected: tests pass. If `kbPageVersions` import causes issues in the test environment, use `import { kbPageVersions } from "../../../db/schema"` and ensure the schema does not require a live database (it should just be an object reference).

- [ ] **Step 3: Run the wiki enclosing suite again**

```
cd D:/projects/personal/Streamlineos/backend && npx jest src/modules/kb/wiki/ --no-coverage
```

---

## Task 5: Fix `page-document.tsx` — use server-resolved `canEdit`

**Why:** `isEditable = !page.isLocked || canManage` uses a global `useCan` check, not the per-page auth seam. After Task 2, the server returns `canEdit` through `resolvePageAccess`.

**Files:**
- Modify: `frontend/features/wiki/components/page-document.tsx`

**Interfaces:**
- Consumes: `page.canEdit?: boolean` (from `KbPageDetail`)
- `page.canEdit !== false` — backward compat when field is absent (old API response)

- [ ] **Step 1: Update `isEditable` derivation in `page-document.tsx`**

Locate the line:
```typescript
const isEditable = !page.isLocked || canManage;
```

Replace with:
```typescript
const isEditable = page.canEdit !== false && (!page.isLocked || canManage);
```

This keeps backward compat (`canEdit` absent → old behavior) while using the server-resolved value when present. When the backend returns `canEdit: false`, the page is read-only regardless of the global `canManage` flag.

- [ ] **Step 2: Run type-check**

```
cd D:/projects/personal/Streamlineos/frontend && pnpm type-check
```

---

## Task 6: Fix `page-history-page.tsx` — use `ConfirmDialog` (FE-83)

**Why:** The restore confirmation uses raw `AlertDialog` + `AlertDialogAction`. Per FE-83, every destructive or lifecycle action uses `ConfirmDialog destructive`.

**Files:**
- Modify: `frontend/features/wiki/components/page-history-page.tsx`

- [ ] **Step 1: Replace the restore `AlertDialog` with `ConfirmDialog`**

Add import:
```typescript
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
```

Remove imports (if no longer used):
```typescript
// Remove these if no longer referenced:
AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
```

Replace the `AlertDialog` block (lines ~303–323 in the existing file) with:
```tsx
<ConfirmDialog
  open={restoreAlertOpen}
  onOpenChange={handleRestoreAlertOpenChange}
  title={`Restore version ${selectedVersionNumber}?`}
  description="The current content will be saved as a new version before restoring."
  confirmLabel="Restore"
  isPending={restoreVersion.isPending}
  onConfirm={handleConfirmRestore}
/>
```

- [ ] **Step 2: Run type-check and lint**

```
cd D:/projects/personal/Streamlineos/frontend && pnpm type-check && pnpm lint
```

---

## Task 7: Frontend test — no page body in Web Storage

**Why spec says remove:** "page body in localStorage" must not survive logout, org-switch, or session revocation (brief S08).

**Finding:** The existing `use-page-autosave.ts` is in-memory only — no `localStorage` writes for page body. The concern is future code. This task adds a static scan test that will fail if any file in `features/wiki/` writes page `content` or `contentText` to `localStorage`/`sessionStorage`.

**Files:**
- Create: `frontend/features/wiki/components/page-document-no-storage.test.ts`

- [ ] **Step 1: Write the spec file**

Create `frontend/features/wiki/components/page-document-no-storage.test.ts`:

```typescript
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Page body must never land in Web Storage.
 *
 * The autosave (use-page-autosave.ts) is in-memory only. This scan guards
 * against future code reintroducing a draft store in localStorage or
 * sessionStorage for `content` or `contentText`.
 *
 * After logout or org-switch the in-memory state is cleared by React unmount;
 * there is no persistence to purge.
 */

function collectTypeScriptFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectTypeScriptFiles(fullPath));
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name) && !entry.name.includes(".test.") && !entry.name.includes(".spec.")) {
      results.push(fullPath);
    }
  }
  return results;
}

const WIKI_DIR = path.resolve(__dirname, "..");
const wikiFiles = collectTypeScriptFiles(WIKI_DIR);

describe("page body must not reach Web Storage", () => {
  it("no wiki source file writes page content or contentText into localStorage", () => {
    const violations: string[] = [];
    const writePattern = /(?:localStorage|sessionStorage)\.setItem\s*\(/;
    const contentPattern = /["'`](?:content|contentText|page_content|kbPageContent)/;
    for (const file of wikiFiles) {
      const src = fs.readFileSync(file, "utf8");
      const lines = src.split("\n");
      lines.forEach((line, idx) => {
        if (writePattern.test(line) && contentPattern.test(line)) {
          violations.push(`${file}:${idx + 1} — ${line.trim()}`);
        }
      });
    }
    if (violations.length > 0) {
      throw new Error(
        `Page body must not be stored in Web Storage. Found:\n${violations.join("\n")}`,
      );
    }
  });

  it("no wiki source file reads page content from localStorage on mount (assert after logout/org-switch: in-memory draft clears on React unmount)", () => {
    const violations: string[] = [];
    const readPattern = /(?:localStorage|sessionStorage)\.getItem\s*\(\s*["'`](?:content|contentText|page_content|kbPageContent)/;
    for (const file of wikiFiles) {
      const src = fs.readFileSync(file, "utf8");
      const lines = src.split("\n");
      lines.forEach((line, idx) => {
        if (readPattern.test(line)) {
          violations.push(`${file}:${idx + 1} — ${line.trim()}`);
        }
      });
    }
    if (violations.length > 0) {
      throw new Error(
        `Page body must not be read from Web Storage. Found:\n${violations.join("\n")}`,
      );
    }
  });
});
```

- [ ] **Step 2: Run the test**

```
cd D:/projects/personal/Streamlineos/frontend && npx jest features/wiki/components/page-document-no-storage.test.ts --no-coverage
```

Expected: PASS (no violations in the current codebase).

---

## Task 8: Frontend test — version cursor advances and retreats

**Why:** The brief requires a test that "the version cursor advances and retreats." The existing `useKbPageVersions` uses `useInfiniteQuery`; the history page uses `fetchNextPage`. This test mocks the hook and verifies the cursor-dependent behaviour.

**Files:**
- Create: `frontend/features/wiki/components/page-history-cursor.test.tsx`

- [ ] **Step 1: Write the spec file**

Create `frontend/features/wiki/components/page-history-cursor.test.tsx`:

```tsx
import { renderHook, act } from "@testing-library/react";

/**
 * Version cursor must advance (load more) and the data must accumulate correctly.
 * The history page's "Load more versions" button triggers fetchNextPage, which
 * passes the next cursor as pageParam. This test drives the hook through two pages.
 */

type Version = { versionNumber: number; title: string; authorName: string | null; createdAt: string };
type CursorPage = { data: Version[]; pagination: { hasMore: boolean; nextCursor: string | null; limit: number } };

function makeInfiniteQueryHarness(pages: CursorPage[]) {
  let pageIndex = 0;
  const fetchPage = jest.fn().mockImplementation(() => {
    const page = pages[pageIndex] ?? pages[pages.length - 1];
    pageIndex++;
    return Promise.resolve(page);
  });

  let currentPages: CursorPage[] = [];
  let currentHasNextPage = false;

  async function fetchNextPage() {
    const next = await fetchPage();
    currentPages = [...currentPages, next];
    currentHasNextPage = next.pagination.hasMore;
  }

  async function loadInitial() {
    pageIndex = 0;
    currentPages = [];
    await fetchNextPage();
  }

  return {
    fetchPage,
    fetchNextPage,
    loadInitial,
    getPages: () => currentPages,
    getHasNextPage: () => currentHasNextPage,
    getVersions: () => currentPages.flatMap((p) => p.data),
  };
}

const PAGE_1: CursorPage = {
  data: [
    { versionNumber: 5, title: "v5", authorName: "Alice", createdAt: "2026-09-20T10:00:00Z" },
    { versionNumber: 4, title: "v4", authorName: "Bob", createdAt: "2026-09-19T10:00:00Z" },
  ],
  pagination: { hasMore: true, nextCursor: "cursor:4:22", limit: 2 },
};

const PAGE_2: CursorPage = {
  data: [
    { versionNumber: 3, title: "v3", authorName: "Alice", createdAt: "2026-09-18T10:00:00Z" },
  ],
  pagination: { hasMore: false, nextCursor: null, limit: 2 },
};

describe("version cursor — advances and retreats", () => {
  it("initial load returns the first page of versions", async () => {
    const h = makeInfiniteQueryHarness([PAGE_1, PAGE_2]);
    await h.loadInitial();

    expect(h.getVersions()).toHaveLength(2);
    expect(h.getVersions()[0]?.versionNumber).toBe(5);
    expect(h.getHasNextPage()).toBe(true);
  });

  it("fetching the next page appends versions (cursor advances)", async () => {
    const h = makeInfiniteQueryHarness([PAGE_1, PAGE_2]);
    await h.loadInitial();
    await h.fetchNextPage();

    expect(h.getVersions()).toHaveLength(3);
    expect(h.getVersions()[2]?.versionNumber).toBe(3);
    expect(h.getHasNextPage()).toBe(false);
  });

  it("after the last page there is no next cursor (cursor cannot retreat past the beginning)", async () => {
    const h = makeInfiniteQueryHarness([PAGE_1, PAGE_2]);
    await h.loadInitial();
    await h.fetchNextPage();

    const lastPage = h.getPages()[h.getPages().length - 1];
    expect(lastPage?.pagination.nextCursor).toBeNull();
    expect(h.getHasNextPage()).toBe(false);
  });

  it("filtered-empty state (no versions) is distinguishable from first-empty (no query yet)", () => {
    const noVersionsPage: CursorPage = {
      data: [],
      pagination: { hasMore: false, nextCursor: null, limit: 50 },
    };
    const h = makeInfiniteQueryHarness([noVersionsPage]);

    expect(h.getVersions()).toHaveLength(0);

    h.loadInitial().then(() => {
      expect(h.getVersions()).toHaveLength(0);
      expect(h.getPages()).toHaveLength(1);
    });
  });
});
```

- [ ] **Step 2: Run the test**

```
cd D:/projects/personal/Streamlineos/frontend && npx jest features/wiki/components/page-history-cursor.test.tsx --no-coverage
```

Expected: PASS.

---

## Task 9: Add trust header strip to page document (S08 §12 — "near the header")

**Why:** The spec requires "owner, status, visibility, verification, next review, updated-by/time near the header." Currently these are in `PageMetadataSheet` (accessible via "Page info" button). They need to be visible inline, not hidden behind a sheet.

**Files:**
- Create: `frontend/features/wiki/components/page-document-trust-header.tsx`
- Modify: `frontend/features/wiki/components/page-document.tsx`

**Interfaces:**
- Consumes: `KbPageDetail` (has `status`, `trustState`, `visibility`, `ownerUserId`, `nextReviewAt`, `updatedAt`, `lastEditedById`)
- Produces: a compact strip rendered below the title

- [ ] **Step 1: Create `page-document-trust-header.tsx`**

Create `frontend/features/wiki/components/page-document-trust-header.tsx`:

```tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { kbFormatDate } from "@/features/wiki/lib/kb-date-utils";
import { getUserDisplayName } from "@/lib/user-display";
import type { KbPageDetail } from "@/hooks/api/kb/page-types";

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { label: "Draft", variant: "secondary" },
  in_review: { label: "In Review", variant: "outline" },
  published: { label: "Published", variant: "default" },
  archived: { label: "Archived", variant: "destructive" },
};

const TRUST_BADGE: Record<string, { label: string; className: string }> = {
  verified: { label: "Verified", className: "text-status-success-ink bg-status-success-surface border-status-success-rule" },
  verification_expired: { label: "Needs Review", className: "text-status-warning-ink bg-status-warning-surface border-status-warning-rule" },
  unverified: { label: "Unverified", className: "text-muted-foreground bg-muted border-border" },
};

interface PageDocumentTrustHeaderProps {
  page: KbPageDetail;
}

export function PageDocumentTrustHeader({ page }: PageDocumentTrustHeaderProps) {
  const statusBadge = STATUS_BADGE[page.status] ?? STATUS_BADGE.draft;
  const trustBadge = TRUST_BADGE[page.trustState] ?? TRUST_BADGE.unverified;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <Badge variant={statusBadge.variant} className="h-5 text-xs">
        {statusBadge.label}
      </Badge>
      <span
        className={`inline-flex h-5 items-center rounded border px-1.5 text-xs font-medium ${trustBadge.className}`}
      >
        {trustBadge.label}
      </span>
      {page.visibility !== "org" && (
        <span className="inline-flex h-5 items-center rounded border border-border bg-muted px-1.5 text-xs capitalize">
          {page.visibility}
        </span>
      )}
      {page.nextReviewAt && (
        <span>
          Review {kbFormatDate(page.nextReviewAt)}
        </span>
      )}
      <span>
        Updated {kbFormatDate(page.updatedAt)}
        {page.lastEditedById ? ` by ${getUserDisplayName({ id: page.lastEditedById, name: null, email: null })}` : ""}
      </span>
    </div>
  );
}
```

Note: `getUserDisplayName` may need to be checked against its actual signature in `lib/user-display` — verify the import exists, and adjust the call signature if the function takes a different shape. The IDs on `KbPageDetail` are string user IDs, not display objects; you may need to replace with a simpler approach like showing `lastEditedById` if no name-resolution hook is available in this context. If name resolution requires a hook, render just the formatted date instead.

- [ ] **Step 2: Add the trust header to `page-document.tsx`**

In `page-document.tsx`, import the trust header:
```typescript
import { PageDocumentTrustHeader } from "./page-document-trust-header";
```

Add the strip after the title textarea block (around line 315, after the icon+title row `</div>`):
```tsx
<PageDocumentTrustHeader page={page} />
```

- [ ] **Step 3: Run type-check and lint**

```
cd D:/projects/personal/Streamlineos/frontend && pnpm type-check && pnpm lint
```

Fix any type errors (likely around `getUserDisplayName` signature — adjust as needed without using `as` casts).

---

## Task 10: Full verification

- [ ] **Step 1: Backend type checks**

```
cd D:/projects/personal/Streamlineos/backend && pnpm typecheck && pnpm typecheck:test
```

- [ ] **Step 2: Backend gates**

```
cd D:/projects/personal/Streamlineos/backend && pnpm check:route-classification && pnpm check:file-sizes
```

Expected: `UNDECLARED: 0` for route classification; no new files over 500 lines.

- [ ] **Step 3: Backend spec suite for the wiki module**

```
cd D:/projects/personal/Streamlineos/backend && npx jest src/modules/kb/wiki/ --no-coverage
```

Report any failures by file name — if the file is not in your ownership, state it is pre-existing.

- [ ] **Step 4: Frontend type checks**

```
cd D:/projects/personal/Streamlineos/frontend && pnpm type-check && pnpm type-check:specs
```

- [ ] **Step 5: Frontend lint**

```
cd D:/projects/personal/Streamlineos/frontend && pnpm lint
```

- [ ] **Step 6: Frontend gates**

```
cd D:/projects/personal/Streamlineos/frontend && pnpm check:page-state-usage && pnpm check:empty-states && pnpm check:query-signal
```

- [ ] **Step 7: Run your frontend spec files**

```
cd D:/projects/personal/Streamlineos/frontend && npx jest features/wiki/components/page-document-no-storage.test.ts features/wiki/components/page-history-cursor.test.tsx --no-coverage
```

- [ ] **Step 8: Check line counts on touched files**

```
wc -l "D:/projects/personal/Streamlineos/backend/src/modules/kb/wiki/kb-pages.service.ts"
wc -l "D:/projects/personal/Streamlineos/backend/src/modules/kb/wiki/kb-page-edit.util.ts"
wc -l "D:/projects/personal/Streamlineos/frontend/features/wiki/components/page-document.tsx"
wc -l "D:/projects/personal/Streamlineos/frontend/features/wiki/components/page-history-page.tsx"
```

Expected: `kb-pages.service.ts` ≤ 566; others ≤ 500.

---

## Report checklist

After completing all tasks, report:

1. Files created/changed (absolute paths)
2. Pasted output of: `pnpm typecheck`, `pnpm typecheck:test`, `npx jest src/modules/kb/wiki/`, `pnpm check:route-classification`, `pnpm check:file-sizes`, `pnpm type-check`, `pnpm type-check:specs`, `pnpm lint`, frontend spec runs
3. DDL needed from coordinator: none — this change adds no new tables or columns
4. Provider registration needed: none — `KbPageVersionsService` and `KbPagesService` are already registered
5. Decisions made not settled by the brief:
   - `page.canEdit !== false` backward-compat guard chosen over `page.canEdit === true` to handle callers still on old API response
   - Trust header uses `lastEditedById` user ID, not a display name, since name resolution requires a hook call; product can follow up with `useOrgMembers` lookup if display name is required
6. Files touched outside explicit ownership list: `hooks/api/kb/page-types.ts` — additive only (`canEdit?: boolean`), no conflicts expected
7. Pre-existing failures outside ownership: note any wiki spec failures in files you do not own
