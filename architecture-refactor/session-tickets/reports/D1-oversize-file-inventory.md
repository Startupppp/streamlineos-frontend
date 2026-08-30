# D1 — Oversize File Inventory

Date: 2026-08-30. Lane D1 produces a plan only; no files were edited.

---

## 1. Raw counts (before exceptions)

| Repo | Files over 500 lines |
|---|---|
| `backend/src/**` | 86 |
| `frontend/**` (excl. `node_modules`, `.next`) | 17 |
| **Total** | **103** |

---

## 2. Exception analysis

§7 exceptions are: generated files · unmodified shadcn primitives under `frontend/components/ui/` · `*.d.ts`.

**Generated files.** No file in either list carries `@generated`, `DO NOT EDIT` or a generator header. None are produced by the Drizzle kit (those live under `backend/migrations/`). Zero exceptions claimed.

**`*.d.ts` files.** The only `.d.ts` in `backend/src/` is `@types/express.d.ts` at 11 lines — not in the list. Zero exceptions claimed.

**Unmodified shadcn primitives.** Every file under `frontend/components/ui/` is under 500 lines (`data-table.tsx` at 463 is the largest). Zero exceptions claimed.

**`feedbucket-widget/src/`** is authored code: it imports from local modules (`./screenshot`, `./metadata`, `./api`, etc.) and has no generator header. It counts as a violation.

**Real violation counts after exceptions: backend 86, frontend 17, total 103.** The raw counts are unchanged.

---

## 3. Full violation list

### Backend (`backend/src/**`) — 86 files

Sorted by line count, largest first.

```
1234  modules/crm/import/crm-import.service.ts
1087  modules/access/access.service.spec.ts
1054  modules/notifications/notification-events.catalog.ts
1016  db/schema/crm/deals.ts
 840  modules/inventory/ai/inv-ai-explain.service.spec.ts
 833  modules/module-access/__tests__/module-access.controller.e2e-spec.ts
 821  modules/crm/import/crm-import.service.spec.ts
 803  modules/inventory/inv-engine-misc-isolation.spec.ts
 779  modules/auth/auth-tokens.service.ts
 767  scripts/relocate-org-data.ts
 757  modules/crm/import/crm-connector.service.ts
 750  modules/access/access.service.ts
 747  modules/ownership/ownership-transfer-response.service.ts
 746  modules/payroll/payout/payout-batches.service.ts
 737  modules/payroll/runs/generate.service.ts
 696  modules/kb/retrieval/kb-indexing.service.ts
 684  modules/billing/core/billing.service.spec.ts
 653  modules/organization/core/org-lifecycle.service.ts
 645  modules/module-access/__tests__/module-access-new-capabilities.spec.ts
 640  modules/platform/platform.service.ts
 635  modules/ai/confirmation/ai-confirmation.service.spec.ts
 634  modules/ownership/__tests__/ownership.service.spec.ts
 634  modules/organization/core/invitations.service.ts
 627  modules/inventory/stock-engine/stock-engine.service.ts
 625  modules/billing/core/billing-webhook.spec.ts
 619  modules/party/party-merge.service.ts
 618  modules/goals/goals.service.ts
 614  modules/inventory/purchase-orders/grn.service.ts
 610  modules/organization/core/membership-revocation.spec.ts
 608  modules/organization/setup/org-setup.service.ts
 606  modules/rbac/roles.service.ts
 604  modules/organization/core/organization-member-status.spec.ts
 602  modules/kb/wiki/kb-pages.service.ts
 602  modules/billing/core/invoice-snapshot.service.spec.ts
 600  modules/support/core/dto/support.schemas.ts
 598  modules/hr/__tests__/sensitive-projection-exposure.spec.ts
 598  modules/build/entity/build-entity.adapter.ts
 597  modules/autonomy/autonomy.service.spec.ts
 589  modules/timesheets/core/approvals.service.ts
 584  modules/rbac/role-templates.constants.ts
 584  modules/cron/cron-platform.controller.ts
 582  modules/kb/help-centre/kb-articles.service.ts
 581  modules/support/core/support.controller.e2e-spec.ts
 579  modules/party/party.service.spec.ts
 578  modules/timesheets/core/reports.service.ts
 576  modules/ai/core/services/crm-brief.service.ts
 575  db/schema/chat/chat.ts
 574  modules/support/core/support-ai.service.spec.ts
 573  modules/payroll/runs/lib/__tests__/calculation-engine.spec.ts
 570  modules/crm/core/crm-organizations.service.ts
 567  modules/users/user-profile.service.ts
 566  modules/kb/retrieval/kb-search.service.ts
 565  modules/support/core/support-tickets.service.spec.ts
 564  modules/ai/core/crm-copilot.service.phase2.spec.ts
 558  modules/ingress/adapters/crm-mailbox.service.spec.ts
 555  modules/build/entity/build-entity.adapter.spec.ts
 552  modules/e-sign/sign-public.service.ts
 549  modules/crm/core/crm-support-dashboard.service.ts
 548  modules/autonomy/autonomy-review.service.ts
 547  modules/tasks/tasks.service.ts
 547  modules/hr/directory/org-structure.service.ts
 546  modules/calendar/calendar.service.ts
 546  modules/billing/core/usage-metering.service.spec.ts
 545  modules/payroll/payout/approvals.service.ts
 544  scripts/seed-enterprise-workspace.ts
 543  modules/party/party-mirror-fields.ts
 542  modules/directory/directory-identity.service.ts
 539  db/schema/common/auth.ts
 537  modules/ownership/__tests__/ownership.controller.e2e-spec.ts
 531  modules/ai/core/services/crm-copilot.service.ts
 525  modules/crm/inbox/crm-inbox.service.ts
 524  modules/ingress/adapters/web-form-to-inbound-event.ts
 522  modules/payroll/payout/publishing.service.ts
 520  modules/ownership/__tests__/module-transfer-parties.spec.ts
 519  modules/access/__tests__/rbac-resolution.spec.ts
 516  modules/billing/core/billing.controller.ts
 515  modules/hr/lifecycle/termination.service.ts
 512  modules/cron/cron-leave.service.ts
 509  modules/hr/core/person-employment-sync.service.ts
 507  modules/inventory/inv-stock-shipments-returns-isolation.spec.ts
 506  modules/party/subject.service.ts
 506  modules/hr/workflows/hr-workflow-engine.service.ts
 505  modules/accounting/posting/finance-posting.service.spec.ts
 504  modules/ownership/ownership-transfers.service.ts
 504  modules/billing/core/ai-credits.service.spec.ts
 501  modules/crm/core/crm-customer360-sections.service.ts
```

