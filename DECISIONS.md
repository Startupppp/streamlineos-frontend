# HRMS core decisions

Updated: 2026-08-18

## Context resolved once

- Backend paths: `backend/src/modules/hr`, `backend/src/modules/directory`, and
  `backend/src/modules/organization/hierarchy`.
- Frontend routes: `frontend/app/(authenticated)/hr` and canonical employee
  self-service under `frontend/app/(authenticated)/me`.
- Schema: `backend/src/db/schema/{common,directory,hr}` plus the isolated
  `backend/src/db/schema/hrms-phase1-sql-managed.ts` contract.
- Migration strategy: Drizzle for representable normal migrations; the pending
  hash-allowlisted SQL bundle for Phase 1-only non-representable objects.
- Redis: available through the existing optional Upstash Redis integration.
- Job queue: BullMQ is not installed. Existing durable outbox/worker primitives
  are reused; no new queue dependency is added.
- Tests: Jest/unit/controller coverage exists; broad suites are slow and have a
  known open-handle warning, so commands are bounded and split.
- Live production tenants: yes; all changes are expand-contract.
- Payroll output: not trusted. No current payroll number becomes a golden test
  without a statutory discrepancy report and approval.

## D-HRMS-001 — Preserve the completed Phase 0 audit

The supplied protocol requests `AUDIT-HRMS.md`; the full audit already exists
with richer evidence. The new file is an authoritative index, not a drifting
copy.

## D-HRMS-002 — Missing protocol file

`EXECUTION-PROTOCOL.md` was absent from every workspace. The local file records
only the rules explicitly supplied in the current prompt plus existing safety
gates. It does not create new production authority.

## D-HRMS-003 — Database mutation remains clone-only

All discovered configured URLs are remote and no target is identifiable as a
disposable clone. The conservative default is no connection and no mutation.
Static dry runs/refusal probes continue; the rehearsal starts only with an
explicit clone identity and exact manifests.

## D-HRMS-004 — Existing dependencies only

Upstash Redis and the durable email/outbox infrastructure are reused. BullMQ,
CASL, a new state library and new migration dependencies are not introduced.

## D-HRMS-005 — Source-complete is not product-closed

`[~]` in `TASKS.md` means an implementation exists and local checks passed, but
clone/deployment/adoption evidence remains. `[x]` is reserved for a completed
finding with observed evidence; `[!]` is an external gate; `[ ]` is actionable.

## D-HRMS-006 — No Payroll or Recruitment scope expansion

Recruitment's legacy HR handoff is treated only as an HR compatibility writer
boundary. Payroll calculations and ATS internals remain out of this worktree.

## D-HRMS-007 - Domain-specific identifier names

Production parameters and locals use the entity name (`employeeUserId`,
`leaveRequestId`, `jobRoleId`, and similar) instead of a bare `id` or a
one-letter alias. Persisted ORM fields, cursor payloads, and established API
response fields may retain `id` because renaming those would change the storage
or wire contract. The final added-code AST audit enforces this boundary.

## D-HRMS-008 - Cursor compatibility is expand-contract

The legacy HR people/employment list endpoints default to bounded cursor
pagination. An explicitly requested legacy `page=` query temporarily keeps the
old count-bearing envelope so unknown external clients are not broken. Removing
that branch requires usage/deprecation evidence; it is not silently removed in
this refactor.

## D-HRMS-009 - Duplicate stores use compatibility adapters

`org_holidays` is the canonical holiday read source and `hr_time_devices` is the
canonical clock-device identity. Active legacy holiday and biometric contracts
remain behind tenant-scoped compatibility adapters because repository-wide
consumer and FK proof shows they are not dead. Physical consolidation waits for
an expand-contract link/backfill and zero-reference proof.

## D-HRMS-010 - Durable exports remain disabled until infrastructure is ready

Employee export is a server-side durable job, not a browser pagination loop.
Its worker stays fail-closed behind the existing private-object-storage and
worker-readiness checks. The review-only migration is not executed against the
live database from this worktree.

## D-HRMS-011 - Visual verification cannot be substituted

The final pass attempts the authenticated local in-app browser. If no browser
session is connected, static responsive/accessibility checks and tests still
run, but the result is reported as an unavailable visual click-through rather
than claimed as a browser pass or replaced with unrelated automation.

## D-HRMS-012 - File-cap scope and module sequencing

Every HRMS-core, sidebar, and shared production file touched by this work is
split below 500 lines. Payroll's `payroll-inputs.service.ts` remains explicitly
assigned to the later Payroll session so this HRMS-core change does not mix
payroll calculation/input responsibilities into the current module.
