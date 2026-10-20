# Step 2 — Page-by-Page Product and Component Specification

> **Supporting route specification:** [`2026-10-20-document-module-product-decision.md`](2026-10-20-document-module-product-decision.md) owns final scope, navigation, and removals. Compatibility routes named below are not automatically primary navigation.

## Shared page contract

Every retained or added page uses the same state model:

- **Loading:** stable skeleton that matches final geometry.
- **Ready:** bounded content with one obvious next action.
- **Empty:** first-run explanation and at most one primary action.
- **Filtered empty:** preserve filters, show result count zero, clear-one/clear-all actions.
- **Error:** human message, retry, request id, and preserved authorized stale data when safe.
- **Denied:** no record-existence leak; route-level denial explains the missing capability.
- **Offline/conflict:** only where drafting or editing is possible; never claim a save that the server has not accepted.

Every collection uses cursor pagination unless it is explicitly bounded: recents 20, favorites 50, Quick find 20. Response-shaping filters live in the URL. Selection, draft text, menus, and dialogs do not.

## 1. Contextual Ask Docs — `/knowledge/chat` (compatibility route)

**Customer job:** receive a grounded answer from authorized organizational knowledge.

**Placement:** launch from Docs or a selected file/folder. Do not make this route the default Docs landing page.

**Keep:** page purpose, prompt suggestions, conversations, sources, composer.

**Add:**

- conversation rail with New, search, rename, delete, and cursor loading;
- source scope sheet: pages/files/notes, space, owner, status, verified-only;
- answer parts for citations, source passage, freshness, verification, disagreement, and insufficient evidence;
- streaming stop/retry, network recovery, copy, helpful/unhelpful, “report wrong/stale,” and “create knowledge gap”;
- visible scope summary before send and access-change handling after an answer was generated;
- deterministic search fallback when AI is disabled, rate limited, over budget, or unavailable.

**Remove/avoid:** generic “confidence percentage,” uncited prose presented as fact, hidden auto-selected sources, and permanent storage of draft prompts in browser storage.

**Acceptance:** no answer text is sent to the model until retrieval candidates pass current ACL; every displayed citation is checked again before disclosure; unsupported answers are explicit.

## 2. Docs Home — `/knowledge/wiki`

**Customer job:** resume recent work and browse the document collection.

**Keep:** recents, favorites, all documents, New document.

**Add:**

- compact Quick find field linked to full results;
- URL-backed `status`, `spaceId`, owner, and view controls;
- card/list toggle, total/result count, cursor for All pages;
- page-card menu: favorite, copy link, share, duplicate, move, archive/delete where allowed;
- trust badges: draft/published/archived, verified/stale, owner missing;
- improved first-run path: create blank, use template, or import.

**Remove/replace:** rendering All pages from the entire page tree. Use a list projection; load children only when hierarchy is expanded.

**Acceptance:** home remains responsive with 100,000 tenant pages and does not download the tree to count or filter them.

## 3. My Files — `/knowledge/wiki/private` (compatibility route)

**Customer job:** find documents and files the current member owns.

**Add:** server filter `ownerMembershipId=me`, search, status/folder filters, list/card view, cursor, file actions, owner-transfer action where allowed.

**Remove:** browser filtering by `visibility=private` and copy that teaches users to change access just to make a document appear here.

**Acceptance:** ownership transfer changes this list without altering visibility; private pages owned by another authorized administrator do not appear as “mine.”

## 4. Shared With Me — `/knowledge/wiki/shared`

**Customer job:** find pages explicitly shared with the current membership or one of its groups.

**Add:** explicit grants; columns/cards for shared by, shared at, access level, source group, expiry when introduced; search; status/access filters; cursor; revoke/access-lost state.

**Remove:** `createdById !== myId` inference. Organization-visible pages are not “shared with me.”

**Acceptance:** creating, changing, or revoking a grant updates list, detail, search, Ask, citations, and cache state within the revocation budget.

## 5. Team Folders — `/knowledge/wiki/spaces` (compatibility route)

**Customer job:** find an organization-owned shared workspace and administer its lifecycle.

**Keep:** cards, create/edit sheet, audience.

**Add:** server-projected page/member counts, search, audience/status filters, cursor, list view, members action, archive/restore, owner, last updated, health summary for managers.

**Remove:** full-tree client counting and customer-facing hard delete. Permanent purge is asynchronous after retention and dependency checks.

**Acceptance:** archive preview reports pages, public links, Ask index impact, and record links; restore is idempotent.

## 6. Team Folder Detail — `/knowledge/wiki/spaces/[spaceId]` (compatibility route)

**Customer job:** browse and maintain documents within one authorized Team folder.

**Add:** breadcrumb, audience/access badge, in-space search, status/owner filters, create-in-space, lazy hierarchy, card/list option, members sheet, review policy summary, archive, inaccessible/not-found recovery.

**Remove:** fetching the organization tree and filtering it in the browser.

**Acceptance:** every child request carries `spaceId`, tenant, parent/cursor, and current access; moving a page checks both source and target spaces.

