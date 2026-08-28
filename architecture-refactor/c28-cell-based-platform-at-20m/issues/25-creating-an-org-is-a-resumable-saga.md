# 25 — Creating an organization is an idempotent, resumable saga

**What to build:** Creating an organization either finishes or leaves nothing behind. Reserving the global id, slug, domain and placement, bootstrapping the cell's organization and owner membership, and activating the directory projection are explicit steps that each record their state and can resume or compensate — so a failure halfway does not strand a half-created workspace nobody can enter or delete.

**Blocked by:** [20 — Placement is a record, not a column](20-placement-is-a-record.md)

**Status:** done · 1 criterion open (ownership-transfer and legal-hold call sites are S1 territory)

**Grounding (2026-08-28, evidence not instruction — re-read at source):** creation now spans two databases — the control plane owns the reservation, the cell owns the organization — so a single transaction can no longer cover it. The PRD requires the same treatment for the whole lifecycle: *"archive, restore, export, ownership transfer, scheduled purge, purge cancellation, legal hold, and terminal deletion use equally explicit state machines."* Purge completion is enumerated there too, and includes database rows, objects, cache, search and vector documents, analytics copies, provider mirrors, backups after expiry, and auditable evidence. Root `CLAUDE.md` §8 also requires the workspace gate to stay durable — completing *or* skipping a wizard stamps the DB and invalidates the `userSession` cache, and a user is never bounced back into a skipped wizard.

## Acceptance criteria

- [x] Slug, domain and organization id are reserved through the control plane with global uniqueness, before any cell row exists.

  `organization_reservations`, unique on `(kind, value)` across `ORGANIZATION_ID | SLUG | DOMAIN`. `createOrganization`'s first step reserves the organization id **and** the slug before `placeOrganization` and long before the cell transaction opens. **`DOMAIN` is modelled but has no caller**, because `createOrganizationSchema` accepts no domain — verified at `dto/organization.schemas.ts:5-17`. Custom domains are added later through `orgCustomDomains`, which is a separate flow; the reservation kind exists so that flow can adopt it without a migration.

- [x] Each step records its state; a retry with the same request resumes rather than duplicating, and an abandoned attempt compensates rather than lingering.

  `organization_lifecycle_sagas` (unique `request_key`) + `organization_saga_steps` (unique `(saga_id, step_name)`). `begin()` is `onConflictDoNothing` then re-read, so a retry returns the existing saga and its step states and the caller skips completed steps. `compensate()` walks `DONE` steps in reverse `position` order.

  **The request key is scoped to the actor, not just the slug.** Keyed on the slug alone — as first written — a second person attempting a taken slug would have resumed the *first* person's saga and bootstrapped their organisation with the second person as owner. Global slug uniqueness is the reservation's job; the request key's job is identifying one person's retry.

- [x] A failure at any step leaves no reserved-but-unusable slug, no cell organization without an owner, and no directory entry for a workspace that does not exist.

  Compensators release both reservations and call `unplaceOrganization`. The organisation row and its owner membership are inserted in **one** transaction, so "a cell organization without an owner" is unrepresentable rather than merely unlikely — and a following step re-checks that the owner membership exists. The directory projection is the last step, so it never runs for a workspace that failed earlier.

- [x] The existing workspace gate keeps working: a created organization lands its owner on setup or dashboard, and neither the org owner nor a platform admin is shown the employee onboarding form.

  `onboardingCompletedAt` is still stamped in the bootstrap transaction and the `org-setup` path is untouched. Pinned by the pre-existing suites, which pass unmodified:

  ```
  PASS src/modules/organization/setup/__tests__/org-setup.service.spec.ts
  PASS src/modules/organization/onboarding/workspace-onboarding.service.spec.ts
  ```

