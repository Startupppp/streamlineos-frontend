# Build work claims

This file is the coordination ledger for active and completed implementation packages. Application work begins only after a claim row is committed to the shared coordination/default branch and every dispatched agent has refreshed that revision. A private-worktree row is not a reservation. Documentation-only planning does not require a claim.

## Active claims

| Package | Requirement IDs | Agent/task | Branch/worktree | Base commit | Primary seam | Planned primary paths/migrations | Prerequisites | Status | Last update | Handoff |
|---|---|---|---|---|---|---|---|---|---|---|
| _none_ | — | — | — | — | — | — | — | — | — | — |

## Completed or superseded claims

| Package | Requirement IDs | Agent/task | Final revision | Outcome | Evidence/handoff | Compatibility or follow-up |
|---|---|---|---|---|---|---|
| _none_ | — | — | — | — | — | — |

## Claim rules

- Use package IDs from [18-architecture-work-package-registry.md](./18-architecture-work-package-registry.md).
- Never replace another active row. Resolve ownership and record a handoff or supersession.
- Serialize edits to this ledger through the coordinator; do not let parallel agents independently merge competing reservations.
- Update `Last update` whenever scope, dependencies, status, or revision changes.
- `MERGED` is source state. `RELEASE_VERIFIED` requires the evidence contract in document 14.

