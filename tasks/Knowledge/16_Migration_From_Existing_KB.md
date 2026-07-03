# StreamlineOS Product Bible

# Knowledge Module

# 16_Migration_From_Existing_KB.md

## Purpose

Move the existing support KB implementation into the unified Knowledge module without breaking current support workflows.

## Existing Files To Audit

- `streamlineos-frontend/frontend/types/kb.ts`
- `streamlineos-frontend/frontend/hooks/api/kb`
- `streamlineos-frontend/frontend/hooks/api/support/kb.ts`
- `streamlineos-frontend/frontend/hooks/api/support/kb-attachments.ts`
- `streamlineos-frontend/frontend/hooks/api/support/kb-comments.ts`
- `streamlineos-frontend/frontend/hooks/api/support/kb-rag.ts`
- `streamlineos-frontend/frontend/app/(authenticated)/support/kb/page.tsx`
- `streamlineos-frontend/frontend/app/(authenticated)/support/kb/[articleId]/page.tsx`
- `streamlineos-frontend/frontend/components/kb/article-content.tsx`
- `streamlineos-frontend/frontend/components/support/kb-ask-panel.tsx`
- `streamlineos-frontend/frontend/lib/rbac/permissions/kb.ts`

## Migration Approach

Phase 1:

- Add new Knowledge schema without deleting current KB code.
- Create compatibility services so old support KB routes can read from new services.
- Add new `/knowledge` UI surfaces.

Phase 2:

- Move support KB data into Knowledge tables.
- Update support KB hooks to call Knowledge endpoints or shared API client functions.
- Keep `/support/kb` routes working.

Phase 3:

- Remove duplicate KB-only services/types/routes after all imports are migrated.
- Keep support-specific UI as a filtered Knowledge surface.

## Data Mapping

Existing `KbSpace`:

- `knowledge_spaces` with `type = support` or `company`.

Existing `KbCategory`:

- `knowledge_collections`, or parent articles if category is tree-like.

Existing `KbArticle`:

- `knowledge_articles`.

Existing status:

- Map draft/in_review/published/archived directly if available.

Existing visibility:

- `public` -> `public_help_center`.
- `internal` -> `team` or `company` based on current route/space.

Existing comments:

- `knowledge_comments`.

Existing attachments:

- `knowledge_attachments`.

Existing analytics:

- views/helpfulness/search events map to analytics tables where available.

## Compatibility Rules

- Do not break `/support/kb`.
- Do not change public article URLs without redirects.
- Preserve article IDs or create stable redirect mapping.
- Preserve slugs.
- Preserve author/owner where possible.
- Preserve published timestamps.
- Preserve helpfulness/vote counters.
- Preserve public/private attachment behavior.
- Preserve search analytics where available.

## Cleanup Rules

Delete only after verifying no imports remain:

- Duplicate types.
- Duplicate hooks.
- Duplicate API handlers.
- Duplicate components.

Use `rg` before deleting.

## Acceptance Criteria

- Existing support KB pages still render.
- New Knowledge pages can show support articles.
- No duplicate KB data models remain after cleanup.
- Public support articles stay accessible if they were public before migration.
- Migration can be previewed before write and retried idempotently.
