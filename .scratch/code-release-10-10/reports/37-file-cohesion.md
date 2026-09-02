# 37 — File cohesion, size policy and published inventories

**Status at close:** backend hard-500 gate GREEN with a fail-closed registry; frontend hard-500
gate RED on three files in other lanes' territories. Over-300 ratchets: frontend GREEN
(519/519), backend RED (400/394, none of the six crossings introduced by this ticket).

Everything below was measured by running the command named beside it and reading its output.
Exit codes are the real ones; `not run` is written where a gate was not executed.

---

## 1. What the gates actually did before this ticket

`check:file-sizes` on the backend accepted an exception if a markdown table row contained a
backticked `src/…` path and at least seven cells. It never opened the file. Re-measuring all
twelve registered rows against disk found **seven of them wrong**:

| Registered path | Recorded | Measured | What that means |
|---|---|---|---|
| `src/modules/access/access.service.ts` | 510 | 486 | exemption outlived the file's overage |
| `src/modules/gdpr/gdpr-export-worker-implementation.ts` | 966 | 405 | exemption outlived the file's overage |
| `src/modules/hr/analytics-plus/hr-analytics-plus.service.ts` | 502 | 494 | exemption outlived the file's overage |
| `src/modules/hr/lifecycle/onboarding-views.service.ts` | 521 | 496 | exemption outlived the file's overage |
| `src/modules/notifications/notification-routing.service.ts` | 671 | 472 | exemption outlived the file's overage |
| `src/modules/organization/core/membership-artifacts.ts` | 2496 | 3216 | grew 720 lines under an unread exemption |
| `src/modules/chat/chat-channel-members-implementation.ts` | 506 | 522 | grew 16 lines under an unread exemption |

Five files were carrying an exception they no longer needed, and two had grown by a combined
736 lines without anyone re-reading the justification. The registry was not enforcing a
policy; it was a list of names.

The frontend twin (`frontend/scripts/check-file-sizes.mjs`) already validated existence, line
count and the still-over-limit rule. It did **not** require an owner, a review date, a removal
trigger or alternatives-considered, and a malformed row was silently *skipped* rather than
reported — a typo downgraded an exception to "not registered", which reads as a size violation
instead of a broken registry.

## 2. The registry now fails closed — both repos, same contract

`backend/src/scripts/check-file-sizes.mjs` was rewritten around a testable `runCheck()` and
`frontend/scripts/check-file-sizes.mjs` was brought to the same contract. A row grants an
exception only when **all** of these hold; each failure fails the gate:

1. all nine columns present and none blank — path, lines, category, owner, public interface,
   cohesion argument, alternatives considered, review date, removal trigger;
2. the path is a concrete file — `*` and a trailing `/` are **rejected as errors**, not ignored;
3. the file exists on disk;
4. the recorded line count equals the measured one exactly;
5. the file still exceeds 500 lines — **a file at or below the limit automatically loses its
   exception** and the row must be deleted;
6. the review date parses as an ISO calendar date;
7. no path is registered twice.

A malformed row is now an *error* carrying the offending path, never a skip.

Self-tests exercise every one of those rules against fixtures written to disk, not against the
parser alone — the failure mode ticket 35 found (a self-test that asserted only its own
constants while `collectFiles()` returned nothing) is covered by fixtures that build a real
tree and assert on the scan.

| Command | Exit | Result |
|---|---|---|
| `pnpm -C streamlineos-backend check:file-sizes:self-test` | 0 | 39 passed |
| `pnpm -C streamlineos-backend check:over-300:self-test` | 0 | 15 passed |
| `pnpm -C .../frontend check:file-sizes:self-test` | 0 | 42 passed |
| `pnpm -C .../frontend check:over-300:self-test` | 0 | 26 passed |

The hardened backend gate proved itself before the registry was rewritten: run against the old
six-column table it failed with `the real registry parses to at least one exception and no row
errors` (exit 1, 1 failed / 38 passed). It is not reporting OK over an empty corpus — the
vacuity guard is asserted by a fixture, and the live scan reports 3,544 files.

## 3. Four unregistered over-500 files were split, not registered

None of the four was given an exception. Each was split at a seam where the two halves change
for different reasons, and each split was proved with the existing specs run **before and
after** the change.

### `src/modules/gdpr/gdpr-subject-erasure.service.ts` — 653 → 244

The erasure path, and the one the ticket flagged as sensitive. It drains on keyset cursors
deliberately; a bare `.limit()` in it is a P1. The drains were moved intact and the only
`.limit(1)` calls left are the three single-row lookups that always were single-row
(membership, legal hold, surviving membership).

| New file | Lines | Responsibility |
|---|---|---|
| `gdpr-subject-erasure-paging.ts` | 40 | `drainIds` / `forEachIdPage` / `ERASURE_ID_PAGE` — the keyset primitives, dependency-free |
| `gdpr-subject-erasure-identity.ts` | 188 | the subject's identity columns: `organization_people`, HR sensitive fields reached through their employments, dependents, and the global `users` row (only once no other membership survives) |
| `gdpr-subject-erasure-authored-content.ts` | 265 | content the subject authored — conversation bodies anonymised in place because the threads carry other participants, KB derivatives hard-deleted because a chunk and its embedding reproduce the subject's text |

The service is now the transaction conductor. It follows the pattern already in the file:
support tickets and export artifacts were **already** delegated to sibling modules
(`support-ticket-erasure.ts`, `gdpr-subject-erasure-export-artifacts.ts`); this extends that
seam to the other three domains rather than inventing one.

Statement order inside the transaction is byte-for-byte unchanged, which matters here: the
GDPR specs drive round-robin mocks keyed on the exact sequence of `tx.select` / `tx.update` /
`tx.delete` calls, and the `tablesAnonymised` array is asserted on. `users.email` is still
written *after* `support_tickets.requester_email`, because the live address is the only link
to a free-text requester column with no FK.

- Before: `jest --runInBand --testPathPattern="modules/gdpr/(gdpr-subject-erasure|gdpr-erasure|gdpr-tenant-isolation|gdpr.controller)"` — **7 suites, 101 tests, all pass**
- After: same command — **7 suites, 101 tests, all pass**, exit 0

### `src/modules/ai/core/gateway/ai-gateway-runner.helper.ts` — 527 → 211

Three runners (`runStructured`, `runStructuredWithImage`, `runText`) each carried its own copy
of the same ~80-line gauntlet, and the two `*WithUsage` methods were character-identical apart
from a type parameter. `ai-gateway-runner-call.ts` (260 lines) now owns what they share:
redaction, the context ceiling, cancellation, the credit reservation, the measured-token
settlement, the provider-error path and the `aiUsage` re-pricing. Each runner is left with the
one thing that differs — which provider method it calls and how the payload becomes `data`.

This is a deduplication, not a fragmentation: the extracted file has a real interface
(`preflightCall` returning a proceed/reject union, `settleSuccessfulCall`, `settleFailedCall`,
`withUsageMeta`, `boundedMaxTokens`) and the runner imports it one-way. Charging still settles
against measured tokens, never the reserve ceiling.

- Before: `jest --runInBand --testPathPattern="modules/ai/"` — **55 suites pass (1 skipped), 515 tests pass, 21 skipped**
- After: same command — **55 suites pass (1 skipped), 515 tests pass, 21 skipped**, exit 0

### `src/modules/storage/storage.service.ts` — 509 → 389

Split at the seam between *where an org's bytes live* and *what we do with them*. Placement
changes when a region is added, re-homed or loses its registry; object operations change when
the storage protocol does. `storage-placement.ts` (152 lines) holds `StoragePlacementResolver`
— the per-credential `S3Client` cache, region-registry resolution, primary config, the bucket
requirement and the object-key composition.

The service keeps every public method it had. `placementForOrg`, `configForOrg` and
`isConfigured` are one-line delegations, but they are three of twenty-plus methods on a class
that still owns all the object work — this is a collaborator, not a wrapper file, and no
importer changed.

- Before: `jest --runInBand --testPathPattern="(modules/storage/|degradation/object-storage)"` — **17 suites, 191 pass, 2 skipped**
- After: same command — **17 suites, 191 pass, 2 skipped**, exit 0

### `src/modules/cron/cron-hr-retention.service.ts` — 504 → 317

Document retention is a different problem from record retention: it consults
`hr_legal_hold_items`, must redact rather than delete anything with a `document_audit_logs`
trail, and yields object-storage keys for post-commit deletion. `cron-hr-retention-documents.ts`
(212 lines) owns it behind `sweepRetentionDocuments(tx, {orgId, cutoff, action, batchSize,
maxBatches})`. The batch constants are passed in rather than shared, so the extracted module
has no import back into the service and no cycle is possible.

- Before: `jest --runInBand --testPathPattern="(cron-hr-retention|s05-retention-scheduling-contract|cron-group-a-tenant-isolation)"` — **5 suites, 51 tests, all pass**
- After: same command — **5 suites, 51 tests, all pass**, exit 0

**What was deliberately NOT done:** no numbered fragments, no pass-through wrapper files, no
re-export shells. `madge --circular` is zero in both repos after the splits (§5). Not one of
the four files was given an exception instead of being split.

## 4. Splitting broke three path-keyed gates. All three were re-run, not assumed.

This is the failure mode the ticket names, and it happened three times:

