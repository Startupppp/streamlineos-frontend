# 07 — Owner-only operations are enumerated, not implied

**What to build:** An organization admin can run the organization. The handful of things only the owner may do is a written list that the code reads, rather than a phrase — *"same as owner except changing the owner"* — that each handler interprets for itself.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

**Grounding (2026-08-28, evidence not instruction — re-read at source):** PRD mistake #5. The gap is not that admins are over-privileged; it is that the boundary was never enumerated, so organization deletion, ownership lifecycle, module transfer, security controls and billing each ended up decided somewhere different. `organization_members.isOwner` is already unique per org (`uniq_org_members_single_owner`, `db/schema/common/auth.ts:103`), so there is exactly one owner to reason about.

## Acceptance criteria

- [ ] One catalog names every owner-only operation, at minimum: ownership transfer, organization deletion and scheduled purge, legal hold, terminal security controls, and the billing relationship itself.
- [ ] Everything not in that list is available to an active organization admin in every enabled and entitled module, with no per-module exception list.
- [ ] The list is enforced from one predicate; a handler cannot opt out of it by checking `isOwner` itself, and a check finds any that do.
- [ ] The frontend derives owner-only affordances from the same catalog, so a hidden button and a denied handler cannot disagree.
- [ ] Each entry records *why* it is owner-only — the reason is what tells the next person whether a new operation belongs on the list.
- [ ] Tests assert both directions: an admin is denied each owner-only operation, and is allowed a representative operation from each module.

## Todo

- [ ] Enumerate what the code does today before deciding what it should do; the current behaviour is the specification of the bugs.
- [ ] Watch for the inverse defect — an operation gated on the owner that has no business being, which locks a large organization out of its own administration.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
