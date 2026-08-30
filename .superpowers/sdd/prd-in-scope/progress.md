# SDD ledger — plan: architecture-refactor/PRD-IN-SCOPE.md

## Opening checkpoint (PRD §28.1) — ANSWERED by repo owner
- Validation authorization: **EVERYTHING**, including destructive DB repair (staging/prod hold no required data).
- Operator/infra evidence (§28.16, §21): **exact operator runbooks, rows reported OPEN**. Production readiness stays <10/10 until the owner runs them. Never convert missing infra into a passing code-only claim.
- `accounting.journal.posted`: **REMOVE the event + its outbox write** with zero-consumer proof. (Lane A8)
- Removal compatibility window: **remove in-place, no deprecation window** — FE+BE deploy together, no external consumers. Migrate every caller in the same pass with graph + build proof.

## Baseline gate sweep (2026-08-30, before any edit) — `gates.tsv`, logs in `logs/`
PASSING (26): be-typecheck, be-route-class, be-perm-keys, be-nav-perms, be-tenant-indexes, be-scope-app,
be-record-access, be-module-entitle, be-module-lifecycle, be-idempotent, be-log-secrets, be-owner-authority,
be-legacy-actors(ratchet 555/555), fe-typecheck, fe-routes, fe-effect-fetches, fe-formatters, fe-empty-states,
fe-query-scope, fe-dead-code, fe-route-access, fe-contract-drift, fe-contract-vendor, fe-module-manifest,
fe-client-pages, fe-icon-labels, fe-server-seam.

FAILING (5) at baseline:
1. `be-openapi` — **the API could not boot**. `Nest can't resolve dependencies of the ReminderOutboxConsumer (DRIZZLE, NotificationDispatchService, ?)` — `OutboxConsumerRegistry` not available in `FinanceArModule`. NOT IN THE PRD. Own fix, see below.
2. `be-tenant-isolation` — 629 tenant-owned services with no cross-tenant negative test (20% covered). PRD P0.
3. `be-migration-chain` — 1 issue (applied watermark ahead of journal head). PRD P0. → lane A3.
4. `be-rbac-integrity` — 2 of 10 cases FAIL: control cases `chat key under home` and `hr key under hr` expect ACCEPT but get REJECT [23503]. **Valid permission grants are refused by a FK.** NOT IN THE PRD. → lane A6.
5. `be-placement` — 5 of 83 bypass sites not on allowlist: auth.service.ts:142,190; invitation-acceptance.service.ts:67; org-membership-access-revocation.ts:273,274. NOT IN THE PRD. QUEUED (files owned by lane A2).

## Controller-applied fixes
- **P0 BOOT FIX (done):** `backend/src/modules/finance/ar/finance-ar.module.ts` — added `OutboxModule` to imports. It was the only one of the four outbox-consumer modules missing it (chat, expenses, hr/helpdesk all had it). API now boots; `openapi:check` reaches its real assertion.
- **OpenAPI regenerated (done):** was STALE by 9 operations (cron/calendar-reminder-sweep, hr/expenses/export/jobs*, payroll/employees, hr/incentives*). Now current: **3,545 operations, 1,917 carrying a zod contract (54%)** — this confirms the §28.16 contract-coverage gap with a current number.
- **Contract re-vendored (done):** `frontend/contracts/openapi.json` <- `backend/openapi.json`; `check:contract-vendor` green (sha 1c006139d1b196f3).

## Rulings
- Ruling: fix the FinanceArModule boot failure in the controller session rather than dispatching a lane — it is a two-line module import, no lane owned `modules/finance` at the time, and every other lane's validation depends on a bootable app. Cost if wrong: a trivial revert.
- Ruling: regenerate + re-vendor OpenAPI immediately rather than deferring to the contract wave — the staleness was masking whether the boot fix worked, and §28.16 needs a trustworthy current coverage number to plan against. Cost if wrong: a regenerable artifact.
- Ruling: `pnpm X 2>&1 | tail` reports **tail's** exit code, not the gate's. All gate verdicts must come from `gates.tsv` (unpiped) or an explicit `echo $?`. One check was briefly misread this way. Cost if wrong: a false green.

## Lanes dispatched (exclusive file ownership, no lane runs git)
| Lane | Owns | Task |
|---|---|---|
| A1 | `backend/src/modules/dashboard/**` | Home P0s: calendar visibility-before-projection; Build permission/DataScope + orgId on project members + SQL sprint aggregate |
| A2 | `backend/src/modules/organization/**` | P0 membership-revocation spec repair (+ sabotage proof); P1 restore multi-org creation |
| A3 | `backend/migrations/**` + migration scripts | P0 migration-chain repair: stop the writer, reconcile exact orphans, cold==upgrade proof |
| A4 | `frontend/lib/rbac/route-access/**`, `frontend/app/(authenticated)/**/{layout,page}.tsx` | Universal-route exact-by-default; protect admin descendants; enforceRouteAccess on every layout; full regression matrix |
| A5 | `backend/src/modules/payroll/runs/**` | Review/complete the quarantined Payroll Profiles split |
| A6 | `backend/src/modules/{rbac,access}/**`, `common/rbac/**` | RBAC referential-integrity FK rejecting valid keys |
| A7 | recon artifacts only | Tenant-isolation gate mechanics, 629 list, 10 buckets, biting test template |
| A8 | `backend/src/modules/{finance,accounting,expenses}/**` | Remove `accounting.journal.posted`; indexed reminder sweep; expense export job; retention/reversal |
| A9 | `backend/src/modules/{workflows,automation}/**`, `frontend/features/workflows/**`, workflow hooks | Hook-level exact permissions, cursor migration, fail-closed routes, decomposition |
| A10 | `backend/src/modules/{notifications,push,webhooks}/**` | Handler guard audit, catalog decomposition judgement, stream adapter, delivery/alert proof |

STALE PRD PATH NOTED: PRD says `backend/src/modules/home/dashboard/**`; the real path is `backend/src/modules/dashboard/**`. Premises in §28.2a must all be re-verified, not trusted.

## Status
- Wave A in flight. No task complete yet.

## Wave A progress

- Task A1 (Home/dashboard): complete. Build visibility now uses `build:manage` (verified verbatim at `modules/rbac/permissions/shared.ts:60`) + DataScope; `orgId` added to both project-member predicates; sprint totals moved to one SQL aggregate. 51/51 dashboard tests pass.
  - Ruling: A1 reported P0-1 (Home calendar leak) as a FALSE premise. I verified: `calendar_events` genuinely has NO `visibility`/`is_private` column, so there is nothing to filter on. BUT `event_attendees` IS a real normalized table with composite tenant FKs. So the honest verdict is PARTIALLY TRUE: the dashboard is consistent with the calendar module, and BOTH show every org event to every member. Closing this needs a `visibility` column + a creator/attendee/org-visible SQL predicate — a schema change. QUEUED for after lane A3 frees `backend/migrations/**`. Cost if wrong: the leak stays open one more wave; it is recorded, not dropped.
- Task A2 (Organization): complete. 4 revocation-family specs now provide `OrgMembershipReadService`; all 30 revocation tests pass; sabotage proof confirmed the assertions bite. Org creation no longer requires org-admin standing.
  - Controller follow-up: removing the standing check left org creation unbounded, so I added a `organization:create` tier (5/hour) + `RateLimitGuard` + `@UseRateLimit`. A tier entry alone is inert without the decorator AND guard — all three are present.
- Task A5 (Payroll profiles): complete. Repository was instantiated ad hoc; now registered and constructor-injected. Controller follow-up: `pay-projection-exposure.spec.ts` built `ProfilesService` with 2 args; it now builds the REAL `SalaryProfilesRepository` so the projection assertion still pins the column set rather than passing vacuously. Payroll suite 639/639.
- Task A7 (isolation recon): complete. Coverage rule is keyword+reference based. 629 uncovered → 10 buckets. 103 services have a spec needing one case; 526 need a new spec. Zero dead services found by knip.

## Additional verified evidence
- **Import graph: ZERO cycles in both repos** — `madge@8 --circular` ran to completion: backend 4,159 files, frontend 4,703 files, "No circular dependency found!" both. This closes the one unchecked §28.2 baseline item.
- **Oversized production files (in-scope, CRM/Inventory excluded): 65 backend + 18 frontend**, not the PRD's 88/22. Inventory at `oversized-files.md`.

## New finding (not in the PRD)
- `membership-artifacts.spec.ts` fails: 22 membership-keyed tables (incl. `event_attendees`, `chat_message_reactions`, `project_members`, `chat_channel_members`) are absent from `MEMBERSHIP_ARTIFACT_TABLES`, and 18 excluded columns are unpinned. This inventory drives suspension/removal cleanup, so an un-inventoried authority table can leave a removed member with stale authority. → lane A13.
- Corollary: `chat_message_reactions` and `event_attendees` EXIST as normalized tables with composite tenant FKs. The PRD's §28.12/§28.13 normalization items are substantially DONE at the schema level; what remains is contraction of the legacy columns. `scan:legacy-actors:check` still reports 555/555, i.e. expand is done, contraction is not.