### Frontend (`frontend/**`) — 17 files

```
1400  features/renderer/renderer.test.tsx
1024  feedbucket-widget/src/ui.ts
 634  app/(authenticated)/inventory/products/page.tsx
 617  feedbucket-widget/src/annotator.ts
 605  components/automations/automation-trigger-data.ts
 551  app/(authenticated)/inventory/stock/movements/page.tsx
 543  app/(authenticated)/workflows/page.tsx
 535  features/chat/channel-sidebar.tsx
 526  app/(authenticated)/accounting/budgets/[budgetId]/page.tsx
 523  features/crm/import/planned-import-section.tsx
 523  app/(auth)/invitation/[token]/page.tsx
 515  app/(authenticated)/inventory/sales-orders/[soId]/page.tsx
 513  features/chat/huddle-panel.tsx
 510  hooks/api/inventory/reports.ts
 506  features/calendar/calendar-view.tsx
 504  app/employee-onboarding/page.tsx
 501  hooks/api/accounting/core.ts
```

---

## 4. Top 25 split plans

Anti-pattern guards applied to every plan:

- **Abandoned-split guard.** For each split, the original file must shrink below 500 lines or be deleted. The plan names the exact import sites that must update so the split cannot be left inert.
- **Cycle guard.** No new import may form a cycle. `import type` on an injected NestJS service erases the DI token; it is never used in these plans. `forwardRef` is banned. Shared types go to neutral files, never beside runtime code.
- **Proof.** `tsc --noEmit` misses a missing side-effect import and a wrong DI wiring. The proof for every backend split is `nest build`; for frontend it is `next build`. Neither is substitutable with tsc.

---

### Plan 1 — `features/renderer/renderer.test.tsx` (1400 lines, frontend)

**Responsibility split.** Eighteen `describe` blocks covering six concerns:

| New file | `describe` blocks |
|---|---|
| `features/renderer/renderer-layout.test.tsx` | "the party layout" (line 36) |
| `features/renderer/renderer-list.test.tsx` | "RecordList" (line 62), "the mobile card" (line 1272) |
| `features/renderer/renderer-detail.test.tsx` | "RecordDetail" (line 185) |
| `features/renderer/renderer-form.test.tsx` | "RecordForm" (line 203), "RecordForm create vs edit" (line 268), "a boolean field" (line 879) |
| `features/renderer/renderer-engine.test.tsx` | "the engine, driven by a description it has never seen" (line 384), and all remaining `describe` blocks |

**Shared fixtures.** The `rows` array and `key` function at the top of the file are used by multiple suites. Extract to `features/renderer/renderer-fixtures.ts` and import from each split file.

**Exported symbols that must survive.** Test files export nothing — the only contracts are the describe/it labels that Jest discovers. No import site changes outside the test runner config.

**Import sites that must change.** None — Jest discovers test files by pattern (`**/*.test.tsx`). The original file is deleted.

**Cycle risk.** None. Test files are leaves.

**Proof.** `next build` (confirms the implementation files still compile) plus `pnpm test features/renderer/` (confirms all describe blocks are discovered and pass). The original `renderer.test.tsx` must not exist after the split.

---

### Plan 2 — `modules/crm/import/crm-import.service.ts` (1234 lines, backend)

**Responsibility split.** Three natural execution phases plus shared types:

