# 04 — A quota that cannot be computed refuses the write

**What to build:** A plan limit holds even when the database is struggling. Today the counter catches everything and returns zero for every limit key, so a blip during a spike lifts every plan limit at once — exactly when it matters most.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

## Acceptance criteria

- [ ] A count that cannot be computed refuses the limited write and says why.
- [ ] With the count query throwing, the write is refused rather than allowed.
- [ ] The failure is reported rather than swallowed.
- [ ] A customer can still see what they have consumed against their plan.

## Todo

- [ ] Remove the catch that returns zeroed counts
- [ ] Test the failure path explicitly — the current behaviour is the inverse
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c17 — Every billing write is provable`](../prd.md) · Candidate index: [`../README.md`](../README.md)
