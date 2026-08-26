# 16 — One queue, many producers

**Status:** done — one queue.
**Track:** D — data quality
**Blocked by:** 02

## Why

Phase 1's duplicate scorer runs and its findings go into a table. There is no
queue, no owner, and no measure of whether the dataset is getting better or
worse.

## Acceptance criteria

- [ ] One queue fed by the duplicate detector, contradiction checks,
      reachability checks, staleness checks, and the importer's uncertainty.
- [ ] Each item carries its producer, its evidence, the action the system would
      take, and its reversibility class — **the same vocabulary Phase 1's
      decision record uses**, so the review feed and this queue read alike.
- [ ] An assignee and an age, so it is somebody's work rather than a report.
- [ ] **Bulk resolution is first-class.** Four hundred parties with the same
      malformed country code is one decision, not four hundred.
- [ ] A resolution is reversible where its reversibility class says it is, and
      refuses where it does not.
