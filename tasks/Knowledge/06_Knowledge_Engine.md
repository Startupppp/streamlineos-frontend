# StreamlineOS Product Bible

# Knowledge Module

# 06_Knowledge_Engine.md

## Purpose

The Knowledge Engine owns business logic. API route handlers must stay thin.

## Folder Targets

Adapt to existing repository conventions, but preferred structure:

- `lib/services/knowledge/space-service.ts`
- `lib/services/knowledge/article-service.ts`
- `lib/services/knowledge/permission-service.ts`
- `lib/services/knowledge/editor-service.ts`
- `lib/services/knowledge/template-service.ts`
- `lib/services/knowledge/review-service.ts`
- `lib/services/knowledge/search-service.ts`
- `lib/services/knowledge/ai-service.ts`
- `lib/services/knowledge/analytics-service.ts`
- `lib/services/knowledge/import-service.ts`
- `lib/services/knowledge/export-service.ts`
- `lib/services/knowledge/duplicate-detection-service.ts`
- `lib/repositories/knowledge/*`
- `lib/validation/knowledge.ts`
- `types/knowledge.ts`

If the repo already has a different services/repositories convention, follow it.

## Engine Responsibilities

## Space Service

- Create space.
- Update space.
- Archive space.
- List spaces visible to user.
- Resolve default company space.
- Resolve or create private user space.
- Manage space members.

## Article Service

- Create article.
- Update article.
- Move article.
- Duplicate article.
- Archive article.
- Restore article.
- Restore from trash.
- Permanently delete when retention policy allows.
- Publish article.
- Verify article.
- Expire verification.
- Submit for review.
- Approve/reject article.
- Reorder article tree.
- Generate slug.
- Maintain path and depth.
- Create article version.
- Sanitize HTML.
- Extract content text.
- Queue embedding refresh.
- Detect duplicates.
- Manage edit locks.

## Permission Service

- Check resource access.
- Calculate inherited permissions from space to article.
- Apply explicit article overrides.
- Resolve user access from role, team, department, organization, and direct shares.
- Enforce module subscription gates.
- Provide explainable access output for debugging and audit.

## Template Service

- List templates.
- Create template.
- Update template.
- Apply template to article.
- Replace variables.
- Track template usage.

## Review Service

- Create approval request.
- Create freshness review.
- Assign reviewer.
- Approve/reject.
- Mark verified.
- Detect stale articles.
- Send review notifications.

## Search Service

- Keyword search.
- Scoped search.
- Permission-filtered results.
- Recent and favorites ranking.
- Log no-result searches.
- Suggest article creation from failed searches.
- Rank verified content above unverified content when relevant.

## AI Service

- Create embeddings.
- Ask question over permitted content.
- Return answer with citations.
- Refuse or fallback when no permitted context exists.
- Log AI usage and citations.
- Respect AI top-up/credit billing rules.

## Analytics Service

- Track views.
- Track feedback.
- Track search events.
- Compute article health.
- Compute stale content.
- Compute support deflection.

## Import Service

- Validate source files.
- Parse Markdown, HTML, and CSV metadata.
- Preview import before write.
- Detect duplicates.
- Map source categories to spaces/collections.
- Create import jobs.
- Produce error reports.
- Support idempotent retry.

## Export Service

- Export article as Markdown or HTML.
- Export space as ZIP of Markdown/HTML.
- Export metadata as CSV.
- Enforce permission and retention policy.
- Expire generated files.

## Business Rules

- Creating an article in a private space creates `visibility = private`.
- Sharing a private article changes visibility to `shared`.
- Publishing requires `knowledge.article.publish`.
- Public help center publish requires both `knowledge.article.publish` and `support.kb.publish` if support permissions exist.
- Moving article to another space recalculates inherited permissions.
- Archiving a parent article archives descendants unless user chooses move children first.
- Deleting is soft-delete.
- Restoring an article restores only the selected article unless restoring subtree is explicitly requested.
- AI indexing only uses published articles by default. Draft indexing is allowed only for the author/editor and must never leak to other users.
- Article save creates a new version only when meaningful content changed or publish occurs.
- Updating verified content marks it unverified or requires re-verification unless the editor is also verifier and policy allows immediate re-verify.
- Duplicate detection should warn, not block, unless organization policy enforces it.

## Concurrency

- Use optimistic UI for editor saves.
- Store `updatedAt` or version for conflict checks.
- If conflict detected, show compare/merge flow rather than overwriting.
- Autosave should debounce and be idempotent.

## Events

Emit domain events:

- `knowledge.space.created`
- `knowledge.article.created`
- `knowledge.article.updated`
- `knowledge.article.published`
- `knowledge.article.archived`
- `knowledge.article.shared`
- `knowledge.article.review_requested`
- `knowledge.article.review_completed`
- `knowledge.article.comment_created`
- `knowledge.article.verified`
- `knowledge.article.verification_expired`
- `knowledge.search.no_results`
- `knowledge.import.completed`
- `knowledge.export.completed`
- `knowledge.ai.asked`

Use existing event/notification infrastructure if present.

## Acceptance Criteria

- Route handlers contain validation, auth, permission checks, and service calls only.
- Business logic is testable without rendering UI.
- No raw DB calls inside React components.
- No cross-tenant access is possible.