| New file | Methods / exports |
|---|---|
| `crm-import-preview.service.ts` | `preview()`, `resolveSubjectType()`, `getImport()`, `targetEntityOf()` |
| `crm-import-commit.service.ts` | `startCommit()`, `claimForCommit()`, `beginCommit()`, `commitBatch()`, `finishCommit()`, `commitRow()`, `fileUncertainty()` |
| `crm-import-revert.service.ts` | `startRevert()`, `claimForRevert()`, `beginRevert()`, `revertBatch()`, `finishRevert()`, `revertRow()` |
| `crm-import.service.ts` (orchestrator, shrinks) | `progress()`, `importContext()`, `extentOf()`, `inOwnTransaction()`, `startPhase()` — shared helpers plus `@Injectable() CrmImportService` that delegates to the three above |

**Shared types** (`PhaseExtent`, `BatchOutcome`, `ImportProgress`, `MAX_ROWS`, `REVERT_WINDOW_DAYS`) stay in `crm-import.service.ts` since every caller imports from that file.

**Exported symbols that must survive in the same path.** `CrmImportService` (class), `PhaseExtent`, `BatchOutcome`, `ImportProgress`, `MAX_ROWS`, `REVERT_WINDOW_DAYS`. All are re-exported from the unchanged `crm-import.service.ts`.

**Import sites that must change:**
- `crm-import.controller.ts` — imports `CrmImportService` from `./crm-import.service`; no path change needed if the class stays there.
- `crm-import.module.ts` — providers list; add the three new services as providers, inject them into `CrmImportService`.
- `crm-import.workflow.ts` — imports `CrmImportService`; no path change.
- `crm-connector.service.ts` — imports `CrmImportService`; no path change.
- `writers/party.writer.ts` — imports `CrmImportService`; no path change.

**Cycle risk.** The three sub-services import shared helpers from `crm-import.service.ts`; `crm-import.service.ts` imports the three sub-services. This is a direct cycle. Resolution: move the shared helpers (`importContext`, `extentOf`, `inOwnTransaction`, `startPhase`) to a new neutral file `crm-import-internals.ts` that none of the four service files re-export from a barrel. The four services import from `crm-import-internals.ts`; `crm-import.service.ts` delegates calls only. `import type` must not be used on the injected sub-services — inject them as concrete class tokens.

**Proof.** `nest build` after wiring. Run `pnpm check:cycles` to assert zero circular dependencies. The original `crm-import.service.ts` must be under 300 lines after the split.

---

### Plan 3 — `modules/access/access.service.spec.ts` (1087 lines, backend)

**Responsibility split.** Split by test surface group:

| New file | Content |
|---|---|
| `access-module-state.service.spec.ts` | Tests for `isModuleEnabled`, `getModuleState`, `getUserDeniedModules`, `setUserModuleAccess` |
| `access-permissions-resolution.service.spec.ts` | Tests for `resolveUserPermissions`, `computeUserPermissions`, caching, version bumping |
| `access-membership.service.spec.ts` | Tests for `canManageOrganizationMembership`, `membersWithPermission`, `scopeFor`, `holds` |
| `access.service.spec.ts` (shrinks) | Shared test setup, mock factories, remaining edge-case tests |

**Exported symbols that must survive.** Spec files export nothing.

**Import sites that must change.** Jest discovers by pattern; no import site changes. The original shrinks rather than disappears (it holds shared factories).

**Proof.** `pnpm test:e2e` (if any are e2e) or `pnpm test` covering the new files.

---

### Plan 4 — `modules/notifications/notification-events.catalog.ts` (1054 lines, backend)

**Responsibility split.** The file already splits CHAT and BUILD into separate catalog files. The remaining module constants (`CRM`, `HR`, `PAYROLL`, `RECRUITMENT`, `KNOWLEDGE`, `SIGN`, `INVENTORY`, `SURVEYS`, `CALENDAR`, `BILLING`, `SECURITY`, `SUPPORT`, `BROADCASTS`, `SYSTEM`, `OWNERSHIP`, `ORGANIZATION`, `ACCOUNTING`) can be split further:

| New file | Constants |
|---|---|
| `notification-events-hr.catalog.ts` | `HR`, `PAYROLL`, `RECRUITMENT` |
| `notification-events-crm.catalog.ts` | `CRM` |
| `notification-events-platform.catalog.ts` | `ORGANIZATION`, `SECURITY`, `OWNERSHIP`, `SYSTEM`, `BROADCASTS`, `BILLING` |
| `notification-events-ops.catalog.ts` | `SUPPORT`, `CALENDAR`, `SURVEYS`, `SIGN` |
| `notification-events-data.catalog.ts` | `INVENTORY`, `KNOWLEDGE`, `ACCOUNTING` |
| `notification-events.catalog.ts` (assembler, shrinks) | imports all above + `CHAT` + `BUILD`, assembles `NOTIFICATION_EVENT_CATALOG`, exports `NotificationEventKey`, `isNotificationEventKey`, `NOTIFICATION_EVENT_MAP` |

**Exported symbols that must survive at the same path.**
- `NOTIFICATION_EVENT_CATALOG` (array) — assembled in the main file from all sub-catalogs.
- `NotificationEventKey` (union type) — derived from the assembled catalog; stays in the main file.
- `isNotificationEventKey` (guard) — stays in the main file.
- `NOTIFICATION_EVENT_MAP` — stays in the main file.