| Gate | What broke | Fix |
|---|---|---|
| `check:lifecycle-predicates` | 3 `ACCEPTED` allowlist entries keyed `modules/gdpr/gdpr-subject-erasure.service.ts::kbSources / ::kbPages / ::kbArticles` went stale — the reads moved | re-keyed to `gdpr-subject-erasure-authored-content.ts` |
| `check:unbounded-reads` | `/cron/cron-hr-retention-documents.ts` unclassified (gate RED); the `/gdpr/gdpr-subject-erasure.service.ts` FALSE-POSITIVE became a **dangling exemption** on a file that no longer has the read | new classified entry for the cron document sweep; the GDPR entry re-keyed to the authored-content file |
| `check:db-call-count` | the `/cron/cron-hr-retention.service.ts` entry described lines that moved; removing it exposed a previously-covered N+1 candidate in the service (the per-policy loop) | entry re-keyed to the documents file, and the policy fan-out classified on its own terms |

The dangling-exemption cases are the dangerous ones: both gates treat an entry as stale only
when the *file* disappears, so an exemption written for code that has since moved keeps
covering whatever is added to the old file next. Both were re-pointed.

`src/common/slo/slo-queues.ts` keys on `sourceFile` paths — checked, **none of the four split
files appears there**.

Every other backend gate was run to confirm no fourth surprise: 58 `check:*` scripts executed,
7 red, and **none of the seven names a file this ticket touched** — `check:alert-ack`,
`check:audit-log-privileges`, `check:module-lifecycle`, `check:replay-ledger`,
`check:set-null-column-lists` need a database URL or webhook that is not set here;
`check:route-budgets` fails on `GET /notifications` and `GET /notifications/unread-count`;
`check:tenant-relationships` fails on workflow FKs. All pre-existing, all other territories.

## 5. Proof

| Command | Exit | Number produced |
|---|---|---|
| `pnpm -C streamlineos-backend check:file-sizes` | **0** | 3,544 files scanned, all within 500 (7 exceptions) — was 4 violations |
| `pnpm -C streamlineos-backend check:file-sizes:self-test` | **0** | 39 passed |
| `pnpm -C streamlineos-backend check:over-300` | **1** | 400 of 3,544 over 300 (baseline 394) — was 401 |
| `pnpm -C streamlineos-backend check:over-300:self-test` | **0** | 15 passed |
| `pnpm -C .../frontend check:file-sizes` | **1** | 3 in-scope violations (0 registered exceptions) + 2 CRM/Inventory informational |
| `pnpm -C .../frontend check:file-sizes:self-test` | **0** | 42 passed |
| `pnpm -C .../frontend check:over-300` | **0** | 519 of 5,224 over 300 (baseline 519) |
| `pnpm -C .../frontend check:over-300:self-test` | **0** | 26 passed |
| `pnpm -C streamlineos-backend check:cycles` | **0** | 5,475 files, no circular dependency |
| `pnpm -C .../frontend check:cycles` | **0** | 5,228 files, no circular dependency |
| `pnpm -C streamlineos-backend check:lifecycle-predicates` | **1** | 0 stale ACCEPTED entries (was 3); 76 primary candidates vs baseline 75 — **pre-existing, +0 from this ticket** |
| `pnpm -C streamlineos-backend check:unbounded-reads` | **0** | 0 actionable, 0 unclassified — was 1 unclassified |
| `pnpm -C streamlineos-backend check:db-call-count` | **0** | all N+1 patterns classified, no stale entries |
| `pnpm -C streamlineos-backend typecheck` | **1** | 1 error, `finance/ap/payment-run-executor.service.ts(157,17)` — **not this territory** |
| `pnpm -C streamlineos-backend check:spec-typecheck` | **2** | 2 errors, `db/__tests__/db-call-count-contract.spec.ts` + the same finance error — **not this territory** |
| `pnpm -C .../frontend type-check` | **2** | 3 errors, all `features/billing/**` — **not this territory** |
| GDPR jest, before / after | 0 / 0 | 101 / 101 pass |
| AI jest, before / after | 0 / 0 | 515 / 515 pass |
| Storage jest, before / after | 0 / 0 | 191 / 191 pass |
| Cron retention jest, before / after | 0 / 0 | 51 / 51 pass |

Backend lint and e2e: **not run.**

## 6. Why neither baseline was moved

`check:over-300` is red on the backend at 400 against a baseline of 394. **The baseline was not
touched**, in either direction. Comparing the over-300 set at `c3f0b73d` (the commit that set
394) against the working tree: 34 files crossed 300 and 28 dropped below it, a net +6 driven
by other lanes' concurrent work — HR, payroll, build, workflows, notifications, finance,
schema. This ticket's four splits removed two crossings (401 → 400 across the same window,
against +1 added elsewhere while it ran). Lowering the number to make the gate green would be
the defect the ticket and ticket 35 both name.

The frontend over-300 ratchet is green at 519/519 and was likewise left alone.

## 7. A gate defect found and NOT fixed, deliberately

`frontend/scripts/check-over-300.mjs` excludes `*.spec.ts` / `*.spec.tsx` / `*.d.ts` but **not**
`*.test.ts` / `*.test.tsx`, while `frontend/scripts/check-file-sizes.mjs` excludes both. The
consequence is live today: `hooks/api/notifications-inbox.test.ts` at 663 lines is the single
largest entry in the frontend over-300 inventory and is simultaneously exempt from the hard-500
gate. Aligning the two exclusion lists would drop the over-300 count and could turn a red
ratchet green — which is exactly the move the ticket forbids doing to clear a regression. It is
recorded here as a finding for a deliberate decision rather than applied.

---

## 8. Published inventories at the final commit

### 8.1 Over-500 — backend (7 files, all registered exceptions, 0 unregistered)

-  3216  `src/modules/organization/core/membership-artifacts.ts`
-   767  `src/scripts/relocate-org-data.ts`
-   552  `src/modules/party/party-mirror-fields.ts`
-   551  `src/scripts/seed-enterprise-workspace.ts`
-   522  `src/modules/chat/chat-channel-members-implementation.ts`
-   509  `src/modules/organization/core/invitation-acceptance.service.ts`
-   504  `src/modules/ai/core/services/crm-scoring.service.ts`

Every one of these carries a full nine-column record in
`architecture-refactor/final-refactor/issues/file-size-exceptions.md`.

### 8.2 Over-500 — frontend (6 files: 3 in-scope violations, 2 out-of-scope, 1 test file)

-   663  `hooks/api/notifications-inbox.test.ts`
-   564  `features/crm/settings/automations/builder/automation-builder.tsx`
-   534  `hooks/api/notifications-inbox.ts`
-   512  `app/(authenticated)/inventory/purchase-orders/[poId]/page.tsx`
-   504  `hooks/api/accounting/banking.ts`
-   501  `features/hr/cases/cases-page-content.tsx`

Zero frontend files hold a registered exception — the frontend registry table is empty.
`notifications-inbox.test.ts` is a test file and is exempt from the hard-500 gate by suffix (see
§7). `automation-builder.tsx` and the inventory PO page are CRM/Inventory, tallied separately as
out-of-scope. The three in-scope violations —
`features/hr/cases/cases-page-content.tsx`, `hooks/api/accounting/banking.ts` and
`hooks/api/notifications-inbox.ts` — are all in other lanes' territories and are listed in §9.

### 8.3 Over-300 — backend, 400 files (baseline 394)

Distribution by owning area:

- hr — 71
- build — 25
- payroll — 23
- organization — 19
- (db) — 18
- inventory — 17
- finance — 16
- crm — 15
- ai — 15
- rbac — 9
- party — 9
- billing — 9
- notifications — 8
- kb — 8
- (common) — 8
- module-access — 7
- ingress — 7
- support — 6
- e-sign — 6
- cron — 6
- (scripts) — 6
- timesheets — 5
- leads — 5
- email — 5
- chat — 5
- autonomy — 5
- users — 4
- sales — 4
- access — 4
- workflows — 3
- storage — 3
- mail — 3
- gdpr — 3
- directory — 3
- data-quality — 3
- clients — 3
- auth — 3
- accounting — 3
- ownership — 2
- issues — 2
- feedbucket — 2
- expenses — 2
- deals — 2
- calendar — 2
- surveys — 1
- settings — 1
- search — 1
- record-layouts — 1
- quotes — 1
- public — 1
- portal — 1
- platform — 1
- invoices — 1
- goals — 1
- delegations — 1
- customer-executive — 1
- contacts — 1
- blog — 1
- automation — 1
- activities — 1

Full list, largest first:

