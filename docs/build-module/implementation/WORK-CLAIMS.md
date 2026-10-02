# Build work claims

This file is the coordination ledger for active and completed implementation packages. Application work begins only after a claim row is committed to the shared coordination/default branch and every dispatched agent has refreshed that revision. A private-worktree row is not a reservation. Documentation-only planning does not require a claim.

## Active claims

| Package | Requirement IDs | Agent/task | Branch/worktree | Base commit | Primary seam | Planned primary paths/migrations | Prerequisites | Status | Last update | Handoff |
|---|---|---|---|---|---|---|---|---|---|---|
| `ARCH-10-EVIDENCE-CLEANUP` | BLD-001, BLD-034, BLD-035 | execution-plan-gate agent | `codex/build-foundation-gates` shared checkout | `13238ca99` | current Build specification coverage and activation-test evidence | `scripts/check-build-execution-plan.mjs`; `backend/src/modules/organization/setup/__tests__/org-setup.service.spec.ts` test fixture only; no product code or schema migration | canonical `docs/build-module` specs committed | IN_PROGRESS | 2026-10-02T17:56Z | execution gate passed; activation mock repair pending |
| `ARCH-16-CAPABILITY-SETTINGS` | BLD-023, BLD-035 | route-census-gate agent | `codex/build-foundation-gates` shared checkout | `13238ca99` | current Build route/cold-access census | `scripts/build-route-census.mjs`; canonical generated snapshot under `docs/build-module/audit/`; no schema migration | current route manifest and route-decision spec | CLAIMED | 2026-10-02T17:50Z | pending |
| `ARCH-06-WIRE-CONTRACTS` | BLD-035 | wire-contract agent | `codex/build-foundation-gates` shared checkout | `13238ca99` | generated Build wire contract parity | `frontend/contracts/build-contracts.generated.ts` via generator; inspect `frontend/contracts/openapi.json`, `backend/openapi.json`; no schema migration | current backend operation inventory | CLAIMED | 2026-10-02T17:50Z | pending |
| `ARCH-01-MODULE-ACCESS` | BLD-004, BLD-035 | module-access agent | `codex/build-foundation-gates` shared checkout | `d2d6b4203` | one authoritative Build assignment and revocation interface | `backend/src/modules/access/*`, `backend/src/modules/module-access/*`, and focused tests only; no migration; onboarding, invitations, and portal reserved for later caller packages | no earlier package; respect current permission catalog and role keys | IN_PROGRESS | 2026-10-02T17:58Z | current positive standing owner found in module-access; safe hardening pending |
| `ARCH-14-ACTIVATION` | BLD-003, BLD-004, BLD-006 | onboarding backend + frontend + invitation-landing agents | `codex/build-foundation-gates` shared checkout | `9a6d3b238` | P0 People invite grant and authorized post-accept landing: selected standing travels through setup outbox to generic invitation acceptance, then a fresh effective-access read chooses destination | backend agent: `backend/src/modules/organization/setup/**` schema, consumer, tests only; People frontend agent: `frontend/features/org-setup/**`, `frontend/hooks/api/org-setup-schema.ts`, focused tests; landing agent: `frontend/app/(auth)/invitation/**`, `frontend/app/(authenticated)/post-invite/**`, `frontend/lib/invitation-landing.ts`, `frontend/proxy.ts`, `frontend/lib/rbac/route-access/universal-routes.ts`, focused tests; no migration, generic invitation writer edit, or client portal | existing invitation moduleAccess contract; ARCH-01 hardening has disjoint paths; generated contract refresh after backend merge | IN_PROGRESS | 2026-10-02T18:27Z | three disjoint seams; no new wizard step/role; access-aware landing must fail closed if permission read fails |

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