- [ ] The same explicit state machine covers archive, restore, ownership transfer, scheduled purge, purge cancellation, legal hold and terminal deletion — each with its states written down.

  **Five of seven are wired; two are not.** `organization-lifecycle-transitions.ts` declares all ten kinds with their allowed `from` statuses, resulting status and legal-hold constraint, and 51 tests pin the matrix. `assertTransitionAllowed` is called at five real sites — `archiveOrg`, `restoreOrg`, `deleteOrg` (`TERMINAL_DELETE`), `schedulePurge`, `cancelPurge`.

  `OWNERSHIP_TRANSFER` and `LEGAL_HOLD` / `LEGAL_HOLD_RELEASE` have table entries and tests but **no call site**. Ownership transfer lives in `modules/ownership/ownership-transfers.service.ts`, which is S1's territory under ticket 08, and there is no legal-hold endpoint anywhere yet — `organization_legal_holds` is written by nothing, so a hold can only be placed by hand. **What would close it:** S1 routing `ownership-transfers.service.ts` through `assertTransitionAllowed("OWNERSHIP_TRANSFER", …)`, and a legal-hold endpoint under `/organization/legal-holds`. Recorded in [`CROSS-SESSION.md`](../sessions/CROSS-SESSION.md). Left unticked rather than claimed, because the constraint is only real where it is consulted.

- [x] Purge completion is auditable and enumerates every adapter it must reach; an adapter that cannot confirm deletion blocks completion rather than being assumed.

  `organization_purge_confirmations`, one row per `(org, purge_job, adapter)` across nine enumerated adapters, seeded `PENDING` and updated with the real outcome. The worker flips to `PURGED` **only** when every adapter is `CONFIRMED` or `NOT_APPLICABLE`; otherwise the organisation stays `PURGE_SCHEDULED` and the failures are recorded and logged at `warn`.

  **Today that means no purge completes**, and that is the correct reading of this criterion rather than a regression: seven of nine adapters have no implementation to confirm with, and the previous worker flipped the status while deleting nothing — so the status was a lie, not a deletion. What each adapter reports now:

  | Adapter | State | What is missing |
  |---|---|---|
  | `database_rows` | FAILED | no cascade deletion of tenant rows exists |
  | `object_storage` | FAILED | no bucket cleanup path |
  | `search_index` · `vector_index` | FAILED | no index client wired |
  | `analytics_copies` · `provider_mirrors` · `backups` | FAILED | no adapter exists |
  | `cache` | NOT_APPLICABLE | org-scoped keys are TTL-bounded |
  | `audit_evidence` | NOT_APPLICABLE | retained by legal obligation |

  ```
  PASS src/modules/cron/__tests__/cron-org-purge-worker.spec.ts
    √ sets statusV2 = PURGED and status = PURGED in the same transaction so legacy readers exclude the org
    √ blocks completion when an adapter cannot confirm deletion, leaving the org PURGE_SCHEDULED
    √ refuses to purge an organization under an active legal hold
  Tests: 5 passed, 5 total
  ```

  The first test is the pre-existing one; it keeps its original assertions and reaches the completion path by supplying a confirming registry, so the both-columns-consistent contract is still pinned.

## Findings

**A taken slug would have surfaced as a 500, not a 409.** `reserve()` detected the unique violation with `err.code === "23505"`, but Drizzle wraps the driver error and the SQLSTATE sits a `cause` link down. Proved with a real duplicate insert against the live database:

```
error ctor: DrizzleQueryError
agent  isUniqueViolation(err) => false
sqlstateOf-style cause walk   => 23505
```

Fixed by using the repo's existing `sqlstateOf`, which walks the chain by shape — and therefore also survives `postgres-js` building that inner error in another realm, where `instanceof Error` is `false`.

## Todo

- [x] States modelled first, as a pure declarative table with no DB and no Nest, so the matrix is testable on its own (51 tests).
- [x] No third retry mechanism added. The saga records state and resumes; `commandFences` still fronts the endpoint via `@Idempotent("organization.create")`, and the outbox is untouched.
- [x] Purge treated as the step that must be right first time — it now refuses to complete rather than assuming, and refuses outright under an active legal hold.
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