```
3216  src/modules/organization/core/membership-artifacts.ts
767  src/scripts/relocate-org-data.ts
552  src/modules/party/party-mirror-fields.ts
551  src/scripts/seed-enterprise-workspace.ts
522  src/modules/chat/chat-channel-members-implementation.ts
509  src/modules/organization/core/invitation-acceptance.service.ts
504  src/modules/ai/core/services/crm-scoring.service.ts
499  src/modules/email/email.service.ts
498  src/modules/data-quality/data-quality-resolution.service.ts
498  src/modules/hr/hr-calendar-source.ts
498  src/modules/hr/recruitment/recruitment-offers.service.ts
497  src/modules/party/party-legacy-writer.ts
497  src/modules/timesheets/core/billing.service.ts
496  src/modules/expenses/expense-lifecycle.service.ts
496  src/modules/hr/lifecycle/onboarding-views.service.ts
496  src/modules/hr/payroll-inputs/payroll-inputs.service.ts
495  src/modules/clients/client-accounts.service.ts
495  src/modules/organization/hierarchy/org-hierarchy.service.ts
494  src/modules/autonomy/autonomy-scoring.service.ts
494  src/modules/feedbucket/feedbucket-public.controller.ts
494  src/modules/hr/analytics-plus/hr-analytics-plus.service.ts
494  src/modules/hr/recruitment/recruitment-candidates.service.ts
492  src/modules/directory/worker-engagements.service.ts
491  src/modules/calendar/calendar.service.ts
489  src/modules/payroll/runs/lib/statutory.ts
489  src/modules/support/core/support-tickets.service.ts
488  src/modules/e-sign/sign-public.service.ts
487  src/modules/hr/cases/hr-safety.service.ts
487  src/modules/hr/performance/documents.service.ts
486  src/modules/access/access.service.ts
485  src/modules/hr/interviews/hr-interviews.service.ts
485  src/modules/payroll/insights/manager-inbox.service.ts
484  src/modules/finance/reports/analytics-reports.service.ts
482  src/modules/e-sign/sign-templates.service.ts
480  src/modules/hr/time/attendance-clock.service.ts
480  src/modules/kb/retrieval/kb-indexing.service.ts
479  src/modules/hr/time/leaves-approval.service.ts
476  src/modules/accounting/posting/finance-posting.service.ts
476  src/modules/ownership/ownership-transfer-response.service.ts
475  src/db/schema/common/notifications-delivery.ts
474  src/modules/hr/time/leaves-write.service.ts
474  src/modules/payroll/runs/lib/calculation-engine.ts
473  src/modules/data-quality/data-quality-queue.service.ts
473  src/modules/notifications/notification-delivery-worker.service.ts
472  src/modules/automation/automation.service.ts
472  src/modules/notifications/notification-routing.service.ts
471  src/modules/access/access-permission.resolver.ts
470  src/modules/crm/core/crm-organizations.service.ts
470  src/modules/cron/cron-platform.controller.ts
470  src/modules/kb/help-centre/kb-articles.service.ts
470  src/modules/notifications/unified-inbox.service.ts
469  src/modules/chat/chat-huddles.service.ts
469  src/modules/organization/core/organization.controller.ts
469  src/scripts/verify-membership-revocation.ts
468  src/modules/payroll/insights/journal-outbox.service.ts
467  src/modules/finance/reports/statement-reports.service.ts
467  src/modules/notifications/broadcasts.service.ts
466  src/modules/crm/core/crm-organizations-insights.service.ts
466  src/modules/party/party-legacy-seam.ts
465  src/common/rbac/module-registry.ts
465  src/modules/expenses/expenses.service.ts
465  src/scripts/seed-demo.ts
464  src/modules/search/search.service.ts
463  src/modules/build/core/projects-tickets-read.service.ts
463  src/modules/finance/planning/budgets.service.ts
462  src/db/schema/hr/offboarding.ts
461  src/modules/hr/cases/hr-cases.service.ts
461  src/modules/hr/import/hr-export-jobs.service.ts
461  src/modules/inventory/channels/channels.service.ts
461  src/modules/surveys/survey-template.service.ts
460  src/modules/hr/lifecycle/exit-write.service.ts
460  src/modules/inventory/products/inv-product-crud.service.ts
460  src/modules/support/core/support-sla.service.ts
457  src/modules/payroll/insights/ess.service.ts
456  src/modules/billing/core/plan-limits.service.ts
456  src/modules/build/execution/timesheets.service.ts
456  src/modules/hr/governance/retention/retention.service.ts
455  src/modules/build/core/projects-ticket-subresources.service.ts
453  src/modules/inventory/sales-orders/so-fulfillment.service.ts
452  src/modules/hr/interviews/hr-interview-scheduling.service.ts
451  src/modules/auth/auth-passwordless.service.ts
451  src/modules/users/users.service.ts
450  src/modules/autonomy/autonomy-hold.service.ts
450  src/modules/hr/performance/performance-reviews.service.ts
449  src/db/schema/crm/deals.ts
449  src/modules/organization/core/org-purge.service.ts
448  src/modules/hr/core/hr-employments.service.ts
448  src/modules/hr/recruitment/recruitment-jobs.service.ts
448  src/modules/hr/workflows/hr-workflow-definitions.service.ts
447  src/modules/organization/hierarchy/org-hierarchy.controller.ts
447  src/modules/payroll/payout/locking.service.ts
445  src/db/schema/common/access.ts
445  src/modules/platform/platform-operator-access.service.ts
444  src/modules/hr/time/leaves.service.ts
444  src/modules/organization/hierarchy/org-hierarchy-dependencies.service.ts
444  src/modules/record-layouts/record-layout-catalog.ts
443  src/modules/build/core/projects-reports.service.ts
443  src/modules/build/core/projects-tickets-update.service.ts
443  src/modules/party/party-divergence.service.ts
440  src/modules/finance/assets/assets.service.ts
440  src/modules/hr/time/attendance-summary.service.ts
440  src/modules/kb/wiki/kb-pages.service.ts
440  src/modules/organization/core/org-profile.service.ts
440  src/modules/payroll/runs/profiles.service.ts
439  src/modules/ai/core/services/projects-ai.service.ts
439  src/modules/cron/cron-billing.service.ts
439  src/modules/hr/payroll-inputs/payroll-inputs-build.service.ts
439  src/modules/party/party.service.ts
438  src/modules/hr/core/hr-timeline.service.ts
438  src/modules/hr/directory/employee-onboarding.service.ts
438  src/modules/hr/helpdesk/hr-helpdesk.service.ts
438  src/modules/ingress/adapters/whatsapp-to-inbound-event.ts
437  src/modules/storage/storage.controller.ts
436  src/modules/build/entity/build-entity-reads.service.ts
434  src/modules/hr/governance/positions/positions.service.ts
434  src/modules/hr/workflows/hr-workflow-instances.service.ts
434  src/modules/rbac/permissions/crm.ts
433  src/modules/finance/banking/reconciliation.service.ts
433  src/modules/hr/policies/hr-policy-evaluation.service.ts
432  src/modules/delegations/delegations.service.ts
430  src/modules/mail/providers/mail-normalizers.ts
428  src/modules/build/core/projects-members.service.ts
427  src/modules/ingress/adapters/crm-mailbox.service.ts
426  src/modules/ai/core/controllers/chat-assistant.controller.ts
425  src/modules/accounting/core/accounting-payables.service.ts
424  src/modules/inventory/reports/inv-reports-extended.service.ts
423  src/modules/inventory/ai/inv-ai-explain.service.ts
422  src/modules/kb/wiki/kb-page-tree.service.ts
421  src/modules/rbac/permissions/shared.ts
421  src/modules/support/core/dto/support-tickets.schemas.ts
419  src/modules/chat/chat-messages.service.ts
419  src/modules/inventory/replenishment/inv-replenishment.service.ts
419  src/modules/ownership/ownership-transfers.service.ts
418  src/modules/data-quality/data-quality-producers.service.ts
418  src/modules/e-sign/sign-envelopes.service.ts
418  src/modules/hr/enterprise-comp/payroll-compliance.service.ts
418  src/modules/payroll/filings/export-builders.ts
417  src/modules/ai/core/hr-copilot-tools.ts
417  src/modules/organization/hierarchy/org-hierarchy-branches.service.ts
417  src/modules/rbac/permissions/accounting.ts
417  src/modules/users/user-ops.service.ts
416  src/modules/hr/automations/hr-webhooks.service.ts
416  src/modules/inventory/purchase-orders/grn-receive.service.ts
415  src/db/schema/payroll/claims-and-settlements.ts
415  src/modules/hr/lifecycle/exit.service.ts
414  src/modules/cron/cron-leave.service.ts
414  src/modules/deals/deals.service.ts
414  src/modules/payroll/filings/filings.service.ts
413  src/modules/billing/core/usage-metering.service.ts
413  src/modules/module-access/module-standing-roster.service.ts
413  src/modules/payroll/runs/lib/input-puller.ts
413  src/modules/timesheets/core/approvals.service.ts
412  src/modules/leads/leads-reports.service.ts
412  src/modules/payroll/runs/lib/statutory-packs.ts
411  src/modules/users/users.controller.ts
409  src/modules/billing/core/ai-credits.service.ts
408  src/modules/hr/lifecycle/probation.service.ts
408  src/modules/payroll/payout/approval-actions.service.ts
408  src/modules/sales/sales-dashboard.service.ts
408  src/modules/support/core/support-macros.service.ts
406  src/db/schema/hr/hiring-pipeline.ts
406  src/modules/kb/retrieval/kb-chat-history.service.ts
405  src/modules/gdpr/gdpr-export-worker-implementation.ts
404  src/modules/finance/planning/forecast.service.ts
403  src/modules/kb/wiki/kb-page-reviews.service.ts
402  src/modules/chat/chat-channels.controller.ts
401  src/modules/hr/import/hr-import.service.ts
401  src/modules/public/public.controller.ts
400  src/db/schema/party/business-parties.ts
399  src/modules/finance/reports/finance-report-export-worker.service.ts
399  src/modules/kb/retrieval/kb-search.service.ts
397  src/modules/goals/goals.service.ts
397  src/modules/mail/mail.service.ts
396  src/modules/ai/core/gateway/ai-gateway.service.ts
396  src/modules/module-access/module-access.service.ts
395  src/db/schema/common/enums.ts
395  src/modules/autonomy/autonomy-actions.service.ts
394  src/modules/organization/core/organization-settings.service.ts
394  src/modules/payroll/payout/lib/payslip-renderer.ts
393  src/modules/ingress/inbound-ingress.workflow.ts
393  src/modules/leads/leads.service.ts
392  src/modules/ingress/adapters/web-form-to-inbound-event.ts
391  src/modules/hr/onboarding/flow/module-checklist.service.ts
391  src/modules/organization/core/org-member-departure.service.ts
391  src/modules/support/core/support-channels.service.ts
390  src/db/schema/hr/performance.ts
390  src/modules/billing/core/invoice-snapshot.service.ts
390  src/modules/directory/person-seam.ts
390  src/modules/feedbucket/feedbucket-ai.service.ts
390  src/modules/hr/time/attendance.service.ts
390  src/modules/inventory/stock/inv-stock-transfers.service.ts
389  src/db/schema/hr/governance.ts
389  src/modules/crm/automation-studio/crm-automation-runner.service.ts
389  src/modules/storage/storage.service.ts
389  src/modules/users/user-profile.service.ts
387  src/common/auth/jwt-auth.guard.ts
387  src/modules/organization/hierarchy/org-hierarchy-teams.service.ts
385  src/modules/hr/performance/engagement.service.ts
385  src/modules/hr/policies/hr-policies.service.ts
385  src/modules/issues/issue-record-types.ts
384  src/modules/hr/directory/employee-mutations.service.ts
383  src/db/schema/hr/enterprise-comp.ts
383  src/modules/timesheets/core/timesheet-analytics.service.ts
382  src/db/schema/crm/data-quality.ts
382  src/modules/payroll/insights/reports-read.service.ts
381  src/modules/build/meetings/meetings.service.ts
381  src/modules/hr/onboarding/core/onboarding-details.service.ts
380  src/modules/ai/core/services/meetings-prep.service.ts
380  src/modules/timesheets/core/entries.service.ts
379  src/modules/billing/payments/payment-webhook-receiver.service.ts
379  src/modules/e-sign/sign-finalization.service.ts
379  src/modules/kb/wiki/kb-pages.controller.ts
378  src/modules/finance/tax/tax-reports.service.ts
377  src/modules/hr/recruitment/recruitment-sourcing.service.ts
376  src/modules/crm/pricebooks/crm-pricebooks.service.ts
375  src/modules/build/core/projects-write.service.ts
375  src/modules/finance/banking/matching.service.ts
375  src/modules/organization/core/org-membership-access-revocation.ts
375  src/modules/portal/access/portal-access.service.ts
374  src/modules/finance/reports/insights-finders.service.ts
374  src/modules/hr/global/compliance-requirements.service.ts
374  src/modules/module-access/module-access.controller.ts
372  src/modules/payroll/payroll.types.ts
371  src/modules/autonomy/autonomy.service.ts
371  src/modules/organization/setup/org-setup.service.ts
370  src/modules/build/core/projects-work-query.service.ts
370  src/modules/crm/inbox/crm-inbox-queries.service.ts
370  src/modules/email/email.provider.ts
370  src/modules/hr/onboarding/core/onboarding.controller.ts
370  src/modules/hr/recruitment/recruitment-candidate-ai.service.ts
370  src/modules/organization/core/org-lifecycle.service.ts
367  src/modules/billing/payments/payments.controller.ts
367  src/modules/hr/recruitment/recruitment-candidate-records.controller.ts
367  src/modules/rbac/permissions/build.ts
366  src/modules/inventory/sales-orders/so-lifecycle.service.ts
365  src/modules/build/core/projects-webhooks-dispatch.service.ts
363  src/modules/access/access-permission-members.resolver.ts
363  src/modules/autonomy/autonomy-hold.workflow.ts
363  src/modules/ingress/inbound-event.ts
363  src/modules/quotes/quotes.service.ts
362  src/modules/payroll/runs/lib/statutory-registry.ts
362  src/modules/rbac/roles.service.ts
362  src/modules/settings/settings.service.ts
361  src/modules/ai/core/providers/llm.service.ts
361  src/modules/build/execution/workspace.service.ts
360  src/modules/notifications/notifications-lifecycle.service.ts
360  src/modules/rbac/role-member.service.ts
359  src/modules/directory/directory.service.ts
359  src/modules/workflows/workflows.controller.ts
358  src/modules/finance/ap/payment-runs.service.ts
358  src/modules/hr/lifecycle/hr-dashboard.service.ts
358  src/modules/inventory/sales-orders/so-core.service.ts
357  src/modules/billing/core/ai-credits-reservation.service.ts
357  src/modules/email/templates/base.ts
357  src/modules/hr/recruitment/recruitment-candidate-ops.service.ts
355  src/modules/finance/ap/recurring-bills.service.ts
355  src/modules/gdpr/gdpr-rectification.service.ts
355  src/modules/ingress/adapters/telephony-call-log.service.ts
354  src/modules/build/pm-workspaces/pm-workspaces.service.ts
354  src/modules/inventory/stock-engine/stock-engine-batch.service.ts
354  src/modules/party/subject.service.ts
353  src/modules/build/core/projects-query.service.ts
353  src/modules/email/email-senders.base.ts
352  src/modules/build/core/projects-analytics.service.ts
352  src/modules/crm/import/column-mapping.ts
352  src/modules/party/party-legacy-mirror.ts
351  src/modules/e-sign/sign-envelope-dispatch.service.ts
351  src/modules/payroll/payout/payslip-bulk-publisher.service.ts
351  src/modules/payroll/runs/run-result-persister.service.ts
351  src/modules/payroll/setup/policy-mutation.service.ts
350  src/modules/leads/lead-conversion.service.ts
349  src/modules/hr/templates/hr-templates.service.ts
349  src/modules/module-access/module-access-ownership.service.ts
348  src/modules/build/qa/test-runs.service.ts
348  src/modules/hr/recruitment/recruitment-automation.service.ts
348  src/modules/hr/templates/seed-default-templates.ts
348  src/modules/leads/leads-detail.service.ts
348  src/modules/payroll/payout/batch-status.service.ts
347  src/db/schema/hr/core-people.ts
347  src/modules/ai/confirmation/ai-confirmation.service.ts
347  src/modules/crm/core/crm-rules.service.ts
346  src/modules/build/core/projects-activity.service.ts
346  src/modules/hr/onboarding/core/onboarding-task.service.ts
345  src/modules/hr/interviews/hr-interviewers.service.ts
345  src/modules/inventory/webhooks/webhooks.service.ts
345  src/modules/issues/issues.service.ts
344  src/modules/finance/ap/vendor-credits.service.ts
344  src/modules/hr/time/attendance-regularization.service.ts
344  src/modules/module-access/module-standing-mutations.service.ts
342  src/modules/organization/core/org-membership-status.service.ts
342  src/modules/payroll/payout/batch-creator.service.ts
341  src/db/schema/billing/billing.ts
340  src/modules/chat/chat-message-timeline.service.ts
340  src/modules/workflows/engine/execution-advance.ts
339  src/modules/auth/auth.controller.ts
339  src/modules/crm/metadata/crm-metadata.controller.ts
339  src/modules/notifications/notifications-read.service.ts
338  src/modules/clients/clients.controller.ts
338  src/modules/hr/core/hr-effective-change-applier.service.ts
337  src/modules/build/entity/build-entity.actions.ts
337  src/modules/hr/directory/employees.service.ts
337  src/modules/rbac/principal-groups.service.ts
336  src/modules/auth/auth.service.ts
336  src/modules/crm/import/crm-export.service.ts
336  src/modules/hr/core/hr-custom-fields.service.ts
336  src/modules/hr/lifecycle/hr-analytics.service.ts
336  src/modules/hr/performance/performance.controller.ts
335  src/common/openapi/build-openapi-document.ts
335  src/modules/build/core/projects-custom-states.service.ts
335  src/modules/cron/cron-hr.controller.ts
334  src/common/organization/organization-actor.ts
334  src/modules/crm/consent/crm-consent.service.ts
334  src/modules/customer-executive/cs-health.service.ts
334  src/modules/finance/controls/approvals.service.ts
333  src/db/schema/accounting/finance-ar-ap.ts
333  src/modules/billing/core/proration-ledger.service.ts
333  src/modules/leads/leads-ops.service.ts
333  src/modules/sales/sales-analytics.service.ts
333  src/modules/storage/file-quarantine.service.ts
332  src/modules/hr/directory/dto/hr-directory.schemas.ts
332  src/modules/organization/core/invitation-create.service.ts
331  src/modules/hr/cases/service-delivery-inbox.service.ts
331  src/modules/workflows/engine/workflow-runner.service.ts
329  src/common/cache/cache.service.ts
329  src/modules/access/entitlements.service.ts
329  src/modules/e-sign/dto/e-sign.schemas.ts
329  src/modules/hr/automations/hr-automation-engine.service.ts
328  src/modules/build/approvals/approvals.service.ts
328  src/modules/calendar/calendar.controller.ts
328  src/modules/party/party-identifiers.ts
327  src/scripts/check-set-null-column-lists.ts
326  src/modules/inventory/stock-engine/stock-engine.service.ts
326  src/modules/invoices/invoices-write.service.ts
325  src/common/region/region-registry.ts
325  src/modules/ai/core/services/hr-recruitment-ai.service.ts
325  src/modules/support/core/support-kb.service.ts
324  src/modules/finance/reports/overview.service.ts
323  src/modules/hr/import/hr-import-commit.service.ts
323  src/modules/hr/performance/documents.controller.ts
323  src/modules/inventory/ai/inv-ai.service.ts
322  src/modules/sales/sales.controller.ts
321  src/common/cache/cache-invalidation-inventory.ts
321  src/db/schema/hr/benefits.ts
321  src/modules/ai/core/controllers/crm-ai.controller.ts
321  src/modules/build/execution/whiteboard-sharing.service.ts
321  src/modules/build/execution/workspace.controller.ts
321  src/modules/build/portfolios/portfolios.service.ts
320  src/modules/crm/import/crm-import.controller.ts
320  src/modules/deals/deals-crud.service.ts
320  src/modules/mail/providers/outlook-mail.provider.ts
320  src/modules/organization/core/lifecycle/organization-purge-adapters.ts
319  src/db/schema/build/ticket-collaboration.ts
319  src/modules/crm/core/crm-support-dashboard.service.ts
319  src/modules/payroll/runs/run-batch-loader.service.ts
319  src/modules/payroll/setup/template-seeds/staffing-executive-seeds.ts
318  src/modules/ai/core/controllers/projects-ai.controller.ts
318  src/modules/build/execution/whiteboards.service.ts
317  src/modules/accounting/gl/periods.service.ts
317  src/modules/billing/core/billing-payment-activation.ts
317  src/modules/crm/metadata/crm-data-quality.service.ts
317  src/modules/cron/cron-hr-engines.service.ts
317  src/modules/cron/cron-hr-retention.service.ts
317  src/modules/organization/core/invitation-lifecycle.service.ts
317  src/modules/timesheets/core/timer.service.ts
316  src/modules/crm/import/import-plan.ts
316  src/modules/finance/banking/imports.service.ts
316  src/modules/module-access/module-access-flat-members.service.ts
316  src/modules/party/party-duplicates.ts
316  src/scripts/run-cell-rollout.ts
315  src/modules/build/core/dto/ticket.schemas.ts
315  src/modules/clients/clients.service.ts
315  src/modules/inventory/stock-engine/valuation.service.ts
315  src/modules/rbac/role-permission.service.ts
315  src/modules/sales/sales.service.ts
314  src/modules/blog/blog.service.ts
314  src/modules/ingress/adapters/mail-to-inbound-event.ts
313  src/modules/ai/core/gateway/ai-gateway-credit.helper.ts
312  src/modules/hr/benefits/hr-benefits.controller.ts
312  src/modules/rbac/role-templates-crm-hr.constants.ts
311  src/modules/ai/core/prompts/crm.prompts.ts
311  src/modules/ai/core/services/ticket-triage-ai.service.ts
311  src/modules/hr/time/work-logs.service.ts
309  src/modules/hr/performance/engagement-extras.controller.ts
309  src/modules/inventory/quality/quality-inspections.service.ts
308  src/modules/hr/governance/labor/labor.service.ts
308  src/modules/notifications/notification-preferences.service.ts
307  src/modules/email/email-outbox.service.ts
305  src/modules/contacts/contact-roles.service.ts
305  src/modules/hr/governance/positions/positions-taxonomy.service.ts
305  src/modules/hr/workflows/hr-workflow-engine.service.ts
305  src/modules/inventory/purchase-orders/po.service.ts
304  src/modules/ai/core/services/chat-history.service.ts
303  src/modules/hr/lifecycle/hr-dashboard-reports.service.ts
302  src/db/schema/common/auth.ts
302  src/modules/activities/activities.service.ts
302  src/modules/crm/import/import-entities.ts
302  src/modules/module-access/user-permission-grants.service.ts
301  src/common/cache/cache-invalidation-matrix.ts
301  src/modules/gdpr/gdpr.service.ts
301  src/modules/notifications/notification-events.catalog.ts
```

