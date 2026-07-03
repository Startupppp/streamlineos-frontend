# PRD — Knowledge Base Wiki (Notion-style Pages)

> Product: StreamlineOS · Module: `kb` · Status: v1 in build · Owner: PM/Eng (AI-assisted)
> Adds a Notion-style collaborative document workspace ("Wiki") to the existing Knowledge Base module.

---

## 1. Problem & Goal

The KB module today is a help-center (articles → categories → spaces) optimized for publishing support content. Teams also need an internal, free-form documentation workspace — meeting notes, specs, runbooks, onboarding docs — with the editing ergonomics of Notion: infinitely nested pages, a block editor with slash commands, icons/covers, favorites, templates, comments, backlinks, version history, and a trash.

**Goal:** ship a Notion-parity core workspace inside the `kb` module, reusing existing KB infrastructure (module gating, RBAC, comments pattern, versions pattern, FTS pattern, storage) — no parallel systems.

## 2. Personas

- **Author** (any employee with `kb:pages:create/update`) — writes and organizes docs daily.
- **Reader** (`kb:pages:view`) — browses, searches, comments.
- **Workspace admin** (`kb:pages:manage`, `kb:templates:manage`) — locks pages, curates templates, empties trash.

## 3. Notion feature parity matrix

| Notion feature | v1 (this build) | Later phase |
|---|---|---|
| Nested pages (infinite hierarchy) | ✅ page tree, expand/collapse | lazy tree loading at scale |
| Block editor (headings, lists, todo, quote, divider, code, table, image, callout) | ✅ TipTap `document` variant | toggle blocks if `extension-details` unavailable |
| Slash commands (`/`) | ✅ suggestion popup | |
| Page icon (emoji) + cover | ✅ curated emoji grid + gradient/preset covers | image-upload covers |
| Drag & drop / reorder | ✅ move dialog + sibling reorder API | full tree drag-drop |
| Favorites | ✅ per-user | |
| Recents | ✅ per-user visit tracking | |
| Templates | ✅ org templates (save page as template, create from) + built-in starters | template gallery |
| Comments (threaded, resolve) | ✅ page-level panel | inline block comments |
| @user mentions | ✅ mention node + notification | |
| Page links + backlinks ("Linked mentions") | ✅ `@page` link node + backlinks panel | |
| Version history + restore | ✅ debounced snapshots (10-min window, cap 100) | diff view |
| Trash / restore / permanent delete | ✅ soft-delete subtree | auto-purge after 30 days |
| Quick find (Ctrl+K) | ✅ FTS search dialog | |
| Duplicate / move page | ✅ deep-copy subtree | cross-space move |
| Lock page | ✅ `isLocked` (manage-gated) | |
| Word count / last edited by | ✅ in page header | |
| Share to web (public) | ❌ | phase 2 (reuse public widget pattern) |
| Databases (table/board/calendar views) | ❌ | phase 3 (own PRD) |
| Real-time multiplayer (CRDT) | ❌ | phase 3 (needs websocket infra) |
| Synced blocks, AI autofill, web clipper, offline | ❌ | phase 3+ |
| RAG indexing of wiki pages (Ask AI over docs) | ❌ | phase 2 (extend `kb_article_chunks` with `page_id`) |

Non-goals for v1 are explicit product decisions, not omissions: databases and CRDT collaboration are each a multi-week workstream with infra prerequisites.

## 4. UX spec

- **Route:** `app/(authenticated)/knowledge-base/` — layout owns a secondary left panel (page tree) inside the shell content area; main area renders the page. Sidebar nav gets a "Wiki" item (module `kb`, permission `kb:pages:view`).
- **Home** (`/knowledge-base`): PageWrapper with Recents, Favorites, and root pages; empty state with "Create your first page" + template starters.
- **Page view** (`/knowledge-base/pages/[pageId]`): breadcrumbs (ancestors), cover, icon, inline title (textarea-like h1), TipTap document editor, autosave (1.5s debounce) with saved/saving indicator, header actions: favorite ⭐, comments panel, history, backlinks, duplicate, move, lock, delete, save-as-template, export (Markdown/HTML download, client-side).
- **Tree panel:** hierarchical list, hover reveals + (add child) and ⋯ menu; active page highlighted; Favorites section above the tree; Trash + Quick find entries at the bottom (dialogs).
- All states per CLAUDE.md §15 (skeletons, full-height empty states, error+retry). Density and interactions match `/signin` reference; ink-first tokens; Framer Motion entrances; `prefers-reduced-motion` respected.

