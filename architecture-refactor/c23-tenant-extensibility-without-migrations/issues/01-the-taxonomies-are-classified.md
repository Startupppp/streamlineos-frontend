# 01 — The 306 taxonomies are classified

**What to build:** Every enum is classified as either a system state machine that must stay an enum, or tenant-facing taxonomy that should become a lookup table. This classification is the deliverable — the migration is mechanical once it exists, and classifying in the wrong direction is the one expensive mistake available here.

**Blocked by:** None — can start immediately

**Status:** done

## Acceptance criteria

- [ ] Every one of the 415 enums is classified, with a reason.
- [ ] System state machines that code branches on stay enums — a tenant adding a value there is a defect, not a feature.
- [ ] Tenant-facing taxonomy is listed with its owning module.
- [ ] The classification is recorded where the next person will find it.
- [ ] No code changes in this ticket.

## Todo

- [ ] Work module by module; enum concentration is highest in the shared and HR areas
- [ ] For each, ask whether code branches on the value
- [ ] Record borderline calls explicitly
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c23 — A tenant extends the product without a deploy`](../prd.md) · Candidate index: [`../README.md`](../README.md)