### 8.4 Over-300 — frontend, 519 files (baseline 519)

Distribution by owning area:

- features/hr — 103
- features/build — 74
- features/accounting — 35
- hooks/api — 34
- app/(authenticated) — 34
- features/payroll — 26
- features/inventory — 23
- features/settings — 19
- features/crm — 17
- features/wiki — 15
- features/chat — 12
- features/timesheets — 10
- features/support — 9
- components/layout — 9
- features/users — 6
- features/notifications — 6
- features/billing — 6
- types — 5
- features/org-setup — 5
- features/calendar — 5
- features/mail — 4
- features/employee-onboarding — 4
- lib/renderer — 3
- features/renderer — 3
- features/module-access — 3

Full list, largest first:

```
663  hooks/api/notifications-inbox.test.ts
564  features/crm/settings/automations/builder/automation-builder.tsx
534  hooks/api/notifications-inbox.ts
512  app/(authenticated)/inventory/purchase-orders/[poId]/page.tsx
504  hooks/api/accounting/banking.ts
501  features/hr/cases/cases-page-content.tsx
499  components/assistant/global-ask-os.tsx
499  features/timesheets/types.ts
496  features/accounting/invoices/invoices-page.tsx
496  features/chat/webrtc-huddle.ts
495  features/help-centre/components/kb-manager-content.tsx
494  features/build/shared/filter-command-menu.tsx
494  features/timesheets/exceptions/exceptions-view.tsx
493  components/ai/ai-actions-menu.tsx
492  app/(authenticated)/crm/deals/[dealId]/page.tsx
491  features/settings/organization/org-danger-zone-section.tsx
491  hooks/api/hr/leaves.ts
489  hooks/api/accounting.ts
488  features/hr/announcements/announcement-form-sheet.tsx
487  hooks/api/hr/employees.ts
486  features/chat/message-input.tsx
486  features/hr/reimbursements/reimbursements-page.tsx
483  app/(authenticated)/inventory/products/[productId]/page.tsx
483  features/users/users-page.tsx
481  features/accounting/settings/fin-settings-dialogs.tsx
479  features/settings/delegations/delegations-page.tsx
479  features/wiki/components/knowledge-settings-page.tsx
478  components/layout/command-palette.tsx
476  features/settings/organization/hierarchy/locations-page.tsx
475  hooks/api/kb/pages.ts
474  features/build/my-work/my-work-page.tsx
473  components/members/member-picker.tsx
473  features/billing/invoice-line-items.tsx
473  features/build/bugs/bug-sheet.tsx
473  lib/query-keys/human-resources.ts
470  features/crm/shared/ai-assistant-panel.tsx
470  features/employee-onboarding/components/step-personal.tsx
468  features/build/ticket-details/activity-feed.tsx
467  features/inventory/components/stock/opening-stock-sheet.tsx
466  features/settings/delegations/grant-delegation-sheet.tsx
465  features/crm/import/bulk-import-section.tsx
464  features/build/project-list/projects-page.tsx
464  features/inventory/components/stock/new-transfer-sheet.tsx
463  features/inventory/components/shipping/package-detail-sheet.tsx
462  features/settings/organization/hierarchy/branches-page.tsx
461  components/layout/header/org-switcher.tsx
458  features/hr/recruitment/candidates/bulk-import-page.tsx
458  features/payroll/team/team-page.tsx
458  features/portal-access/client-access-page.tsx
457  features/crm/quotes/components/quote-create-sheet.tsx
457  features/hr/attendance/check-in-button.tsx
456  features/hr/handbook/handbook-page-client.tsx
456  features/hr/recruitment/email-sequences/email-sequences-page.tsx
455  app/(authenticated)/crm/deals/page.tsx
455  features/accounting/core/new-journal-entry-page.tsx
455  features/accounting/core/recurring-journal-sheet.tsx
455  features/accounting/sales/collections-tab.tsx
455  features/build/incidents/incident-sheet.tsx
455  features/hr/forms/components/form-builder.tsx
455  features/support/settings/custom-fields/custom-fields-page.tsx
455  hooks/api/workflows/workflows-mutations.test.tsx
454  features/settings/organization/hierarchy/cost-centers-page.tsx
453  app/(authenticated)/inventory/purchase-orders/page.tsx
453  features/wiki/components/reviews-page.tsx
451  features/build/ticket-details/ticket-checklists.tsx
451  features/hr/leave-policies/policy-form-sheet.tsx
451  features/support/settings/channels-page.tsx
450  features/build/tickets/create-ticket-dialog.tsx
449  features/build/approvals/request-approval-sheet.tsx
448  app/(auth)/verify-email/page.tsx
448  components/rbac/role-assignments-sheet.tsx
448  features/accounting/settings/setup-wizard-steps.tsx
448  features/build/project-create/steps/step-basics.tsx
448  features/hr/onboarding/bulk-onboard-template.ts
447  features/accounting/planning/budgets-page.tsx
446  features/hr/recruitment/offer-templates/offer-templates-page.tsx
446  lib/renderer/layout.ts
445  app/(authenticated)/crm/settings/options/page.tsx
445  components/workspace-onboarding/success-checklist.tsx
445  features/settings/organization/hierarchy/teams-page.tsx
444  features/hr/work-logs/work-log-entry-row.tsx
444  features/portal/components/portal-project-detail.tsx
443  features/inventory/components/receive-goods-sheet.tsx
443  features/wiki/components/kb-record-target-combobox.tsx
442  features/payroll/me/me-page.tsx
441  features/build/shared/ticket-filter-bar.tsx
440  components/hr/self-edit-profile-form.tsx
440  features/build/teams/team-home-page.tsx
440  features/chat/huddle-panel.tsx
440  features/hr/performance/cycles-tab.tsx
439  features/hr/recruitment/headcount/headcount-page.tsx
438  features/blog/admin/blog-admin-posts.tsx
438  features/payroll/runs/breakdown-sheet.tsx
437  features/build/whiteboard/whiteboard-page.tsx
437  features/crm/leads/lead-detail-sheet.tsx
436  features/build/cycles/cycles-page.tsx
436  features/build/views/display-options-panel.tsx
436  hooks/api/build/projects.ts
434  features/hr/governance/components/labor-tabs.tsx
433  features/build/intake/intake-page.tsx
433  features/hr/documents/components/upload-document-dialog.tsx
433  features/hr/documents/template-editor.tsx
432  features/accounting/ap/payment-run-detail-page.tsx
432  features/employee-onboarding/hooks/use-onboarding-wizard.ts
432  features/hr/recruitment/candidates/candidates-page.tsx
432  features/settings/organization/hierarchy/departments-page.tsx
432  features/wiki/components/wiki-sidebar-nav.tsx
431  app/(authenticated)/crm/settings/assignment-rules/page.tsx
431  components/automations/ai-node-config-forms.tsx
431  features/accounting/coa/account-detail-page.tsx
430  features/build/pm-workspaces/pm-workspaces-page.tsx
430  features/build/shared/filter-flat-search.tsx
428  app/(public)/roadmap/[orgId]/page.tsx
428  features/crm/leads/kanban-card.tsx
427  features/hr/fnf/fnf-page-client.tsx
427  features/wiki/components/import-page.tsx
426  features/crm/settings/assignment-rule-sheet.tsx
425  features/accounting/core/journal-page.tsx
425  features/hr/engagement/recognition-feed.tsx
424  components/hr/recruitment/scorecard-form.tsx
424  features/build/views/gantt-view.tsx
424  features/chat/use-message-panel-data.ts
424  features/crm/import/planned-import-section.tsx
424  lib/renderer/layout-adjustment.test.ts
423  app/(authenticated)/inventory/products/page.tsx
423  features/accounting/ap/purchase-bills-page.tsx
423  features/billing/ai-credits-settings-page.tsx
420  features/build/managed-products/managed-products-page.tsx
420  features/build/views/use-board-url-state.ts
420  features/notifications/components/provider-editor.tsx
419  components/entitlement-gate.tsx
418  features/build/settings/project-settings-page.tsx
418  features/hr/attendance/attendance-email-dialog.tsx
418  features/hr/engagement/engagement-page.tsx
418  hooks/api/crm/deals.ts
417  features/chat/chat-bubble.tsx
416  components/layout/header/user-avatar-menu.tsx
416  features/timesheets/billing/billing-view.tsx
416  hooks/api/crm/metadata.ts
415  features/accounting/banking/components/bank-import-client.tsx
415  hooks/api/dashboard.ts
414  features/accounting/banking/components/reconciliation-rules-sheet.tsx
414  hooks/api/inventory/shipping.ts
413  features/build/project-list/edit-project-sheet.tsx
413  features/hr/employees/employees-list-page.tsx
412  features/hr/expenses/expense-list.tsx
412  features/wiki/components/knowledge-analytics-page.tsx
411  components/rbac/permission-matrix.tsx
411  features/build/shared/filter-category-submenu.tsx
411  features/hr/background-verification/background-verification-page-client.tsx
410  components/layout/sidebar/sidebar-nav-groups-finance.ts
410  features/hr/kpis/competency-frameworks-tab.tsx
410  features/org-setup/components/step-basics.tsx
410  features/support/inbox/ticket-reply-composer.tsx
409  features/dashboard/hr-widgets.tsx
409  features/hr/employees/detail/employee-details-view.tsx
409  features/hr/expenses/expenses-page.tsx
409  features/payroll/runs/salary-profile-sheet.tsx
409  features/renderer/renderer.field-kinds.test.tsx
409  types/notifications.ts
408  features/accounting/coa/chart-of-accounts-page.tsx
408  features/accounting/purchases/vendor-credits-page.tsx
408  types/hr/recruitment.ts
407  features/accounting/sales/payment-reminders-page.tsx
407  features/build/tickets/ticket-create-properties.tsx
407  features/chat/__tests__/chat-presence-budget.test.ts
406  app/(authenticated)/inventory/stock/transfers/[transferId]/page.tsx
406  features/build/qa/test-case-sheet.tsx
405  features/build/command-center/command-center-actions.tsx
404  features/crm/leads/lead-actions.tsx
404  features/hr/travel/travel-approvals-page.tsx
404  features/hr/workforce/workforce-planning-page.tsx
403  features/accounting/assets/asset-detail-page.tsx
403  features/hr/recruitment/question-bank/question-form-body.tsx
403  features/settings/simulate/simulate-page.tsx
402  features/chat/channel-sidebar.tsx
402  features/hr/performance/goals-tab.tsx
402  features/hr/performance/pip-form-fields.tsx
401  components/ui/data-table.tsx
401  features/calendar/meeting-follow-up-panel.tsx
401  features/inventory/components/inventory-dashboard-client.tsx
401  hooks/api/hr/attendance.ts
400  features/feedbucket/components/feedbucket-ai-panel.tsx
400  features/hr/engagement/polls-tab.tsx
400  features/hr/feedback/cycles-tab.tsx
399  lib/api-client.ts
398  hooks/api/hr/recruitment/candidate-details.ts
397  features/build/portfolios/portfolio-detail-page.tsx
397  features/hr/recruitment/scorecard-templates/scorecard-templates-page.tsx
397  features/timesheets/settings/general-settings-form-fields.tsx
396  features/hr/email-templates/email-templates-page-client.tsx
396  hooks/api/calendar.ts
395  hooks/api/hr/recruitment/candidates.ts
394  components/ui/__tests__/contrast-tokens.test.ts
394  features/build/portfolios/portfolios-page.tsx
394  features/calendar/calendar-toolbar.tsx
394  features/wiki/components/page-metadata-sheet.tsx
393  features/build/project-list/project-table-columns.tsx
393  features/hr/documents/templates-list-page.tsx
393  features/hr/leaves/components/leaves-wfh-content.tsx
393  features/notifications/notification-bell.tsx
392  app/(authenticated)/crm/activities/page.tsx
392  features/hr/performance/pip-tab.tsx
392  features/module-access/components/member-dialogs.tsx
392  features/party/parties/parties-page.tsx
392  features/payroll/runs/runs-page-content.tsx
392  types/inventory.ts
391  components/layout/header/quick-create-button.tsx
391  features/inventory/components/operations/vendor-return-sheet.tsx
391  features/wiki/lib/starter-templates.ts
391  hooks/api/inventory/quality.ts
390  features/hr/automations/automation-upsert-sheet.tsx
389  features/accounting/settings/fin-settings-sections.tsx
389  features/help-centre/components/kb-article-editor.tsx
388  features/payroll/taxes/filings-tab.tsx
386  app/(authenticated)/inventory/stock/page.tsx
386  features/hr/recruitment/interviews/interview-form-sheet.tsx
386  features/payroll/runs/inputs-tab.tsx
386  features/settings/organization/hierarchy/business-units-page.tsx
386  features/wiki/components/page-tree-item.tsx
385  features/accounting/taxes/tax-codes-page.tsx
385  features/build/modules/modules-page.tsx
385  features/calendar/calendar-view.tsx
385  features/hr/safety/safety-page-content.tsx
385  features/wiki/components/knowledge-base-page.tsx
384  app/(authenticated)/inventory/sales-orders/[soId]/page.tsx
384  features/hr/recruitment/candidates-list/edit-candidate-sheet.tsx
384  features/payroll/employees/employee-detail-page.tsx
383  features/crm/leads/lead-followup-tab.tsx
382  app/(authenticated)/crm/tasks/page.tsx
382  features/accounting/core/general-ledger-page.tsx
382  features/payroll/reports/calendar-manager.tsx
382  features/settings/organization/org-branding-section.tsx
381  features/accounting/planning/forecast-page.tsx
381  features/build/all-work/all-work-views-menu.tsx
381  features/dashboard/dashboard-deferred-body.tsx
381  features/module-access/components/roles-tab.tsx
381  features/org-setup/components/welcome-boot-stage.tsx
380  features/hr/termination/use-termination-actions.ts
379  features/accounting/approvals/approvals-page.tsx
379  features/crm/import/bulk-import-entities.ts
379  features/hr/expenses/components/import-expense-sheet.tsx
379  features/hr/templates/template-upsert-sheet.tsx
378  features/hr/attendance/manage-holidays-card.tsx
378  features/hr/custom-fields/components/custom-field-upsert-sheet.tsx
377  features/accounting/purchases/recurring-bill-form-sheet.tsx
377  features/billing/components/billing-profile-tab.tsx
376  features/calendar/calendar-accounts-sheet.tsx
376  features/hr/analytics/command-center-section.tsx
376  features/hr/assets/assets-page.tsx
376  features/support/settings/routing-rule-sheet.tsx
375  features/build/ai/ai-chat-panel.tsx
375  features/build/meetings/meetings-list-page.tsx
375  features/build/programs/programs-page.tsx
375  features/payroll/ess/components/ess-bank-section.tsx
373  features/build/settings/git-integration-settings.tsx
373  features/build/views/list-view.tsx
373  features/hr/recruitment/interview-feedback-form.tsx
373  features/hr/workflows/approvals-page.tsx
373  features/org-setup/components/generation-progress-stage.tsx
371  app/(auth)/invitation/[token]/page.tsx
371  features/build/epics/epic-card.tsx
371  features/hr/termination/termination-list.tsx
370  features/hr/recruitment/talent-pools/talent-pools-page.tsx
370  features/users/user-invitations-panel.tsx
369  components/layout/mobile/use-mobile-shell-fab-position.ts
369  features/directory/people/people-directory-page.tsx
368  features/build/teams/teams-list-page.tsx
368  features/chat/message-list.tsx
368  features/hr/org/org-catalog-table.tsx
368  features/hr/work-logs/work-logs-page.tsx
367  features/hr/recruitment/candidate-detail/calibration-tab.tsx
367  features/mail/mail-accounts-sheet.tsx
367  features/shared/automations/module-automations-settings.tsx
366  app/(authenticated)/crm/companies/[companyId]/page.tsx
366  features/build/settings/custom-fields-settings.tsx
366  features/crm/settings/validation-rule-sheet.tsx
365  app/(authenticated)/crm/leads/page.tsx
365  features/mail/mail-compose-sheet.tsx
364  features/build/ticket-details/comment-item.tsx
364  features/hr/performance/reviews-tab.tsx
364  features/portal-access/grant-form-dialog.tsx
363  features/accounting/taxes/tax-reports-page.tsx
363  features/payroll/command-center-page.tsx
362  features/hr/policies/policies-page.tsx
362  features/payroll/salary-structures/salary-structure-template-sheet.tsx
361  features/timesheets/approvals/approval-detail-sheet.tsx
360  app/(authenticated)/inventory/reports/stock-summary/page.tsx
360  app/(authenticated)/inventory/stock/movements/page.tsx
360  features/accounting/sales/credit-note-form-sheet.tsx
360  features/hr/termination/termination-form-sheet.tsx
360  features/settings/webhooks/webhooks-page.tsx
360  hooks/api/org-hierarchy.ts
359  features/hr/onboarding/onboarding-detail-sheet.tsx
359  features/notifications/preferences-page.tsx
358  features/inventory/components/operations/customer-return-sheet.tsx
357  features/build/bugs/bugs-page.tsx
357  features/build/my-work/grouping-sidebar.tsx
357  features/build/ticket-details/ticket-detail-page.tsx
357  features/build/views/workload-view.tsx
357  features/hr/leaves/components/leaves-tab-content.tsx
357  features/support/portal/new-ticket-sheet.tsx
356  features/build/goals/goal-detail-page.tsx
356  features/hr/recruitment/candidates-list/add-candidate-sheet.tsx
355  features/hr/import-export/components/import-wizard-sheet.tsx
355  features/inventory/components/finance/valuation-client.tsx
355  features/inventory/components/product-edit-form.tsx
355  features/org-setup/components/step-generation.tsx
354  features/directory/workers/workers-page.tsx
354  hooks/api/hr/recruitment/interviews.ts
353  components/layout/sidebar/sidebar-nav-items.ts
353  features/build/project-list/grouping-sidebar.tsx
353  features/build/settings/labels-settings.tsx
352  features/inventory/components/tools/barcode-client.tsx
352  features/timesheets/my-time/timer-panel.tsx
351  app/(authenticated)/inventory/stock/transfers/page.tsx
351  hooks/api/hr/global.ts
350  features/organization/organization-structure-page.tsx
350  features/settings/organization/hierarchy/organization-chart-page.tsx
350  types/projects/projects.ts
349  app/(authenticated)/inventory/sales-orders/new/page.tsx
349  features/hr/onboarding/bulk-onboard-panel.tsx
349  features/payroll/reports/accounting-mappings-sheet.tsx
348  features/build/goals/goals-page.tsx
348  features/build/governance/risks-page.tsx
348  features/build/settings/status-row.tsx
348  features/hr/recruitment/candidate-detail/reference-checks-tab.tsx
348  types/accounting.ts
347  app/(authenticated)/inventory/products/categories/page.tsx
347  features/inventory/components/shipping/shipment-detail-sheet.tsx
347  features/inventory/components/warehouse/add-location-sheet.tsx
346  features/hr/documents/document-form-fields.tsx
346  features/hr/global/compliance-page-content.tsx
346  features/notifications/components/template-editor.tsx
346  features/settings/settings-profile.tsx
345  features/accounting/banking/components/reconciliation-match-panel.tsx
345  features/hr/workflows/workflow-upsert-sheet.tsx
344  features/hr/recruitment/sla/sla-config-page.tsx
343  features/hr/recruitment/inbox/recruitment-inbox-page.tsx
343  features/inventory/components/control/cycle-counts-client.tsx
343  features/inventory/components/quality/inspection-detail-sheet.tsx
343  features/payroll/bonuses/incentives-tab.tsx
343  features/payroll/ess/components/ess-reimbursements-section.tsx
343  features/support/inbox/ticket-detail-relations.tsx
343  features/timesheets/my-time/week-grid.tsx
343  lib/renderer/layout-adjustment.ts
342  components/layout/sidebar/sidebar-permission-navigation.test.ts
342  features/billing/create-invoice-dialog.tsx
342  features/build/project-list/project-card.tsx
342  features/build/releases/releases-page.tsx
342  features/chat/message-panel-view.tsx
342  features/chat/new-group-dialog.tsx
342  features/support/support-dashboard-page.tsx
341  features/billing/components/plan-tab.tsx
341  features/directory/workers/worker-engagement-form.tsx
340  app/(public)/legal/privacy/page.tsx
340  features/accounting/purchases/bill-detail-view.tsx
340  features/wiki/components/page-comments-sheet.tsx
339  features/hr/recruitment/command-center-page.tsx
339  features/hr/recruitment/requisitions/requisition-form-sheet.tsx
339  features/renderer/renderer.references.test.tsx
339  features/users/user-edit-form.tsx
338  app/(public)/forms/[token]/page.tsx
338  components/expenses/expense-export/expense-export-dialog.tsx
338  features/hr/document-review/review-sheet.tsx
338  features/users/user-detail-sheet.tsx
338  hooks/api/chat-realtime.ts
338  hooks/api/payments.ts
337  features/crm/settings/sequences/sequence-sheet.tsx
337  features/support/inbox/create-ticket-dialog.tsx
336  features/accounting/sales/payments-received-page.tsx
336  features/billing/invoices-client.tsx
336  features/build/incidents/incidents-page.tsx
336  features/feedbucket/components/feedbucket-submission-detail.tsx
336  features/module-access/components/module-members-tab.tsx
335  app/(authenticated)/inventory/vendors/page.tsx
334  features/build/managed-products/managed-product-form-sheet.tsx
334  features/dashboard/public-documents-card.tsx
334  features/hr/shifts/shift-form-sheet.tsx
334  features/payroll/setup/steps/step-profile.tsx
334  features/workflows/secrets/secrets-page.tsx
334  hooks/api/support/ai.ts
334  types/projects/tasks.ts
333  app/(authenticated)/crm/quotes/page.tsx
332  components/editor/plate/plate-combobox-elements.tsx
332  features/hr/attendance/team-attendance-card.tsx
332  features/hr/recruitment/jobs/create-job-form/index.tsx
332  hooks/api/hr/engagement.ts
331  features/hr/assets/asset-form-sheet.tsx
331  features/hr/enterprise/ops/identity/identity-page-content.tsx
331  features/landing/components/landing-walkthrough.tsx
330  features/payroll/payout/bank-transfers/batch-detail-sheet.tsx
329  app/(authenticated)/inventory/operations/returns/page.tsx
329  features/build/views/card-inline-extra-fields.tsx
329  features/chat/internal-link-preview.tsx
329  features/inventory/components/planning/replenishment-client.tsx
328  features/build/views/kanban-column-header.tsx
328  features/hr/leaves/leave-types-manager.tsx
328  features/hr/recruitment/candidate-detail/candidate-detail-page.tsx
327  features/build/client-portal/portal-dashboard-page.tsx
327  features/hr/org-chart/org-chart-page.tsx
327  features/timesheets/approvals/approvals-tab-panel.tsx
327  features/timesheets/settings/rate-form-sheet.tsx
326  components/ui/stat-card.tsx
326  features/accounting/sales/credit-notes-page.tsx
326  features/calendar/event-form-fields.tsx
326  features/inventory/components/product-variant-sheet.tsx
326  features/payroll/ess/components/ess-tax-section.tsx
326  features/settings/roles/roles-page.tsx
325  features/hr/policies/policy-upsert-sheet.tsx
325  features/notifications/components/event-policy-sheet.tsx
325  features/payroll/templates/templates-page.tsx
325  features/wiki/components/page-history-page.tsx
324  features/hr/recruitment/diversity-report-page.tsx
324  features/inventory/components/quality/hold-create-sheet.tsx
323  app/(authenticated)/inventory/channels/page.tsx
323  app/(authenticated)/inventory/reports/expiry/page.tsx
323  features/build/change-requests/change-request-sheet.tsx
323  features/crm/contacts/contact-list-page.tsx
323  features/hr/cases/case-detail-sheet.tsx
323  features/hr/performance/succession-tab.tsx
323  features/payroll/inputs/inputs-page-content.tsx
323  hooks/api/support/macros.ts
322  app/(authenticated)/crm/leads/smart-search/page.tsx
322  features/build/views/kanban-board.tsx
322  features/payroll/salary-structures/salary-structures-page.tsx
321  features/employee-onboarding/components/step-review.tsx
321  features/hr/document-review/upload-doc-sheet.tsx
321  features/hr/exit/resignation-form-sheet.tsx
320  features/accounting/sales/record-payment-dialog.tsx
320  features/build/all-work/all-work-page.tsx
320  features/build/teams/team-form-sheet.tsx
320  features/hr/recruitment/requisitions/requisition-card.tsx
320  hooks/api/inventory/transfers.ts
319  app/(authenticated)/crm/deals/approvals/page.tsx
319  components/hr/recruitment/rollout-documents-dialog.tsx
319  features/build/tickets/use-create-ticket-form.ts
319  features/settings/audit-log/audit-log-page.tsx
319  features/wiki/components/public-page-content.tsx
318  features/employee-onboarding/components/profile-preview.tsx
318  features/hr/governance/components/delegation-sheet.tsx
318  features/wiki/components/page-document-toolbar.tsx
317  features/accounting/purchases/recurring-bills-page.tsx
317  features/build/project-detail/project-budget-page.tsx
317  features/crm/issues/issues-page.tsx
317  features/crm/shared/crm-inline-ai-menu.tsx
317  features/hr/work-logs/work-log-advanced-filters-sheet.tsx
317  features/inventory/components/order-line-table.tsx
317  features/payroll/employees/worker-detail-page.tsx
316  app/(authenticated)/crm/quotes/[quoteId]/page.tsx
316  features/hr/recruitment/candidates-list/candidate-card.tsx
316  features/support/settings/sla-page.tsx
316  features/users/user-actions-menu.tsx
316  hooks/api/hr/enterprise-comp.ts
316  hooks/api/inventory/counts.ts
316  types/leads.ts
315  app/(authenticated)/inventory/sales-orders/page.tsx
315  features/accounting/banking/components/bank-account-detail-client.tsx
315  features/build/teams/team-projects-section.tsx
315  features/chat/channel-info-panel.tsx
315  features/org-setup/components/workspace-preview-main.tsx
314  features/build/sidebar/project-nav-config.ts
314  features/hr/leaves/leave-request-form-fields.tsx
314  features/settings/roles/groups/group-detail-sheet.tsx
314  hooks/api/organization.ts
313  features/hr/attendance/daily-history-table.tsx
313  hooks/api/inventory/operations.ts
312  features/hr/expenses/components/expense-form-fields.tsx
312  types/chat.ts
311  features/crm/leads/detail/lead-detail-header.tsx
311  features/inventory/components/tools/export-tab.tsx
311  features/payroll/components/component-form-sheet.tsx
310  app/(authenticated)/inventory/vendors/[vendorId]/page.tsx
309  features/build/qa/runs/run-execution-page.tsx
309  features/build/whiteboard/share-dialog.tsx
309  features/settings/organization/org-localization-section.tsx
309  features/timesheets/reports/reports-view.tsx
309  hooks/api/leads.ts
308  features/inventory/components/channels/three-pl-connection-sheet.tsx
308  features/inventory/components/planning/replenishment-rule-form.tsx
308  features/mail/mail-empty-pane.tsx
308  hooks/api/accounting/ar.ts
307  components/automations/automation-builder-sheet.tsx
307  features/build/automations/automation-sheet.tsx
307  features/build/backlog/project-backlog-page.tsx
307  features/build/inbox/inbox-ticket-preview.tsx
307  features/hr/exit/exit-management-page.tsx
307  features/users/user-invitation-columns.tsx
307  hooks/api/build/ticket-mutations.ts
307  types/hr/employee.ts
306  app/(authenticated)/inventory/reports/movements/page.tsx
305  app/(authenticated)/crm/leads/source-report/page.tsx
305  app/(authenticated)/inventory/quality/holds/page.tsx
305  features/accounting/core/period-checklist-panel.tsx
305  features/accounting/sales/invoice-detail-view.tsx
305  features/hr/document-types/document-type-form-dialog.tsx
305  features/hr/expenses/expense-item.tsx
304  components/shared/rich-surface.tsx
304  features/build/analytics/project-charts-impl.tsx
304  features/hr/governance/components/data-requests-tab.tsx
304  features/wiki/components/kb-conversation-list.tsx
304  lib/rbac/route-access/__tests__/page-level-gates.test.ts
303  app/(authenticated)/crm/leads/duplicates/page.tsx
303  features/hr/recruitment/candidate-detail/vault-document-list.tsx
303  features/notifications/notification-filter-bar.tsx
303  features/payroll/payout/payslips/template-edit-sheet.tsx
303  features/payroll/reimbursements/reimbursements-page.tsx
303  features/payroll/reports/journal-batches-sheet.tsx
302  components/layout/mobile/mobile-module-nav-items.test.ts
302  features/accounting/planning/scenario-form-fields.tsx
302  features/build/qa/test-cases-tab.tsx
302  features/build/views/workload-filter-menu.tsx
302  features/hr/employees/detail/sensitive-tab.tsx
302  features/hr/recruitment/interviews/interview-list.tsx
302  features/mail/mail-reading-pane.tsx
301  features/inventory/components/channels/channel-sheet.tsx
301  features/inventory/components/product-field-selects.tsx
301  features/renderer/record-form.tsx
301  features/settings/organization/org-profile-section.tsx
```

