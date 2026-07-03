# StreamlineOS Product Bible

# Knowledge Module

# 07_Backend_APIs.md

## API Principles

- REST routes under `/api/knowledge`.
- Existing support KB routes must be migrated or wrapped to the same services.
- Every body, query, and param is validated with Zod.
- Every protected route verifies session and permission server-side.
- Return consistent error shape.
- Paginate all list endpoints.
- Use transactions for multi-step writes.
- Invalidate server caches and TanStack Query keys after mutations.

## Error Shape

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have access to this article.",
    "details": {}
  }
}
```

## Spaces

`GET /api/knowledge/spaces`

Query:

- `type`
- `search`
- `page`
- `pageSize`
- `includeArchived`

Returns paginated visible spaces.

`POST /api/knowledge/spaces`

Creates a space.

Required permission:

- `knowledge.space.create`

`GET /api/knowledge/spaces/[spaceId]`

Returns space details if visible.

`PATCH /api/knowledge/spaces/[spaceId]`

Updates space.

Required permission:

- space manage or `knowledge.space.manage`

`DELETE /api/knowledge/spaces/[spaceId]`

Soft archives/deletes space.

## Articles

`GET /api/knowledge/articles`

Query:

- `spaceId`
- `parentArticleId`
- `status`
- `visibility`
- `ownerUserId`
- `tag`
- `search`
- `page`
- `pageSize`

`POST /api/knowledge/articles`

Creates an article.

Body:

- `spaceId`
- `parentArticleId`
- `templateId`
- `title`
- `contentJson`
- `visibility`

`GET /api/knowledge/articles/[articleId]`

Returns article with permissions, metadata, and optional editor content.

`PATCH /api/knowledge/articles/[articleId]`

Updates title/content/metadata.

`DELETE /api/knowledge/articles/[articleId]`

Soft deletes article.

`POST /api/knowledge/articles/[articleId]/publish`

Publishes article or submits review depending workflow.

`POST /api/knowledge/articles/[articleId]/archive`

Archives article.

`POST /api/knowledge/articles/[articleId]/restore`

Restores article.

`POST /api/knowledge/articles/[articleId]/move`

Moves article to parent/space.

`POST /api/knowledge/articles/[articleId]/duplicate`

Duplicates article with optional descendants.

`POST /api/knowledge/articles/[articleId]/verify`

Marks article verified.

Body:

- `verifiedUntil`
- `verificationNote`

`POST /api/knowledge/articles/[articleId]/mark-stale`

Marks article as needing verification.

`POST /api/knowledge/articles/[articleId]/lock`

Creates an edit lock.

`DELETE /api/knowledge/articles/[articleId]/lock`

Releases an edit lock.

## Article Tree

`GET /api/knowledge/spaces/[spaceId]/tree`

Returns nested tree visible to user.

`POST /api/knowledge/spaces/[spaceId]/tree/reorder`

Body:

- ordered article IDs with parent IDs.

Must validate user can edit all moved articles.

## Share And Permissions

`GET /api/knowledge/articles/[articleId]/permissions`

`PUT /api/knowledge/articles/[articleId]/permissions`

`GET /api/knowledge/spaces/[spaceId]/permissions`

`PUT /api/knowledge/spaces/[spaceId]/permissions`

Only manage permission users can call.

## Favorites And Recents

`GET /api/knowledge/favorites`

`POST /api/knowledge/favorites`

`DELETE /api/knowledge/favorites/[favoriteId]`

`GET /api/knowledge/recent`

`POST /api/knowledge/articles/[articleId]/view`

## Comments

`GET /api/knowledge/articles/[articleId]/comments`

`POST /api/knowledge/articles/[articleId]/comments`

`PATCH /api/knowledge/comments/[commentId]`

`DELETE /api/knowledge/comments/[commentId]`

`POST /api/knowledge/comments/[commentId]/resolve`

## Versions

`GET /api/knowledge/articles/[articleId]/versions`

`GET /api/knowledge/articles/[articleId]/versions/[versionId]`

`POST /api/knowledge/articles/[articleId]/versions/[versionId]/restore`

## Templates

`GET /api/knowledge/templates`

`POST /api/knowledge/templates`

`PATCH /api/knowledge/templates/[templateId]`

`DELETE /api/knowledge/templates/[templateId]`

`POST /api/knowledge/templates/[templateId]/apply`

## Reviews

`GET /api/knowledge/reviews`

`POST /api/knowledge/articles/[articleId]/reviews`

`POST /api/knowledge/reviews/[reviewId]/approve`

`POST /api/knowledge/reviews/[reviewId]/reject`

`POST /api/knowledge/reviews/[reviewId]/verify`

## Search And AI

`GET /api/knowledge/search`

Query:

- `q`
- `spaceId`
- `type`
- `page`
- `pageSize`

`POST /api/knowledge/ask`

Body:

- `question`
- `spaceId`
- `articleId`
- `linkedRecord`

Response:

- `answer`
- `citations`
- `hasContext`
- `usage`

## Import And Export

`POST /api/knowledge/import/preview`

Validates and previews import.

`POST /api/knowledge/import/jobs`

Starts import job.

`GET /api/knowledge/import/jobs`

Lists import jobs.

`GET /api/knowledge/import/jobs/[jobId]`

Gets import result and error report.

`POST /api/knowledge/export/jobs`

Starts export job.

`GET /api/knowledge/export/jobs`

Lists export jobs.

`GET /api/knowledge/export/jobs/[jobId]`

Gets export status and download link if ready.

## Trash

`GET /api/knowledge/trash`

Lists deleted articles, spaces, and templates.

`POST /api/knowledge/trash/[resourceType]/[resourceId]/restore`

Restores resource.

`DELETE /api/knowledge/trash/[resourceType]/[resourceId]`

Permanent delete only when retention policy and permission allow.

## Attachments

`POST /api/knowledge/articles/[articleId]/attachments`

`DELETE /api/knowledge/attachments/[attachmentId]`

Uploads must validate:

- file type
- file size
- extension
- organization storage quota
- permission

## Analytics

`GET /api/knowledge/analytics/overview`

`GET /api/knowledge/analytics/articles`

`GET /api/knowledge/analytics/searches`

`GET /api/knowledge/analytics/gaps`

## Public Help Center

`GET /api/public/help/[spaceSlug]`

`GET /api/public/help/[spaceSlug]/[articleSlug]`

Public endpoints:

- Only return published public help center content.
- Never return internal permissions, comments, audit, draft content, private attachments, or author private details.

## Acceptance Criteria

- API routes use descriptive dynamic params.
- All params and body fields are Zod-validated.
- All protected endpoints use `requirePermission()` or repo equivalent.
- All list endpoints paginate.
- All mutations audit meaningful changes.
- Import/export endpoints are asynchronous for large jobs and idempotent where possible.