## 7. Templates — `/knowledge/wiki/templates`

**Customer job:** start a useful page quickly or maintain organization standards.

**Keep:** Starters and Saved tabs; current starter set.

**Add:** URL `tab`, `q`, category, preview, expected output, use count/last used for saved templates, owner, cursor, create/edit/delete saved template for managers, template variables only where they eliminate repetitive typing.

**Remove/avoid:** marketplace, ratings, AI-generated decorative templates, and dozens of near-duplicates.

**Acceptance:** using a template creates a page through the same page-create command and returns an editable page; starter use does not require template-manage permission.

## 8. Reviews Administration — `/knowledge/wiki/reviews`

**Customer job:** decide approval/freshness work before it becomes risky.

**Add:** search; URL filters for status/type/reviewer/due/space; derived overdue; cursor; sortable due date; page trust context; optional approval note; required rejection reason; bulk decide with per-row results; mobile cards; assignment notifications.

**Remove:** persisted `expired` state. Overdue is `pending && dueAt < now`. Do not hide failures behind an empty table.

**Acceptance:** list and decision both use page visibility; a user cannot infer a hidden page from review metadata; bulk is partial-success and retry-safe.

## 9. Import & Export — `/knowledge/wiki/import` (contextual/admin)

**Customer job:** migrate knowledge safely and obtain a portable copy.

**Add:** separately gated tabs; file/paste format and size help; title, target space/parent, default visibility, duplicate policy, dry-run summary, progress, per-item errors, retry, cancel before processing, cursor histories, expiring download indicator, audit event.

**Remove:** client slicing of job history and any synchronous parsing/indexing on the request connection.

**Acceptance:** uploads are scanned; jobs are idempotent; a partial import reports created/skipped/failed items and can resume without duplicates.

## 10. Analytics Administration — `/knowledge/wiki/analytics`

**Customer job:** decide what knowledge to improve.

**Add:** date range and space; successful resolution, zero-result queries, unsupported Ask queries, citation reuse, stale high-use pages, review SLA, public deflection; paginated drill-down; assign/dismiss/create-fix actions for gaps; privacy thresholds for low-volume data.

**Remove:** vanity totals, raw org-wide titles, duplicated “trust scores,” and charts without table alternatives.

**Acceptance:** metrics use the same record visibility as lists; aggregates cannot reveal one hidden page through a count or label; every chart answers a documented decision.

## 11. Trash — `/knowledge/wiki/trash`

**Customer job:** recover an accidental deletion or permanently purge authorized content.

**Add:** table/mobile cards; search; deleted by/date/space filters; cursor; selected restore/purge; dependency impact; retention permission split; empty trash; legal/retention hold explanation where applicable.

**Remove:** silent 100-row cap and card-only layout.

**Acceptance:** restore repairs tree/search/index links idempotently; purge drains database, object, chunk, cache, analytics, and public-token artifacts with a resumable ledger.

## 12. Page Document — `/knowledge/wiki/doc/[pageId]`

**Customer job:** read, edit, discuss, trust, and reuse one page.

**Keep:** title, rich editor, autosave, cover/icon, breadcrumb, AI, share, undo/redo.

**Add:**

- read/edit modes appropriate to permission;
- owner, status, visibility, verification, next review, updated-by/time near the header;
- favorite, comments, metadata, backlinks, linked records, history, duplicate, move, save template, export, archive/delete in one consistent action model;
- slash/insert menu for supported blocks, link preview, heading outline, anchored comments, and source citation blocks;
- mobile metadata/comments sheets;
- in-memory or tenant-scoped server draft, connectivity and save timestamps, field-level conflict comparison, and retry;
- AI actions that show sources and produce a preview/diff before applying.

**Remove/avoid:** large persistent toolbar on small screens, page body in localStorage, access mutations hidden behind generic “More,” and AI replacing text without review.

**Acceptance:** content writes require expected content revision; metadata-only writes do not overwrite content; save conflict preserves both versions; unauthorized/missing are indistinguishable 404.

## 13. History — `/knowledge/wiki/doc/[pageId]/history`

**Customer job:** understand and safely restore prior content.

**Add:** cursor list with actor/time/change summary; current marker; select one or two versions; semantic block diff; metadata/content distinction; restore preview and confirmation; deep link to version; audit entry.

**Remove:** unbounded revision load and raw JSON diff.

**Acceptance:** restore creates a new append-only version, never rewrites history, increments revision, and reindexes asynchronously.

## 14. Quick Find and Full Search — `/knowledge/wiki/search`

**Customer job:** inspect all authorized matches and refine the query.

**Components:** query input, result count, spell/exact suggestion, facets for space/status/type/owner/updated/verified, snippet rows, keyword highlight, trust/access metadata, cursor, card/table option, page actions, keyboard navigation, empty and insufficient-access-safe states.

**Rules:** exact/lexical results remain available without embeddings; semantic results complement them; URL contains normalized query and filters; Quick find hands off with the query intact.

**Acceptance:** p95 server response < 500 ms at the planning envelope; no result contains title, snippet, count, or facet derived from unauthorized content.