---

## 9. Cross-territory findings — reported, not fixed

1. **Frontend `check:file-sizes` is RED on three files, none of them mine.**
   - `hooks/api/notifications-inbox.ts` — 534 lines. `hooks/api/` is another lane's territory.
   - `hooks/api/accounting/banking.ts` — 501 lines. Same territory; it crossed 500 *during* this
     session (it was not over the limit when this ticket started).
   - `features/hr/cases/cases-page-content.tsx` — 501 lines, uncommitted and modified minutes
     before this measurement, i.e. actively held by another agent.
   Each needs a cohesive split by its owner, or a nine-column registry record. Note the shape:
   two of the three are a **single line** over the limit.

2. **`check:over-300` backend is 6 above baseline** and none of the crossings came from this
   ticket. The files that crossed 300 since `c3f0b73d`, by owner: HR (`work-logs`,
   `labor.service`, `hr-workflow-engine`, `payroll-compliance`), payroll (`reports-read`,
   `locking`, `run-batch-loader`), build (`projects-custom-states`,
   `projects-webhooks-dispatch`), workflows (`execution-advance`, `workflow-runner.service`),
   notifications (`notification-preferences`, `notifications-lifecycle`), AI
   (`ai-gateway.service`, `ai-gateway-credit.helper`, `chat-history.service`), plus
   `common/cache/cache.service`, `common/cache/cache-invalidation-matrix`,
   `db/schema/common/auth`, `db/schema/hr/benefits`, `modules/auth/auth.controller`,
   `modules/crm/import/import-entities`, `modules/email/email-outbox`,
   `modules/platform/platform-operator-access`, `modules/storage/file-quarantine`,
   `modules/timesheets/core/timer`.

