# StreamlineOS Product Bible

# Knowledge Module

# 08_RBAC_Teams_And_Sharing.md

## Purpose

Knowledge permissions must support personal notes, team access, company-wide docs, public support articles, and module-aware access.

## Permission Names

Add or extend:

- `knowledge.view`
- `knowledge.space.create`
- `knowledge.space.manage`
- `knowledge.article.create`
- `knowledge.article.view`
- `knowledge.article.comment`
- `knowledge.article.edit`
- `knowledge.article.publish`
- `knowledge.article.archive`
- `knowledge.article.delete`
- `knowledge.article.share`
- `knowledge.template.manage`
- `knowledge.review.manage`
- `knowledge.analytics.view`
- `knowledge.settings.manage`
- `knowledge.ai.ask`
- `knowledge.public_help.publish`
- `knowledge.import`
- `knowledge.export`
- `knowledge.trash.restore`
- `knowledge.trash.delete_permanently`
- `knowledge.article.verify`

## Resource-Level Roles

For spaces and articles:

- Viewer
- Commenter
- Editor
- Publisher
- Manager

## Plan-Aware Capabilities

Gate by subscription:

- Private notes.
- Team spaces.
- Public help center.
- AI ask.
- AI indexing.
- Advanced analytics.
- Import/export.
- Version retention.
- Storage quota.
- Verification workflows.

## Access Resolution Order

1. Platform owner/super admin, if applicable.
2. Organization owner.
3. Direct article permission.
4. Direct space permission.
5. Team permission.
6. Department permission.
7. Role permission.
8. Organization-wide permission.
9. Module permission for linked module spaces.
10. Public help center visibility for anonymous users.

The most permissive valid grant wins unless an explicit deny system already exists in the repo. Do not add deny rules unless the RBAC platform already supports them.

## Private Notes

Rules:

- Private space is visible only to owner by default.
- Admins cannot read private notes through normal UI.
- Legal/export access, if ever needed, is enterprise-only and audited.
- Sharing a private article makes it shared and creates explicit permission grants.

## Team Spaces

Rules:

- Team lead can manage team space if granted by role.
- Team members can view by default.
- Editors/publishers are explicit grants or role-based.
- Removing a user from a team removes inherited access immediately.

## Company Spaces

Rules:

- Visible to all active organization members by default.
- Editing/publishing requires explicit permission.
- Company policies require review workflow if enabled.

## Module Spaces

Examples:

- CRM Knowledge
- HR Knowledge
- Inventory Knowledge
- Support Knowledge
- Projects Knowledge

Rules:

- Module spaces are visible only to users with module access.
- Article access cannot exceed module access for linked confidential records.
- A user without HR access must not see HR-linked articles unless article is explicitly published company-wide and contains no restricted linked data.

## Public Help Center

Rules:

- Only published articles with `visibility = public_help_center` are anonymous-readable.
- Public articles cannot include internal comments or restricted attachments.
- Public publishing requires publish permission and support/help-center permission.
- Public article URLs must be stable.

## Share Sheet Behavior

Share sheet must show:

- Current access.
- Inherited access.
- Direct grants.
- Link access.
- Expiration.
- Warnings when sharing outside current team or making public.

## Link Access Levels

Internal link:

- Anyone in organization with link can view.

Restricted link:

- Only explicitly invited users/teams can open.

Public link:

- Only for public help center articles.
- Requires public publishing permission.

## Billing Gate

Knowledge availability is controlled by subscription:

- Module enabled.
- User seat access.
- Plan limits for AI ask, storage, public help center, version history, analytics, and templates.

If Knowledge is disabled:

- Hide navigation.
- API returns 403 with feature gate code.
- Existing public help articles can remain readable only if plan allows public help center continuity.

## Acceptance Criteria

- Client-side checks improve UX only.
- Server-side checks enforce every read/write.
- AI, search, exports, analytics, and notifications use the same permission model.
- Permission tests cover direct, team, role, org, private, module, and public cases.
- Import/export/trash permissions cannot bypass article-level access.
