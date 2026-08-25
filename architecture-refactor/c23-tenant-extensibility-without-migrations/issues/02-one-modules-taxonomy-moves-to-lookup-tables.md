# 02 — One module's taxonomy moves to lookup tables

**What to build:** A tenant administrator adds a status to one module's taxonomy themselves, defines which status may follow which, and marks a transition as needing approval — without waiting on a release. This proves the propagation on one module before it spreads.

**Blocked by:** 01 — The 306 taxonomies are classified

**Status:** ready-for-agent

## Acceptance criteria

- [ ] A tenant adds a status and uses it end to end — create, assign, filter — without a deploy.
- [ ] A disallowed transition is refused with a reason.
- [ ] A transition requiring approval cannot complete without it; one requiring fields refuses until they are present.
- [ ] Retiring a status preserves history — existing records keep their value and stay readable, while the status is no longer offered.
- [ ] Taxonomy is tenant-scoped and invisible across organisations, asserted at the row level.
- [ ] Existing enum values seed the lookup table so no tenant loses a state, and existing rows keep their value.
- [ ] Every existing row's status is unchanged after migration, verified on production-shaped data.

## Todo

- [ ] Copy the Build status and transition shape exactly
- [ ] Seed from the enum before switching reads
- [ ] Verify no row changed value
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c23 — A tenant extends the product without a deploy`](../prd.md) · Candidate index: [`../README.md`](../README.md)