3. **`check:lifecycle-predicates` is 1 primary-read candidate above its baseline of 75.**
   Confirmed not from this ticket: the three GDPR reads simply moved file and the candidate
   count is unchanged by the split. Owner unknown; it needs `--list` diffed against the
   baseline commit by whoever owns the added read.

4. **Backend typecheck**: `src/modules/finance/ap/payment-run-executor.service.ts(157,17)
   TS2552: Cannot find name 'newStatus'`. Finance/accounting lane.

5. **Backend spec-typecheck**: `src/db/__tests__/db-call-count-contract.spec.ts(64,40) TS2339:
   Property 'onConflictDoNothing' does not exist on type 'PromiseLike<unknown>'`. DB lane.

6. **Frontend type-check**: three errors in `features/billing/` —
   `payments-tab.tsx(125,9)` (`amount: string | null` vs `string | number`),
   `invoice-detail-utils.ts(3,14)` and `invoices-client.tsx(54,7)` (both missing `SENT`,
   `PARTIALLY_PAID`, `OVERDUE` from an invoice-status `Record`). Billing lane.

7. **A registry whose line counts must match exactly is fragile under concurrent editing.**
   `seed-enterprise-workspace.ts` moved 550 → 551 between two measurements in this session, and
   `hooks/api/accounting/banking.ts` moved 501 → 504 → 501. The strictness is correct — it is
   what caught seven stale rows — but a registered file edited by another lane turns the gate
   red until the row is re-measured. Worth knowing before someone assumes a red gate is their
   own regression.

