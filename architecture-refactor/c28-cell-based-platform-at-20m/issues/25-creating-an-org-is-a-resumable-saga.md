# 25 — Creating an organization is an idempotent, resumable saga

**What to build:** Creating an organization either finishes or leaves nothing behind. Reserving the global id, slug, domain and placement, bootstrapping the cell's organization and owner membership, and activating the directory projection are explicit steps that each record their state and can resume or compensate — so a failure halfway does not strand a half-created workspace nobody can enter or delete.

**Blocked by:** [20 — Placement is a record, not a column](20-placement-is-a-record.md)

**Status:** ready-for-agent

**Grounding (2026-08-28, evidence not instruction — re-read at source):** creation now spans two databases — the control plane owns the reservation, the cell owns the organization — so a single transaction can no longer cover it. The PRD requires the same treatment for the whole lifecycle: *"archive, restore, export, ownership transfer, scheduled purge, purge cancellation, legal hold, and terminal deletion use equally explicit state machines."* Purge completion is enumerated there too, and includes database rows, objects, cache, search and vector documents, analytics copies, provider mirrors, backups after expiry, and auditable evidence. Root `CLAUDE.md` §8 also requires the workspace gate to stay durable — completing *or* skipping a wizard stamps the DB and invalidates the `userSession` cache, and a user is never bounced back into a skipped wizard.

## Acceptance criteria

- [ ] Slug, domain and organization id are reserved through the control plane with global uniqueness, before any cell row exists.
- [ ] Each step records its state; a retry with the same request resumes rather than duplicating, and an abandoned attempt compensates rather than lingering.
- [ ] A failure at any step leaves no reserved-but-unusable slug, no cell organization without an owner, and no directory entry for a workspace that does not exist.
- [ ] The existing workspace gate keeps working: a created organization lands its owner on setup or dashboard, and neither the org owner nor a platform admin is shown the employee onboarding form.
- [ ] The same explicit state machine covers archive, restore, ownership transfer, scheduled purge, purge cancellation, legal hold and terminal deletion — each with its states written down.
- [ ] Purge completion is auditable and enumerates every adapter it must reach; an adapter that cannot confirm deletion blocks completion rather than being assumed.

## Todo

- [ ] Model the states before writing the code. A saga discovered while implementing acquires the steps someone remembered.
- [ ] Reuse the outbox and idempotency primitives that already exist rather than adding a third retry mechanism.
- [ ] Purge is the step that has to be right on the first try, because its failure is unrecoverable in the direction that matters.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
