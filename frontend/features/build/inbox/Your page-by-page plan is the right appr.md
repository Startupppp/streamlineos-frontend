Your page-by-page plan is the right approach, with this completion rule:

1. Inventory the page’s current route, components, APIs, schemas, permissions, query keys, filters, states, responsive behavior, and open BT requirements.
2. Compare the current UI with the intended product experience.
3. Agree on the changes together.
4. Implement the smallest complete vertical slice.
5. Run focused tests, lint, typecheck, and contract checks.
6. Browser-test desktop, tablet, and mobile.
7. Test loading, empty, error, denial, not-found, refresh, Back/Forward, deep links, duplicate submission, and persistence.
8. Test applicable organization, module, project, record, and client access.
9. Check console and network failures.
10. Record evidence and mark the page **Build verified** only when all applicable checks pass.

Recommended Build order:

1. Command Center
2. Projects
3. Project details and navigation
4. Tickets list, board, and backlog
5. Ticket details
6. My Work and Drafts
7. Intake, Triage, Forms, and Feedbucket
8. Client Portal
9. Cycles, Epics, Milestones, and Releases
10. Goals, Roadmap, Products, Portfolios, and Programs
11. Workload, budgets, approvals, risks, and decisions
12. QA, incidents, reports, files, wiki, meetings, and collaboration
13. Build and project settings

Onboarding can remain with the other developer, but we should freeze its output contract: organization, enabled modules, invitations, custom fields, default templates, Build standing, and landing destination. That prevents onboarding work from breaking Build pages.

We are ready to begin with **Command Center**, or you can name another first page and the exact changes you want.