## 15. Content Health Administration — `/knowledge/wiki/manage`

**Customer job:** repair the most harmful knowledge debt efficiently.

**Components:** impact-ranked inbox; presets for unowned, stale, unverified, empty, broken link, overexposed, duplicate candidate, contradictory claim, overdue review; filters; owner/due; reason/explanation; bulk repair; dismiss/snooze with reason; before/after health trend.

**Rules:** signals are explainable and reversible; AI suggestions are drafts; rank by observed use and risk, not by opaque score.

**Acceptance:** every item links to evidence and a repair action; dismissals expire or record a durable exception; no automated fix publishes without a human.

## 16. Public Page — `/wiki/[shareToken]`

**Customer job:** read one explicitly shared page.

**Add:** accessible reading typography, brand-light header, last updated, optional helpful feedback, revoked/invalid 404, cache headers keyed by token revision, abuse/rate limits.

**Remove:** authenticated chrome, sibling tree, internal comments, Ask scope, and metadata not explicitly public.

**Acceptance:** token rotation/revocation purges CDN/cache; page and attachment access are bound to the same public grant.

## 17. Support Knowledge Gaps — `/support/knowledge-gaps`

**Customer job:** turn repeated unresolved support questions into reviewed Knowledge Base work.

**Components:** cursor-fed gap list, evidence from tickets and searches, detect action, draft action, proposed-page link, dismissal reason, and loading, empty, error, and denied states.

**Rules:** Support owns detection and triage; Knowledge Base owns the resulting draft, its publication, and its access policy. Reads require `support:knowledge-gaps:view`; detect, draft, and dismiss require `support:knowledge-gaps:manage`. A draft is never published by detection alone.

**Acceptance:** duplicate detection or retry creates no duplicate gap or draft; a dismissed gap stays out of active work until a documented resurfacing event; the proposed-page link is shown only to an actor who may open it. The collection stays bounded as new gaps arrive.

## 18. Docs Entry and Redirect Aliases — `/knowledge`, `/ask`, `/docs`, `/kb`, and `/knowledge/wiki/pages/[pageId]`

**Customer job:** reach Docs from one stable entry route.

**Rules:** `/knowledge`, `/docs`, and `/kb` redirect to `/knowledge/wiki`; `/ask` may retain `/knowledge/chat` as a contextual compatibility route. The legacy `/knowledge/wiki/pages/[pageId]` and `/history` paths redirect to the canonical document and history routes. The destination enforces the current session, entitlement, and object access. Record redirect use without disclosing the tenant or access state in the redirect response.

**Acceptance:** permitted and unentitled actors land in their correct destination state, and the redirect is visible in live telemetry.

## 19. Project Docs Adapters — `/build/[projectId]/wiki`, `/build/[projectId]/wiki/[pageId]`, and `/build/[projectId]/wiki/[pageId]/history`

**Customer job:** browse, edit, and inspect the history of project knowledge without leaving the project context.

**Rules:** reuse the canonical wiki list, document, version, editor, and search interfaces. Bind every read, create, move, restore, citation, and attachment to the current project and actor. The project back path remains available; there is no second project page store.

**Acceptance:** a member of another project cannot learn a page title, history, count, or attachment URL through an adapter. The three routes retain the shared loading, denied, error, empty, and edit-conflict behavior.

## 20. Support Knowledge Management — `/support/kb` and `/support/kb/[articleId]`

**Customer job:** maintain help content during the documented page cutover.

**Rules:** keep the retained Support contract and its current callers until the migration reconciliation is signed. Any article-to-page identity mapping is explicit; an article id must not be interpreted as a page id. Publication remains a human action subject to the current audience policy.

**Acceptance:** list and detail routes preserve authorized creation, editing, and publication during cutover. Remove a route only after caller, redirect, data, and rollback evidence in `06-code-removal-and-reuse.md` is complete.

## 21. Public Help — `/help/[orgId]` and `/help/[orgId]/[articleSlug]`

**Customer job:** find and read deliberately published help content without an authenticated session.

**Rules:** project only public, published content for the requested organization. Public cache policy and rate limits are separate from authenticated Knowledge reads. A private title, count, snippet, attachment, or citation cannot be inferred through public search or an old slug.

**Acceptance:** valid content, unknown slug, withdrawn content, and revoked public access have distinct safe outcomes; retained redirects resolve without exposing another tenant's content.

## Shared module inventory

Reuse or deepen these modules before creating page-specific versions:

- `PageState` for loading/error/denied/empty;
- `FilterBar` with URL codecs;
- `DataTable` plus mobile cards and cursor controls;
- `WikiPageCard` and one action descriptor model;
- `EntityFormDialog` for small forms and `EntityFormSheet` for contextual/multi-section forms;
- `ConfirmDialog` for destructive/access/approval actions;
- member/owner picker, status/trust badges, date formatters;
- command palette and shortcut scope;
- dirty-state/conflict guard;
- page authorization interface and list projection;
- search result/citation projection shared by Search and Ask.

Promote a shared module only after two real consumers. A wrapper that only renames props is shallow and should not exist.
