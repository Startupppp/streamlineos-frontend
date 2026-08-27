# 01 — The 306 taxonomies are classified

**What to build:** Every enum is classified as either a system state machine that must stay an enum, or tenant-facing taxonomy that should become a lookup table. This classification is the deliverable — the migration is mechanical once it exists, and classifying in the wrong direction is the one expensive mistake available here.

**Blocked by:** None — can start immediately

**Status:** done

**Audit note (2026-08-26):** All criteria satisfied. The deliverable is `../enum-classification.md` (634 lines). The PRD figure of 415 was correct at authoring time; 7 enums were added during the program bringing the scan total to 422. The title's "306" is the PRD's raw taxonomy estimate before applying the branching test — the real tenant-extensible population is 54; 362 are system state machines; 6 are uncertain. All boxes updated to reflect the verified state.

## Acceptance criteria

- [x] Every one of the 415 enums is classified, with a reason. — `../enum-classification.md` (422 at scan time; 54 tenant taxonomy, 362 system, 6 uncertain)
- [x] System state machines that code branches on stay enums — a tenant adding a value there is a defect, not a feature. — `../enum-classification.md` (SYSTEM STATE MACHINE column, branching-test rationale per entry)
- [x] Tenant-facing taxonomy is listed with its owning module. — `../enum-classification.md` (TENANT TAXONOMY section, 54 entries)
- [x] The classification is recorded where the next person will find it. — `../enum-classification.md`
- [x] No code changes in this ticket. — deliverable is a Markdown document only

## Todo

- [x] Work module by module; enum concentration is highest in the shared and HR areas — `../enum-classification.md` scanned 73 files across all modules
- [x] For each, ask whether code branches on the value — used as the primary classification criterion
- [x] Record borderline calls explicitly — 6 UNCERTAIN entries recorded with notes
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c23 — A tenant extends the product without a deploy`](../prd.md) · Candidate index: [`../README.md`](../README.md)
