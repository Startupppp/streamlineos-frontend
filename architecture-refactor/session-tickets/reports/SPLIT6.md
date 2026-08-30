# SPLIT6 — Oversize File Splits

All splits confirmed: original files shrank, moved code is GONE from originals (not copied). `pnpm run check:cycles` passes at zero circular imports.

---

## Splits completed

### 1. CRM Import service — abandoned-split repair

`backend/src/modules/crm/import/crm-import.service.ts`
- Before: 1,234 lines (all code duplicated between original and 3 split services that already existed and were registered — the abandoned-split failure mode)
- After: 163 lines — thin facade; delegates every method to `CrmImportPreviewService`, `CrmImportCommitService`, or `CrmImportRevertService`; keeps only `progress()` method; re-exports `BatchOutcome`, `PhaseExtent`, `ImportProgress`, `REVERT_WINDOW_DAYS`, `MAX_ROWS` for callers

Pre-existing sub-services (unchanged, already registered in `crm-import.module.ts`):
- `crm-import-preview.service.ts` — 220 lines
- `crm-import-commit.service.ts` — 292 lines
- `crm-import-revert.service.ts` — 232 lines
- `crm-import-internals.ts` — 201 lines

`backend/src/modules/crm/import/crm-connector-walk.service.ts` — updated `MAX_ROWS` import to come from `crm-import-preview.service` directly (the re-export chain still works; this fixes the direct path to the canonical source).

### 2. CRM deals schema — split into 4 domain sub-files

`backend/src/db/schema/crm/deals.ts`
- Before: 1,016 lines
- After: 459 lines — retains core deal tables: `deals`, `dealActivities`, `dealMeetings`, `dealMeetingAttendees`, `dealApprovalRules`, `dealApprovals`, `crmDealCompetitors`, `crmDealStakeholders`, `crmForecastSnapshots` + `ForecastSnapshotData` interface + all their relations + `contactsRelations` (left here to avoid deals → contacts circular import)

`backend/src/db/schema/crm/deals-transitions.ts` (NEW, 36 lines)
- `dealStageTransitions` table

`backend/src/db/schema/crm/deals-tasks.ts` (NEW, 137 lines)
- `tasks`, `taskSequences`, `taskSequenceSteps` tables + relations

`backend/src/db/schema/crm/deals-sales.ts` (NEW, 202 lines)
- `salesQuotas`, `commissionRules`, `commissions`, `incentiveConfig`, `incentives` tables + `incentivesRelations`

`backend/src/db/schema/crm/deals-territories.ts` (NEW, 179 lines)
- `territories`, `territoryReps`, `territoryLocations`, `crmSlaBreachLog` tables + relations + `TerritoryCriteria` interface

`backend/src/db/schema/crm/index.ts` — updated barrel to export all 4 new sub-files.

`backend/src/modules/crm/core/territory-match.service.ts` — updated `TerritoryCriteria` import from `deals.ts` to `deals-territories.ts` (direct path; the barrel also works for indirect consumers).

### 3. Support schemas — barrel split

`backend/src/modules/support/core/dto/support.schemas.ts`
- Before: 600 lines (monolithic flat Zod schema file)
- After: 4 lines (barrel re-exporting from 4 sub-files — all 30+ importers unchanged)

`backend/src/modules/support/core/dto/support-tickets.schemas.ts` (NEW, 420 lines)
- All ticket, custom-field, macro, routing-rule, queue, saved-view, tag, ticket-link, portal, channel, inbound, and CSAT schemas + their inferred types

`backend/src/modules/support/core/dto/support-sla.schemas.ts` (NEW, 64 lines)
- Business hours and SLA policy schemas + types; imports `ticketStatusSchema` / `ticketPrioritySchema` from `support-tickets.schemas`

`backend/src/modules/support/core/dto/support-kb.schemas.ts` (NEW, 86 lines)
- KB category, article, comment, attachment, and ask schemas + types

`backend/src/modules/support/core/dto/support-ai.schemas.ts` (NEW, 37 lines)
- AI report filters, AI settings, resolve suggestion, translate, and support report filter schemas + types

---

## Legitimate exceptions (not split)

- `notification-events.catalog.ts` (1,054) — flat `notificationEvent()` registry, same pattern as the existing exception
- `role-templates.constants.ts` (584) — flat `ROLE_TEMPLATES: readonly RoleTemplate[]` array, same pattern as `automation-trigger-data.ts` (605)

---

## Cycle check

```
pnpm run check:cycles
✔ No circular dependency found!
```

Processed 4,692 files. Zero circular imports before and after all splits.

---

## Remaining files over 500 lines (not touched this session)

Non-spec backend files (still require splitting in a future session):
- `access.service.ts` (754) — complex, internally coupled via constructor-wired resolver closures
- `relocate-org-data.ts` (767) — script
- `org-lifecycle.service.ts` (653)
- `invitations.service.ts` (634)
- `org-setup.service.ts` (608)
- `roles.service.ts` (606)
- `kb-pages.service.ts` (602)
- `kb-articles.service.ts` (585)
- `kb-search.service.ts` (582)
- `crm-brief.service.ts` (576)
- `approvals.service.ts` (560) — payroll
- `tasks.service.ts` (547)
- `org-structure.service.ts` (547)
- `calendar.service.ts` (546)
- plus ~15 more between 501–545

Spec files still over 500:
- `ai-confirmation.service.spec.ts` (826)
- `crm-import.service.spec.ts` (821)
- `billing.service.spec.ts` (686)
- `sensitive-projection-exposure.spec.ts` (663)
- `module-access-new-capabilities.spec.ts` (645)
- `ownership.service.spec.ts` (636)
- `billing-webhook.spec.ts` (625)
- `membership-revocation.spec.ts` (610)
- `organization-member-status.spec.ts` (604)
- `invoice-snapshot.service.spec.ts` (602)
- `autonomy.service.spec.ts` (597)
- `support.controller.e2e-spec.ts` (582)
- `support-ai.service.spec.ts` (574)
- `support-tickets.service.spec.ts` (565)
- `access.service.spec.ts` (565)
- `crm-copilot.service.phase2.spec.ts` (564)
- `crm-mailbox.service.spec.ts` (558)
- `module-access.controller.e2e-spec.ts` (833)
- `ownership.controller.e2e-spec.ts` (537)

Frontend non-test files over 500 lines: not addressed this session.

Lint/tests: not run (per standing rules).
