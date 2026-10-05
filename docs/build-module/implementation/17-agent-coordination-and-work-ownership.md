# 17 — Agent coordination and work ownership

Status: mandatory implementation process  
Applies to: every human or AI agent implementing `docs/build-module`

## 1. Outcome

This protocol prevents duplicate implementation, overlapping migrations, conflicting interfaces, repeated research, and false completion. An agent implements one claimed vertical work package through its canonical seams, then leaves a reviewable handoff and evidence trail.

## 2. Authority order

When sources disagree, use this order:

1. current repository source for claims about what exists;
2. existing scoped `frontend/CLAUDE.md` and `backend/CLAUDE.md`, accepted ADRs, and `CONTEXT.md` for implementation invariants; a root `CLAUDE.md` is absent in this checkout and cannot supply rules until added explicitly;
3. canonical product, onboarding, experience, architecture, integration, governance, and delivery specifications under `docs/build-module` for intended behavior;
4. [deep-module reconciliation](../architecture/08-deep-module-reconciliation.md) for architecture ownership and dependency order;
5. [work-package registry](./18-architecture-work-package-registry.md) for package scope and prerequisites;
6. retained PM/UX/analysis packs as research evidence only.

An agent must not invent a third behavior. It records the conflict in the requirement ledger and pauses only the conflicting part.

## 3. Claim before edit

Before changing application code, a coordinator reserves the package in the shared [WORK-CLAIMS.md](./WORK-CLAIMS.md). For parallel worktrees, claim changes are serialized and committed to the coordination/default branch before work is dispatched. Every agent refreshes that revision and confirms the package is still uniquely owned. A row that exists only in a private feature branch is not a valid reservation.

If a team later configures an issue tracker with atomic assignment, the tracker may become the reservation authority only after this document and the Build index name it explicitly. Until then, `WORK-CLAIMS.md` is authoritative and a tracker is only a mirror.

Required claim fields:

- package ID and requirement IDs;
- agent/task identifier and branch/worktree;
- base commit and claim time;
- primary seam and owning interface;
- exact planned paths and migrations;
- prerequisites and their verified revision;
- compatibility adapters affected;
- status: `CLAIMED`, `IN_PROGRESS`, `HANDOFF_READY`, `BLOCKED`, `MERGED`, or `RELEASE_VERIFIED`;
- last update and handoff link.

One active claim is allowed per primary seam. Two agents may work in the same product area only when the registry declares different primary seams and their file sets do not overlap. A reviewer or coordinator resolves conflicting claims before either implementation proceeds. Claim creation, scope changes, handoff, and closure are serialized even when implementation is parallel.

## 4. Pre-edit inventory

The claim is valid only after the agent records:

1. current routes/pages and redirect behavior;
2. controllers/handlers and generated operation IDs;
3. command/query interfaces and every caller;
4. tables, migrations, indexes, constraints, and RLS/tenant rules;
5. Zod/DTO/request/response schemas and generated client contracts;
6. permission keys, role-template grants, record-reach checks, and portal capabilities;
7. query keys, cache namespaces, invalidation, and freshness;
8. outbox events, consumers, jobs, retries, and notifications;
9. UI components, states, responsive behavior, and accessibility;
10. unit, integration, contract, browser, database, deployment, and operational evidence;
11. compatibility routes/identities and removal conditions;
12. open work already present in Git status or another claim.

Use `rg` and generated registries before adding a file. A missing import from the current file does not prove the concept is absent.

## 5. Non-overlap rules

- One canonical command writer per aggregate behavior.
- One query module per projection family.
- One wire schema per operation version.
- One query-key factory per entity/domain.
- One migration owner for a table/column/index during a delivery window.
- One route/nav/capability registry owner for a navigation change.
- One source module owns ledger or identity data; consuming modules use adapters/projections.
- No agent creates `v2`, `new`, `enhanced`, `manager`, or `unified` alternatives beside a canonical seam unless the approved migration explicitly names a compatibility adapter and removal condition.
- No agent deletes an old route, table, permission, schema, type, hook, or adapter until the migration package proves zero unsupported callers and records recovery.
- Documentation edits are made in the canonical owner document. Research packs are not updated to mirror the same target specification.

