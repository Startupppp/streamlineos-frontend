# StreamlineOS Product Bible

# Knowledge Module

# 01_Vision_Goals_Research.md

## Vision

Make StreamlineOS the operating memory of a company.

Employees should know where to write, find, trust, and reuse knowledge without switching between Notion, Confluence, Google Docs, shared drives, and disconnected help-center tools.

## Problems To Solve

- Important process knowledge is scattered across chat, tickets, spreadsheets, documents, and people's heads.
- Existing support KB is too narrow and separated from internal documentation.
- Users need private notes, team notes, SOPs, and customer-facing articles in one place.
- Permissions must respect modules, teams, roles, and article-level sharing.
- AI should answer from company knowledge, but only from content the user can access.
- Stale SOPs and policies create operational risk.
- Mid-market teams want Notion-like speed but ERP-grade governance.

## Competitor Baseline

Odoo Knowledge provides:

- Internal articles.
- Parent/child article nesting.
- Favorites and workspace/private sections.
- Article creation from scratch or templates.
- Sharing and article management.
- Integrated business-app context.

Notion provides:

- Flexible pages and databases.
- Teamspaces.
- Page sharing with permission levels.
- Verification/trust signals.
- AI search across connected tools with permission awareness.

Confluence provides:

- Spaces.
- Pages.
- Templates.
- Versioning.
- Collaboration.
- Knowledge base structure.
- Enterprise permissions and app ecosystem.

Guru provides:

- Strong positioning around governed and verified knowledge for AI.
- Verification workflows that make answers more trustworthy.
- Analytics and knowledge health signals.

## StreamlineOS Edge

StreamlineOS should win by being operationally connected:

- Link articles to live business records: deals, invoices, employees, policies, projects, assets, stock items, vendors, support tickets, goals, and chat channels.
- Create SOPs directly from repeated support tickets, failed searches, chat discussions, onboarding checklists, and workflow events.
- Use module permissions as context, not just article permissions.
- Provide article freshness and ownership by team.
- Provide AI answers with citations and access proof.
- Prefer verified content in AI and search ranking.
- Turn Knowledge into an onboarding, compliance, support, and operating layer, not just a document repository.

## Target Customers

Initial:

- Small and mid-market businesses.
- Teams that currently use spreadsheets, chat, Notion, Google Docs, or Odoo Knowledge.
- Companies using StreamlineOS for HR, CRM, Inventory, Projects, Support, or Chat.

Future:

- Enterprise customers needing advanced governance, legal holds, retention, advanced analytics, SCIM-driven ownership, and regional data policies.

## Personas

## Founder / CEO

Needs:

- Company operating manual.
- Team accountability.
- Fast search.
- Decision history.
- AI answers across permitted company knowledge.

## Department Head

Needs:

- Team wiki.
- SOPs.
- Approval workflows.
- Freshness review reminders.
- Team-level permissions.

## Employee

Needs:

- Personal notes.
- Quick article creation.
- Favorites.
- Recently viewed.
- Search and AI ask.
- Clear distinction between private, team, and company content.

## HR Admin

Needs:

- Policies.
- Handbook.
- Onboarding packs.
- Employee-facing documents.
- Compliance review trail.

## Support Manager

Needs:

- Customer-facing articles.
- Internal macros and troubleshooting guides.
- Article suggestions from tickets.
- Helpfulness metrics and failed searches.

## Product / Engineering Manager

Needs:

- Product specs.
- Release notes.
- Incident postmortems.
- Technical runbooks.
- Decision records.

## Success Metrics

- 80% of active organizations create at least one Knowledge space within 14 days of enabling the module.
- 50% of weekly active users view or search Knowledge.
- Median article search result click time under 5 seconds.
- AI answer acceptance rate above 60%.
- Support tickets linked to KB articles increase month over month.
- Stale published articles below 15%.
- Verified published articles above 70% for policy, SOP, and support categories.
- At least 30% of onboarding organizations use a template pack.

## Non-Goals For MVP

- Full offline editing.
- Full public website builder for docs.
- Complex database views like Notion databases.
- Google Docs import with perfect formatting.
- Multi-region data residency.
- External guest collaboration beyond public help articles.

## MVP Principles

- Reuse existing KB infrastructure where possible.
- Make the editor fast and focused.
- Keep navigation Odoo-simple: Favorites, Workspace, Private, Shared, Spaces.
- Use Sheets only for large multi-row data work; Knowledge is for text, decisions, SOPs, guides, checklists, embeds, and context.
- Large editing and article settings use full-page or side panel patterns, not many dialogs.
- Every action must be permission-aware.
