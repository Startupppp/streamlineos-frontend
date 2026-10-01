# Build Active Backlog

Updated 2026-09-30 from the current code, release status, page specifications, and architecture tickets.

This is the short execution queue for the next implementation sessions. The numbered page specs, architecture tickets, and release status remain the evidence source. Do not delete those evidence files when a packet is finished.

## Current product verdict

**Not sellable as a dependable ClickUp, Jira, or Linear replacement yet.** The module has a broad project-work surface, product planning, client portal, forms, feedback, Wiki, QA, reporting, settings, imports, permissions, and cache-sync foundations. It is suitable for a controlled pilot, but release is blocked by the data-lifecycle defect, stale API contract, incomplete browser matrix, missing real fixtures for several product workflows, and the guided freelancer handoff.

Current documentation snapshot: 273 Markdown files and 124 unchecked boxes. These are not 124 unique workflows; several are repeated page and release evidence requirements.

## Packet 1 — Release blockers and data lifecycle

**Status:** OPEN. **Owner:** backend/data. **User job:** safely delete, restore, retain, and recover Build records without losing related work.

Tasks:

- Fix project deletion for projects containing tickets and preserve the status foreign-key invariant.
- Define whether deletion is soft-delete only, reversible archive, or permanent deletion, then make the API and UI agree.
- Make restore preserve members, statuses, assignees, attachments, labels, timesheets, and ticket relationships.
- Decide and implement retention/legal-hold scope for comments, files, incidents, approvals, and client evidence.
- Prevent the retention scheduler from destroying data until migration 1540, policy, and rollout controls are verified.
- Add database-backed behavior tests and verify the real application role against the production-safe target.

Evidence: `RELEASE-STATUS.md` Finding 1 and the retention finding; `99-open-questions.md` questions 9, 10, and 12.

## Packet 2 — API contract and deployment parity

**Status:** OPEN. **Owner:** backend plus frontend. **User job:** ensure every visible Build action calls an API that exists in the deployed contract.

Tasks:

- Regenerate the backend OpenAPI artifact using the official generator.
- Vendor the regenerated contract into the frontend and run contract parity/vendor checks.
- Include all Build restore operations and both retention-purge operations.
- Verify response schemas for All Work, Wiki backlinks, managed-product feedback, goals, portfolios, and project summaries.
- Expose and record frontend/backend deployment identities so browser evidence maps to the tested commit.
- Retest contract errors in the browser after deployment.

Evidence: `RELEASE-STATUS.md` Finding 2 and deployment-identity section; `03-api-contracts.md`.

## Packet 3 — Browser release matrix

**Status:** OPEN. **Owner:** Codex/browser QA. **User job:** use every important Build workflow reliably on desktop and mobile.

Tasks:

- Test the canonical route census with authenticated browser actions, not route visits only.
- For each page, exercise create, edit, delete, restore, search, filter, sort, pagination, dialogs, sheets, menus, and drag-and-drop where present.
- Verify ready, empty, filtered-empty, error, denied, conflict, refresh, reconnect, and stale-tab states.
- Verify 375px and desktop layouts, keyboard focus, Escape/Enter behavior, and responsive overflow.
- Test real product, portfolio, team, goal, meeting, incident, QA-run, public-form, and public-roadmap fixtures.
- Record route, action, expected result, actual result, console/network result, and deployment identity before marking boxes complete.

Evidence: `BROWSER-QA-PROGRESS.md`, `RELEASE-STATUS.md`, and each `10-*.md` acceptance section.

## Packet 4 — Core workflow completeness and URL state

**Status:** PARTIAL. **Owner:** frontend. **User job:** plan and execute work quickly, then share the exact view with another person.

Tasks:

