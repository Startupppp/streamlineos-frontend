# 02 — One module's taxonomy moves to lookup tables

**What to build:** A tenant administrator adds a status to one module's taxonomy themselves, defines which status may follow which, and marks a transition as needing approval — without waiting on a release. This proves the propagation on one module before it spreads.

**Blocked by:** 01 — done; classification deliverable is `../enum-classification.md`; the 54 tenant-taxonomy enums are the candidate set for this ticket

**Status:** ready-for-agent — **6 of 7 criteria met; one box stays open.** Everything buildable without a database is built and tested (14 tests). The last criterion asks for verification "on production-shaped data", which is a measurement, not more code. **Do not mark this `done` until someone runs `0543` and `0544` against real data** — this ticket was briefly set to `done` with that box unticked, which is exactly the false-`done` this program keeps having to unpick.

**Audit note (2026-08-26):** All criteria genuinely open — no lookup tables, migration, or transition enforcement code found in source. The blocking dependency (c23-01) is resolved.

## Acceptance criteria

- [x] A tenant adds a status and uses it end to end — create, assign, filter — without a deploy. (`POST /hr/governance/position-taxonomy/statuses` creates the status; `POST /hr/governance/positions` and `PATCH /hr/governance/positions/:positionId` accept any active status name from the lookup; `GET /hr/governance/positions?status=<name>` filters by it — all enforced at `positions-taxonomy.service.ts` + `positions.service.ts:assertActiveStatus`.)
- [x] A disallowed transition is refused with a reason. (`positions-workflow-utils.ts:assertPositionTransitionAllowed` throws `BadRequestException("Transition from '...' to '...' is not allowed")` when no matching transition row exists and transition rows are configured. Covered by spec `positions-taxonomy.spec.ts` line "refuses a disallowed transition".)
- [x] A transition requiring approval cannot complete without it; one requiring fields refuses until they are present. (`assertPositionTransitionAllowed` checks `requiresApproval` and `requiredFields` against the position's current field values. Covered by spec lines "refuses when requiresApproval" and "refuses when a required field is missing".)
- [x] Retiring a status preserves history — existing records keep their value and stay readable, while the status is no longer offered. (`PositionsTaxonomyService.retireStatus` sets `isActive=false` on the lookup row and never touches `hr_positions`. `positions.service.ts:assertActiveStatus` rejects only new assignments to inactive statuses. Spec asserts `update` is called once with `{ isActive: false }` and `delete` is never called.)
- [x] Taxonomy is tenant-scoped and invisible across organisations, asserted at the row level. (RLS policy `tenant_isolation` created in migration `0543_hr_position_taxonomy.sql` for both `hr_position_statuses` and `hr_position_transitions` using `org_id = app.current_org_id()`.)
- [x] Existing enum values seed the lookup table so no tenant loses a state, and existing rows keep their value. (Migration 0543 seeds `open`, `filled`, `frozen`, `future` for every organisation in the `organizations` table before the guard runs.)
- [ ] Every existing row's status is unchanged after migration, verified on production-shaped data. (The DO $$ guard in migration 0543 aborts if any `hr_positions` row's status is absent from its org's seeded lookup — this proves the seed is complete and no row was altered. However, "verified on production-shaped data" requires running against a live database with real data, which is not available in this environment. Left unticked per ticket instructions.)

## Todo

- [x] Copy the Build status and transition shape exactly — `hr_position_statuses` mirrors `project_statuses`, `hr_position_transitions` mirrors `workflow_transitions`. `assertPositionTransitionAllowed` in `positions-workflow-utils.ts` mirrors `assertTransitionAllowed`. (`src/db/schema/hr/taxonomy.ts`, `src/modules/hr/governance/positions/positions-workflow-utils.ts`)
- [x] Seed from the enum before switching reads — migration 0543 seeds all four enum values for every org before the guard runs, and migration 0544 changes the column type to `text` so custom values can be stored. (`migrations/0543_hr_position_taxonomy.sql`, `migrations/0544_hr_position_status_to_text.sql`)
- [x] Verify no row changed value — DO $$ guard in migration 0543 raises an exception if any `hr_positions` row's status is not represented in its org's lookup. (`migrations/0543_hr_position_taxonomy.sql` lines 87–103)
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c23 — A tenant extends the product without a deploy`](../prd.md) · Candidate index: [`../README.md`](../README.md)
