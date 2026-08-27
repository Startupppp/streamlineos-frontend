# 24 — An organization switch is revalidated in the target cell

**What to build:** Switching organizations works across cells and is authorized by the cell that owns the answer. The list of organizations someone can switch into is a fast global projection; the permission to enter one is re-checked against that organization's own cell before a session is issued.

**Blocked by:** [01 — The request knows which membership it is](01-the-request-knows-its-membership.md) · [20 — Placement is a record, not a column](20-placement-is-a-record.md)

**Status:** ready-for-agent

**Grounding (2026-08-28, evidence not instruction — re-read at source):** the PRD is emphatic that the discovery index is *"a projection, never authorization truth: a switch is revalidated against the target cell before a session is issued."* `POST /organization/switch` already accepts a different org's id and is membership-checked (root `CLAUDE.md` §5) — that check has to move to, or be repeated in, the target cell. `users.lastActiveOrgId` (`db/schema/common/auth.ts:154`) exists today and is a global column pointing at an organization that may live elsewhere. The frontend already clears its cache on switch; ticket 17 makes that structural rather than remembered.

## Acceptance criteria

- [ ] A derived account-to-organization index in the control plane answers *"which organizations can this account see?"* without querying every cell.
- [ ] The index is a projection: it is rebuilt from cell truth, is allowed to be stale, and is never the basis for issuing a session.
- [ ] Every switch revalidates live membership in the **target** cell before the session is issued; a membership removed in that cell denies the switch even while the index still lists it.
- [ ] A switch into an organization whose placement is `MOVING`, `READ_ONLY` or unknown behaves as ticket 20 declares, rather than falling back to the current cell.
- [ ] The switch invalidates the frontend cache and the authorization snapshot for the outgoing organization in the same flow.
- [ ] A test proves a stale index entry cannot grant access, by removing the membership in the target cell without refreshing the index.

## Todo

- [ ] Decide how the index is rebuilt before building it — an event-driven projection and a periodic rebuild have different staleness bounds, and the bound is what the revalidation exists to tolerate.
- [ ] Look at `lastActiveOrgId` in the same change; a global pointer at a cell-local organization is the same class of fact this program is moving off `users`.
- [ ] Do not let the index become authorization by convenience. The revalidation is the whole ticket.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