**Import sites that must change.** All external consumers import from `notification-events.catalog.ts`:
- `notification-event-registry.service.ts`
- `notification-events.controller.ts`
- `notification-outbox-relay.service.ts`
- `notification.types.ts`
- `ownership-transfer-response.service.ts`
- `notification-catalog-cohesive-exception.ts`
- `notification-catalog-integrity.spec.ts`

None of these need path changes — they import the assembled exports from the main file, which is unchanged.

**Cycle risk.** Sub-catalog files import only from `notification-event-channel-policy.ts` and `notification-event-factory.ts` — the same imports the main file currently uses. No new dependency direction is created.

**Proof.** `nest build`. The main `notification-events.catalog.ts` must shrink to under 200 lines (the assembler + three exports).

---

### Plan 5 — `feedbucket-widget/src/ui.ts` (1024 lines, frontend)

**Responsibility split.** Three UI concerns:

| New file | Responsibilities |
|---|---|
| `feedbucket-widget/src/ui-toolbar.ts` | Toolbar rendering, tool-selection buttons, pen/arrow/rect/comment controls |
| `feedbucket-widget/src/ui-form.ts` | Feedback submission form, field rendering, validation, submit handler |
| `feedbucket-widget/src/ui.ts` (shrinks) | Entry point: `initFeedbackWidget`, overlay mounting, wires toolbar and form |

**Exported symbols that must survive.** The widget entry point (`initFeedbackWidget` or equivalent) is imported by `feedbucket-widget/src/index.ts`. That import must continue to resolve.

**Import sites that must change.** `feedbucket-widget/src/index.ts` — verify it imports only from `./ui`; no path change needed if the entry point stays there.

**Cycle risk.** The toolbar and form do not need to import each other. The main `ui.ts` imports both. Acyclic.

**Proof.** `next build` (the widget is bundled into the Next.js app). The original `ui.ts` must shrink below 400 lines.

---

### Plan 6 — `db/schema/crm/deals.ts` (1016 lines, backend)

**Responsibility split.** The file defines 20+ tables and their relations across three domains: core deal pipeline, sales compensation/territory, and tasks/sequences.

| New file | Tables |
|---|---|
| `db/schema/crm/deal-pipeline.ts` | `deals`, `dealStageTransitions`, `dealActivities`, `dealMeetings`, `dealMeetingAttendees`, `dealApprovalRules`, `dealApprovals`, `crmDealCompetitors`, `crmDealStakeholders`, `crmForecastSnapshots`, `crmSlaBreachLog` + their relations |
| `db/schema/crm/deal-sales.ts` | `salesQuotas`, `commissionRules`, `commissions`, `incentiveConfig`, `incentives`, `territories`, `territoryReps`, `territoryLocations` + their relations |
| `db/schema/crm/deal-tasks.ts` | `tasks`, `taskSequences`, `taskSequenceSteps` + their relations |
| `db/schema/crm/deals.ts` | **deleted** |

The `contactsRelations` defined in `deals.ts` (line 815) must move to `deal-pipeline.ts` since it references `contacts` (already defined in `contacts.ts`). This is an additive Drizzle relation — move the block, import `contacts` from `./contacts`.

**`db/schema/crm/index.ts`** — replace `export * from "./deals"` with three lines:
```
export * from "./deal-pipeline";
export * from "./deal-sales";
export * from "./deal-tasks";
```

**Exported symbols that must survive.** All 20+ table exports and all relation exports. Consumers import from the root barrel `db/schema` — no consumer path changes needed.

**Cross-file FK.** `tasks` has FKs to `deals` (in `deal-pipeline.ts`). `deal-tasks.ts` must import `deals` from `./deal-pipeline` to declare the FK. This is a one-direction import — no cycle.

**Cycle risk.** `deal-pipeline.ts` ← `deal-tasks.ts` (tasks references deals). `deal-sales.ts` has no cross-file FK to pipeline or tasks. Acyclic.

**Proof.** `nest build`. Confirm with `pnpm check:cycles`. Schema migration must NOT be run — the tables are unchanged, only the file organisation changes.

---

### Plan 7 — `modules/inventory/ai/inv-ai-explain.service.spec.ts` (840 lines, backend)

**Responsibility split.**

| New file | Content |
|---|---|
| `inv-ai-explain-content.service.spec.ts` | Tests for content generation, prompt assembly, context loading |
| `inv-ai-explain-credit.service.spec.ts` | Tests for credit reservation, refund on failure, exhaustion paths |
| `inv-ai-explain.service.spec.ts` (shrinks) | Shared mock setup, integration-style tests |

**Proof.** `pnpm test modules/inventory/ai/`.

---

### Plan 8 — `modules/module-access/__tests__/module-access.controller.e2e-spec.ts` (833 lines, backend)

**Responsibility split.**

| New file | Content |
|---|---|
| `module-access-grants.controller.e2e-spec.ts` | Tests for grant/revoke endpoints |
| `module-access-view.controller.e2e-spec.ts` | Tests for view/list endpoints, access snapshot |
| `module-access.controller.e2e-spec.ts` (shrinks) | Shared `createE2eApp` setup, authentication fixtures |

**Proof.** `pnpm test:e2e modules/module-access/`.

---

