# S01 — Authentication, organization, RBAC and Settings

Status: active

Independent scope: backend Auth, Organization, RBAC, module-access and Settings controllers/services; frontend auth, organization switching and `/settings/**` features except Billing page internals. Authenticated shell/navigation primitives belong to S11. Schema and migration edits belong to S02.

Master coverage: sections 6, 10.1, 10.2 and 10.4; owned portions of sections 2, 3, 5, 7, 8 and 11.

## Acceptance criteria

- [ ] Reconcile identity, sessions, membership, invitations, organization switching, six fixed standings, fixed templates, grants, delegations, DataScope and module access; no seventh standing or arbitrary custom-role surface exists.
- [ ] Prove deny-by-default data-layer enforcement, owner transfer, last-owner and descendant protection, cross-org denial and revocation of caches, sessions and realtime credentials.
- [ ] Verify canonical Settings ownership, strict Zod/OpenAPI contracts, bounded indexed queries, exact permission-backed routes/navigation/actions and mutation invalidation.
- [ ] Cover fixation/replay, enumeration, recovery/MFA, invitation takeover, altered organization/user and BOLA/IDOR with focused tests.
- [ ] Inventory owned files and remove only dependency-proven duplicate/dead routes, types, validators, hooks and components.
- [ ] Run focused Auth/Organization/RBAC/Settings tests and targeted permission, owner-authority, route-classification, module-gate and cache-invalidation gates; record commands and results.
- [ ] Reconcile this session and the master PRD using the README protocol.

## Completion

- [ ] S01 is complete; commit/evidence: _pending_.