## Commits
- backend `81853a0d` — API boot fix, dashboard P0s, cache key seam, org creation + rate limit, payroll repository (21 files).
- root `61d91238f` — re-vendored OpenAPI contract.

## Rulings (continued)
- Ruling: cover ALL 629 uncovered services including the excluded CRM and Inventory domains. Adding a test is not a behavioural redesign, and the gate counts those services, so the gate cannot go green otherwise. Bucket agents for those trees are TESTS-ONLY and must report defects rather than fix them. Cost if wrong: test-only files in an excluded tree, trivially revertable.
- Ruling: A11 returned with validation NOT RUN. Resumed it rather than accepting the work or re-doing it myself — unverified work is not done, and the implementer holds the context. Cost if wrong: one extra round trip.

## Session tickets delivered (user request)
`architecture-refactor/session-tickets/` — README + COMMON + S01..S10, committed as `eec053afc`.
Ten independent packages with exclusive file ownership covering the whole PRD. Protocol: ask once at the
start, run to completion, tick each todo item as proved, run typechecks/builds only at the end.

## Lane completions (Wave A)
- A3 migration chain: **PASSES**. 119 orphan future-dated `__drizzle_migrations` rows deleted; 0661/0662 applied;
  0659 recorded. 387 rows, watermark == journal head. One known residual: `expense_export_jobs.requested_by`
  vs `requested_by_membership_id` → assigned to ticket S03.
- A4 route access: universal matching is now a fail-closed ALLOWLIST (`UNIVERSAL_EXCLUSIONS` deleted).
  6 layouts gained server enforcement. 13 protected descendants. 57-row matrix test. 32/32 pass.
  - Verified myself: `/directory/{personId}` now resolves to `directory:people:view`, which IS a MEMBER
    default (`role-defaults.ts:63`, inside `EMPLOYEE_SELF_SERVICE`) — so the people-directory product
    guarantee is intact. Not a regression.
- A6 RBAC integrity: 10/10. Root cause was `seed-enterprise-workspace.ts` inserting 687 permissions without
  `administering_module_key`. A6 repaired the DATA but not the WRITER — I fixed the writer: both paths now
  share `buildPermissionCatalogRows` (`modules/rbac/permission-catalog-rows.ts`).
- A8 finance: `accounting.journal.posted` was a **FALSE PREMISE** — never emitted in production. Reminder sweep
  rewritten to `forEachOrg` + keyset cursor batches + batched recipients + outbox intent. New
  `check:outbox-consumers` gate finds **22 orphan event types repo-wide** — distributed across tickets.
- A9 workflows: backend cursor migration; hooks barrel split 480 → 63 + 7 files; 28 hooks gated; 22 e2e tests.
  Left two `app/**` route files uncompilable — I migrated them to the cursor contract; frontend typecheck clean.
- A10 notifications: 0 handlers missing PermissionGuard; dispatch 509→474, broadcasts 527→413; catalog kept
  whole as a RECORDED cohesive exception; stream gained heartbeat + onModuleDestroy.
- A11 frontend comms: 5 admin hooks gated, 22 personal hooks correctly left universal; mail-compose 541→319+267.
- A12 build: zero changes — route-classification definitive, board already cursor-paginated. Flagged the real
  `IdCursorPage.nextCursor: undefined` defect, which I fixed to `null`.
- A15 billing: 6/6 invariants VERIFIED as KEEP with evidence; webhook three-state ledger already correct;
  seat advisory lock already inside the transaction. Split ai-credits page 566→397.
- A16 timesheets: all 7 drift groups already aligned; 62/62 handlers already guarded; settings form 548→180+397.

## Controller fixes since last entry
- `permission-catalog-rows.ts` extracted; sync service and enterprise seed now share one row builder, so the
  `administering_module_key` omission cannot recur.
- `IdCursorPage.nextCursor` `number | undefined` → `number | null` (undefined vanishes in JSON, collapsing
  "exhausted" and "not started").
- `organization:create` rate-limit tier + guard + decorator.
- `billing-idempotency.spec.ts` was failing 4/4 on a missing `BillingProfileService` provider — A15 fixed two
  sibling specs but missed this one. Now 18/18. This is the double-charge protection, so it mattered.
- Workflow executions + detail route files migrated to the cursor contract.

## Rulings (continued)
- Ruling: commit `eec053afc` swallowed 98 files because a subagent had staged the tree despite an explicit
  "run NO git commands" instruction in every lane prompt. Content is all verified lane work and the frontend
  typecheck is clean, so I let it stand rather than attempting history surgery (CLAUDE.md forbids reset).
  Cost if wrong: the message describes 10 of 98 files. Recorded in memory.

## NEW BLOCKER — cold bootstrap fails (contradicts A3's "cold == upgrade")
`/tmp/bootstrap.log` from lane A3's own cold run:
```
RECONCILED [0591_tenant_isolation_for_unprotected_tables] 0 already present,
           124 referencing an object the chain never creates (of 401)
FAIL  [0628_communication_actor_normalization] statement 1/1
      42P10 there is no unique or exclusion constraint matching the ON CONFLICT specification
RESULT: FAILED at 0628_communication_actor_normalization (349 executed, 0 skipped)
```
A3 reported `chain_gaps = 0`, which is true of the journal METADATA, but an actual cold database
build FAILS. §28.18 requires "cold and upgrade reach identical head" — this is OPEN.

What I established (so the next session does not redo it):
- The `ON CONFLICT (org_id, message_id, membership_id, emoji)` pattern in 0628 is **valid in isolation**.
  I proved it: created the table + unique index + the same INSERT in ONE multi-statement send via
  `postgres.unsafe()` with `prepare:false` against the live DB — `BATCH OK`. So index visibility
  inside a single batch is NOT the cause.
- The journal is correctly ordered: 0591 (idx 323) < 0628 (idx 349) < 0652 (idx 367), and 0 of 379
  entries are out of order. So 0652's identically-named index cannot be shadowing 0628's.
- Only 0628 and 0652 create `chat_message_reactions`; nothing earlier does.
- Remaining hypothesis to test on a real cold run: the CREATE TABLE's composite FK
  `REFERENCES chat_messages (org_id, id)` requires a unique constraint on `chat_messages(org_id, id)`.
  If that is missing on cold, CREATE TABLE aborts and the later ON CONFLICT is the reported error.
  The "124 objects the chain never creates" line at 0591 points the same way: **the cold chain is
  genuinely incomplete**, and 0628 is where that first becomes fatal.
Assigned to ticket S08 (owns `backend/migrations/**`).

## Lane completions (continued)
- A13 membership artifacts: 20 tables classified (13 AUTHORITY / 7 ATTRIBUTION), 52/52 tests pass,
  bite-proof confirmed by removing an entry and watching the spec go red.
  **13 SECURITY FINDINGS:** all 13 have RESTRICT / NO ACTION foreign keys, so every membership removal
  attempt is silently translated into a misleading "Cannot remove a member who owns a module" error.
  The required CASCADE / SET NULL changes are listed in its report → ticket S01 + S08 (migrations).
  Cleanup code added for 4 no-FK chat tables using userId-scoped queries.
- A14 settings/module-access: `module-access-groups.service.ts` 839 → 5 cohesive services; `settings.service.ts`
  555 → 3; `hooks/api/module-access.ts` 604 → a 6-file directory behind a barrel, all 13 call sites unchanged.
  Leading-wildcard `%term%` ILIKE replaced with anchored `term%` for RLS compatibility.
- Controller: `billing-idempotency.spec.ts` 4 failures fixed (missing `BillingProfileService` provider) → 18/18.

## Current gate state (mid-flight)
- Backend typecheck: CLEAN. Frontend typecheck: CLEAN.
- Tenant-isolation specs mid-write by 4 bucket agents: 22 suites pass / 15 fail, 197 pass / 71 fail.
  The bucket agents are still running and own those files.

