# StreamlineOS Product Bible

# Knowledge Module

# 15_Testing_And_QA.md

## Test Strategy

Test at four levels:

- Unit tests for services and permission logic.
- API tests for validation, permissions, and mutations.
- Component tests if the repo supports them.
- Playwright/manual QA for critical UI flows.

## Unit Tests

Cover:

- Permission resolution.
- Space creation.
- Private space creation.
- Article create/update/publish/archive.
- Article move and tree path updates.
- Version creation.
- Share grants.
- Review workflow.
- Search filtering.
- AI retrieval filtering.
- Import parser and duplicate detection.
- Export permission checks.
- Verification expiry logic.

## API Tests

Cover:

- Missing session returns 401.
- Missing permission returns 403.
- Invalid body returns 400.
- Cross-tenant access returns 404 or 403 per repo convention.
- List pagination.
- Article create with version transaction.
- Publish workflow.
- Public help article read.
- Private article not visible through search.
- Public publish blocked when private attachment exists.
- Export blocked when user cannot view all selected articles.

## UI QA

Screens:

- Knowledge home.
- Recent.
- Favorites.
- Private notes.
- Shared with me.
- Spaces list.
- Space detail/tree.
- Article editor.
- Article history.
- Templates.
- Reviews.
- Analytics.
- Settings.
- Import.
- Trash.
- Support KB migrated surface.
- Public help article.

Viewports:

- 375px.
- 768px.
- 1280px.

States:

- Loading.
- Empty.
- Error.
- Permission denied.
- Feature disabled.
- Offline/network failure for autosave.

## Critical Flows

1. Create private note.
2. Create team space.
3. Create article from template.
4. Edit and autosave article.
5. Publish article.
6. Share article with team.
7. Comment and mention user.
8. Favorite article.
9. Search article.
10. Ask AI and verify citations.
11. Submit article for review.
12. Approve and publish public support article.
13. Restore previous version.
14. Archive article.
15. Restore article from trash.
16. Verify article and let verification expire.
17. Import Markdown articles with duplicate detection.
18. Export a space as Markdown.

## Permission QA Matrix

Roles:

- Org owner.
- Admin.
- Department head.
- Team lead.
- Employee.
- Support agent.
- External anonymous visitor.

Content:

- Private article.
- Team article.
- Company article.
- Draft article.
- Published article.
- Public help article.
- Archived article.

Actions:

- View.
- Comment.
- Edit.
- Publish.
- Share.
- Manage.
- Ask AI.
- Export.

## Accessibility

Verify:

- Keyboard navigation in sidebar tree.
- Focus visible.
- Editor toolbar labels/tooltips.
- Dialog/sheet focus management.
- Color contrast.
- Screen reader labels for icon buttons.

## Build Verification

Run from frontend package:

- `pnpm lint`
- `pnpm build`

Run tests if available:

- `pnpm test`
- or existing project-specific test command.

## Acceptance Criteria

- All critical flows pass.
- No unauthorized content appears in UI, API, search, AI, analytics, or notifications.
- Import/export/trash flows respect permissions and retention.
- Lint and build pass.
- Any skipped tests are documented with reason.
