# StreamlineOS Product Bible

# Knowledge Module

# 03_UI_UX_Every_Screen.md

## Design Goals

- Fast like notes.
- Structured like a wiki.
- Governed like ERP.
- Compact and professional.
- Minimal dialogs.
- Clear ownership and access.

## Global UI Rules

- Use existing StreamlineOS tokens from `globals.css`, `tailwind.config`, and shared UI components.
- Use lucide icons where available.
- No arbitrary colors.
- No oversized cards or decorative hero layouts.
- No unnecessary popups.
- Use Sheet for multi-section forms and settings.
- Use Dialog only for small confirmations or short forms.
- Use table/list layouts for dense management screens.
- Use skeletons matching real layout.
- All pages support 375px, 768px, and 1280px.

## `/knowledge`

Purpose:

- Main Knowledge dashboard.

Layout:

- Sticky Knowledge sidebar.
- Main content with compact sections.
- Right utility panel on desktop only for AI ask, activity, or reviews.

Required states:

- Loading skeleton for sidebar and dashboard sections.
- Error with retry.
- Empty state if no articles/spaces.

Required actions:

- New article.
- New space.
- Ask AI.
- Create from template.
- Import existing KB articles.

## `/knowledge/recent`

Purpose:

- Recently viewed and edited articles.

Required UI:

- List/table with title, space, owner, last activity, status.
- Filters: viewed by me, edited by me, published, draft.
- Search input.

## `/knowledge/favorites`

Purpose:

- User's pinned/favorite articles and spaces.

Required UI:

- Group favorites by space.
- Support drag order or pin order.
- Empty state with link to browse spaces.

## `/knowledge/private`

Purpose:

- Personal notes.

Required UI:

- Private article tree.
- Quick note creation.
- Clear private badge.
- Share action available but must warn that sharing converts visibility from private to shared.

## `/knowledge/shared`

Purpose:

- Articles and spaces shared directly with the user.

Required UI:

- Table/list.
- Shows who shared, permission level, expiration if any.
- Filter by permission: view, comment, edit, publish, admin.

## `/knowledge/spaces`

Purpose:

- Browse and manage spaces.

Required UI:

- Segmented filter: All, My teams, Company, Modules, Support, Archived.
- Search.
- Compact cards or table depending count.
- Create space Sheet.

Create Space fields:

- Name.
- Slug.
- Type.
- Description.
- Icon.
- Default visibility.
- Owning team.
- Owners.
- Members.
- Public help center enabled for support spaces only.

## `/knowledge/spaces/[spaceId]`

Purpose:

- Space landing and article tree.

Required UI:

- Header: space name, type, member count, settings.
- Article tree.
- Recent articles.
- Popular articles.
- Needs review.
- Empty state with create article and import actions.

## `/knowledge/articles/[articleId]`

Purpose:

- Read and edit article.

Desktop layout:

- Left sidebar: spaces/tree.
- Center: article editor or reader.
- Right panel: outline, metadata, comments, activity, linked records, AI.

Mobile layout:

- Top bar with back, title, actions.
- Editor fills page.
- Metadata/comments open as Sheet.

Required actions:

- Edit.
- Save draft.
- Publish.
- Verify.
- Mark stale.
- Submit for review.
- Approve/reject.
- Archive.
- Duplicate.
- Move.
- Favorite.
- Share.
- Copy link.
- Export.
- View history.
- Attach file.
- Add linked record.

Editor requirements:

- Title field.
- Rich text blocks.
- Headings.
- Bullet list.
- Numbered list.
- Checklist.
- Quote.
- Code block.
- Table if supported by existing editor stack or defer to post-MVP.
- Image.
- Attachment.
- Link.
- Mention user.
- Mention article.
- Mention record.
- Divider.
- Callout.
- StreamlineOS record embed.

## `/knowledge/articles/[articleId]/history`

Purpose:

- Version history and restore.

Required UI:

- Version list.
- Diff preview.
- Restore action.
- Published version marker.
- Actor and timestamp.

## `/knowledge/templates`

Purpose:

- Manage article templates.

Required UI:

- Template library.
- Categories.
- Create/edit template.
- Preview.
- Default templates.
- Template usage count.

Template creation:

- Use full page or Sheet depending complexity.
- Include title, description, category, scope, default content, variables, status.

## `/knowledge/reviews`

Purpose:

- Governance queue for articles needing approval or freshness review.

Required UI:

- Tabs: Pending approval, stale, scheduled, rejected, mine.
- Table columns: article, owner, space, status, due date, reviewer, risk.
- Bulk assign reviewer.
- Bulk mark verified if permission allows.

## `/knowledge/analytics`

Purpose:

- Measure article health and usefulness.

Required UI:

- KPIs: total articles, published, verified, stale, searches, failed searches, AI answers, helpfulness.
- Top articles.
- No-result searches.
- Articles with negative feedback.
- Team coverage.
- Support article deflection.

## `/knowledge/settings`

Purpose:

- Module-level settings.

Required UI:

- General settings.
- Default spaces.
- Review intervals.
- Public help center.
- AI settings.
- Import/export.
- Retention.
- Permissions defaults.
- Verification requirements.

## `/knowledge/import`

Purpose:

- Import existing documents and preview migration from old KB or external sources.

Required UI:

- Import source selector.
- File upload dropzone.
- Space/category mapping.
- Preview table.
- Duplicate detection results.
- Validation errors.
- Start import action.
- Import history.

Supported MVP imports:

- Markdown.
- HTML.
- CSV metadata.
- Existing support KB migration preview.

## `/knowledge/trash`

Purpose:

- Restore recently deleted Knowledge content.

Required UI:

- Tabs: Articles, Spaces, Templates.
- Columns: title, original space, deleted by, deleted at, retention expiry.
- Restore action.
- Permanent delete only if retention policy and permission allow it.

## Public Help Center Screens

Routes:

- `/help`
- `/help/[spaceSlug]`
- `/help/[spaceSlug]/[articleSlug]`

Required UI:

- Public search.
- Category/collection navigation.
- Article page.
- Helpful/not helpful feedback.
- Related articles.
- Contact support fallback if enabled.

Rules:

- No internal app chrome.
- No internal comments.
- No draft/status/internal metadata.
- No private attachments.

## Share Sheet

Use Sheet, not Dialog.

Sections:

- Link access.
- People.
- Teams.
- Roles.
- Organization-wide access.
- Expiration.
- Public help center access if eligible.

Permission levels:

- View.
- Comment.
- Edit.
- Publish.
- Manage.

## Article Metadata Sheet

Fields:

- Space.
- Parent.
- Collection.
- Status.
- Visibility.
- Owner.
- Review interval.
- Tags.
- Linked records.
- SEO fields for public articles.
- Verification owner and expiry.
- Import source metadata.

## UX Anti-Patterns To Avoid

- Do not force a modal before users can start writing.
- Do not split article creation into many steps.
- Do not bury share settings behind multiple dialogs.
- Do not show unavailable modules as broken links.
- Do not show AI answers without citations.
- Do not show private articles in global search to unauthorized users.
- Do not make permanent delete easy; use retention-aware confirmation.
