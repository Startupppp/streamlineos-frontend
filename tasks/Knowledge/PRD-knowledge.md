# StreamlineOS Product Bible

# Knowledge Module PRD

## Purpose

Knowledge is the internal memory layer for StreamlineOS. It combines notes, SOPs, policies, public help articles, project decisions, team playbooks, onboarding material, and AI-answerable knowledge into one permission-aware system.

The module must feel as fast and simple as Odoo Knowledge, but fit StreamlineOS better by connecting directly with HR, CRM, Inventory, Projects, Support, Chat, Organization, Billing, AI, and RBAC.

## Current Context

The repository already has a support knowledge base slice:

- `streamlineos-frontend/frontend/app/(authenticated)/support/kb`
- `streamlineos-frontend/frontend/types/kb.ts`
- `streamlineos-frontend/frontend/hooks/api/kb`
- `streamlineos-frontend/frontend/hooks/api/support/kb*`
- `streamlineos-frontend/frontend/lib/rbac/permissions/kb.ts`

This existing slice should be audited and migrated into the new Knowledge module instead of duplicated. Public support articles remain a surface of Knowledge, not a separate product.

## Competitive Baseline

Research sources:

- Odoo Knowledge documentation: https://www.odoo.com/documentation/19.0/applications/productivity/knowledge.html
- Odoo article management documentation: https://www.odoo.com/documentation/16.0/applications/productivity/knowledge/management.html
- Notion Wiki guidance: https://www.notion.com/help/guides/category/wiki
- Notion verified pages: https://www.notion.com/help/wikis-and-verified-pages
- Notion sharing and permissions: https://www.notion.com/help/sharing-and-permissions
- Notion AI security practices: https://www.notion.com/help/notion-ai-security-practices
- Confluence knowledge base guide: https://www.atlassian.com/software/confluence/resources/guides/best-practices/knowledge-base
- Confluence features: https://www.atlassian.com/software/confluence/features
- Guru knowledge governance positioning: https://www.getguru.com/

## Product Positioning

Knowledge should be positioned as:

- A company wiki for teams.
- A notes app for individuals.
- A SOP and policy library for operations.
- A support knowledge base for customers.
- A module-aware documentation layer for CRM, HR, Inventory, Projects, Accounting, and Support.
- A permission-safe AI memory layer.

## Primary Navigation

Add a top-level authenticated module:

- `/knowledge`

Support KB should stay accessible as:

- `/support/kb`

But it must read/write the same Knowledge data model with `surface = support_help_center`.

## Ordered PRD Pack

Read and implement in this order:

1. `Knowledge/00_README.md`
2. `Knowledge/01_Vision_Goals_Research.md`
3. `Knowledge/02_Information_Architecture.md`
4. `Knowledge/03_UI_UX_Every_Screen.md`
5. `Knowledge/04_Database_Design.md`
6. `Knowledge/05_Drizzle_Schema_And_Migrations.md`
7. `Knowledge/06_Knowledge_Engine.md`
8. `Knowledge/07_Backend_APIs.md`
9. `Knowledge/08_RBAC_Teams_And_Sharing.md`
10. `Knowledge/09_Editor_Collaboration_And_Versioning.md`
11. `Knowledge/10_Search_AI_RAG_And_Discovery.md`
12. `Knowledge/11_Workflows_Templates_And_Governance.md`
13. `Knowledge/12_Integrations_With_StreamlineOS_Modules.md`
14. `Knowledge/13_Analytics_Audit_Notifications.md`
15. `Knowledge/14_Performance_Security_And_Compliance.md`
16. `Knowledge/15_Testing_And_QA.md`
17. `Knowledge/16_Migration_From_Existing_KB.md`
18. `Knowledge/17_Claude_Code_Implementation.md`
19. `Knowledge/18_AI_Agent_Context_Bootstrap.md`

## MVP Scope

Must ship:

- Knowledge dashboard.
- Personal notes.
- Team spaces.
- Workspace/company articles.
- Nested article tree.
- Favorites.
- Recently viewed.
- Draft/published/archived lifecycle.
- Tiptap rich text editor using existing dependencies.
- Templates.
- Share sheet with users, teams, roles, and link settings.
- Comments.
- Mentions.
- Attachments.
- Article version history.
- Verified/trusted article state with owner and expiry.
- Import/export.
- Trash/restore.
- Global and scoped search.
- Existing support KB migration.
- RBAC enforcement server-side.
- Billing feature gate.
- Audit log.
- Basic AI ask over permitted articles.

## Edge Differentiators

StreamlineOS should exceed Odoo/Notion/Confluence for mid-market operations by adding:

- Module-aware articles linked to CRM deals, HR employees, inventory products, projects, tasks, support tickets, accounting records, and chat channels.
- Permission-safe AI answers that respect the user's exact article and module access.
- SOP freshness reviews with owners, due dates, and stale content alerts.
- Operational embeds: live tables, saved views, KPIs, checklists, forms, and process cards from StreamlineOS modules.
- Team onboarding packs generated from selected spaces and templates.
- Approval workflows for policies and customer-facing help articles.
- Knowledge gaps from support tickets, failed searches, and repeated chat questions.
- Verified answer layer inspired by Guru-style governance: AI should prefer verified, owner-approved content over stale drafts.

## Definition of Done

Knowledge is done when:

- The module is available only to subscribed organizations with the Knowledge feature enabled.
- Every knowledge record belongs to an organization.
- Server-side permissions protect every read and write.
- Existing support KB pages use the same backend model.
- AI answers never use content the requesting user cannot access.
- AI answers flag stale or unverified citations.
- Lists are paginated and indexed.
- Mutations invalidate TanStack Query and server caches.
- UI is compact, consistent, responsive, accessible, and free of unnecessary dialogs.
- Lint, typecheck, tests, and production build pass.
