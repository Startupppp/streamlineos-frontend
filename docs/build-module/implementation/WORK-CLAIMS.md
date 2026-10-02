# Build work claims

This file is the coordination ledger for active and completed implementation packages. Application work begins only after a claim row is committed to the shared coordination/default branch and every dispatched agent has refreshed that revision. A private-worktree row is not a reservation. Documentation-only planning does not require a claim.

## Active claims

| Package | Requirement IDs | Agent/task | Branch/worktree | Base commit | Primary seam | Planned primary paths/migrations | Prerequisites | Status | Last update | Handoff |
|---|---|---|---|---|---|---|---|---|---|---|
| `ARCH-10-EVIDENCE-CLEANUP` | BLD-034, BLD-035 | execution-plan-gate agent | `codex/build-foundation-gates` shared checkout | `13238ca99` | current Build specification coverage gate | `scripts/check-build-execution-plan.mjs`; no schema migration | canonical `docs/build-module` specs committed | CLAIMED | 2026-10-02T17:50Z | pending |
| `ARCH-16-CAPABILITY-SETTINGS` | BLD-023, BLD-035 | route-census-gate agent | `codex/build-foundation-gates` shared checkout | `13238ca99` | current Build route/cold-access census | `scripts/build-route-census.mjs`; canonical generated snapshot under `docs/build-module/audit/`; no schema migration | current route manifest and route-decision spec | CLAIMED | 2026-10-02T17:50Z | pending |
| `ARCH-06-WIRE-CONTRACTS` | BLD-035 | wire-contract agent | `codex/build-foundation-gates` shared checkout | `13238ca99` | generated Build wire contract parity | `frontend/contracts/build-contracts.generated.ts` via generator; inspect `frontend/contracts/openapi.json`, `backend/openapi.json`; no schema migration | current backend operation inventory | CLAIMED | 2026-10-02T17:50Z | pending |
| `ARCH-01-MODULE-ACCESS` | BLD-004, BLD-035 | module-access agent | `codex/build-foundation-gates` shared checkout | `d2d6b4203` | one authoritative Build assignment and revocation interface | `backend/src/modules/access/*` and focused tests only; no migration; onboarding and portal are caller paths reserved for later packages | no earlier package; respect current permission catalog and role keys | CLAIMED | 2026-10-02T17:54Z | pending |

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