## 6. Package boundaries

Each package identifies four path classes:

- **Primary paths:** the only agent allowed to redesign these while the claim is active.
- **Caller paths:** may be edited to adopt the interface; their behavior stays owned by the primary package.
- **Generated paths:** changed only through the generator or authoritative schema.
- **Forbidden paths:** owned by another module or package and changed only through a separate claimed dependency.

If two packages need the same primary path, they are sequential. If they need only independent caller paths against a stable merged interface, they may proceed in parallel.

## 7. Vertical completion

A package is `HANDOFF_READY` only when it includes:

- complete user interaction and responsive behavior;
- controller/transport adaptation with validated input;
- capability, module, project, record, action, field, and portal checks as applicable;
- canonical command/query execution;
- persistence, transaction, CAS, idempotency, and tenant invariants;
- cache update/invalidation and freshness behavior;
- outbox/event/job/notification behavior;
- generated contract and consumer updates;
- observability and safe error behavior;
- focused and negative tests;
- browser proof for the named actors and viewports;
- migration, rollback, compatibility, and cleanup notes;
- requirement ledger and work-claim updates.

Partial backend or frontend work remains `IN_PROGRESS`; it is not handed off as a completed feature.

## 8. Required negative cases

Every package tests unauthorized capability, foreign tenant, unreachable project or record, revoked access during use, invalid input, duplicate submission, revision conflict, retry/idempotency, stale cache, dependency failure, refresh, Back/Forward, deep link, mobile interaction, keyboard access, and safe error disclosure. Add package-specific negatives from the work-package registry.

## 9. Handoff format

The final package handoff must contain:

```text
Package:
Requirements:
Base and final commits:
Primary seam/interface:
Changed primary paths:
Changed caller paths:
Generated outputs and command used:
Migrations and rollback:
Permissions/reachability:
Cache/events/jobs:
Tests run with exact results:
Browser actors/data/actions/viewports:
Database/deployment/operations evidence:
Compatibility adapters still present:
Cleanup now safe:
Known risks or blocked evidence:
Ledger and claim updates:
```

The receiving agent revalidates the base revision and interface rather than copying conclusions from the handoff.

## 10. Merge and cleanup rules

1. Merge prerequisite interfaces before dependent callers.
2. Rebase or refresh the dependent worktree and rerun contract tests.
3. Merge one migration owner at a time for the affected tables.
4. Keep compatibility adapters until adoption telemetry/caller census and rollback criteria pass.
5. Mark a claim `MERGED` after the repository revision is known.
6. Mark `RELEASE_VERIFIED` only after the package’s runtime, tenant/role, database, deployment, and operational evidence is attached.
7. Remove the active row only when historical completion is copied to the completed-claims table; never erase blocked or superseded history.

## 11. Agent stop conditions

An agent stops the affected part and records `BLOCKED` when:

- another active claim owns the same primary seam or migration target;
- current source contradicts the accepted domain or permission model;
- a destructive migration has no backfill comparison and rollback;
- the required permission key or authoritative data owner is unresolved;
- an external/client action would bypass grant or record reachability;
- generated contract changes cannot be reproduced;
- target data needed for a safe migration is unavailable.

The agent continues independent work outside the blocked seam.

## Delivery checklist

Track completion in the [requirement ledger](REQUIREMENT-LEDGER.md) and [work claims](WORK-CLAIMS.md). An unchecked item stays open until evidence is recorded on the current branch.

- [x] Publish the claim-before-edit protocol and package ownership boundaries; active claims and handoffs are recorded in [WORK-CLAIMS.md](WORK-CLAIMS.md).
- [x] Before each slice, refresh source and caller inventory, claim one primary seam, and resolve any overlapping file or contract ownership in the claim ledger.
- [x] Require each handoff to identify exact files, contract and migration changes, tests with outputs, browser actors/actions, open risks, and removal conditions.
- [x] Verify independent work is merged in dependency order, generated contracts are reproducible, and negative role/tenant cases remain green.
- [x] Stop or reassign any slice when an authority conflict, missing target data, or unsafe migration blocks an evidence-backed result.