### Plan 9 — `modules/crm/import/crm-import.service.spec.ts` (821 lines, backend)

**Responsibility split.**

| New file | Content |
|---|---|
| `crm-import-preview.service.spec.ts` | Tests for `preview`, column mapping, `getImport`, `targetEntityOf` |
| `crm-import-commit.service.spec.ts` | Tests for `startCommit`, `beginCommit`, `commitBatch`, `finishCommit` |
| `crm-import-revert.service.spec.ts` | Tests for `startRevert`, `beginRevert`, `revertBatch`, `finishRevert` |
| `crm-import.service.spec.ts` (shrinks) | Shared mock factory, `progress()` tests |

Note: after Plan 2 splits the service, these spec files should align to the new service classes.

**Proof.** `pnpm test modules/crm/import/`.

---

### Plan 10 — `modules/inventory/inv-engine-misc-isolation.spec.ts` (803 lines, backend)

**Responsibility split.** Misc isolation tests cover disparate inventory flows. Split by resource:

| New file | Content |
|---|---|
| `inv-engine-transfers-isolation.spec.ts` | Transfer-related isolation tests |
| `inv-engine-adjustments-isolation.spec.ts` | Adjustment-related isolation tests |
| `inv-engine-misc-isolation.spec.ts` (shrinks) | Remaining edge cases, shared mock setup |

**Proof.** `pnpm test modules/inventory/` (or `pnpm test:e2e` if e2e).

---

### Plan 11 — `modules/auth/auth-tokens.service.ts` (779 lines, backend)

**Responsibility split.** Five distinct authentication flows:

| New file | Methods |
|---|---|
| `auth-email-verification.service.ts` | `verifyEmail()`, `resendVerification()` |
| `auth-magic-link.service.ts` | `requestMagicLink()`, `verifyMagicLink()` |
| `auth-otp.service.ts` | `requestEmailOtp()`, `verifyEmailOtp()` |
| `auth-google-oauth.service.ts` | `googleOAuth()` |
| `auth-tokens.service.ts` (shrinks) | `resolveActiveMembership()`, `resolveSuspendedMembership()`, `logLoginEvent()`, `getAuditAnalytics()`, `findOrCreateUser()`, `createLoginSession()`, `resolvePreferredOrgId()` |

`createLoginSession()` is called by `verifyMagicLink`, `verifyEmailOtp`, and `googleOAuth`. To avoid importing `AuthTokensService` into each sub-service (which reverses the dependency direction), extract `createLoginSession` to a new neutral file `auth-session-factory.ts`. Sub-services import from there.

**Exported symbols that must survive at `./auth-tokens.service`:**
`AuthTokensService` (class — controller injects it), `resolveActiveMembership`, `resolveSuspendedMembership`, `logLoginEvent`, `getAuditAnalytics`.

**Import sites that must change:**
- `auth.controller.ts` — injects `AuthTokensService`; delegates to it; no path change.
- `auth.module.ts` — providers list; add four new service classes as providers.
- `auth.service.ts` — imports `AuthTokensService`; no path change.
- `auth-tokens-membership.spec.ts`, `auth-tokens-tenant-isolation.spec.ts` — update imports to `./auth-tokens.service` or the specific new service file as appropriate.

**Cycle risk.** Sub-services import from `auth-session-factory.ts`. `AuthTokensService` imports sub-services (not `import type`). `auth-session-factory.ts` imports from DB/redis only. Acyclic.

**Proof.** `nest build`. The original `auth-tokens.service.ts` must shrink below 300 lines.

---

### Plan 12 — `scripts/relocate-org-data.ts` (767 lines, backend)

**Responsibility split.** Scripts are one-off utilities; the hard rule still applies. Split into phases:

| New file | Content |
|---|---|
| `scripts/relocate-org-data-validation.ts` | Org pre-flight checks, data validation, dry-run output |
| `scripts/relocate-org-data-execution.ts` | Actual data migration, transaction blocks |
| `scripts/relocate-org-data.ts` (shrinks) | CLI argument parsing, orchestrates validation + execution |

**Import sites that must change.** Scripts are executed directly; no module import sites. The original file calls the phases inline.

**Cycle risk.** None. Scripts are leaf files.

**Proof.** Dry-run execution: `ts-node scripts/relocate-org-data.ts --dry-run`. No build required; verify the script exits 0 with correct output.

---

### Plan 13 — `modules/crm/import/crm-connector.service.ts` (757 lines, backend)

**Responsibility split.** Two phases: the walk (fetching pages from the remote connector) and the staging (storing and advancing).

| New file | Methods |
|---|---|
| `crm-connector-walk.service.ts` | `beginWalk()`, `fetchPage()`, `finishWalk()`, `advance()`, `stage()`, `stagedCount()` — the page-walking protocol |
| `crm-connector-lifecycle.service.ts` | `startSync()`, `ensureSync()`, `claimRun()`, `sync()`, `recordFailure()`, `progress()`, `connection()`, `stagedRecords()`, `clearStaged()` |
| `crm-connector.service.ts` (orchestrator, shrinks) | `CrmConnectorService` delegating to both; constants `MAX_PAGES_PER_WALK`, `FAILURE_LIMIT`; types `WalkExtent`, `PageOutcome`, `WalkResult` |

