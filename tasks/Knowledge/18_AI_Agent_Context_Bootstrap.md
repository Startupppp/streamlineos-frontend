# StreamlineOS Product Bible

# Knowledge Module

# 18_AI_Agent_Context_Bootstrap.md

## Purpose

Use this file as the first prompt/context document when handing the Knowledge feature to an AI coding agent. It prevents the agent from starting without repo context or accidentally building a disconnected module.

## First Instruction To Agent

You are implementing the StreamlineOS Knowledge module from scratch inside the existing repository. Do not assume architecture. Read the repository first, then implement using existing patterns.

## Required Reading Before Coding

1. `PRD-knowledge.md`
2. `Knowledge/00_README.md`
3. `Knowledge/01_Vision_Goals_Research.md`
4. `Knowledge/02_Information_Architecture.md`
5. `Knowledge/03_UI_UX_Every_Screen.md`
6. `Knowledge/04_Database_Design.md`
7. `Knowledge/05_Drizzle_Schema_And_Migrations.md`
8. `Knowledge/06_Knowledge_Engine.md`
9. `Knowledge/07_Backend_APIs.md`
10. `Knowledge/08_RBAC_Teams_And_Sharing.md`
11. `Knowledge/09_Editor_Collaboration_And_Versioning.md`
12. `Knowledge/10_Search_AI_RAG_And_Discovery.md`
13. `Knowledge/11_Workflows_Templates_And_Governance.md`
14. `Knowledge/12_Integrations_With_StreamlineOS_Modules.md`
15. `Knowledge/13_Analytics_Audit_Notifications.md`
16. `Knowledge/14_Performance_Security_And_Compliance.md`
17. `Knowledge/15_Testing_And_QA.md`
18. `Knowledge/16_Migration_From_Existing_KB.md`
19. `Knowledge/17_Claude_Code_Implementation.md`

## Mandatory Repo Audit

Before editing, inspect:

- `streamlineos-frontend/frontend/package.json`
- `streamlineos-frontend/frontend/app`
- `streamlineos-frontend/frontend/features`
- `streamlineos-frontend/frontend/components`
- `streamlineos-frontend/frontend/hooks/api`
- `streamlineos-frontend/frontend/lib/api-client.ts`
- `streamlineos-frontend/frontend/lib/query-keys.ts`
- `streamlineos-frontend/frontend/lib/rbac`
- `streamlineos-frontend/frontend/lib/billing`
- `streamlineos-frontend/frontend/lib/db`
- `streamlineos-frontend/frontend/types/kb.ts`
- `streamlineos-frontend/frontend/hooks/api/kb`
- `streamlineos-frontend/frontend/hooks/api/support/kb.ts`
- `streamlineos-frontend/frontend/app/(authenticated)/support/kb`
- `streamlineos-backend` if APIs or DB ownership live there.

## Non-Negotiable Decisions

- Do not create a separate Support KB product. Support KB is a Knowledge surface.
- Do not create a separate auth system.
- Do not bypass RBAC.
- Do not use raw fetch in components.
- Do not create a second editor library unless Tiptap cannot satisfy MVP.
- Do not use AI retrieval without permission filtering first.
- Do not expose public help center content unless article is published and public.
- Do not permanently delete content unless retention policy and permission allow it.

## Build Slices

Slice 1:

- RBAC permissions.
- Billing gate.
- Schema/migrations.
- Services/repositories.

Slice 2:

- Spaces.
- Articles.
- Tree.
- Editor/autosave.
- Versions.

Slice 3:

- Sharing.
- Comments.
- Mentions.
- Favorites.
- Recents.

Slice 4:

- Search.
- AI ask.
- Embeddings.
- Permission-safe citations.

Slice 5:

- Templates.
- Reviews.
- Verification.
- Analytics.

Slice 6:

- Import/export.
- Trash/restore.
- Existing support KB migration.
- Public help center.

## Output Required From Agent Before Editing

The agent must produce:

- Existing relevant files found.
- Existing patterns to reuse.
- Tables/routes/hooks/components that already exist.
- Exact implementation order.
- Files expected to be added/changed/deleted.
- Risks and assumptions.

Then implementation can begin.

## Final Done Checklist

- `/knowledge` works.
- `/support/kb` still works.
- Public help center works if enabled.
- Existing support KB data is migrated or compatibility-supported.
- All protected reads/writes enforce permissions server-side.
- Search and AI are permission-safe.
- Import/export/trash are permission-safe.
- Verified/trusted content states work.
- Lint, typecheck, tests, and build pass or failures are documented with exact reason.