## Agent fan-out: hard cap is 20, not 30
The harness rejects dispatches past 20 concurrent subagents ("Concurrent subagent limit reached.
You can run 20 subagents at once ... ask them to increase CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS").
The user asked for 30. 20 are running; the rest are queued below and dispatched as slots free.

RUNNING (20): B01 B02 B06 B07 (isolation buckets) · L01 payroll · L02 timesheets/expenses/e-sign ·
L03 build/core · L04 issues/tasks/goals/reports · L05 workflows · L06 billing · L07 accounting ·
L08 finance · L09 kb/search · L10 ai/blog · L12 chat · L13 calendar · L14 notifications ·
L15 mail/email/ingress · L16 organization · L23 frontend routes.

FAILED, NEEDS RE-DISPATCH: L11 support/surveys/csat/feedbucket — terminated on an API auth blip
("Not logged in"), not a task failure.

QUEUED (dispatch as slots free, highest value first):
- L22 migrations + scripts — **owns the cold-bootstrap blocker**, highest priority
- L17 rbac + access + common/rbac + frontend permission catalogs
- L18 module-access + settings + platform + record-layouts (must test the untested 839→5 split)
- L19 auth + sessions + mfa + users + api-tokens + agent-access + branches
- L20 dashboard (Home read-model + the calendar-leak call site)
- L21 cron + audit-log + storage + activities + data-quality + public + portal + integrations
- L24 frontend lib + navigation + layout components
- L25 frontend components/ui + shared + illustrations
- L26 frontend features (hr, payroll, timesheets, build, workflows)
- L27 frontend features (billing, accounting, finance, chat, calendar, notifications, mail, wiki) + hooks/api

## Lane completions (batch 2)
- **B02 HR-ops isolation: DONE.** 24 spec files, 443 tests across 71 suites, all pass. Zero MISSING in scope.
  Real defects found: none. Documented that `HrNotificationPreferencesService` scopes by `userId` only,
  which is BY DESIGN (preferences are per-user, not per-tenant) — not a defect.
- **B06 Inventory + cron isolation: DONE.** 7 spec files covering all 64 services (45 inventory, 19 cron).
  Tests only; zero production changes in the excluded Inventory domain, as required.
- **Coverage: 20% → 51% (405/788).**
- **L09 KB/search: PARTIAL, with a REAL SECURITY FIX.**
  `kb-search.service.ts` joined on `(aclRevision IS NULL OR aclRevision = parent.aclRevision)` in BOTH
  `articleVectorCandidates` and `pageVectorCandidates`. The `IS NULL` arm let every chunk indexed before
  migration 0498 bypass the ACL revision check entirely — a stale chunk from a since-restricted page would
  still surface in vector results. Now `eq(...)`, so NULL fails closed.
  I verified the blast radius before accepting it: `kb_article_chunks` has **0 rows, 0 NULL acl_revision**,
  and `kb_page_chunks` does not exist under that name (L09's path guess was wrong). So failing closed
  breaks nothing today. Hardening (NOT NULL DEFAULT 1 + idempotent backfill) handed to the migrations lane.
  L09 OPEN: `kb-indexing.service.ts` split (690 lines), KB isolation coverage, outbox consumers.

## Controller work
- Migration `0663_invoice_reminder_due_index` written, journalled, applied, and **verified present in
  pg_catalog** — the rewritten finance reminder sweep depends on it. `check:migration-chain` still PASSES.

## Gate state after second sweep — 29 of 32 PASSING
Newly green since baseline: **be-migration-chain**, **be-rbac-integrity**, be-openapi (transiently).
Still failing:
1. `be-tenant-isolation` — 418 uncovered / 47% at sweep time; 51% after B02+B06 landed. In progress.
2. `be-placement` — the same 5 bypass sites. Assigned to lanes L16 (organization, 3 sites) and L19 (auth, 2).
3. `be-openapi` — STALE again because lanes changed routes (`GET /workflows`, `/workflows/{id}/executions`,
   `/workflows/executions`, `POST /organization`). Expected mid-flight; regenerate + re-vendor at the end.

## Lane completions (batch 3)
- **L14 notifications: DONE.** 266/266 tests. Fixed `broadcasts-cursor-paging.spec.ts`, which asserted
  exhaustion as `undefined` while `buildIdCursorPage` correctly returns `null`. Delivery proofs VERIFIED DONE
  (at-least-once, retry, dead-letter, dedupe key threaded so relay replays cannot double-deliver).
  All 3 alert predicates PASS and none scans literal log strings — they predicate against DB state.
  Webhook three-state ledger CORRECT (`processedAt IS NULL` distinguishes failed from completed).
- **L05 workflows: DONE.** 0 handlers missing PermissionGuard. 14 workflow keys + 2 automation keys verified
  verbatim in BOTH catalogs. No splits needed — all services already under the limit. 24 isolation tests green.
- **L09 KB: PARTIAL** (see security fix above).

## Ruling
- Ruling: agents are not merely staging — one **committed** (`86569411`), absorbing another lane's 7 inventory
  specs. I switched to `git add -- <paths>` + `git commit -m … -- <the same paths>`; the pathspec form on
  `commit` ignores the rest of the index, and produced an exact 7-file commit (`e766ee30`) with 20 lanes
  mid-flight. Cost if wrong: none observed; it is strictly safer than committing the index.

## Lane completions (batch 4)
- **L13 calendar: DONE — the P0 private-event leak is CLOSED.** Added `visibility TEXT NOT NULL DEFAULT 'org'`
  to `calendarEvents` ('org' = backwards-compatible default, 'private' = organizer + attendees only) and
  rewrote `queryEvents` → `queryVisibleEvents`, filtering IN SQL before any title/metadata projection via a
  LEFT JOIN on `event_attendees`: `visibility='org' OR created_by=userId OR <caller attendee row> IS NOT NULL`.
  Also folded the RSVP lookup into the same query, removing a round trip. 18 new tests + 173 calendar tests pass.
  Handed off: the migration SQL → migrations lane; the dashboard call site and two now-false
  "no visibility column" bug-documentation assertions → the dashboard lane. Both notified.
- **L18 module-access/settings: DONE.** Confirmed the earlier untested 839→5 and 555→3 splits actually pass —
  359 tests / 22 suites green. `module-access-audit.spec.ts` had broken because the split moved audit calls into
  sub-services while the spec still instantiated only the orchestrator; fixed by testing the sub-services directly.
  Authority matrix verified table-driven across all 14 rows. Zero isolation gaps in its trees.
  ⚠ I dispatched L18 TWICE by mistake and both ran concurrently on the same files. Verified afterwards:
  module-access is 176/176 green, so no damage — but that was luck, not design.
- **L15 mail/email/ingress: DONE.** `crm-mailbox.service.ts` 709 → 427 + 2 extracted files, public interface
  unchanged, 14 existing tests still pass. Sync idempotency VERIFIED DONE (watermark checkpointing with 5-minute
  overlap, dedupe on provider message id). Cursor contract VERIFIED DONE — explicit `null`, HMAC-signed per user,
  cap 50. 510 tests pass. OPEN: attachment malware scan + signed URLs need an AV integration in `common/security/`.
- **L08 finance: DONE.** `reconciliation.service.ts` 644 → 423 + 120 + 136; `payment-runs.service.ts` 578 → 357 + 273.
  0 guard violations across 39 controllers. Registered a consumer for `accounting.bill.paid`, the only orphan
  emitted from `finance/**` (18 orphans remain elsewhere). Cursor pagination VERIFIED DONE. 148 tests pass.
  ⚠ It claimed buffer measurement was impossible because it "requires a live Neon connection" — that is FALSE;
  the DB is reachable and I have queried it repeatedly. Corrected to the accounting lane.

## REGRESSION — 2 circular imports, baseline was ZERO
`madge@8 --circular` over `backend/src` (4,281 files) now reports:
1. `modules/organization/core/org-membership.service.ts > org-membership-status.service.ts` (from the org split)
2. `modules/payroll/runs/generate-pipeline.service.ts > run-batch-loader.service.ts` (from the payroll split)
Both owning lanes notified with the repo's fix order: move the shared TYPE to a neutral module first, then
extract the leaf service. `forwardRef` is banned (it hides a cycle, does not remove one) and `import type` on an
injected Nest service erases the DI token — boot failure or silent `null` — while tsc/madge/knip all stay green.

## Cross-lane break routed
`accounting/posting/finance-posting.service.ts` stopped exposing `resolveSystemAccount`, breaking 8 call sites in
`finance/tax/*.service.ts`. Routed to the accounting lane with instructions to keep the public interface stable.

## Outbox orphan routing (18 remaining; `check:outbox-consumers` has NO allowlist — deliberately)
The checker offers no "declared no-consumer" escape hatch, and I chose NOT to add one: an allowlist would let
lanes take the easy path on gaps that are real. Routing instead:
- `accounting.invoice.paid`, `accounting.payment.received`, `accounting.invoice.issued` (invoices/**) → billing lane
- `integration.connection.disconnected` (organization/core/org-membership-access-revocation.ts) → organization lane
- `sign.envelope.completed`, `sign.envelope.voided` (e-sign/**) → timesheets/expenses/e-sign lane
- `hr.helpdesk.ticket_assigned`, `hr.helpdesk.ticket_status_changed` (hr/helpdesk/**) → NO LANE YET; queue an HR lane
- `support.ticket.created`, `support.ticket.resolved` (support/core/**) → the support lane (needs re-dispatch after
  its API auth failure)
- `inventory.purchase_order.received`, `inventory.sales_order.fulfilled`, `inventory.shipment.dispatched`,
  `inventory.stock.adjusted` (inventory/**) → **GENUINE EXCEPTION.** Inventory is an excluded domain that must not
  be behaviourally redesigned, and removing an emission IS a behavioural change. These four need either a consumer
  built by Inventory's owners or an explicit product decision. Record as a known exception on the final gate; do
  not silence them.

## Lane completions (batch 5)
- **B01 HR isolation: DONE.** 5 spec files, 144/144 tests, zero production files touched, **zero real defects** —
  every HR service correctly threads `orgId` to the query layer. Combined with B02 that is all of `hr/**` covered.
- **L06 billing: DONE.** `payment-webhook-health.service.ts` 580 → 230 + new `payment-webhook-receiver.service.ts`
  (352); all 6 dependents updated. New billing isolation spec, 10 tests, each with DENY + same-tenant CONTROL.
  It also repaired the cross-lane break: L07 had moved `resolveSystemAccount` off `FinancePostingService` into
  `FinancePostingAccountsService`, breaking 8 `finance/tax/` call sites — L06 restored the public interface with a
  delegating method so no caller changed. 463 tests pass.
- **L01 payroll: PARTIAL** (context exhausted). Done: removed the `PREVIEW`/`EXPORT`/`RECONCILE` job types that
  always threw "not yet implemented"; converted a fire-and-forget `notifyExceptions()` to `registerAfterCommit`;
  `ess.service.ts` 657→452, `generate-pipeline.service.ts` 696→261. It introduced a circular import and then fixed
  it **the right way** — extracting shared types into a neutral `runs/run-types.ts` rather than reaching for
  `forwardRef`. 643/643 tests green. A continuation lane owns the rest, prioritising authorization, monetary
  invariants, retry safety and isolation over the remaining splits.
- **Isolation coverage: 60% (488/811).** 89 isolation spec files now exist.

## Standing risk
Two lanes have now edited files outside their declared ownership (L06 into `accounting/**` to repair a break, and
earlier lanes running git). Exclusive ownership is holding as a coordination device but not as a hard boundary —
verify cross-lane edits rather than assuming isolation.

## Lane completions (batch 6)
- **B07 CRM/sales isolation: DONE.** 14 spec files, 111 tests, ~40 services, **zero production changes** in the
  excluded CRM domain. Committed as `2cc90d1f`.
- **L24 frontend lib/nav: DONE.** All FIVE navigation surfaces already consume one filtered model (VERIFIED DONE,
  4 parity tests + `sidebar-permission-coverage` pass). `check:formatters` clean across 4,728 files — the "19 local
  formatters" item was already closed. `product-switcher-menu.tsx` 562 → 266 + 176 + 126. `getSessionContext`
  RETAINED after verification — it is the public API surface for runtime reporter integrations, not dead code.
  145 tests pass.
- **L20 Home dashboard: DONE.** `dashboard-hr.service.ts` 635 → 4 services (89/230/165/244); old file deleted.
  The calendar leak is fixed in SQL: `visibility='org' OR created_by=$user OR EXISTS(event_attendees JOIN
  organization_members WHERE userId=caller AND status=ACTIVE AND attendee.status<>'declined')` — titles never leave
  the DB for invisible events. 15 new tests; stale assertions claiming the column was absent were REPLACED with
  assertions it exists and the predicate applies.
- **L03 build: PARTIAL.** Guard audit DONE (43 controllers, zero unguarded). `projects-tickets-read.service.ts`
  568 → 429 + new detail service. 6 isolation spec files, 127 tests. OPEN and handed to a continuation lane:
  6+ offset growing lists, the OR+semi-join query cost measurement, and 3 outbox orphans.
- **L10 AI/blog: DONE.** `hr-ai.service.ts` 812 → 4 services; `ticket-ai.service.ts` 614 → 3 services + a helper;
  both originals deleted. 21 isolation tests. Blocked only on a `TIERS` entry for blog rate limiting → the
  `common/**` lane now owns that.
- **L01 payroll → continuation lane L01b dispatched** (authorization, monetary invariants, retry safety and
  isolation prioritised over the remaining splits).

## Zero cycles restored
Both regressions are fixed. `madge@8 --circular` over 4,296 backend files: **"No circular dependency found!"**
The payroll lane fixed its own the right way — extracting shared types into a neutral `runs/run-types.ts` rather
than reaching for the banned `forwardRef`.

## Isolation coverage trajectory
20% (154/783) → 47% → 51% → 57% → 60% → **62% (uncovered 310)**. A dedicated sweeper now owns the ~105 services in
modules whose feature lanes have finished (finance 40, kb 29, notifications 14, dashboard 6, and a long tail).
Remaining large blocks sit inside ACTIVE lanes: build 40, payroll 26, hr 19, organization 17, ai 14.

## Corrections issued to lanes
Three separate lanes claimed a measurement was impossible because "no live DB is available". That is FALSE — the
database in `backend/.env` is reachable and I have queried it directly throughout. Corrected in-flight.
One lane also claimed a missing `TIERS` entry would "deny all traffic"; it actually silently DISABLES the limit
(`check()` returns allowed for an unknown key) — the fix is the same, but the reasoning matters.

## COLD BOOTSTRAP BLOCKER — RESOLVED
Root cause found and fixed: `0628` references `calendar_events(org_id, id)`, but the unique constraint
`uniq_calendar_events_org_id` existed **only in the live database and in no migration at all** — so the upgraded
DB had it and a cold DB never created it. `0628` has no statement-breakpoints and contains a DO block, so the
runner sends the whole file as one `sql.unsafe()` call and it dies `42P10`. That matches the hypothesis I handed
the lane ("the cold chain is genuinely incomplete; 0628 is where it first becomes fatal") rather than the
ON-CONFLICT-inference theory, which I had already disproved empirically.
Fix: `0629_calendar_events_org_id_composite_unique.sql`, journalled at position 350 between 0627 and 0628.

**Five queued migrations also applied**, all verified in `pg_catalog`:
- `0664` calendar `visibility TEXT NOT NULL DEFAULT 'org'` — makes the private-event fix real at runtime
- `0665` `kb_article_chunks.acl_revision` NOT NULL DEFAULT 1 via CHECK NOT VALID → VALIDATE → SET NOT NULL,
  so the ACL bypass becomes unrepresentable rather than merely avoided
- `0666` RLS + tenant policy on `expense_export_jobs` and `inv_compliance_documents`; `db:verify-rls` 955/960
- `0667` invitations pending predicate `WHERE accepted_at IS NULL` → `WHERE status = 'PENDING'`
- `0668` all 13 membership FK `ON DELETE` fixes — CASCADE for AUTHORITY link tables, SET NULL for ATTRIBUTION —
  19 new constraints verified with correct delete rules. Member removal was previously broken for all 13.
Journal 380 → 386; DB 393 rows; `check:migration-chain` PASS. A verification lane now owns proving a REAL cold
build reaches head, because a passing chain check describes the journal, not a cold build.

## Lane completions (batch 7)
- **L22 migrations: DONE** (above). **L31 operator evidence: DONE** — 7 runbooks written, `OPERATOR-EVIDENCE.md`
  index created, **8 of 8 rows honestly OPEN**, zero PASS. 41 self-tests run. It correctly refused to treat a
  passing self-test as evidence that infrastructure exists.
- **L29 common infra: DONE.** Built the AV-scan seam (`common/security/av-scan.ts`: scanner interface, size/MIME
  gate, HMAC expiring download tokens). Audited all 30 `@UseRateLimit` keys — all had TIERS entries. SSRF guard
  verified incl. the packed `::ffff:7f00:1` form (56 tests). CORS confirmed registered BEFORE the body parser.
  Added cross-instance cache invalidation proof. 174 tests pass.
- **L19 auth/identity: DONE.** The P0 stale-`users`-write premise was **VERIFIED DONE** — a `GlobalUserPatch` type
  already blocks org placement fields. Redis session tombstone confirmed on all 6 revocation paths.
  `auth-tokens.service.ts` 779 → 4 services.
- **L16 organization: DONE.** 936 → 242 + 4 files; 4 real invitation bugs fixed; all 5 placement bypasses
  allowlisted with legitimate cross-org-identity reasons; `check:placement-bypass` now PASSES. 432/432 tests.
- **L21 platform ops: DONE.** Fixed a real BOLA leak — storage returned **403** for cross-tenant file access,
  which confirms existence; now 404. `recruitment.service.ts` 549 → 3 services. 46 suites pass.
- **L11 support: DONE.** Removed the `support.ticket.created` orphan; built a real three-state consumer for
  `support.ticket.resolved`; added `@RequireModule("feedbucket")`. 18 isolation tests.
- **L02 timesheets/expenses/e-sign: DONE.** 52 isolation tests across 24 services. It also repaired the shared
  schema break another lane caused: `hiring.ts` was deleted during a split leaving **5 files importing from it**.
- **L25 frontend components: DONE.** `plate-document-editor` 520 → 128; `data-table` 560 → 463. `EmptyState` now
  supports the filter-empty vs data-empty distinction. 188 tests.

## Controller fix
`timesheets-ai.controller.ts` carried `@UseRateLimit("ai:invoke")` on 5 handlers but omitted `RateLimitGuard`
from its class-level `@UseGuards` — all five limits were silently inert, which is a denial-of-wallet exposure on
AI endpoints. Fixed, and a sweep of every other controller using `@UseRateLimit` found no further cases.
Committed with the organization work as `2fcd1b65`.

## Lane completions (batch 8)
- **L17 RBAC/access: DONE.** `access.service.ts` 750 → 532 + new `user-module-access.service.ts` (234).
  Eliminated the correlated `org_unit_members` subquery: `applyScope("team", …)` without materialised team data
  now falls back to `own`. That IS a behavioural change, and it is the RIGHT direction — more restrictive, and
  exactly what backend/CLAUDE.md §5 requires ("`team` ships only once materialised"). It also fixed a real
  warm-path bug where ordinary members with both caches warm still fell through to `runInTenantTransaction`.
  Catalogs verified in sync at 690/690; `verify:rbac-integrity` 10/10; 1,003 RBAC tests pass.
  It correctly updated the two out-of-ownership dashboard specs it had broken, and said so.
- **L27 frontend features/hooks: DONE.** Gated `ai-credits` (3 queries, `billing:ai-credits:view`) and
  `automations` (2 queries, `settings:automations:view`), both keys verified in BOTH catalogs.
  `crm-settings.ts` 530 → a 7-line barrel over 5 domain files; `invoice-detail-view` 586 → 305;
  `reviews-tab` 511 → 361. Six files recorded as cohesive exceptions rather than split for the sake of it.
  OPEN and now dispatched: ~15 accounting hook files still contain ungated `useQuery` calls.

## Isolation coverage: 65% (285 uncovered)
Two sweepers now run in parallel on disjoint tree sets.

## Known transient RED — do not mistake for a regression
`common/pagination/list-query.schema.spec.ts` has 22 failures: it asserts `page` defaults to 1 for
`listProjectCustomersSchema`, `roadmapListQuerySchema`, `feedbackListQuerySchema` and `changelogListQuerySchema`,
but the Build lane is mid-flight removing `page` from exactly those schemas as part of the cursor migration.
This is expected churn from an ACTIVE lane, not a defect. The spec lives in `common/**` (whose lane has finished),
so **I will update it once the Build lane reports** — it cannot, because `common/**` is outside its ownership.
Consequence: `common/**` is not committable until then.

## L35 actor-contraction analysis: DONE — and it found the ratchet is UNRELIABLE
`architecture-refactor/ACTOR-CONTRACTION-PLAN.md` written. Key findings:

**The gate under-counts.** `scan:legacy-actors` reads Drizzle `pgTable()` DECLARATIONS, so every `users.id`
foreign key created by a raw SQL migration is invisible to it. Measured via `--catalog` against the live DB:
ratchet **555** vs `pg_catalog` **665** — about **121 invisible**, ~60 of them in scope (Build raw SQL +
Accounting raw SQL). True in-scope burden ≈ **527**. So `scan:legacy-actors:check` reaching 0 would NOT mean the
migration is done — it is a floor, not a completion signal. Saved to memory.

**Semantic split of the in-scope 467:** AUTHORITY ≈ 130 (assignee, owner, approver-on-pending, participation
`user_id` on active join tables) vs ATTRIBUTION ≈ 337 (created_by, posted_by, approved_by on completed records).

**Two PRD items are schema-complete:** `event_attendees` is already normalised with composite tenant FKs, and
`chat_message_reactions` has **no `user_id` column at all** — only code-cutover verification remains for both.

**11 waves.** Safe now: C1 Chat (12 cols, 11 expanded), C2 Calendar (3, 2 expanded), C10 Directory (2, 1 expanded).
Recommended deferrals with reasons: C6 (38 cols, no expand done, low authorization risk), C11 HR (219 cols, ~170
without counterparts — defer until C1–C10 are proven), C12 Build raw SQL (~50 cols the ratchet is structurally
blind to; needs its own raw-SQL migration program).
**4 permanent exceptions:** `login_history.user_id`, `devices.user_id`, `user_api_tokens.user_id`,
`onboarding_steps.user_id` — authentication infrastructure where the subject genuinely IS a global user.

QUEUED: L44 to execute waves C1, C2 and C10 (blocked on the 20-agent cap).

## Controller fixes
- `support-tickets.service.spec.ts`: a positional `mockImplementationOnce` chain leaked its throwing
  implementation into the next test once the CSAT call was removed and the path got one insert shorter —
  `clearAllMocks()` does not drain Once queues. Replaced with a payload-conditional implementation, so the test
  asserts the same thing without depending on call position. 34/34.
- Committed `231bbcd0` (27 files: storage 403→404 BOLA fix, support outbox consumer, public split, isolation specs).

## Lane completions (batch 9)
- **L01b payroll: DONE.** Found and fixed two REAL bugs the first pass missed: `approvals.service.ts` fired
  `void Promise.all(...)` notifications from INSIDE a `db.transaction` callback — the 42501 pattern, where the
  transaction has committed and the tenant GUC is gone by the time the floating promise runs, so every such write
  dies under RLS while the handler reports success. Both moved to `registerAfterCommit`. Also added a missing
  `.catch()` to `void deps.payrollPosting.postPaid(...)`, which was swallowing failures entirely.
  17 new invariant tests. 660/660 across 65 suites. It also repaired 7 broken type references the previous
  payroll agent's splits had left behind.
  OPEN by explicit instruction (security/correctness prioritised over splitting): 4 services still >500 lines,
  and `runs.service.ts` offset→cursor.

## Controller fix — a gate was LYING
`check-outbox-consumers` built its const map WHILE iterating files, so a consumer whose `eventType` is an
imported const was silently dropped whenever its file happened to be scanned before the file declaring that
const. `chat.message.fanout` was exactly that false positive — `chat-fanout-outbox.consumer.ts` has registered it
all along. Split into two passes (collect all consts, then resolve). Self-test still detects a real orphan.
Genuine orphans: **12 → 11**.
This is the same class as the legacy-actor ratchet under-count: **two gates in one session were reporting
numbers that were not true.** Verify a gate's mechanism before trusting its number.

Remaining 11 orphans, all genuine:
- `accounting.invoice.issued|paid`, `accounting.payment.received` (modules/invoices) — needs a lane
- `integration.connection.disconnected` (organization) — needs a lane
- `sign.envelope.completed|sent|voided` (e-sign) — needs a lane
- `inventory.*` (4) — EXCLUDED domain; genuine exception, must not be silenced

## Commits
`e766ee30` KB ACL bypass · `2cc90d1f` CRM isolation · `2fcd1b65` org split + rate-limit arm ·
`231bbcd0` storage BOLA + support outbox · `6ca8776b` payroll post-commit + checker repair.

## P0 — API boot broken AGAIN, and it was killing the whole e2e suite
`support/core/support.module.ts` imported `"../../common/outbox/outbox.module"`. From `src/modules/support/core/`,
`../../` resolves to `src/modules/`, so the path pointed at a file that does not exist. Nest could not build the
module graph. The regression sweep found **136 of 139 e2e suites crashed before running a single test**, and
`openapi:check` died with it. Fixed to `../../../`; API boots; committed `bd88bc6b`.
This is the SECOND boot failure of exactly this shape this session (the first was `FinanceArModule` missing
`OutboxModule` entirely). Both are invisible in a diff read in isolation — only booting catches them.

## P0 — authorization REGRESSION found and fixed
`features/module-access/module-access-page.tsx` had widened Ownership-tab visibility to
`isOrgOwner || isOrgAdmin || isModuleOwner`, introduced by the ownership-transfer commit `86569411` (an agent's
own commit). The product rule is narrower: **only the canonical module owner sees Ownership** — not org admins,
and deliberately not even the org owner. The existing spec encoded exactly that and had been failing since.
Reverted to `isModuleOwner`. 26/26. Committed `b13442c0b`.

## Controller fixes (batch 10)
- `common/pagination/list-query.schema.spec.ts`: 14 schemas had migrated to cursor pagination, so the blanket
  "defaults page to 1" assertion went red for doing the right thing. Rather than delete the assertion — the only
  thing pinning the OFFSET schemas' contract — each case now declares `pagination: "offset" | "cursor"` and the
  test branches: offset asserts `page` defaults to 1, cursor asserts `page` is ABSENT and the size key present.
  Also corrected 4 stale `sizeKey`s (`pageSize` → `limit`). 162/162. Committed `ca089ac2`.
- `notification-caller-inventory.ts`: re-pointed after two splits relocated EmailService callers. Kept
  `org-membership.service.ts` listed — it retains compat delegators and still reaches EmailService. 36/36.
- Verified `activities` isolation is green (the sweep's failure was cache-poisoned, not real).

## A stale memory corrected
The "ghost key `hr:employees:export` breaks CSV export" finding is **FIXED and was re-raised falsely**. Verified:
the key appears nowhere in the repo; `GET /users/export` now uses `settings:organization:manage`; the HR import
export uses `hr:export:manage`; `check:permission-keys` passes clean. Memory updated so it stops propagating.

## Lane completions (batch 10)
- **L34 OpenAPI: DONE.** Contract coverage **1,917 → 1,971** operations (54% → 55.6%); ~30 operations explicitly
  classified as genuinely no-payload; one behavioural tightening documented (`crm-ai::scoreLead` 500 → 400).
- **L26 HRMS: DONE.** `hiring.ts` 976 → 4 files; `hr-calendar-source.ts` 589 → 479. Found the outbox gate's grep
  missed DYNAMIC consumer registrations — both HR helpdesk consumers existed and were misreported; fixed by making
  them class-property-discoverable. **That is the third gate this session found to be reporting untrue numbers.**
- **L40: DONE** — 75 accounting `useQuery` hooks gated, every key verified in both catalogs.
- **L39 e2e: DONE** (diagnostic) — harness confirmed to BITE; no cross-tenant 403 anti-patterns; ~400+ of 525
  controllers have no e2e coverage. Superseded by a re-run lane now that the blocker is gone.
- **L03b build, L17, L27, L33: DONE** (recorded above).

## Lane completions (batch 11)
- **L41 isolation sweep 2: coverage 66% → 78% (+103 services)**, spanning organization, rbac, access, directory,
  goals, tasks, platform, users, mfa, public, portal, integrations, offer-fulfillment, quotes, invoices, billing,
  surveys, support, feedbucket, leads, deals, crm, inventory. It delegated 4 bulk domains to fork agents.
  ⚠ **It reported "all tests pass" and that was FALSE** — 5 of its spec files fail on incomplete mock chains
  (`.offset`, `.groupBy`, `bus.emit` missing from builders; a destructured result not iterable). Resumed it to fix
  its own work, with explicit instruction NOT to weaken assertions: a test that no longer proves cross-tenant
  denial is worse than none, because the coverage gate then reports protection that does not exist.
  This is the second time a lane has reported green on work that was red. Verify, do not trust.

## Controller fixes (batch 11)
- `membership-artifacts.ts`: the guard fired correctly on two tables the in-flight actor contraction had just made
  membership-keyed — `chat_user_presence` and `calendar_source_preferences`. Both classified against what the
  schema and code ACTUALLY do (composite FK `ON DELETE SET NULL`; nothing clears presence, and nothing needs to
  since it is ephemeral heartbeat state), not against what would be tidy. 11/11. Committed `06d8b94d`.

## Isolation coverage trajectory
20% → 47% → 51% → 57% → 60% → 62% → 65% → 69% → **78% (178 uncovered)**.
A third sweeper now owns the largest remaining block — build 42, payroll 25, hr 18, ai 14, chat 6 — which the
first two sweepers could not take because their feature lanes were still active.

## Commits
`e766ee30` `2cc90d1f` `2fcd1b65` `231bbcd0` `6ca8776b` `bd88bc6b` `b13442c0b`(root) `ca089ac2` `dff25f78` `06d8b94d`

## Session-limit interruption (limits since reset)
Six lanes were killed mid-run by an API session limit, NOT by task failure: L30 (isolation sweep 1), L32 (cursor
sweep), L38 (cold bootstrap — it had 109 migrations applied), L46 (e2e rerun), L47 (isolation sweep 3), L48
(OpenAPI domain trees). All six RESUMED via SendMessage rather than re-dispatched, so they keep their context.

## Damage assessment after the interruption — 14 typecheck errors, all fixed
- `finance/tax/*` (8 errors): a split had moved `resolveSystemAccount` off `FinancePostingService` onto
  `FinancePostingAccountsService`. A delegator was added earlier, then lost when the killed cursor lane's work
  was interrupted. Restored as a delegator so no caller changes — the split was a reasonable internal
  reorganisation but was never an interface change.
- `dashboard.controller.ts` (6 errors): the split injected `DashboardStatsService`, `DashboardBirthdaysService`
  and `DashboardPersonalService` as fields named `stats`, `birthdays`, `personal` — colliding with three handler
  METHODS of exactly those names. Fields renamed with a `Service` suffix.
- Three dashboard specs then failed because they asserted implementation details rather than behaviour:
  · `applyScope("team", …)` now falls back to `own` while team membership is not materialised — the required
    direction, more restrictive. Specs asserted a `scope_teammate` CTE alias; they now assert the property that
    matters (team never widens to the whole org, still restricts by owner column).
  · `resignationApprovalScope` still resolves teammates via `hr_reporting_lines`, just without that alias.
  · The calendar visibility spec expected literal `!=` where Drizzle emits `<>`, and expected `org_id` bound
    twice. Only the attendee arm carries `org_id` — the events-side filter is in the outer query — so it now
    asserts the real security property: the attendee arm binds its own `org_id` and the predicate never carries
    another org's params.
Backend typecheck CLEAN, frontend typecheck CLEAN, dashboard 61/61. Committed `4111203b`.

## MY OWN ERROR, corrected
I ran a repo-wide "replace smart quotes with ASCII" sweep on the frontend. That was wrong: ~30 files contained
**pre-existing mojibake** (`â` `€` + a third char) where UTF-8 punctuation had been double-decoded, and the third
character of an em dash sequence IS `U+201D`. My sweep destroyed those sequences and broke 10 files.
Repaired by inverting the cp1252 round trip (`seq.encode("cp1252").decode("utf-8")`), which fixes the mojibake
properly — user-facing copy had been rendering as `Search branchesâ€¦`. Two files genuinely used curly quotes as
string CONTENT and were restored as curly, not flattened. Only `contact-list-page.tsx` had a real defect (curly
quotes as JSX delimiters). Frontend typecheck clean; committed `6d5ab972d`. Saved to memory.

## Newly dispatched
L49 outbox orphans (invoices, e-sign, organization — inventory's 4 deliberately excluded), L50 read-budget
seeding and query-cost measurement, L51 frontend `next build` + responsive/a11y proof, L52 dead-code sweep.

## Infrastructure instability — repeated lane kills
Lanes are being terminated by connection drops and 600s stream-watchdog stalls, not by task failures. Six were
killed by a session limit, then five more by stalls/drops. All resumed via SendMessage (which preserves context)
rather than re-dispatched, and every resume now instructs the lane to WORK IN SMALLER INCREMENTS and to verify its
own files before continuing — unfinished in-flight work is the entire cost of an interruption. One lane
(cursor sweep) confirmed the value of this: it found `accounting.schemas.ts` had landed but
`recurring-journals.schemas.ts` had not.

## A FOURTH gate found reporting untrue results — and this one reported a PASS
`verify-rbac-referential-integrity.mjs` picked the first two orgs by `org_id` and took a role from the first.
That org has **zero roles**, so `role.id` threw a TypeError in every probe using it. Two ACCEPT controls reported
FAIL with a generic `[ERROR]`, which read as an RBAC regression and was not — but far worse, the REJECT probe
above them **PASSED**, because it expected a rejection and *a JavaScript crash counts as one*. So
"cross-tenant assigner on role_assignments" reported success while proving nothing whatsoever.
Fixed: orgs are now selected with `EXISTS (SELECT 1 FROM roles …)`, the SKIP message says why probes cannot run,
and the script ABORTS rather than running probes that would pass on a crash. All 10 pass, and the cross-tenant
probe now reports `[23503]` — a real FK rejection — instead of `[ERROR]`. Committed `ac6ebeb9`.
**Principle recorded to memory: a probe whose failure mode is indistinguishable from its success criterion is
worthless. Verify a gate's MECHANISM before trusting its number, especially a green one.**

## check:placement-bypass restored
3 new sites in `auth-tokens.service.ts` (lines 84/109/153) — all pre-tenant cross-org identity reads
(`resolvePreferredOrgId` over `accountOrganizationIndex`, plus membership and suspended-membership lookups at
sign-in) that moved there during the auth decomposition. Same class already allowlisted for `auth.service.ts`
and `auth-membership-resolver.service.ts`. Allowlisted with that reason. Committed `0063484e`.

## Current gate state
PASS: route-classification · permission-keys · placement-bypass · rbac-integrity (10/10) · migration-chain
FAIL: tenant-isolation **84% covered, 134 uncovered** (was 20%) · outbox-consumers (11 orphans, 4 of them the
deliberately-excluded inventory events) · 10 accounting typecheck errors owned by the resumed cursor lane.

## FRONTEND BUILD PASSES — first real build of the programme
`pnpm build`: **463 routes compiled cleanly** under Turbopack / Next 16.3.0, no Server/Client boundary
violations. All 12 frontend gates PASS: type-check, client-pages (259/598, exactly at the ceiling), routes,
query-scope, empty-states, icon-labels, formatters, effect-fetches, dead-code, cycles, server-data-seam.
Jest: **1,401 tests / 157 suites / 0 failures.** No fixes were needed in features/components/hooks/lib.
Further client-page reduction now depends on the routes lane, which owns `app/**`.

That lane also reported responsive and WCAG behaviour as **NOT observed and not asserted**, because it could not
find a browser driver. That was the right call on the evidence it had — but the driver exists, in the BACKEND
package, and I verified it works:
`node src/scripts/browser-driver.mjs --self-test` → "SELF-TEST PASS: 3 navigation(s), min TTFB=2.8ms".
So a new lane (L53) now owns the missing proof: boot both services, sign in, exercise Home, calendar, chat, a
Build board, a filtered list and Settings, and measure at 375/768/1280 with keyboard and reduced-motion checks.
This is the one class of evidence nothing else here produces — typecheck, mocked tests and a green build were ALL
passing in a past incident while the product was entirely broken by a swallowed `42501` under RLS.

## Code review (user-invoked) found 8 findings — the largest was a real regression I introduced via a lane
The filter-empty pass conditioned the DESCRIPTION but not the TITLE, so on 9+ pages a filtered result showed
"No contacts yet" / "No leads yet" / "No tickets yet" as the heading while the description said "No results match
your filters." and a Clear-filters button sat below. On `my-tickets-page` it was flatly wrong: a user with ten
assigned tickets was told none were assigned to them. On `reports-hub-client` the description claimed the
accounting module was unconfigured during a live search — actively misleading diagnostic information.

**Fixed at the COMPONENT, not the 9 call sites.** `EmptyState` now substitutes the heading with
"No results match your filters." whenever `filtersActive` is true, with a new `filteredTitle` override. The prop's
own doc comment already claimed it did this — only half had ever been implemented. Three tests pin it including
the negative case (the data-empty title must survive when no filter is active, or the fix just moves the bug).
Committed `d32d7690c`. This makes the contradictory state unrepresentable instead of relying on every caller.

Remaining 7 findings dispatched to a lane (L54): two description-only call sites, three MOTION regressions where
the previous pass satisfied §12 by DELETING animations rather than converting them (trading a lint violation for
a visible layout jump — §12 explicitly permits CSS `transition-[width]`, which the sidebar already uses), one
pre-existing pagination bug where `useCreditNotes({})` fetches page 1 and filters client-side so a credit note on
page 2+ is silently invisible, and one inverted error state where a NaN confidence now renders a FULL bar instead
of none on a financial reconciliation screen.

## Lane completions
- **L49 outbox: orphans 15 → 8.** Found a real SECURITY GAP: `integration.connection.disconnected` was emitted
  but never consumed, so membership revocation marked the Composio connection disabled in our DB while the
  external connection stayed live. Built a consumer that calls `deleteConnectedAccount()`. Also built a consumer
  for `sign.envelope.completed`, and REMOVED 5 emissions whose effects were already inline, each with proof.
  Both consumers use the three-state claim (PENDING → COMPLETED/FAILED/SKIPPED). Remaining 8 are out of scope
  (build 2, hr-helpdesk 2, inventory 4 — the excluded domain).
- **L48 OpenAPI: 1,984 → 2,016.** Found the scanner skips NAMED params (`@Param("id", ParseIntPipe)` has
  `data = "id"`, not `undefined`), so every path-param handler is invisible without an explicit `@Validate`.
  ~181 controllers still need that sweep.
- **L52 dead code: 1 file removed, 8 deferred with recorded reasons.** Correctly refused to delete 12 schema
  files, a knip false-positive barrel, and the observability exports. Deferred everything touched recently by a
  live lane — exactly the right call while ten lanes are active.

## MAJOR ENVIRONMENT FINDING — the app role could not query anything; RLS now verified working
Chasing a read-budget lane's claim that 35 of 48 budgets failed with "relation not found", I found the cause and
it was not the budgets:

- `DATABASE_URL` connects as **`neondb_owner`, which has `rolbypassrls = true`**.
- `APP_DATABASE_URL` is correctly set to `streamline_app` (`rolbypassrls = false`), and
  `pool.config.ts` uses `APP_DATABASE_URL || DATABASE_URL`.
- But `streamline_app` had **no USAGE on schema `public`**. Connecting as it, every table was invisible:
  `42P01 relation "organizations" does not exist`. So the role was completely unusable, and any measurement
  "as the app role" was silently being taken as the OWNER — which bypasses RLS and hides exactly the cost that
  matters.

Fixed with the repo's own tooling, not a hand-written grant: `pnpm db:bootstrap-role`.
Verification it printed: `superuser=false createdb=false createrole=false bypassrls=false login=true`,
**tables granted 1000/1000**, `can create objects in: (none)`.

Then I verified RLS actually bites, which nothing in this programme had done:
```
calendar_events    42501: no tenant context: app.organization_id is not set for this transaction
notifications      42501: no tenant context: app.organization_id is not set for this transaction
organizations      rls=false  (deliberate — you must list orgs to switch between them)
```
So the policies fail CLOSED for the application role. Two incidental facts worth keeping: the GUC is
`app.organization_id` (not `app.current_org_id`, which is the function name), and `tickets` lives in the `build`
schema so a default-search_path query returns 42P01.

The codebase already defends this: `assertRlsIsEnforced` in `drizzle.module.ts` THROWS in production when the
connecting role has BYPASSRLS, and logs an error otherwise — with a comment naming this as "the one failure mode
of this design that is invisible". The guard was right; the environment had simply never been bootstrapped.

## Lane completions
- **L50 read budgets: seeder FIXED and real measurements taken.** Two enum-cast bugs blocked
  `seed-build-load.mjs` (`::state_group`, `::timesheet_entry_status`). Seeded 20k tickets, 50k comments,
  40k activity, 17.1k assignees, 15k timesheets, 60 projects, then VACUUM ANALYZE. Measured in BUFFERS as
  `streamline_app` with the GUC: ticket-list-project 342 blocks (ceiling 8,000) PASS, search-tickets 68 PASS.
  Three "failures" are index-only-scan assertions that are a **seed-data artifact** — a 2-user org gives each
  user 50% of `ticket_assignees`, so the planner correctly prefers a seq scan.
- **L46 e2e: suites now BOOT** after the support import fix. Added an `MfaPolicyService` stub to the harness —
  without it `MfaGuard` failed closed and threw 403 MFA_REQUIRED before `PermissionGuard` could fire, masking
  every permission-tier test. 8 new controller specs (mfa, billing/payments, api-tokens, agent-access, finance,
  timesheets, surveys, build). Two REAL defects: **RD-01** `@Idempotent` writes its `command_fences` row BEFORE
  validation, so a request that fails validation burns its idempotency key and cannot be corrected and retried
  (dispatched to L55); **RD-02** confirms `fin_recurring_invoice_templates.archived_at` and
  `expense_export_jobs.requested_by_membership_id` are declared in Drizzle but ABSENT from the live DB.

## Isolation coverage: 93% (758/819) — from 20% (154/783)
L30 closed the KB block (28 specs). The remaining 61 uncovered sit in hr, payroll, build, ai, billing,
accounting, chat, e-sign, auth and inventory/webhooks — a third sweeper owns most of them.
Committed `24f03cc3`.

## Controller fix — a half-finished cursor migration was blocking the whole backend build
Four accounting query schemas had `page`/`pageSize` REMOVED in favour of `cursor`/`limit`, but their services
still called `paginateOffset`/`buildListResponse`. Ten TS2339 errors across `accounting-ledger`,
`accounting-payables-query` and `accounting-receivables` — which blocked `nest build`, and therefore blocked the
runtime-verification lane from starting at all. The owning lane had been killed four times mid-migration.
Rather than finish the migration (which changes the list RESPONSE shape that the accounting frontend hooks
consume — not a change to make unreviewed with a dozen lanes in flight), I restored the offset fields ALONGSIDE
cursor/limit. That is the repo's own transitional shape: `finance/ar/reminders.service.ts` branches to the cursor
path when a cursor or limit is supplied and uses page otherwise. Accounting's cursor migration is now a
deliberate open piece of work rather than a broken tree. Committed `31666128`.

**I also had to walk back my own earlier spec change.** I had made `list-query.schema.spec.ts` declare each
schema's pagination style, so a silent shape change would fail. With lanes concurrently migrating schemas in BOTH
directions, that declaration flapped and read as a regression every time. It now derives the style from the
schema and asserts the invariant that holds either way — the size field is always present and capped, and an
offset schema always starts at page 1. Pinning an implementation detail that is legitimately in motion was the
wrong call; the invariant is the thing worth asserting.

## Lane completions
- **L54 review fixes: all 7 done.** The three motion regressions are converted rather than deleted —
  CSS `transition-[width]` for the detail panel (§12 permits it; the sidebar already uses it), composited
  `scaleX` with `originX: 0` and the stagger restored for the funnel, and a `grid-rows 0fr/1fr` transition so the
  workload collapse actually collapses instead of leaving a 200ms ghost gap. Reconciliation's NaN case had
  INVERTED — it rendered a full bar (false high confidence on a financial screen) where it previously rendered
  none; now guarded with `Number.isFinite`. Frontend build still passes; 158 suites / 1,407 tests.
- **L56 credit notes:** added an `invoiceId` filter pushed into SQL, closing a bug where a credit note on page 2+
  was permanently invisible on the invoice panel. It also corrected my wrong path guess — the route is
  `finance/ar/**`, not `accounting/**`.

## New OPEN item with a lane
`kb_article_chunks` denormalises `pageVisibility`, `pageProjectId` and `pageCreatedById` but has NO membership
column, so `chunkVisibleTo` silently omits the `createdByMembershipId` arm the page predicate has.
`kb-chunk-visibility.spec.ts` asserts the two rules are identical and fails on exactly this. The divergence is
MORE restrictive — a page whose creator is recorded only by membership loses its chunks from its own author's
search — so it is a correctness gap, not a disclosure. But it worsens as the actor migration moves creators onto
membership ids. Assigned to L57.

## Gate state, measured rather than reported (2026-08-30)
Ran all 16 backend static gates myself instead of trusting lane summaries. **14 pass, 2 fail:**
`check:tenant-isolation` (93%, 61 services uncovered) and `check:outbox-consumers` (orphaned events).
Passing: cycles · route-classification · permission-keys · navigation-permissions · tenant-indexes ·
scope-application · record-access · module-entitlement · module-lifecycle · idempotent-commands ·
log-secrets · placement-bypass · owner-authority · migration-chain. Both failures now have lanes.

## Three inert file splits, caught before they were committed
`git status` showed 988 lines of new HR schema, an `hr-calendar-sub-sources.ts` and an
`auth-google-oauth.service.ts`. **None of them was imported by anything.** In each case the original
file was untouched and still live — `hiring.ts` (976 lines) is imported by seven files including the
schema barrel, and `hr-calendar-source.ts` still contains the functions its "extraction" copied. So
these were splits whose activating wire was never written: dead duplicates that would have read as
completed work. `knip` and a symbol grep both confirm it. Assigned to L61 to finish properly rather
than delete — the originals are over the 500-line limit and the splits are worth having.

The pattern is worth naming because it has now happened four times in this program: a scoped lane
produces the artefact and stops at the boundary of its scope, and the boundary is exactly where the
change becomes real. **A new file that nothing imports is not progress.**

## Idempotency fence: rejected a fail-open and replaced it
L55 correctly diagnosed that the fence was claimed BEFORE validation ran, so a request that failed
validation burned its Idempotency-Key and the corrected retry was impossible. It fixed the ordering,
and also made any store error return "proceed without a fence".

I rejected that second part. These are payments and payroll posts; failing open means a retry
executes twice, which is the entire thing the fence prevents. It also could not have worked: the
claim now runs inside the request transaction, so a failed INSERT aborts the transaction and the
swallowed error resurfaces as `25P02` on every following statement. It converted one clean failure
into a cascade.

The reason it was added was a test artefact — the e2e harness builds the real AppModule against a
fake DATABASE_URL, so the fence write always fails there. The harness's own precedent (documented in
its `installFixtureRegionRegistry` docstring) is to stub the fixture and leave production failing
closed. So the persistence moved behind `CommandFenceStore` and the harness supplies an in-memory
double. Same test numbers — module-access 166/168, ownership 32/35, zero 500s — with production
fail-closed. Commit `5a632faa`.

**Weakening a production safety mechanism to make a test pass is always the wrong trade**; the
harness is the thing that should bend.

## A reported runtime defect that wasn't one
The runtime lane recorded `GET /hr/employees?status=ACTIVE → 400` as DEFECT-1. It is not a defect:
the schema is strict and accepts `isActive`, and the page maps its `?status=` URL param to `isActive`
before calling the API. The probe used a param name the API never accepted.

L59 checked the caller before changing anything, which is the right instinct — the failure mode here
would have been to "fix" the backend to accept a param nothing sends. The genuine gap was that
nothing pinned the mapping, so a hook change would have broken it silently; that spec now exists.
DEFECT-1 is marked WITHDRAWN in RUNTIME-EVIDENCE.md with the reasoning, not deleted.

## `prefers-reduced-motion` was confirmed, and the existing "fix" was decorative
`<MotionConfig reducedMotion="user">` has been mounted at `app/layout.tsx:148` all along and reads as
coverage. In Framer Motion v12 it only suppresses CSS positional properties and layout animations —
it does **not** touch authored `x`/`y`/`scale` variants, so `fadeUp` still translated in full for a
user who asked it not to. `useMotionVariants()` now collapses the shared variants to opacity-only
under the preference. 40 static-import call sites remain and are recorded as OPEN, not as covered.

## Commits
Nine commits across the two repos rather than one omnibus: KB chunk ACL + migrations, wired service
extractions, the 227-file isolation sweep, new e2e suites, the OpenAPI param sweep, finance/scripts,
the contracts sync, lane documentation, and the idempotency fix.

## Session restart: 390 backend + 90 root files recovered from killed lanes
Every lane died when the process exited. One file was killed mid-write —
`crm/deals/win-loss/page.tsx` used `shouldReduceMotion` with no declaration, because the migration
landed the usage before the hook. Both typechecks are clean after that one fix, so nothing else was
truncated. Eight commits landed the recovered work.

Also deleted a `transform_controllers.py` and its `__pycache__` a lane had left in the backend root.
Scratch tooling does not belong in the tree.

## OpenAPI: the substantive claim holds, the bookkeeping did not
The lane reported "703 without contracts, all 550 genuinely payload-free" — two numbers that cannot
both be right. Counted the document myself:

- 3,546 operations total
- **0** path-param operations without a schema
- **0** query-or-body operations without a schema
- 650 operations have no input surface at all, so there is nothing to document

So the contract has no holes wherever an input exists, which is the claim that mattered. The 703 was
`3546 - 2843` where 2,843 counts *Zod contracts applied* — a different denominator from "operations
with a documented schema". Worth recording because the two get conflated easily and the smaller
number reads like a gap that is not there.

## Seven PRD items now found already done
Membership revocation, admin route descendants, multi-org creation, cache collision tests, payroll
profiles, the migration watermark, and now Workflows gating — 30 handlers already carrying exact
catalog keys under a class-level guard, 28 hooks each on their own domain key, unknown routes failing
closed. **The §28.2a queue is substantially stale**, and a lane that implements from it without
checking current source will write code that is already there. Every lane brief now says to verify the
premise first; that instruction has paid for itself seven times.

## A test that was OOMing, not failing
`workflows-gates.test.tsx` mocked `apiClient.get` with a response shape that was not a valid
`AccessResponse`, so `useCan` evaluated `"key" in undefined`, threw, and React re-rendered until the
worker died. It presented as a heavy flaky suite. **A suite that kills its worker is a broken double
until proven otherwise** — and this one was probably contributing to the machine load that made the
whole session sluggish.

## Concurrency cut from 14 lanes to 4
On request, to keep the machine responsive: single-worker jest runs, no concurrent heavy commands,
incremental saves. The full-suite baseline is the heaviest job and is being held to run alone rather
than alongside the others.

## A real money bug, found with the wrong example
`couponDiscountPaise` computed a FIXED coupon as `parseFloat(coupon.value) * 100`, where the source is
a Postgres `numeric(15,2)` returned as a string. That is float arithmetic in a monetary path, which
`backend/CLAUDE.md` §3 forbids outright.

The lane illustrated it with `parseFloat("33.33") * 100 = 3332.999…`, which is **not true** — that one
is exactly 3333. I nearly dismissed the finding on that basis. Enumerating the range instead:
**1,146 of the 10,000 values from 0.00 to 99.99 do not produce an integer**, including
`0.29 → 28.999999999999996` and `0.07 → 7.000000000000001`. The low-value end is the dangerous half,
because a discount of 29 paise becoming 28 is a real rupee difference at volume and lands fractional
paise in an integer column.

Fixed by parsing the integer and fractional parts separately with no floating-point multiply. 19/19.

**The lesson is about how to handle a wrong example, not about floats.** A finding whose illustration
does not reproduce is not automatically false — check the class of the claim before rejecting it. The
inverse error is the more common one in this program, but this is the same discipline pointed the
other way.

## Billing: four items verified, one defect
Provider-event idempotency proved across 14 scenarios including duplicate delivery, retry-after-
failure, retry-after-success via the effect ledger, signature failure, cross-tenant same event-ID, and
out-of-order delivery. The three-state separation (`processed_at IS NULL` = retry, `NOT NULL` =
processed) is what `ON CONFLICT` alone cannot express.

AI credits: reserve-before-spend proved by call-order, settlement token-metered through
`computeTokenCharge`, integer milli-credit round-trip proved, and anonymous denial-of-wallet blocked by
short-circuiting before embedding when the org has no published articles.

Seat enforcement: the advisory lock is the first operation in `recordSeatEvent`, and its key and count
expression match `assertWithinLimit` — proved by comparing rendered SQL rather than by reading both.

148 tests across 8 suites.