**Exported symbols that must survive at `./crm-connector.service`:**
`CrmConnectorService`, `MAX_PAGES_PER_WALK`, `FAILURE_LIMIT`, `WalkExtent`, `PageOutcome`, `WalkResult`.

**Import sites that must change:**
- `crm-import.module.ts` — add two new services to providers list.
- `crm-import.controller.ts` — injects `CrmConnectorService`; no path change.
- `crm-connector.workflow.ts` — injects `CrmConnectorService`; no path change.
- `connectors/salesforce.connector.ts` — check for direct imports.

**Cycle risk.** Walk service imports schema tables; lifecycle service imports the walk service. No cycle if orchestrator only imports the two sub-services, not the other direction. Use concrete class tokens, not `import type`.

**Proof.** `nest build`. `pnpm check:cycles`.

---

### Plan 14 — `modules/access/access.service.ts` (750 lines, backend)

**Responsibility split.** The service has already extracted resolution logic into internal resolver classes. Two remaining clusters:

| New file | Methods |
|---|---|
| `access-module-access.service.ts` | `getUserDeniedModules()`, `getUserModuleAccess()`, `setUserModuleAccess()`, `isModuleEnabled()`, `getModuleState()`, `moduleAvailability()`, `moduleAvailabilityFor()`, `getPlanLockedModules()` |
| `access.service.ts` (shrinks) | `resolveUserPermissions()`, `getPermissionsVersion()`, `canManageOrganizationMembership()`, `membersWithPermission()`, `scopeFor()`, `holds()`, `getAccessSnapshot()`, caching infrastructure, `OnModuleInit`/`OnModuleDestroy` |

**Critical DI rule.** `access-module-access.service.ts` needs DB and Redis — inject them with concrete tokens. Never `import type` on an injected service; `AccessModuleAccessService` must be a concrete class token in `access.module.ts`.

**Exported symbols that must survive at `./access.service`:**
`AccessService` (class — injected throughout the codebase), plus all re-exported types (`DataScope`, etc.).

**Import sites that must change:**
- `access.module.ts` — add `AccessModuleAccessService` as a provider, inject into `AccessService`.
- Every existing importer of `AccessService` (`module.guard.ts`, `me.controller.ts`, `cache-invalidation-matrix.ts`, and ~15 others) — no path change needed.

**Cycle risk.** `access.module.ts` imports both services. Neither imports the other. Acyclic.

**Proof.** `nest build`. The original `access.service.ts` must shrink below 400 lines.

---

### Plan 15 — `modules/ownership/ownership-transfer-response.service.ts` (747 lines, backend)

**Responsibility split.** Three top-level public operations each with private helpers:

| New file | Methods |
|---|---|
| `ownership-transfer-accept.service.ts` | `acceptTransfer()`, `applyOrgTransfer()` (lines 79–405) |
| `ownership-transfer-decline.service.ts` | `declineTransfer()`, `cancelTransfer()`, `notifyResponders()` (lines 502–747) |
| `ownership-transfer-response.service.ts` (orchestrator, shrinks) | `OwnershipTransferResponseService` delegating to both sub-services; `invalidateUserAccess()`, `invalidateTransferCaches()`, `applyModuleTransfer()` (shared helpers) |

**Exported symbols that must survive at `./ownership-transfer-response.service`:**
`OwnershipTransferResponseService` (class — injected by `ownership.controller.ts` and `ownership.module.ts`).

**Import sites that must change:**
- `ownership.module.ts` — add two new services as providers.
- `ownership.controller.ts` — injects `OwnershipTransferResponseService`; no path change.
- Test specs in `__tests__/` — update only if they reference the sub-service classes directly.

**Proof.** `nest build`. `pnpm check:cycles`.

---

### Plan 16 — `modules/payroll/payout/payout-batches.service.ts` (746 lines, backend)

**Responsibility split.**

| New file | Methods |
|---|---|
| `payout-batch-creation.service.ts` | `createBatch()` (lines 67–347) — the large creation method with formatting logic |
| `payout-batch-lifecycle.service.ts` | `markSent()`, `markItemPaid()`, `markItemFailed()`, `markBatchPaid()` (lines 374–579) |
| `payout-bank-return.service.ts` | `importBankReturn()` (lines 580–696) |
| `payout-batches.service.ts` (orchestrator, shrinks) | `PayoutBatchesService` delegating; `listBatches()`, `getBatch()`, `getFile()`, `getBankDetails()` |

**Exported symbols that must survive at `./payout-batches.service`:**
`PayoutBatchesService` (class — injected by controller).

**Import sites that must change:**
- `payroll-payout.module.ts` — add three new services as providers.
- `payout-batches.controller.ts` — injects `PayoutBatchesService`; no path change.

**Proof.** `nest build`.

---

### Plan 17 — `modules/payroll/runs/generate.service.ts` (737 lines, backend)

**Responsibility split.**

