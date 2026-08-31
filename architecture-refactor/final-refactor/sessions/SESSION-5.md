# S5 — Frontend platform, route access and contracts

Read `PROTOCOL.md`, the PRD and tickets 26, 27, 28, 29, 34, 35 and 36.

## Opening decisions to include

- Confirm the PRD universal-route allowlist and whether any route requires an explicit additional exception.
- Confirm public token pages should use direct Server Component loading or hydrated TanStack Query when both are feasible.
- Ask the protocol's commit, environment and browser-test questions.

## Exclusive territory

- Frontend shared RBAC/access libraries, route layouts, navigation model, query-key infrastructure, shared formatters/states and public-token pages.
- Timesheets frontend contracts needed for ticket 26; backend Timesheets contract edits remain S2 territory and must be requested through the coordination log.

Start 26, 35 and 36 immediately. Ticket 27 follows S1 ticket 03; 28 follows 27; 29 follows S1 ticket 02 and ticket 27; 34 follows 27.
