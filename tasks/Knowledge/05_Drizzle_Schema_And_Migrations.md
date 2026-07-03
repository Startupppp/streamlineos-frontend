# StreamlineOS Product Bible

# Knowledge Module

# 05_Drizzle_Schema_And_Migrations.md

## Purpose

Define how to implement Knowledge schema and migrations using the existing repository conventions.

## Pre-Implementation Audit

Before editing:

- Locate existing Drizzle schema files.
- Locate existing migration naming convention.
- Inspect existing KB/support tables if any.
- Inspect `types/kb.ts`.
- Inspect route handlers and hooks for support KB.
- Identify integer ID vs UUID convention in current DB.

Do not invent a parallel schema if KB tables already exist. Create migration scripts that extend or transform them.

## Schema Rules

- Every table must include `organizationId`.
- Use repository naming convention for camelCase vs snake_case exports.
- Use enums consistently.
- Add indexes for every list/filter path.
- Use transactions for article create with first version.
- Use unique constraints scoped by organization.
- Use soft-delete columns for user content.
- Avoid JSON-only designs for fields that are filtered or joined.
- Keep `contentText` as a searchable projection.
- Store editor JSON separately from sanitized HTML.

## Required Drizzle Objects

Create or extend:

- `knowledgeSpaces`
- `knowledgeCollections`
- `knowledgeArticles`
- `knowledgeArticleVersions`
- `knowledgePermissions`
- `knowledgeFavorites`
- `knowledgeArticleViews`
- `knowledgeComments`
- `knowledgeAttachments`
- `knowledgeTemplates`
- `knowledgeReviews`
- `knowledgeLinks`
- `knowledgeSearchEvents`
- `knowledgeAiEmbeddings`
- `knowledgeFeedback`
- `knowledgeAuditEvents`
- `knowledgeImportJobs`
- `knowledgeExportJobs`

## Migration Order

1. Create enums.
2. Create spaces.
3. Create collections.
4. Create articles.
5. Create versions.
6. Create permissions.
7. Create favorites/views/comments.
8. Create attachments/templates/reviews.
9. Create links/search/feedback/audit.
10. Create embeddings.
11. Create import/export jobs.
12. Backfill existing support KB records.
13. Add foreign keys and missing indexes.
14. Add data validation checks where supported.

## Existing KB Migration

If existing support KB tables exist:

- Preserve all article IDs if routes depend on them, or create a redirect/ID mapping table.
- Map current spaces/categories to `knowledge_spaces`, `knowledge_collections`, and nested articles.
- Map public articles to `visibility = public_help_center`.
- Map internal articles to `visibility = team` or `company`.
- Preserve views, helpful counts, comments, attachments, translations, and analytics if present.
- Preserve article slugs.
- Preserve public URL redirects where slugs change.
- Record migration source in import metadata.

## Backfill Defaults

For every organization:

- Create a company space named `Workspace`.
- Create one private space per active user on first access, not necessarily during migration.
- Create a support space if existing support KB data exists.
- Seed system templates globally.
- Seed default import mapping presets for support KB, Markdown, HTML, and CSV.

## Seed Templates

System templates:

- Blank note.
- SOP.
- Policy.
- Meeting notes.
- Decision record.
- Project brief.
- Sales playbook.
- Support article.
- Troubleshooting guide.
- HR onboarding guide.
- Inventory process.
- Incident postmortem.

## Migration Safety

- Migrations must be forward-only.
- Large backfills must be idempotent.
- Use batches for large organizations.
- Add nullable columns first, backfill, then enforce not-null where safe.
- Do not drop existing KB tables until routes are migrated and verified.
- Include rollback notes, but do not rely on destructive rollback.

## Acceptance Criteria

- Drizzle schema compiles.
- Migrations run on a clean database.
- Migrations run on an existing database with support KB data.
- No cross-tenant FK is possible.
- Query plans are acceptable for article tree, search, reviews, and permissions.
