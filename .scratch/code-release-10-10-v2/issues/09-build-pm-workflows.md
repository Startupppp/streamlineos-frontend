# 09: Build, PM and Workflows

**What to build:** Project and automation workflows are tenant-safe, bounded, asynchronous where needed, and complete from schema through UI.

**Blocked by:** 02 — Schema and executable-key minimization; 04 — API, Zod and OpenAPI contracts; 05 — Authentication, Organization, RBAC and Settings

**Status:** ready-for-agent

**Source:** `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md`

**Human gate:** H08-H11 in `architecture-refactor/decisions/CODE-RELEASE-HUMAN-INPUTS.md`.

## Acceptance criteria

- [x] **PRD-C123** — Reconstruct current-head Build/PM evidence across workspace/project/ticket schema, tenant and record authorization, bounded boards/backlogs/search, cursor and cache contracts, async/realtime workflows, frontend states, folder cohesion and representative E2E.
- [x] **PRD-C124** — Reconstruct current-head Workflow evidence across definition/version/execution schema, permission rung, bounded execution history, idempotent queue/outbox processing, retry/DLQ/cancellation, secrets/redaction, frontend states and representative E2E.

## Completion evidence

- Record applicable frontend/root and backend commit SHAs, commands, pass/fail/skip counts, and artifact locations.
- Update the source PRD checkbox states and the traceability manifest in the same completion commit.
