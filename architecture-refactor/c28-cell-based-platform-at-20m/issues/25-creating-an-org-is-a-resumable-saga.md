# 25 — Creating an organization is an idempotent, resumable saga

**What to build:** Creating an organization either finishes or leaves nothing behind. Reserving the global id, slug, domain and placement, bootstrapping the cell's organization and owner membership, and activating the directory projection are explicit steps that each record their state and can resume or compensate — so a failure halfway does not strand a half-created workspace nobody can enter or delete.

**Blocked by:** [20 — Placement is a record, not a column](20-placement-is-a-record.md)

**Status:** done

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

- [x] The same explicit state machine covers archive, restore, ownership transfer, scheduled purge, purge cancellation, legal hold and terminal deletion — each with its states written down.

  **All seven are now wired.** `organization-lifecycle-transitions.ts` declares all ten kinds with their allowed `from` statuses, resulting status and legal-hold constraint; 51 tests pin the matrix. `assertTransitionAllowed` is consulted at seven real sites:

  | Transition | Call site |
  |---|---|
  | `ARCHIVE` · `RESTORE` · `TERMINAL_DELETE` · `PURGE_SCHEDULE` · `PURGE_CANCEL` | `org-lifecycle.service.ts` |
  | `LEGAL_HOLD` · `LEGAL_HOLD_RELEASE` | `lifecycle/organization-legal-hold.service.ts` |
  | `OWNERSHIP_TRANSFER` | `modules/ownership/ownership-transfer-response.service.ts` `acceptTransfer` |

  **The legal hold is now placeable**, which is what turns the other guards from declared into live: `deleteOrg` and the purge worker already refused an org under an active hold, but `organization_legal_holds` was written by nothing. `POST|GET|DELETE /organization/legal-holds` now write it, reusing the existing `settings:organization:manage` key — **no new permission key**, because a backend-only key would make `useCan` false forever and the frontend catalog is another session's territory. `release` conditionally updates `WHERE released_at IS NULL` and checks the affected-row count, so releasing an already-released hold is a 404 rather than a silent success.

  **Ownership transfer is gated only for `ORGANIZATION` scope.** A `MODULE`-scoped transfer is a different concern and is deliberately not subject to the org transition table — pinned by a test that passes a module transfer through while the org holds an active legal hold.

  ```
  PASS src/modules/organization/core/lifecycle/organization-lifecycle-transitions.spec.ts
  PASS src/modules/organization/core/lifecycle/organization-saga.service.spec.ts
  PASS src/modules/organization/core/lifecycle/organization-legal-hold.service.spec.ts
  Tests: 72 passed, 72 total

  PASS src/modules/ownership/__tests__/ownership-transfer-lifecycle.spec.ts
  PASS src/modules/ownership/__tests__/ownership.service.spec.ts
  PASS src/modules/ownership/__tests__/module-transfer-parties.spec.ts
  PASS src/modules/ownership/__tests__/ownership-notifications.spec.ts
  Tests: 50 passed, 50 total
  ```

  **A legal hold blocks only the destructive transitions**, by design — `PURGE_SCHEDULE` and `TERMINAL_DELETE`, and nothing else. A hold preserves data; it is not an administrative freeze, and blocking ownership transfer would strand an organisation under an indefinite hold whose owner had left, with nobody able to take it over. A test asserted the opposite when it was first written; the design was kept and the test corrected to assert the intended behaviour explicitly, alongside a case proving the destructive pair *are* still refused.

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
  Tests: 9 passed, 9 total
  ```

  The first test is the pre-existing one; it keeps its original assertions and reaches the completion path by supplying a confirming registry, so the both-columns-consistent contract is still pinned.

## Adversarial review round (2026-08-28)

Three parallel reviewers went over this work afterwards. Four real defects found and fixed; the headline one was **mine, not an agent's**.

**P0 — the legal-hold guard could never run.** `cron-org-purge-worker.purgeSingle` read `organization_legal_holds` on the bare pool. That table is RLS-protected, the cron route is `@Public()` so no `TenantContextInterceptor` context exists, and the policy uses the *raising* variant. Proved as `streamline_app` (`rolbypassrls = false`):

```
policy USING: (org_id = current_org_id())
READ with NO GUC -> ERROR code= 42501 no tenant context: app.organization_id is not set
```

The reviewer predicted a silent empty read (fail-open, held org purged). The truth is the opposite — it raises, so `purgeSingle` died on its **first statement** and every purge was counted as a generic failure. Fails closed, but it means purge was broken *before* it ever reached the adapter logic, so this ticket's "adapters block completion" evidence was only half the story. Fixed by wrapping the read in `runInNewTenantTransaction`, plus a test that fails if the read regresses to the pool.

**P1 — a half-applied step stranded a reservation.** `reserve-identity` reserved the organisation id, then the slug. If the slug reserve threw a non-`23505` error, the step was marked `FAILED` — and `compensate` only walks `DONE` steps, so its compensator never ran. The id reservation persisted for its 7-day TTL and every retry collided with it. Fixed with inline cleanup inside the step, since a step that half-applies has to undo its own first half.

**P2 — `complete()` could overwrite a terminal state.** It was an unconditional `UPDATE`, so a retry after compensation flipped `COMPENSATED` → `COMPLETED` and erased the rollback from the audit trail. Now guarded with `notInArray(state, ["COMPLETED", "COMPENSATED"])`.

**Inert code — `claim()` was never called and `fail()` was dead.** Reservations went `RESERVED` → deleted, never reaching `CLAIMED`. `claim` is now called for both the organisation id and the slug once the saga completes (2 call sites). `fail()` was redundant — `runStep` already marks the saga `FAILED` — so it was deleted rather than given an invented caller.

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