- Close the remaining page-level implementation boxes for command center, issues, goals, meetings, incidents, QA runs, Wiki, settings, and product detail pages.
- Finish the shared URL contract for filters, sort, grouping, view, cursor, and saved views on every list surface.
- Ensure deep links restore the same state after refresh and browser back/forward navigation.
- Verify server-side search and pagination do not fall back to capped browser filtering.
- Remove duplicate route shells, duplicate loaders, and stale compatibility surfaces only after redirect behavior is verified.
- Retest loading, error, permission, offline, and optimistic rollback states.

Evidence: `01-ia-navigation.md`, `04-shared-components.md`, `05-performance-caching.md`, P1-2, and tickets 47–56.

## Packet 5 — Product management workflow

**Status:** PARTIAL. **Owner:** frontend plus backend. **User job:** turn customer feedback into a prioritized roadmap and measurable delivery outcome.

Tasks:

- Provide real managed-product fixtures and verify product, roadmap, goals, insights, feedback, and linked-project flows.
- Verify revenue/tier snapshots, RICE scoring, feedback votes, and roadmap status end to end.
- Ensure product-scoped navigation and labels never fall back to organization-level copy.
- Verify product permissions, tenant isolation, empty states, and detail-route behavior.
- Connect adoption outcomes back to insights without duplicating source records.

Evidence: P1-8 in `06-prioritized-backlog.md`; the `10-managed-products-*.md` page specs.

## Packet 6 — Freelancer and client delivery flow

**Status:** PARTIAL. **Owner:** backend plus frontend. **User job:** move from client engagement to paid delivery without re-entering data.

Tasks:

- Verify quote to signed agreement to project provisioning with retry-safe identity handoff.
- Verify client portal grants, project visibility, comments, change requests, and non-disclosure behavior.
- Verify approved time to invoice to payment traceability.
- Add a guided flow that links the records instead of sending the user through disconnected modules.
- Verify public forms, intake, uploads, notifications, and expired or revoked client access.

Evidence: P1-4 in `06-prioritized-backlog.md`; portal, form, intake, change-request, and billing page specs.

## Packet 7 — Performance, caching, and security proof

**Status:** PARTIAL. **Owner:** backend plus frontend. **User job:** see current work quickly without stale or cross-tenant data.

Tasks:

- Measure the slowest Build list/detail endpoints with production-shaped data.
- Fix confirmed N+1 queries and add only measured composite indexes.
- Verify query keys include organization, project, product, and record identity.
- Verify focus/reconnect invalidation, optimistic rollback, conflict recovery, and cross-tab updates.
- Run tenant-isolation and permission-denial tests against the real application role.
- Close the non-production database and mail-sink gap so destructive and browser tests are repeatable.

Evidence: `05-performance-caching.md`, `02-schemas.md`, `RELEASE-STATUS.md`, and the security tickets.

## Packet 8 — Differentiation after dependable release

**Status:** P2, NOT STARTED. **Owner:** product plus engineering. **User job:** gain leverage beyond basic project tracking.

Tasks:

- Durable AI proposals with citations, diffs, approval, budget, and run history.
- Observable no-code automations with retries, loop protection, and failure explanations.
- Saved delivery scenarios comparing people, money, dependencies, and dates.
- Incident postmortems linked to services, releases, owners, and follow-up work.
- Audit-ready evidence packs governed by retention and legal hold.

Evidence: P2-1 through P2-5 in `06-prioritized-backlog.md` and `08-build-os-flowcharts.md`.

## Documentation rule

Keep completed ticket files and release evidence because they explain what was tested, which command ran, and what limitation remained. Delete a Markdown file only when it is a duplicate with no inbound references, has no unique acceptance evidence, and its content has been moved into the canonical backlog or release record. Do not delete page specifications, migration runbooks, architecture verification, browser evidence, or open-question records merely because their implementation work is complete.

## Completion rule

A packet is complete only when its code exists, focused checks pass, required migration/deployment evidence exists, browser actions pass, and the relevant source documents are updated with route, action, result, and limitation. A route rendering or source inspection alone does not close a packet.
