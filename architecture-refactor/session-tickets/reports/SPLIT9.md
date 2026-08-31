# SPLIT9 — Backend Oversize File Splits

**Lane:** SPLIT9 (backend `src/modules/` only, restricted paths excluded)
**Date:** 2026-08-31

## Scope

Files enumerated above 500 lines in territory (excluding restricted modules). Candidates by priority:

| File | Before | Action |
|---|---|---|
| `notification-events.catalog.ts` | 1,054 | Cohesive catalog — exempt (pure data, equivalent to permission catalog) |
| `invitations.service.ts` | 634 | Restricted (`org/core`) — not touched |
| `org-setup.service.ts` | 608 | **Split** → `org-setup-resolver.service.ts` |
| `kb-pages.service.ts` | 602 | **Split** → `kb-page-status.service.ts` |
| `kb-articles.service.ts` | 585 | **Split** → `kb-article-query.service.ts` |
| `rbac/role-templates.constants.ts` | 584 | Cohesive catalog — exempt |
| `kb-search.service.ts` | 589 | No clean responsibility boundary without moving the entire search domain; no split |
| `ai/core/services/crm-brief.service.ts` | 576 | Restricted (`crm`) — not touched |
| `ai/core/services/crm-copilot.service.ts` | 531 | Restricted (`crm`) — not touched |
| `hr/directory/org-structure.service.ts` | 547 | Restricted (`hr`) — not touched |
| Other remaining >500 | various | Restricted paths or no clean boundary |

## Splits Completed

### Split 1 — `kb-pages.service.ts` → `kb-page-status.service.ts`

**Responsibility extracted:** KB page lifecycle state transitions (lock, publish, archive, unarchive, verify, markStale).

| File | Before | After |
|---|---|---|
| `kb/wiki/kb-pages.service.ts` | 602 | 425 |
| `kb/wiki/kb-page-status.service.ts` | — | 203 (new) |

**Constructor change (`KbPagesService`):** removed `reviews: KbPageReviewsService` (no longer needed after extraction).

**Registrations:**
- `kb-wiki.module.ts`: added `KbPageStatusService` to `providers`
- `kb-pages.controller.ts`: injected `KbPageStatusService`, routed `lock/publish/archive/unarchive/verify/markStale` to `this.status.*`

**Spec updated:** `kb-pages-tenant-isolation.spec.ts` — removed `reviews` variable, updated 2 constructor calls (replace_all: true).

### Split 2 — `org-setup.service.ts` → `org-setup-resolver.service.ts`

**Responsibility extracted:** org target resolution and creation (slugify, listSetupMemberships, suspendedAccessError, resolveCurrentSetupTarget, resolveExistingSetupTarget, resolveOrCreateOrg) plus exported types `SetupMembership` and `SetupTarget`.

| File | Before | After |
|---|---|---|
| `organization/setup/org-setup.service.ts` | 608 | 371 |
| `organization/setup/org-setup-resolver.service.ts` | — | 264 (new) |

**Constructor change (`OrgSetupService`):** added `resolver: OrgSetupResolverService` as last param; delegates all resolution calls to `this.resolver.*`.

**Registrations:**
- `org.module.ts`: added `OrgSetupResolverService` to `providers`
- No controller change needed (resolver is consumed by `OrgSetupService`)

**Specs updated:**
- `__tests__/org-setup.service.spec.ts`: added `OrgSetupResolverService` as a real provider in `buildService`
- `org-setup-tenant-isolation.spec.ts`: creates `resolver` first, passes it as last arg to `new OrgSetupService(..., resolver)`

### Split 3 — `kb-articles.service.ts` → `kb-article-query.service.ts`

**Responsibility extracted:** read-only article queries (list with pagination/filtering, listVersions). These share only `db` and `KbAccessService` and carry no write-path private helpers.

| File | Before | After |
|---|---|---|
| `kb/help-centre/kb-articles.service.ts` | 585 | 468 |
| `kb/help-centre/kb-article-query.service.ts` | — | 131 (new) |

**Types moved with methods:** `ArticleListItem`, `ArticleListResult` (only used by `list`; `ArticleWithTags` stays in main service since `get` returns it and spec tests it).

**Imports removed from `KbArticlesService`:** `desc`, `ilike`, `or`, `type SQL`, `applyScope`, `DataScope`, `ListArticlesInput`.

**Registrations:**
- `kb-help-centre.module.ts`: added `KbArticleQueryService` to `providers`
- `kb-articles.controller.ts`: injected `KbArticleQueryService`; routed `this.articles.list(...)` → `this.query.list(...)`, `this.articles.listVersions(...)` → `this.query.listVersions(...)`

**Spec unmodified:** `kb-articles-tenant-isolation.spec.ts` creates `new KbArticlesService(db, access, events)` and tests `get` — constructor signature unchanged.

## Gate Results

**Cycles (`pnpm check:cycles`):** zero circular dependencies (4,734 files processed).

**DI exports (`node src/scripts/check-module-di.mjs`):** 213 modules parsed, 0 invalid exports.

## Spec Results

| Pattern | Suites | Tests | Result |
|---|---|---|---|
| `kb-pages-tenant-isolation` | 1 | 2 | PASS |
| `org-setup` | 2 | 10 | PASS |
| `kb-articles-tenant-isolation\|kb-article` | 7 | 35 | PASS |
| **Total** | **10** | **47** | **all PASS** |

## Files Changed

**New files:**
- `backend/src/modules/kb/wiki/kb-page-status.service.ts` (203 lines)
- `backend/src/modules/organization/setup/org-setup-resolver.service.ts` (264 lines)
- `backend/src/modules/kb/help-centre/kb-article-query.service.ts` (131 lines)

**Modified:**
- `backend/src/modules/kb/wiki/kb-pages.service.ts` (602 → 425)
- `backend/src/modules/kb/wiki/kb-pages.controller.ts`
- `backend/src/modules/kb/wiki/kb-wiki.module.ts`
- `backend/src/modules/kb/wiki/kb-pages-tenant-isolation.spec.ts`
- `backend/src/modules/organization/setup/org-setup.service.ts` (608 → 371)
- `backend/src/modules/organization/setup/org.module.ts`
- `backend/src/modules/organization/setup/__tests__/org-setup.service.spec.ts`
- `backend/src/modules/organization/setup/org-setup-tenant-isolation.spec.ts`
- `backend/src/modules/kb/help-centre/kb-articles.service.ts` (585 → 468)
- `backend/src/modules/kb/help-centre/kb-articles.controller.ts`
- `backend/src/modules/kb/help-centre/kb-help-centre.module.ts`

**No git commands run.**

## DI Safety

All three new services use `private readonly` injection (not `import type`) to preserve DI tokens. No `forwardRef`. Each extracted service injects only stable leaf dependencies that do not import back to the source service — confirmed by the zero-cycles gate.
