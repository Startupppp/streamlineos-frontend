# StreamlineOS Product Bible

# Knowledge Module

# 17_Claude_Code_Implementation.md

## Implementation Mode

Act as senior CTO, PM, product manager, and full-stack engineer.

Before coding:

- Read this entire Knowledge PRD pack.
- Start with `18_AI_Agent_Context_Bootstrap.md` when giving this work to another AI coding agent.
- Read repository rules in `.claude/`, `CLAUDE.md`, and relevant docs.
- Audit existing KB/support implementation.
- Audit existing RBAC, billing gates, DB schema, migrations, API patterns, TanStack Query hooks, page layout, and design tokens.

## Strict Workflow

1. Audit first.
2. Produce a concise implementation plan.
3. Implement one slice at a time.
4. Reuse existing code.
5. Delete duplicate/dead code only after verifying imports.
6. Run lint, typecheck/build, and tests where available.
7. Update docs and page/task status if applicable.

## Implementation Order

1. Repository audit and migration plan.
2. RBAC permission definitions and billing gate.
3. Drizzle schema and migrations.
4. Knowledge services/repositories.
5. API routes.
6. TanStack Query hooks.
7. Shared Knowledge UI shell/sidebar.
8. Spaces and article tree.
9. Article editor and autosave.
10. Sharing and permissions Sheet.
11. Comments, mentions, favorites, recents.
12. Templates and reviews.
13. Search.
14. AI ask with permission-safe retrieval.
15. Analytics/audit/notifications.
16. Support KB migration.
17. Public help center surface if enabled.
18. Import/export and trash.
19. Verification/trusted content workflow.
20. QA, cleanup, docs.

## Code Quality Rules

- Strict TypeScript.
- No `any`.
- No type forcing hacks.
- No `@ts-ignore`.
- No raw fetch in components.
- No data fetching in `useEffect`.
- No duplicate code.
- No unnecessary comments.
- No console logs.
- No dead files.
- Thin route handlers.
- Business logic in services.
- DB access in repository/service layer.
- Zod validation for every input.
- Server-side permission checks.
- Paginated lists.
- Indexed queries.
- Explicit cache invalidation.

## UI Rules

- Follow StreamlineOS design tokens.
- Compact, clean, professional UI.
- Use Sheet for sharing, article metadata, and multi-section forms.
- Use Dialog only for small confirmations.
- Loading skeletons must match layout.
- Empty states fill available content area.
- Sidebar and page shell must not scroll with content.
- Main content scrolls internally.
- Buttons use icons where natural.
- Text must not overflow or overlap.

## Security Rules

- Every route validates session.
- Every protected action validates permission server-side.
- AI retrieval filters by permissions before prompt construction.
- Public endpoints return only public-safe fields.
- File uploads are validated.
- Sanitized HTML only.
- No secrets in code.
- Audit permissions, sharing, publishing, and deletion.

## Acceptance Criteria

The implementation is complete only when:

- `/knowledge` works end to end.
- `/support/kb` uses the unified Knowledge backend.
- Private, team, company, and public help articles are permission-safe.
- Search and AI never leak restricted content.
- Import/export/trash/verification flows work and are permission-safe.
- Existing KB data is migrated or compatibility-supported.
- Lint and build pass.
- Tests or documented QA cover critical flows.

## Final Report Format

When done, report:

- Files added.
- Files changed.
- Files deleted.
- Migrations created.
- Tests run.
- Known gaps.
- Manual QA notes.