## 10. Files changed

Backend (`streamlineos-backend`):
- `src/scripts/check-file-sizes.mjs` — rewritten fail-closed, testable `runCheck()`, 39 self-tests
- `src/scripts/check-lifecycle-predicates.mjs` — 3 ACCEPTED entries re-keyed
- `src/scripts/baselines/unbounded-reads-classification.json` — GDPR entry re-keyed, cron document sweep classified
- `src/scripts/baselines/db-call-count-classification.json` — cron entry re-keyed, policy loop classified
- `src/modules/gdpr/gdpr-subject-erasure.service.ts` (653 → 244) and new `-paging.ts`, `-identity.ts`, `-authored-content.ts`
- `src/modules/ai/core/gateway/ai-gateway-runner.helper.ts` (527 → 211) and new `ai-gateway-runner-call.ts`
- `src/modules/storage/storage.service.ts` (509 → 389) and new `storage-placement.ts`
- `src/modules/cron/cron-hr-retention.service.ts` (504 → 317) and new `cron-hr-retention-documents.ts`

Frontend (`streamlineos-frontend`):
- `architecture-refactor/final-refactor/issues/file-size-exceptions.md` — 12 rows → 7, nine-column records, audit trail
- `frontend/scripts/check-file-sizes.mjs` — nine-column contract, malformed rows reported, 42 self-tests
- `frontend/scripts/file-size-exceptions.md` — same contract documented; table still empty
- `.scratch/code-release-10-10/issues/37-file-cohesion-and-size-policy.md` — boxes
- `.scratch/code-release-10-10/reports/37-file-cohesion.md` — this report