## 5. Data model (backend `src/db/schema/kb/`)

New tables (identity PKs; every table `org_id text NOT NULL` FK → organizations cascade, indexed first in composites):

- **kb_pages** — id, org_id, space_id int NULL FK kb_spaces (set null), parent_page_id int NULL self-FK, title text NOT NULL default '', icon text, cover_image text, content jsonb (TipTap JSON), content_text text, sort_order int NOT NULL default 0, is_locked bool default false, created_by_id / last_edited_by_id text FK users (set null), deleted_at timestamptz, deleted_by_id text, created_at, updated_at. Indexes: (org_id, parent_page_id, sort_order), (org_id, deleted_at), (org_id, updated_at desc), parent_page_id. Out-of-band migration adds generated `fts tsvector` on title+content_text + GIN (follow `0118_kb_foundations.sql` pattern).
- **kb_page_favorites** — id, org_id, page_id FK cascade, user_id FK cascade, sort_order, created_at; unique(page_id, user_id); idx (org_id, user_id).
- **kb_page_visits** — id, org_id, page_id FK cascade, user_id FK cascade, visited_at; unique(page_id, user_id) (upsert on visit); idx (org_id, user_id, visited_at desc).
- **kb_page_links** — id, org_id, source_page_id FK cascade, target_page_id FK cascade, created_at; unique(source, target); idx (org_id, target_page_id) for backlinks.
- **kb_page_versions** — id, org_id, page_id FK cascade, version_number int, title, content jsonb, author_id FK users set null, created_at; unique(page_id, version_number).
- **kb_page_comments** — id, org_id, page_id FK cascade, author_id FK users set null, parent_id int (thread), content text, resolved_at, created_at, updated_at; idx (org_id, page_id).
- **kb_page_templates** — id, org_id, name, icon, description, content jsonb, created_by_id FK users set null, created_at, updated_at; idx (org_id).

Migration: next number `0137` via `pnpm -C backend db:generate`; plus out-of-band `0137_kb_pages_foundations.sql` (fts + GIN). `db:push`/`db:migrate` require a TTY — run manually.

## 6. API contract (NestJS, module `kb`, envelope `{success,data}` auto-wrapped)

All endpoints: `@UseGuards(JwtAuthGuard, ModuleGuard, PermissionGuard)` + `@RequireModule("kb")` + `@RequirePermission(...)`; Zod DTOs via `ZodValidationPipe`; every query org-scoped (BOLA re-asserted per id).

`kb-pages.controller.ts` (`@Controller("kb")`; static routes declared before `:pageId`):

| Verb Route | Permission | Notes |
|---|---|---|
| GET `pages/tree` | view | flat nodes: id, parentPageId, title, icon, sortOrder, hasChildren |
| GET `pages/recent` · `pages/favorites` · `pages/trash` | view | summaries, limit 20/50/100 |
| GET `pages/search?q=` | view | FTS `websearch_to_tsquery` + `ts_headline` snippet, limit 20 |
| POST `pages` | create | { parentPageId?, title?, templateId? } |
| GET `pages/:pageId` | view | detail + ancestors + isFavorite |
| PATCH `pages/:pageId` | update | title/icon/coverImage/content+contentText; rejects when locked (unless manage); snapshots version (10-min window); resyncs links; notifies new @mentions |
| POST `pages/:pageId/move` | update | { parentPageId, index }; cycle-guarded |
| POST `pages/:pageId/duplicate` | create | deep-copies subtree |
| DELETE `pages/:pageId` | delete | soft-deletes subtree (recursive CTE) |
| POST `pages/:pageId/restore` | update | restores subtree; reparents to root if parent deleted |
| DELETE `pages/:pageId/permanent` | delete | hard delete |
| POST/DELETE `pages/:pageId/favorite` | view | per-user |
| POST `pages/:pageId/visit` | view | upsert visit (no writes in GETs) |
| GET `pages/:pageId/backlinks` | view | |
| GET `pages/:pageId/versions` · GET `.../versions/:versionNumber` | view | |
| POST `pages/:pageId/versions/:versionNumber/restore` | update | snapshots current first |
| PATCH `pages/:pageId/lock` | manage | { isLocked } |