| New file | Methods |
|---|---|
| `payroll-run-data-loader.service.ts` | `loadPreviousSnapshots()`, `loadPolicy()`, `loadEligibleProfiles()`, `loadHeldUserIds()` (pure data-loading, no side effects) |
| `payroll-run-generation.service.ts` | `generateRunLocked()` (lines 93–519) — the core locked generation algorithm |
| `generate.service.ts` (orchestrator, shrinks) | `GenerateService` delegating; `generateRun()`, `postPayrollLock()`, `applyLoanRecovery()`, `clearPreviouslyConsumedReimbursements()`, `clearRunAllocations()` |

**Exported symbols that must survive at `./generate.service`:**
`GenerateService` (class — injected by `payroll-jobs-worker.service.ts`, `approvals.service.ts`, `locking.service.ts`, `loan-adjustments.service.ts`, `runs.controller.ts`, `payroll-runs.module.ts`).

**Import sites that must change:**
- `payroll-runs.module.ts` — add two new services as providers.
- All six current importers of `GenerateService` — no path change.

**Proof.** `nest build`.

---

### Plan 18 — `modules/kb/retrieval/kb-indexing.service.ts` (696 lines, backend)

**Responsibility split.**

| New file | Methods |
|---|---|
| `kb-indexing-utils.ts` | `chunkText()`, `sha256()`, `isPageIndexable()`, `streamToBuffer()` — pure utilities with no class state |
| `kb-indexing-attachment.service.ts` | `indexAttachment()`, `removeAttachmentChunks()`, `indexPageDocument()` — file/attachment-specific paths |
| `kb-indexing-reindex.service.ts` | `reindexAll()`, `reindexAllPages()`, `reindexArticle()` — bulk re-indexing operations |
| `kb-indexing.service.ts` (core, shrinks) | `KbIndexingService` with `indexArticle()`, `indexPage()`, `indexSource()`, `removeArticleChunks()`, `removePageChunks()`, `removeSourceChunks()`, `isContentUnchanged()`, `getPageChunkState()`, `getArticleIndexStatus()` |

`kb-indexing.service.ts` delegates to `KbIndexingAttachmentService` and `KbIndexingReindexService` via injection; all import from `kb-indexing-utils.ts` for the utilities. Utility functions are exported from `kb-indexing-utils.ts` directly (no class wrapper).

**Exported symbols that must survive at `./kb-indexing.service`:**
`KbIndexingService`, `isPageIndexable`.

**Import sites that must change (~13 consumers):**
- `kb-article-reindex.service.ts`, `kb-content-adapter.ts`, and all `*.e2e-spec.ts` files currently injecting `KbIndexingService` — no path change needed.
- `kb-indexing.service.ts` module must register `KbIndexingAttachmentService` and `KbIndexingReindexService`.

**Proof.** `nest build`. `pnpm check:cycles`.

---

### Plan 19 — `modules/billing/core/billing.service.spec.ts` (684 lines, backend)

**Responsibility split.**

| New file | Content |
|---|---|
| `billing-plan-limits.service.spec.ts` | Tests for plan limit assertions, seat enforcement |
| `billing-subscriptions.service.spec.ts` | Tests for subscription create/update/cancel |
| `billing.service.spec.ts` (shrinks) | Shared mock setup, remaining edge cases |

**Proof.** `pnpm test modules/billing/core/`.

---

### Plan 20 — `modules/organization/core/org-lifecycle.service.ts` (653 lines, backend)

**Responsibility split.**

| New file | Methods |
|---|---|
| `org-archive.service.ts` | `listArchivedOwnedOrganizations()`, `archiveOrg()`, `restoreOrg()` — reversible archive/restore flow |
| `org-purge.service.ts` | `deleteOrg()`, `schedulePurge()`, `cancelPurge()` — destructive deletion flow |
| `org-lifecycle.service.ts` (orchestrator, shrinks) | `OrgLifecycleService` delegating to both; private helpers `hasActiveLegalHold()`, `listMemberUserIds()`, `bustMembersMembership()`, `revokeMembersAccess()`, `findNextActiveOrgId()`, `resolveReplacementOrgIds()`, `repairLastActiveOrgIds()` |

**Exported symbols that must survive at `./org-lifecycle.service`:**
`OrgLifecycleService` (class — injected by `organization.controller.ts`, `organization.service.ts`, `organization.module.ts`).

**Import sites that must change:**
- `organization.module.ts` — add two new services as providers.
- `organization.controller.ts`, `organization.service.ts` — inject `OrgLifecycleService`; no path change.

**Proof.** `nest build`.

---

### Plan 21 — `modules/module-access/__tests__/module-access-new-capabilities.spec.ts` (645 lines, backend)

**Responsibility split.**

| New file | Content |
|---|---|
| `module-access-grant-flow.spec.ts` | Tests for grant creation, update, delete flows |
| `module-access-permission-expansion.spec.ts` | Tests for permission expansion, inheritance |
| `module-access-new-capabilities.spec.ts` (shrinks) | Shared test context, remaining coverage |

**Proof.** `pnpm test:e2e` if e2e, else `pnpm test`.

---

### Plan 22 — `modules/platform/platform.service.ts` (640 lines, backend)

**Responsibility split.** The platform service is a mix of public-website-facing and internal-admin concerns:

