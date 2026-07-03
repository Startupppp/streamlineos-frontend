# StreamlineOS Product Bible

# Knowledge Module

# 00_README.md

## Overview

Knowledge is the central documentation, notes, wiki, SOP, and help-center platform inside StreamlineOS.

It serves five audiences:

- Individual users writing private notes.
- Teams managing process documentation and decisions.
- Company administrators publishing policies and handbooks.
- Support teams publishing customer-facing help articles.
- AI features answering questions using permission-safe company knowledge.

## Reading Order

1. `01_Vision_Goals_Research.md`
2. `02_Information_Architecture.md`
3. `03_UI_UX_Every_Screen.md`
4. `04_Database_Design.md`
5. `05_Drizzle_Schema_And_Migrations.md`
6. `06_Knowledge_Engine.md`
7. `07_Backend_APIs.md`
8. `08_RBAC_Teams_And_Sharing.md`
9. `09_Editor_Collaboration_And_Versioning.md`
10. `10_Search_AI_RAG_And_Discovery.md`
11. `11_Workflows_Templates_And_Governance.md`
12. `12_Integrations_With_StreamlineOS_Modules.md`
13. `13_Analytics_Audit_Notifications.md`
14. `14_Performance_Security_And_Compliance.md`
15. `15_Testing_And_QA.md`
16. `16_Migration_From_Existing_KB.md`
17. `17_Claude_Code_Implementation.md`
18. `18_AI_Agent_Context_Bootstrap.md`

## Module Scope

Knowledge owns:

- Spaces
- Articles
- Private notes
- Team wikis
- Nested page tree
- Article editor
- Templates
- Favorites
- Comments
- Mentions
- Attachments
- Version history
- Verified/trusted state
- Approval workflows
- Trash and restore
- Import/export
- Help-center articles
- Search
- AI ask and citations
- Freshness reviews
- Knowledge analytics

Knowledge does not own:

- Authentication
- Subscription billing
- Core organization hierarchy
- Core RBAC framework
- File storage provider setup
- Chat realtime transport
- Support ticket lifecycle

Knowledge consumes those systems and adds documentation-specific behavior.

## Existing Repo Surfaces To Reuse

Audit first:

- `streamlineos-frontend/frontend/types/kb.ts`
- `streamlineos-frontend/frontend/hooks/api/kb`
- `streamlineos-frontend/frontend/hooks/api/support/kb.ts`
- `streamlineos-frontend/frontend/hooks/api/support/kb-attachments.ts`
- `streamlineos-frontend/frontend/hooks/api/support/kb-comments.ts`
- `streamlineos-frontend/frontend/hooks/api/support/kb-rag.ts`
- `streamlineos-frontend/frontend/app/(authenticated)/support/kb`
- `streamlineos-frontend/frontend/components/kb`
- `streamlineos-frontend/frontend/components/support/kb-ask-panel.tsx`
- `streamlineos-frontend/frontend/lib/rbac/permissions/kb.ts`

Do not create a second disconnected KB model.

## Target Routes

Authenticated:

- `/knowledge`
- `/knowledge/recent`
- `/knowledge/favorites`
- `/knowledge/private`
- `/knowledge/shared`
- `/knowledge/spaces`
- `/knowledge/spaces/[spaceId]`
- `/knowledge/articles/[articleId]`
- `/knowledge/articles/[articleId]/history`
- `/knowledge/templates`
- `/knowledge/reviews`
- `/knowledge/analytics`
- `/knowledge/settings`
- `/knowledge/import`
- `/knowledge/trash`

Support surface:

- `/support/kb`
- `/support/kb/[articleId]`

Public help center, if enabled:

- `/help`
- `/help/[spaceSlug]`
- `/help/[spaceSlug]/[articleSlug]`

## Definition of Done

- No duplicate Knowledge/KB backends.
- Existing support KB is preserved through migration.
- Knowledge is module-gated by subscription.
- Permissions are enforced on the server.
- UI follows the StreamlineOS design system.
- Article trees, editor, sharing, search, and AI are production-ready.
- Import/export, trash/restore, and verified content flows are included.