`kb-page-comments.controller.ts`: GET/POST `pages/:pageId/comments` (view), PATCH/DELETE `page-comments/:commentId` (author or manage), POST `page-comments/:commentId/resolve` (view).
`kb-page-templates.controller.ts`: GET `page-templates` (view), POST `page-templates` { fromPageId, name, description? } (templates:manage), DELETE `page-templates/:templateId` (templates:manage).

## 7. RBAC

New catalog keys (`permissions.constants.ts` + `ROLE_DEFAULT_PERMISSIONS`): `kb:pages:view`, `kb:pages:create`, `kb:pages:update`, `kb:pages:delete`, `kb:pages:manage`, `kb:templates:manage`. CUSTOMER_SUPPORT gets all; other role templates get `kb:pages:view` (+create/update for content-producing roles). Org owners / platform admins bypass (existing). Frontend `PermissionKey` union extended to match.

## 8. Frontend architecture

- Hooks: `hooks/api/kb/pages.ts`, `page-comments.ts`, `page-templates.ts` (re-exported from `hooks/api/kb/index.ts`); keys added under `queryKeys.kb.pages*` in `lib/query-keys.ts`; calibrated `staleTime` (tree/lists 30s, detail 15s, templates 5m); optimistic favorite toggle.
- Editor: `components/editor/tiptap-editor.tsx` gains `variant?: "basic" | "document"` (default `basic`, zero behavior change for existing callers). Document variant wires: TaskList/TaskItem, Table, Image, CodeBlockLowlight, Mention (users), page-link mention, slash-command suggestion, custom Callout node. New files under `components/editor/` (slash command, extensions, suggestion lists). New deps: `@tiptap/extension-table`, `@tiptap/extension-task-list`, `@tiptap/extension-task-item`, `@tiptap/suggestion`, `lowlight`.
- Feature UI: `features/knowledge-base/components/` — page-tree, page-editor-header (icon/cover pickers), comments-panel (Sheet), history-sheet, backlinks-popover, quick-find-dialog, trash-dialog, move-page-dialog, templates-dialog, export util (`features/knowledge-base/lib/export-page.ts`).
- Routes: `app/(authenticated)/knowledge-base/{layout,page,loading,error}.tsx` + `pages/[pageId]/page.tsx`.

## 9. Acceptance criteria (Definition of Done, CLAUDE.md §26)

- Backend + frontend build, lint, typecheck green.
- CRUD complete for pages/comments/templates incl. all lifecycle actions above; e2e controller specs (401 / module-disabled 404 / 403 / happy path) + unit tests for link/mention extraction and tree move cycle-guard.
- Every endpoint org-scoped and permission-gated; locked pages reject writes; cross-tenant access impossible.
- All list surfaces have loading skeletons, full-height empty states, error+retry; responsive 375/768/1280; keyboard: Ctrl+K quick find, Esc closes dialogs.
- `PAGES.md` updated.

## 10. Rollout

1. Migration `0137` generated + out-of-band FTS SQL (applied manually via TTY, like 0118).
2. Backfill: none required (new tables).
3. Nav item appears only with module `kb` enabled + `kb:pages:view`.
4. Phase 2 candidates in priority order: share-to-web, RAG indexing of pages, tree drag-drop, inline block comments, cover uploads, database views.