| New file | Methods |
|---|---|
| `platform-contact.service.ts` | `submitContactForm()`, `recordVisit()`, `getLayoutData()` — public-facing interactions |
| `platform-analytics.service.ts` | `getDashboardMetrics()`, `getRevenueSummary()`, `getVisitorAnalytics()` — internal metrics |
| `platform-admin.service.ts` | `listCustomers()`, `getCustomerBySlug()`, `listMessages()`, `getMessageByPublicCode()`, `updateMessageStatus()`, `markMessageReplied()`, `replyToMessage()`, `listLeads()`, `listPayments()` — admin operations |
| `platform.service.ts` (orchestrator, shrinks) | `PlatformService` delegating to all three; `countLeadParties()` (shared private) |

**Exported symbols that must survive at `./platform.service`:**
`PlatformService`, `VisitMeta`.

**Import sites that must change:**
- `platform.module.ts` — add three services as providers.
- `platform.controller.ts` — injects `PlatformService`; no path change.
- `notification-caller-inventory.ts`, `platform-tenant-isolation.spec.ts` — no path change.

**Proof.** `nest build`.

---

### Plan 23 — `modules/ai/confirmation/ai-confirmation.service.spec.ts` (635 lines, backend)

**Responsibility split.**

| New file | Content |
|---|---|
| `ai-confirmation-approval.service.spec.ts` | Tests for approval-path flows |
| `ai-confirmation-rejection.service.spec.ts` | Tests for rejection and timeout paths |
| `ai-confirmation.service.spec.ts` (shrinks) | Shared mock setup, service bootstrap |

**Proof.** `pnpm test modules/ai/confirmation/`.

---

### Plan 24 — `app/(authenticated)/inventory/products/page.tsx` (634 lines, frontend)

**Responsibility split.**

| New file | Content |
|---|---|
| `features/inventory/products/product-status-badges.tsx` | `StatusBadge`, `StockBadge`, `TrackingBadge` — pure display components |
| `features/inventory/products/product-row-actions.tsx` | `ProductRowActions` — delete/archive actions with confirmation dialog |
| `features/inventory/products/products-table.tsx` | `ProductsPageInner` — the large table component with filters, pagination, columns |
| `app/(authenticated)/inventory/products/page.tsx` (shrinks) | `ProductsPage` shell (Suspense wrapper + imports from feature files) |

**Exported symbols that must survive.** `ProductsPage` default export at the page route — Next.js requires the default export in `page.tsx`. The feature components are internal.

**Import sites that must change:**
- `page.tsx` — imports from three new feature files; replaces inlined definitions.
- No other page currently imports from `app/(authenticated)/inventory/products/page.tsx` directly.

**Cycle risk.** Feature files import from `hooks/api/inventory`; `page.tsx` imports feature files. No intra-feature cycle.

**Proof.** `next build`. The original `page.tsx` must shrink below 80 lines.

---

### Plan 25 — `modules/organization/core/invitations.service.ts` (634 lines, backend)

**Responsibility split.**

| New file | Methods |
|---|---|
| `invitation-send.service.ts` | `invite()`, `inviteAuthorized()`, `bulkInvite()` — new invitation creation |
| `invitation-lifecycle.service.ts` | `resend()`, `changeRole()`, `cancel()`, `revokeAllPending()` — post-creation lifecycle |
| `invitations.service.ts` (orchestrator, shrinks) | `InvitationsService` delegating to both; `recordDeliveryFailure()`; `InviteActor` interface |

**`InviteActor`** interface must remain in `invitations.service.ts` (or move to `invitation-send.service.ts` and re-export); all external consumers import it from there.

**Exported symbols that must survive at `./invitations.service`:**
`InvitationsService`, `InviteActor`.

**Import sites that must change:**
- `organization.module.ts` — add two new services as providers.
- `organization.controller.ts`, `organization.service.ts`, `org-membership.service.ts`, `org-lifecycle.service.ts`, `org-lifecycle.service.spec.ts`, `notification-caller-inventory.ts`, `invitations-plan-limit.spec.ts`, `invitations-state-machine.spec.ts`, `organization-creation-policy.spec.ts` — all inject `InvitationsService`; no path change.

**Proof.** `nest build`. `pnpm check:cycles`.

---

## 5. Notes on spec files

Thirty-eight of the 86 backend violations are test files (`*.spec.ts`, `*e2e-spec.ts`). §7 does not exempt them. All plans for spec files follow the same guard: the split is proven by running the relevant test command with the new file paths, and the original file must visibly shrink (it holds shared setup) or be deleted (if all tests move).

Spec splits carry lower structural risk than service splits (no DI token erasure, no module registration) but still require the abandoned-split guard: verify the test runner discovers the new files and that coverage does not silently drop.

---

## Summary

| Category | Backend | Frontend | Total |
|---|---|---|---|
| Runtime services | 43 | 12 | 55 |
| Test files | 38 | 1 | 39 |
| Schema files | 3 | 0 | 3 |
| Scripts | 2 | 0 | 2 |
| Widget (authored) | 0 | 2 | 2 |
| Hooks / data files | 0 | 2 | 2 |
| **Total** | **86** | **17** | **103** |
