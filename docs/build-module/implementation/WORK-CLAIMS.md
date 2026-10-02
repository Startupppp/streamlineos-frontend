# Build work claims

This file is the coordination ledger for active and completed implementation packages. Application work begins only after a claim row is committed to the shared coordination/default branch and every dispatched agent has refreshed that revision. A private-worktree row is not a reservation. Documentation-only planning does not require a claim.

## Active claims

| Package | Requirement IDs | Agent/task | Branch/worktree | Base commit | Primary seam | Planned primary paths/migrations | Prerequisites | Status | Last update | Handoff |
|---|---|---|---|---|---|---|---|---|---|---|
| `ARCH-10-EVIDENCE-CLEANUP` | BLD-001, BLD-034, BLD-035 | execution-plan-gate agent | `codex/build-foundation-gates` shared checkout | `13238ca99` | current Build specification coverage and activation-test evidence | `scripts/check-build-execution-plan.mjs`; `backend/src/modules/organization/setup/__tests__/org-setup.service.spec.ts` test fixture only; no product code or schema migration | canonical `docs/build-module` specs committed | IN_PROGRESS | 2026-10-02T18:47Z | execution-plan gate passes; backend setup fixture repaired at `2d313b8f8`; runtime evidence remains open |
| `ARCH-16-CAPABILITY-SETTINGS` | BLD-023, BLD-035 | route-census-gate agent | `codex/build-foundation-gates` shared checkout | `13238ca99` | current Build route/cold-access census | `scripts/build-route-census.mjs`; canonical generated snapshot under `docs/build-module/audit/`; no schema migration | current route manifest and route-decision spec | IN_PROGRESS | 2026-10-02T18:47Z | route census self-test and 84 route patterns pass; cold-access browser evidence remains open |
| `ARCH-06-WIRE-CONTRACTS` | BLD-035 | wire-contract agent | `codex/build-foundation-gates` shared checkout | `13238ca99` | generated Build wire contract parity | `frontend/contracts/build-contracts.generated.ts` via generator; inspect `frontend/contracts/openapi.json`, `backend/openapi.json`; no schema migration | current backend operation inventory | IN_PROGRESS | 2026-10-02T19:21Z | Backend OpenAPI `b0d0af028` and frontend generated/client status contract `2f0a5ee25` pass OpenAPI and Build-contract checks. Repository contract-parity still fails one unrelated HR enum mismatch plus nine stale baseline entries |
| `ARCH-01-MODULE-ACCESS` | BLD-004, BLD-035 | module-access agent | `codex/build-foundation-gates` shared checkout | `d2d6b4203` | one authoritative Build assignment and revocation interface | `backend/src/modules/access/*`, `backend/src/modules/module-access/*`, and focused tests; serialized positive-regrant handoff in `backend/src/modules/rbac/role-member.service.ts` and `backend/src/modules/ownership/ownership-transfer-apply.ts` plus tests; no migration; onboarding, invitations, and portal remain separately owned | no earlier package; respect current permission catalog and role keys | IN_PROGRESS | 2026-10-02T19:23Z | Revocation source committed at backend `f3d962afe`; next serialized caller slice clears existing denial when authorized direct role assignment or accepted ownership transfer grants standing. Group-grant semantics and runtime verification remain open |
| `ARCH-14-ACTIVATION` | BLD-003, BLD-004, BLD-006 | onboarding backend + frontend + invitation-landing agents | `codex/build-foundation-gates` shared checkout | `9a6d3b238` | P0 People invite grant and authorized post-accept landing: selected standing travels through setup outbox to generic invitation acceptance, then a fresh effective-access read chooses destination | backend agent: `backend/src/modules/organization/setup/**` schema, consumer, tests only; People frontend agent: `frontend/features/org-setup/**`, `frontend/hooks/api/org-setup-schema.ts`, focused tests; landing agent: `frontend/app/(auth)/invitation/**`, `frontend/app/(authenticated)/post-invite/**`, `frontend/lib/invitation-landing.ts`, `frontend/proxy.ts`, `frontend/lib/rbac/route-access/universal-routes.ts`, focused tests; serialized delivery-truth handoff: `backend/src/modules/organization/core/invitation-create.service.ts`, `invitations-read.service.ts`, `backend/src/modules/users/dto/users-response.schemas.ts`, setup consumer/query and focused tests; serialized atomic-outbox handoff in `backend/src/modules/email/email-outbox.service.ts`, `email.service.ts`, and invitation-create integration/tests; no migration or client portal | existing invitation moduleAccess contract; ARCH-01 hardening has disjoint paths; generated contract refresh after backend merge | IN_PROGRESS | 2026-10-02T19:23Z | Enqueue truth committed at backend `9046fc768` and client `2f0a5ee25`; next serialized slice passes the invitation transaction through email outbox writes. Setup replay, manual resend, worker failure, target DB/browser, and full activation remain open |

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

## Delivery checklist

Track completion in the [requirement ledger](REQUIREMENT-LEDGER.md) and [work claims](WORK-CLAIMS.md). An unchecked item stays open until evidence is recorded on the current branch.

- [x] ARCH-10, ARCH-16, ARCH-06, ARCH-01, and ARCH-14 have disjoint primary seams recorded before their application edits.
- [ ] Move each completed source slice to the completed table with its exact revision, checks, and remaining follow-up.
- [ ] Close ARCH-01 only after inherited grants and revocation are covered end to end.
- [ ] Close ARCH-14 only after invitation acceptance, authorized landing, and selected grants pass browser and persistence checks.
- [ ] Mark any package RELEASE_VERIFIED only after the evidence contract in document 14 is satisfied.
