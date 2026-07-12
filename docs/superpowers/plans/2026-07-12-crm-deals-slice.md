# CRM Deals Slice — Pipelines, Blueprint Transitions, Forecast, Approvals, Deal Room

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded deal stages with pipeline-driven metadata, wire blueprint transition enforcement, upgrade approvals to multi-type approvers, add forecast snapshots and deal health, add competitors/next-step/stakeholders, and fix the page.tsx:444 TS error — all without touching parallel agents' files.

**Architecture:** Backend: DealsModule imports CrmMetadataModule; DealsService calls CrmBlueprintsService.assertTransitionAllowed on every stage move and CrmValidationService.evaluate on create/update; new tables added via migration 0250; analytics service removes STAGE_PROBABILITIES literal map and reads stage probability from metadata. Frontend: hooks/api/crm/deals.ts upgraded with optimistic patches on exact caches; deal detail page wired from useCrmStages; hardcoded STAGES arrays replaced; forecast/approvals pages use resolveStage from metadata hooks.

**Tech Stack:** NestJS + Drizzle ORM + Neon Postgres (backend); Next.js App Router + TanStack Query v5 + react-hook-form + Zod + Framer Motion (frontend); Sonner toasts; shadcn/ui.

---

## File Map

### Backend — new / changed files

| File | Change |
|------|--------|
| `backend/migrations/0250_crm_deals_process.sql` | New migration: schema additions + backfill |
| `backend/migrations/meta/_journal.json` | Append entry idx 28 |
| `backend/src/db/schema/crm/deals.ts` | Add `pipelineId`, `forecastCategory`, `nextStep`, `healthScore` to deals; de-default approverRole; add `approverType`, `approverUserId` to dealApprovalRules; new tables `crmDealCompetitors`, `crmForecastSnapshots` |
| `backend/src/db/schema/crm/index.ts` | Export new tables |
| `backend/src/modules/deals/dto/deals.schemas.ts` | `dealStageSchema` → `z.string()`, remove hardcoded enum; add schemas for competitors, nextStep, health, snapshot, approvalRule v2, updateApprovalRule |
| `backend/src/modules/deals/deals.service.ts` | Inject CrmBlueprintsService + CrmMetadataService; blueprint transition check on stage change; validation wiring; won/lost via stageType metadata; remove WON/LOST literals; automation event emission |
| `backend/src/modules/deals/deals-approvals.service.ts` | Import CrmMetadataModule; resolve approvers by approverType (role/user/manager); stage-change apply in transaction on approve |
| `backend/src/modules/deals/deals-analytics.service.ts` | Remove STAGE_PROBABILITIES literal map; fetch stage probabilities from CrmMetadataService; add `getHealth` + `getForecastCategory` helpers; new `createForecastSnapshot`, `getForecastSnapshots`, `compareForecastSnapshots` methods |
| `backend/src/modules/deals/deals-analytics.controller.ts` | Add `POST /deals/forecast/snapshot`, `GET /deals/forecast/snapshots`, `GET /deals/forecast/compare`; add `GET /deals/:dealId/health` |
| `backend/src/modules/deals/deals-competitors.service.ts` | New: CRUD for crmDealCompetitors |
| `backend/src/modules/deals/deals-competitors.controller.ts` | New: `GET/POST/PATCH/DELETE /deals/:dealId/competitors` |
| `backend/src/modules/deals/deals.module.ts` | Import CrmMetadataModule; register new providers + controllers |
| `backend/src/modules/rbac/permissions.constants.ts` | Add `crm:deals:approve`, `crm:deals:forecast` permission keys |
| `backend/src/modules/deals/deals-transition.spec.ts` | New Jest spec: transition engine (blocked/missingFields/approval-gate/won-lost/fail-open) |
| `backend/src/modules/deals/deals-forecast.spec.ts` | New Jest spec: forecast weighting + snapshot shape |

### Frontend — new / changed files

| File | Change |
|------|--------|
| `frontend/types/crm/deals.ts` | `DealStage` → `string`; add `DealCompetitor`, `ForecastSnapshot`, `ForecastSnapshotCompare`, `DealHealth`, `DealApprovalRule`, `DealApprovalRuleV2`, `DealPendingApproval` types; update `Deal` to include `pipelineId`, `forecastCategory`, `nextStep`, `healthScore` |
| `frontend/hooks/api/crm/deals.ts` | Optimistic `useUpdateDealStage` patches board + list + detail caches; add `useDealCompetitors`, `useCreateDealCompetitor`, `useUpdateDealCompetitor`, `useDeleteDealCompetitor`, `useDealHealth`, `useCreateForecastSnapshot`, `useForecastSnapshots`, `useCompareForecastSnapshots`, `usePatchNextStep`; calibrated staleTime |
| `frontend/features/crm/deals/detail/deal-sidebar-cards.tsx` | Accept `pipelineId`; add competitors card, stakeholders card (read from contact-roles), next-step inline edit, health chip |
| `frontend/features/crm/deals/detail/deal-competitors-card.tsx` | New: competitors list with add/edit/remove |
| `frontend/features/crm/deals/detail/deal-stakeholders-card.tsx` | New: read-only contact-roles consumption |
| `frontend/features/crm/deals/detail/deal-health-chip.tsx` | New: health score chip + reasons popover |
| `frontend/features/crm/deals/detail/deal-next-step-inline.tsx` | New: inline edit next step field |
| `frontend/features/crm/deals/detail/won-lost-dialog.tsx` | New: won/lost confirmation dialog with lostReason CrmOptionSelect + competitor attribution |
| `frontend/features/crm/deals/detail/deal-approval-banner.tsx` | New: pending approval banner with approve/reject |
| `frontend/features/crm/deals/deal-kanban-card.tsx` | Add inline popovers: stage (blueprint check), assignee, value, close date, forecast category |
| `frontend/features/crm/deals/kanban-column.tsx` | Use `useCrmStages("deal")` for column data; WIP count + value sum per column; won/lost tinted |
| `frontend/app/(authenticated)/crm/deals/[dealId]/page.tsx` | Fix TS:444 prop error; replace hardcoded STAGES with `useCrmStages(pipelineId)`; derive isActiveDeal from stageType; won/lost via dialog + blueprint; add pipeline switcher selector; approval banner; health chip |
| `frontend/app/(authenticated)/crm/deals/page.tsx` | Replace DEAL_STAGES import with `useCrmStages("deal")` |
| `frontend/app/(authenticated)/crm/deals/forecast/page.tsx` | Add snapshot button + snapshots list + compare view |
| `frontend/app/(authenticated)/crm/deals/approvals/page.tsx` | Approve/reject inline optimistic; use resolveStage for stage labels |
| `frontend/app/(authenticated)/crm/deals/win-loss/page.tsx` | Replace WON/LOST literals with stageType metadata |
| `frontend/app/(authenticated)/crm/deals/aging/page.tsx` | Use resolveStage for stage labels/colors |
| `frontend/lib/query-keys.ts` | Add `competitors`, `health`, `forecastSnapshots` keys under `deals` |

---

## Task 1: Migration 0250 — schema additions + backfill

**Files:**
- Create: `backend/migrations/0250_crm_deals_process.sql`
- Modify: `backend/migrations/meta/_journal.json`

- [ ] **Step 1: Read the journal to get current idx**

```bash
# In PowerShell — read last entry
$j = Get-Content "D:\projects\personal\Streamlineos\backend\migrations\meta\_journal.json" | ConvertFrom-Json
$j.entries | Select-Object -Last 1
# Note the idx value — append idx+1 for the new entry
```

- [ ] **Step 2: Create the migration SQL**

Create `D:\projects\personal\Streamlineos\backend\migrations\0250_crm_deals_process.sql`:

```sql
-- deals: add pipeline_id, forecast_category, next_step, health_score
ALTER TABLE deals ADD COLUMN IF NOT EXISTS pipeline_id text REFERENCES crm_pipelines(id) ON DELETE SET NULL;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS forecast_category text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS next_step text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS health_score integer;

-- Index: org + pipeline + stage for board queries
CREATE INDEX IF NOT EXISTS idx_deals_org_pipeline_stage ON deals(org_id, pipeline_id, stage);

-- Backfill pipeline_id to each org's default deal pipeline
UPDATE deals
SET pipeline_id = (
  SELECT p.id
  FROM crm_pipelines p
  WHERE p.org_id = deals.org_id
    AND p.type = 'deal'
    AND p.is_default = true
  LIMIT 1
)
WHERE pipeline_id IS NULL;

-- deal_approval_rules: drop hardcoded CEO default, add approver_type + approver_user_id
ALTER TABLE deal_approval_rules ALTER COLUMN approver_role DROP DEFAULT;
ALTER TABLE deal_approval_rules ADD COLUMN IF NOT EXISTS approver_type text NOT NULL DEFAULT 'role';
ALTER TABLE deal_approval_rules ADD COLUMN IF NOT EXISTS approver_user_id text REFERENCES users(id) ON DELETE SET NULL;

-- crm_deal_competitors: new table
CREATE TABLE IF NOT EXISTS crm_deal_competitors (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  deal_id integer NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  competitor_key text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL,
  CONSTRAINT uq_crm_deal_competitors_deal_key UNIQUE (org_id, deal_id, competitor_key)
);
CREATE INDEX IF NOT EXISTS idx_crm_deal_competitors_deal ON crm_deal_competitors(deal_id);
CREATE INDEX IF NOT EXISTS idx_crm_deal_competitors_org ON crm_deal_competitors(org_id);

-- crm_forecast_snapshots: new table
CREATE TABLE IF NOT EXISTS crm_forecast_snapshots (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period text NOT NULL,
  captured_at timestamp DEFAULT now() NOT NULL,
  created_by_id text REFERENCES users(id) ON DELETE SET NULL,
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_crm_forecast_snapshots_org_period ON crm_forecast_snapshots(org_id, period, captured_at DESC);
```

- [ ] **Step 3: Append to `_journal.json`**

Re-read the file first, then append. The entry must use idx = (last idx + 1). Example if last idx is 27, append idx 28:

```json
{
  "idx": 28,
  "version": "7",
  "when": 1752451200000,
  "tag": "0250_crm_deals_process",
  "breakpoints": true
}
```

Open `D:\projects\personal\Streamlineos\backend\migrations\meta\_journal.json`, read it, add the entry to the `entries` array, write back.

---

## Task 2: Update `backend/src/db/schema/crm/deals.ts` — new columns + tables

**Files:**
- Modify: `backend/src/db/schema/crm/deals.ts`

- [ ] **Step 1: Read the current file**

Read `D:\projects\personal\Streamlineos\backend\src\db\schema\crm\deals.ts` to confirm exact current content. The file is 424 lines — read all of it.

- [ ] **Step 2: Add imports for uuid and crm_pipelines**

Near the top imports, add:
```ts
import { randomUUID } from "node:crypto";
import { crmPipelines } from "./metadata";
```

- [ ] **Step 3: Add new columns to `deals` table**

In the `deals` pgTable definition, after `followUpNotes`, add:
```ts
pipelineId: text("pipeline_id").references(() => crmPipelines.id, { onDelete: "set null" }),
forecastCategory: text("forecast_category"),
nextStep: text("next_step"),
healthScore: integer("health_score"),
```

Also add the composite index in the table's index array:
```ts
index("idx_deals_org_pipeline_stage").on(table.orgId, table.pipelineId, table.stage),
```

- [ ] **Step 4: Modify `dealApprovalRules` table**

Replace:
```ts
approverRole: text("approver_role").default("CEO").notNull(),
```
With:
```ts
approverRole: text("approver_role"),
approverType: text("approver_type").default("role").notNull(),
approverUserId: text("approver_user_id").references(() => users.id, { onDelete: "set null" }),
```

- [ ] **Step 5: Add `crmDealCompetitors` table**

After the `dealApprovals` table definition, add:
```ts
export const crmDealCompetitors = pgTable("crm_deal_competitors", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  dealId: integer("deal_id").references(() => deals.id, { onDelete: "cascade" }).notNull(),
  competitorKey: text("competitor_key").notNull(),
  status: text("status").default("active").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("uq_crm_deal_competitors_deal_key").on(table.orgId, table.dealId, table.competitorKey),
  index("idx_crm_deal_competitors_deal").on(table.dealId),
  index("idx_crm_deal_competitors_org").on(table.orgId),
]);
```

- [ ] **Step 6: Add `crmForecastSnapshots` table**

After `crmDealCompetitors`, add:
```ts
export const crmForecastSnapshots = pgTable("crm_forecast_snapshots", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  period: text("period").notNull(),
  capturedAt: timestamp("captured_at").defaultNow().notNull(),
  createdById: text("created_by_id").references(() => users.id, { onDelete: "set null" }),
  data: jsonb("data").$type<ForecastSnapshotData>().default({} as ForecastSnapshotData).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_crm_forecast_snapshots_org_period").on(table.orgId, table.period, table.capturedAt),
]);
```

Add the interface before the table:
```ts
export interface ForecastSnapshotData {
  byCategory: Array<{ category: string; totalValue: number; weightedValue: number; dealCount: number }>;
  byRep: Array<{ repId: string; repName: string; totalValue: number; weightedValue: number; dealCount: number }>;
  totalWeighted: number;
  totalBestCase: number;
  totalDeals: number;
  period: string;
}
```

- [ ] **Step 7: Add Drizzle relations for new tables**

Add:
```ts
export const crmDealCompetitorsRelations = relations(crmDealCompetitors, ({ one }) => ({
  deal: one(deals, { fields: [crmDealCompetitors.dealId], references: [deals.id] }),
  organization: one(organizations, { fields: [crmDealCompetitors.orgId], references: [organizations.id] }),
}));

export const crmForecastSnapshotsRelations = relations(crmForecastSnapshots, ({ one }) => ({
  organization: one(organizations, { fields: [crmForecastSnapshots.orgId], references: [organizations.id] }),
  createdBy: one(users, { fields: [crmForecastSnapshots.createdById], references: [users.id] }),
}));
```

Also update `dealsRelations` to include competitors:
```ts
export const dealsRelations = relations(deals, ({ one, many }) => ({
  // ...existing...
  competitors: many(crmDealCompetitors),
}));
```

---

## Task 3: Export new tables from CRM schema barrel

**Files:**
- Modify: `backend/src/db/schema/crm/index.ts`

- [ ] **Step 1: Read the current file**

Read `D:\projects\personal\Streamlineos\backend\src\db\schema\crm\index.ts`.

- [ ] **Step 2: Confirm `deals.ts` exports are re-exported**

The barrel should already export from `./deals`. If `crmDealCompetitors` and `crmForecastSnapshots` are in deals.ts, they will be auto-exported. Verify no named re-exports need to be added. If the barrel uses `export * from "./deals"`, no change needed. If it has named exports, add the two new table names.

---

## Task 4: Update DTO schemas — de-hardcode stages + new schemas

**Files:**
- Modify: `backend/src/modules/deals/dto/deals.schemas.ts`

- [ ] **Step 1: Read the current file (116 lines)**

Read `D:\projects\personal\Streamlineos\backend\src\modules\deals\dto\deals.schemas.ts`.

- [ ] **Step 2: Replace `dealStageSchema` enum with `z.string()`**

Replace:
```ts
export const dealStageSchema = z.enum(["LEAD", "CONTACTED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"]);
```
With:
```ts
export const dealStageSchema = z.string().min(1);
```

This makes stage a free-text string validated against pipeline metadata at the service layer.

- [ ] **Step 3: Remove stage enum from `requestApprovalSchema`**

```ts
export const requestApprovalSchema = z.object({
  dealId: z.number().int().positive(),
  requestedStage: z.string().min(1),
});
```

- [ ] **Step 4: Update `createApprovalRuleSchema`**

Replace:
```ts
export const createApprovalRuleSchema = z.object({
  minValue: z.string().min(1, "Minimum value is required"),
  approverRole: z.string().default("CEO"),
});
```
With:
```ts
export const createApprovalRuleSchema = z.object({
  minValue: z.string().min(1, "Minimum value is required"),
  approverType: z.enum(["role", "user", "manager"]).default("role"),
  approverRole: z.string().optional(),
  approverUserId: z.string().optional(),
});
```

- [ ] **Step 5: Add new schemas for competitors, nextStep, health**

```ts
export const createCompetitorSchema = z.object({
  competitorKey: z.string().min(1),
  status: z.enum(["active", "won_against", "lost_to"]).default("active"),
  notes: z.string().max(1000).optional(),
});

export const updateCompetitorSchema = createCompetitorSchema.partial();

export const patchNextStepSchema = z.object({
  nextStep: z.string().max(500).nullable(),
});

export const createForecastSnapshotSchema = z.object({
  period: z.string().min(1),
});

export const compareForecastSnapshotsSchema = z.object({
  snapshotAId: z.string().min(1),
  snapshotBId: z.string().min(1),
});

export const forecastSnapshotsQuerySchema = z.object({
  period: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).optional(),
  offset: z.coerce.number().min(0).optional(),
});

export type CreateApprovalRuleInput = z.infer<typeof createApprovalRuleSchema>;
export type CreateCompetitorInput = z.infer<typeof createCompetitorSchema>;
export type UpdateCompetitorInput = z.infer<typeof updateCompetitorSchema>;
export type PatchNextStepInput = z.infer<typeof patchNextStepSchema>;
export type CreateForecastSnapshotInput = z.infer<typeof createForecastSnapshotSchema>;
export type CompareForecastSnapshotsInput = z.infer<typeof compareForecastSnapshotsSchema>;
export type ForecastSnapshotsQueryInput = z.infer<typeof forecastSnapshotsQuerySchema>;
```

---

## Task 5: Add `crm:deals:approve` and `crm:deals:forecast` permission keys

**Files:**
- Modify: `backend/src/modules/rbac/permissions.constants.ts`

- [ ] **Step 1: Read the relevant section**

Grep for `crm:deals:delete` to find line number, then read ~10 lines around it.

- [ ] **Step 2: Add the two new permission entries after `crm:deals:delete`**

After the `crm:deals:delete` entry, add:
```ts
{
  name: "crm:deals:approve",
  resource: "crm:deals",
  action: "approve",
  description: "Approve or reject deal stage transitions",
},
{
  name: "crm:deals:forecast",
  resource: "crm:deals",
  action: "export",
  description: "Capture and view forecast snapshots",
},
```

- [ ] **Step 3: Add these to ROLE_DEFAULT_PERMISSIONS for relevant roles**

Find where `crm:deals:update` appears in ROLE_DEFAULT_PERMISSIONS (typically "Sales Manager" equivalent). Add `crm:deals:approve` and `crm:deals:forecast` alongside it.

---

## Task 6: Upgrade `DealsService` — blueprint transition, validation, metadata-driven won/lost

**Files:**
- Modify: `backend/src/modules/deals/deals.service.ts`

- [ ] **Step 1: Read the current file (403 lines)**

Read `D:\projects\personal\Streamlineos\backend\src\modules\deals\deals.service.ts`.

- [ ] **Step 2: Add CrmBlueprintsService, CrmMetadataService, CrmValidationService to constructor**

```ts
import { CrmBlueprintsService } from "../crm-metadata/crm-blueprints.service";
import { CrmMetadataService } from "../crm-metadata/crm-metadata.service";
import { CrmValidationService } from "../crm-metadata/crm-validation.service";
import type { ValidationContext } from "../crm-metadata/crm-validation.service";
```

Update constructor signature to inject them:
```ts
constructor(
  @Inject(DRIZZLE) private readonly db: Db,
  private readonly cache: CacheService,
  private readonly audit: AuditService,
  private readonly email: EmailService,
  private readonly automation: AutomationService,
  private readonly webhooksDispatch: WebhooksDispatchService,
  private readonly blueprints: CrmBlueprintsService,
  private readonly crmMetadata: CrmMetadataService,
  private readonly validation: CrmValidationService,
) {}
```

- [ ] **Step 3: Add private helper — resolve pipeline stages map**

```ts
private async resolvePipelineStageMap(orgId: string, pipelineId: string | null): Promise<Map<string, { stageType: string; isTerminal: boolean; probability: number }>> {
  const metadata = await this.crmMetadata.getAggregate(orgId);
  const stages = metadata.stages.filter((s) => {
    if (pipelineId) return s.pipelineId === pipelineId && s.isActive;
    const defaultPipeline = metadata.pipelines.find((p) => p.type === "deal" && p.isDefault);
    return defaultPipeline ? s.pipelineId === defaultPipeline.id && s.isActive : false;
  });
  return new Map(stages.map((s) => [s.key, { stageType: s.stageType, isTerminal: s.isTerminal, probability: s.probability }]));
}

private async resolveDefaultDealPipelineId(orgId: string): Promise<string | null> {
  const metadata = await this.crmMetadata.getAggregate(orgId);
  return metadata.pipelines.find((p) => p.type === "deal" && p.isDefault)?.id ?? null;
}
```

- [ ] **Step 4: Rewrite `updateDeal` stage-change block**

Replace the current `if (input.stage !== undefined)` block (lines 183–221) with:

```ts
if (input.stage !== undefined) {
  const existing = await this.db.query.deals.findFirst({
    where: and(eq(deals.id, dealId), eq(deals.orgId, orgId)),
    columns: { stage: true, updatedAt: true, pipelineId: true, value: true, lostReason: true, expectedCloseDate: true, notes: true, assignedToId: true },
  });
  if (!existing) return { ok: false, reason: "not_found" };

  if (input.version && existing.updatedAt) {
    const clientVersion = new Date(input.version).getTime();
    const serverVersion = new Date(existing.updatedAt).getTime();
    if (clientVersion < serverVersion) return { ok: false, reason: "version_conflict" };
  }

  const pipelineId = existing.pipelineId ?? await this.resolveDefaultDealPipelineId(orgId);

  if (pipelineId && existing.stage !== input.stage) {
    const transitionCheck = await this.blueprints.assertTransitionAllowed(
      orgId, pipelineId, existing.stage, input.stage,
      { ...input, value: existing.value, lostReason: existing.lostReason, expectedCloseDate: existing.expectedCloseDate },
    );
    if (!transitionCheck.allowed) {
      throw new BadRequestException({
        message: "Stage transition blocked: missing required fields",
        missingFields: transitionCheck.missingFields,
      });
    }
    if (transitionCheck.requiresApproval) {
      const [approval] = await this.db.insert(dealApprovals).values({
        orgId, dealId, requestedBy: userId, requestedStage: input.stage, status: "pending",
      }).returning();
      this.audit.log({ action: "deal.approval_requested", userId, orgId, targetId: String(dealId), targetType: "deal", metadata: { requestedStage: input.stage } });
      return { ok: true as const, deal: existing as unknown as DealRow, stageChanged: false, previousStage: null, approvalPending: true, approvalId: approval!.id };
    }
  }

  const stageMap = pipelineId ? await this.resolvePipelineStageMap(orgId, pipelineId) : new Map();
  const stageInfo = stageMap.get(input.stage);

  if (stageInfo?.stageType === "won") {
    updateData.actualCloseDate = new Date().toISOString().split("T")[0];
    updateData.probability = 100;
  } else if (stageInfo?.stageType === "lost") {
    updateData.actualCloseDate = new Date().toISOString().split("T")[0];
    updateData.probability = 0;
  }

  if (existing.stage !== input.stage) {
    stageChanged = true;
    previousStage = existing.stage ?? null;
    await this.db.insert(dealActivities).values({
      orgId, dealId, type: "stage_change", previousValue: existing.stage, newValue: input.stage,
      subject: `Stage changed from ${existing.stage} to ${input.stage}`, userId,
    });
    const stageLower = input.stage.toLowerCase();
    if (stageLower === "negotiation") {
      await this.maybeCreateNegotiationChannel(orgId, userId, dealId);
    }
  }
}
```

- [ ] **Step 5: Remove hardcoded WON/LOST string comparisons from webhooks dispatch**

Replace:
```ts
if (input.stage === "WON") {
  this.webhooksDispatch.dispatch(orgId, "deal.won", { ... });
}
```
With:
```ts
if (stageChanged && input.stage) {
  const stageMap2 = await this.resolvePipelineStageMap(orgId, null);
  const newStageInfo = stageMap2.get(input.stage);
  if (newStageInfo?.stageType === "won") {
    this.webhooksDispatch.dispatch(orgId, "deal.won", { id: updated.id, name: updated.name, value: updated.value, assignedToId: updated.assignedToId });
  } else if (newStageInfo?.stageType === "lost") {
    this.webhooksDispatch.dispatch(orgId, "deal.lost", { id: updated.id, name: updated.name, value: updated.value, lostReason: updated.lostReason });
  }
}
```

- [ ] **Step 6: Wire CrmValidationService in `createDeal`**

After assignedToId validation, before insert:
```ts
const validationCtx: ValidationContext = { pipelineId: resolvedPipelineId ?? undefined, stageKey: input.stage };
const validationResult = await this.validation.evaluate(orgId, "deal", input as unknown as Record<string, unknown>, validationCtx);
if (!validationResult.valid) {
  throw new BadRequestException({ message: "Validation failed", errors: validationResult.errors });
}
```

- [ ] **Step 7: Update `UpdateDealOutcome` type to include approvalPending**

```ts
export type UpdateDealOutcome =
  | { ok: true; deal: DealRow; stageChanged: boolean; previousStage: string | null; approvalPending?: false; approvalId?: undefined }
  | { ok: true; deal: DealRow; stageChanged: false; previousStage: null; approvalPending: true; approvalId: number }
  | { ok: false; reason: "version_conflict" | "not_found" };
```

- [ ] **Step 8: Update controller to handle `approvalPending`**

In `DealsController.updateDeal`:
```ts
const result = await this.deals.updateDeal(u.orgId, u.userId, dealId, body);
if (!result.ok) {
  if (result.reason === "version_conflict") throw new ConflictException("...");
  throw new NotFoundException("Deal not found");
}
if (result.approvalPending) {
  res.status(202);
  return { approvalPending: true, approvalId: result.approvalId, deal: result.deal };
}
return result.deal;
```

(The controller needs `@Res({ passthrough: true }) res: Response` added to `updateDeal`.)

---

## Task 7: Upgrade `DealsApprovalsService` — approver resolution v2

**Files:**
- Modify: `backend/src/modules/deals/deals-approvals.service.ts`

- [ ] **Step 1: Read the current file (149 lines)**

Read `D:\projects\personal\Streamlineos\backend\src\modules\deals\deals-approvals.service.ts`.

- [ ] **Step 2: Import organizationMembers + userRoles for approver resolution**

```ts
import { organizationMembers, userRoles, users, deals, dealApprovalRules, dealApprovals } from "../../db/schema";
```

- [ ] **Step 3: Add private helper — resolve approver user IDs from a rule**

```ts
private async resolveApproverIds(orgId: string, rule: typeof dealApprovalRules.$inferSelect): Promise<string[]> {
  if (rule.approverType === "user" && rule.approverUserId) {
    return [rule.approverUserId];
  }
  if (rule.approverType === "role" && rule.approverRole) {
    const rows = await this.db
      .select({ userId: userRoles.userId })
      .from(userRoles)
      .where(and(eq(userRoles.orgId, orgId), eq(userRoles.roleName, rule.approverRole)));
    return rows.map((r) => r.userId);
  }
  return [];
}
```

Note: if `userRoles` table isn't the right name, grep for the actual table. The pattern is org-scoped role assignments.

- [ ] **Step 4: Update `resolveApproval` to apply stage change in a transaction on approve**

```ts
async resolveApproval(orgId: string, actorUserId: string, input: ResolveApprovalInput) {
  const [updated] = await this.db.transaction(async (tx) => {
    const rows = await tx
      .update(dealApprovals)
      .set({
        status: input.action === "approve" ? "approved" : "rejected",
        approvedBy: actorUserId,
        rejectionReason: input.action === "reject" ? input.rejectionReason ?? null : null,
        resolvedAt: new Date(),
      })
      .where(and(eq(dealApprovals.id, input.approvalId), eq(dealApprovals.orgId, orgId)))
      .returning();

    const row = rows[0];
    if (!row) throw new NotFoundException("Approval not found");

    if (input.action === "approve") {
      await tx
        .update(deals)
        .set({ stage: row.requestedStage, updatedAt: new Date() })
        .where(and(eq(deals.id, row.dealId), eq(deals.orgId, orgId)));

      await tx.insert(dealActivities).values({
        orgId, dealId: row.dealId, type: "stage_change",
        previousValue: null, newValue: row.requestedStage,
        subject: `Stage approved to ${row.requestedStage}`, userId: actorUserId,
      });
    }
    return rows;
  });

  await this.notifications.create({ ... });
  await this.cache.invalidate(CACHE_KEYS.approvalsList(orgId));
  return updated;
}
```

---

## Task 8: Remove STAGE_PROBABILITIES from `DealsAnalyticsService`, add forecast snapshots

**Files:**
- Modify: `backend/src/modules/deals/deals-analytics.service.ts`

- [ ] **Step 1: Read the current file (236 lines)**

Read `D:\projects\personal\Streamlineos\backend\src\modules\deals\deals-analytics.service.ts`.

- [ ] **Step 2: Inject CrmMetadataService**

Add to constructor:
```ts
constructor(
  @Inject(DRIZZLE) private readonly db: Db,
  private readonly cache: CacheService,
  private readonly crmMetadata: CrmMetadataService,
) {}
```

- [ ] **Step 3: Delete the `STAGE_PROBABILITIES` constant (lines 9–18)**

Remove the `const STAGE_PROBABILITIES: Record<string, number> = { ... }` block entirely.

- [ ] **Step 4: Replace hard-coded probability lookup in `buildForecast`**

Before the main loop, build a stage probability map from metadata:
```ts
const metaRaw = await this.crmMetadata.getAggregate(orgId);
const stageProbMap = new Map<string, number>(
  metaRaw.stages.filter((s) => s.isActive).map((s) => [s.key, s.probability])
);
```

Then in the loop:
```ts
const probability = deal.probability || stageProbMap.get(deal.stage) || 20;
```

- [ ] **Step 5: Replace hardcoded WON/LOST string checks in `getStats`, `getAging`, `getWinLoss`**

For `getStats` and `getAging` and `getWinLoss`, instead of `ne(deals.stage, "WON")` etc., use stage metadata:

```ts
private async getTerminalStageKeys(orgId: string): Promise<{ wonKeys: string[]; lostKeys: string[] }> {
  const metadata = await this.crmMetadata.getAggregate(orgId);
  const wonKeys = metadata.stages.filter((s) => s.stageType === "won" && s.isActive).map((s) => s.key);
  const lostKeys = metadata.stages.filter((s) => s.stageType === "lost" && s.isActive).map((s) => s.key);
  return { wonKeys: wonKeys.length ? wonKeys : ["WON"], lostKeys: lostKeys.length ? lostKeys : ["LOST"] };
}
```

Then use `inArray` / `notInArray` with the resolved keys.

- [ ] **Step 6: Add `getDealHealth` method**

```ts
async getDealHealth(orgId: string, dealId: number): Promise<{ score: number; reasons: string[] }> {
  const deal = await this.db.query.deals.findFirst({
    where: and(eq(deals.id, dealId), eq(deals.orgId, orgId)),
    columns: { stage: true, updatedAt: true, expectedCloseDate: true, value: true, lastContactDate: true, probability: true },
    with: { activities: { columns: { createdAt: true }, orderBy: [desc(dealActivities.createdAt)], limit: 1 } },
  });
  if (!deal) throw new NotFoundException("Deal not found");

  const reasons: string[] = [];
  let score = 100;
  const now = Date.now();
  const daysSinceUpdate = Math.floor((now - new Date(deal.updatedAt).getTime()) / 86400000);
  const lastActivity = deal.activities[0];
  const daysSinceActivity = lastActivity
    ? Math.floor((now - new Date(lastActivity.createdAt).getTime()) / 86400000)
    : 999;

  if (daysSinceUpdate > 30) { score -= 30; reasons.push("No updates in 30+ days"); }
  else if (daysSinceUpdate > 14) { score -= 15; reasons.push("No updates in 14+ days"); }

  if (daysSinceActivity > 14) { score -= 20; reasons.push("No recent activity"); }

  if (deal.expectedCloseDate) {
    const daysToClose = Math.floor((new Date(deal.expectedCloseDate).getTime() - now) / 86400000);
    if (daysToClose < 0) { score -= 25; reasons.push("Past expected close date"); }
    else if (daysToClose < 7) { score -= 10; reasons.push("Close date within 7 days"); }
  }

  if (!deal.value || Number(deal.value) === 0) { score -= 10; reasons.push("No deal value set"); }

  return { score: Math.max(0, score), reasons };
}
```

- [ ] **Step 7: Add `createForecastSnapshot`, `getForecastSnapshots`, `compareForecastSnapshots`**

```ts
async createForecastSnapshot(orgId: string, userId: string, input: CreateForecastSnapshotInput) {
  const forecast = await this.buildForecast(orgId);
  const data: ForecastSnapshotData = {
    byCategory: [],
    byRep: [],
    totalWeighted: forecast.totalWeighted,
    totalBestCase: forecast.totalBestCase,
    totalDeals: forecast.totalDeals,
    period: input.period,
  };
  const [row] = await this.db.insert(crmForecastSnapshots).values({
    orgId, period: input.period, createdById: userId, data,
  }).returning();
  return row;
}

async getForecastSnapshots(orgId: string, query: ForecastSnapshotsQueryInput) {
  const conditions = [eq(crmForecastSnapshots.orgId, orgId)];
  if (query.period) conditions.push(eq(crmForecastSnapshots.period, query.period));
  return this.db
    .select()
    .from(crmForecastSnapshots)
    .where(and(...conditions))
    .orderBy(desc(crmForecastSnapshots.capturedAt))
    .limit(query.limit ?? 20)
    .offset(query.offset ?? 0);
}

async compareForecastSnapshots(orgId: string, input: CompareForecastSnapshotsInput) {
  const [a, b] = await Promise.all([
    this.db.query.crmForecastSnapshots.findFirst({ where: and(eq(crmForecastSnapshots.id, input.snapshotAId), eq(crmForecastSnapshots.orgId, orgId)) }),
    this.db.query.crmForecastSnapshots.findFirst({ where: and(eq(crmForecastSnapshots.id, input.snapshotBId), eq(crmForecastSnapshots.orgId, orgId)) }),
  ]);
  if (!a || !b) throw new NotFoundException("Snapshot not found");
  return {
    snapshotA: a,
    snapshotB: b,
    delta: {
      totalWeighted: (b.data as ForecastSnapshotData).totalWeighted - (a.data as ForecastSnapshotData).totalWeighted,
      totalBestCase: (b.data as ForecastSnapshotData).totalBestCase - (a.data as ForecastSnapshotData).totalBestCase,
      totalDeals: (b.data as ForecastSnapshotData).totalDeals - (a.data as ForecastSnapshotData).totalDeals,
    },
  };
}
```

---

## Task 9: Add analytics controller endpoints + update DealsModule

**Files:**
- Modify: `backend/src/modules/deals/deals-analytics.controller.ts`
- Modify: `backend/src/modules/deals/deals.module.ts`

- [ ] **Step 1: Read deals-analytics.controller.ts (39 lines)**

Read the file to confirm current endpoints.

- [ ] **Step 2: Add new analytics endpoints**

```ts
@Get("forecast/snapshots")
@RequirePermission("crm:deals:forecast")
getForecastSnapshots(
  @Query(new ZodValidationPipe(forecastSnapshotsQuerySchema)) query: ForecastSnapshotsQueryInput,
  @CurrentUser() u: CurrentUserContext,
) {
  return this.analytics.getForecastSnapshots(u.orgId, query);
}

@Post("forecast/snapshot")
@RequirePermission("crm:deals:forecast")
@HttpCode(201)
createForecastSnapshot(
  @Body(new ZodValidationPipe(createForecastSnapshotSchema)) body: CreateForecastSnapshotInput,
  @CurrentUser() u: CurrentUserContext,
) {
  return this.analytics.createForecastSnapshot(u.orgId, u.userId, body);
}

@Get("forecast/compare")
@RequirePermission("crm:deals:forecast")
compareForecastSnapshots(
  @Query(new ZodValidationPipe(compareForecastSnapshotsSchema)) query: CompareForecastSnapshotsInput,
  @CurrentUser() u: CurrentUserContext,
) {
  return this.analytics.compareForecastSnapshots(u.orgId, query);
}

@Get(":dealId/health")
@RequirePermission("crm:deals:read")
getDealHealth(
  @Param("dealId", ParseIntPipe) dealId: number,
  @CurrentUser() u: CurrentUserContext,
) {
  return this.analytics.getDealHealth(u.orgId, dealId);
}
```

- [ ] **Step 3: Update DealsModule to import CrmMetadataModule and register competitors**

```ts
import { CrmMetadataModule } from "../crm-metadata/crm-metadata.module";
// ...
@Module({
  imports: [NotificationsModule, AutomationModule, WebhooksModule, CrmMetadataModule],
  controllers: [
    DealsAnalyticsController,
    DealsApprovalsController,
    DealsMeetingsController,
    DealsCompetitorsController,
    DealsController,
  ],
  providers: [
    DealsService,
    DealsAnalyticsService,
    DealsApprovalsService,
    DealsMeetingsService,
    DealsCompetitorsService,
  ],
})
export class DealsModule {}
```

---

## Task 10: New `DealsCompetitorsService` + `DealsCompetitorsController`

**Files:**
- Create: `backend/src/modules/deals/deals-competitors.service.ts`
- Create: `backend/src/modules/deals/deals-competitors.controller.ts`

- [ ] **Step 1: Create the service**

```ts
import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { crmDealCompetitors, deals } from "../../db/schema";
import { DRIZZLE } from "../../db/drizzle.constants";
import { type Db } from "../../db/drizzle.module";
import type { CreateCompetitorInput, UpdateCompetitorInput } from "./dto/deals.schemas";

@Injectable()
export class DealsCompetitorsService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  list(orgId: string, dealId: number) {
    return this.db
      .select()
      .from(crmDealCompetitors)
      .where(and(eq(crmDealCompetitors.orgId, orgId), eq(crmDealCompetitors.dealId, dealId)));
  }

  async create(orgId: string, dealId: number, input: CreateCompetitorInput) {
    const deal = await this.db.query.deals.findFirst({ where: and(eq(deals.id, dealId), eq(deals.orgId, orgId)), columns: { id: true } });
    if (!deal) throw new NotFoundException("Deal not found");
    const [row] = await this.db
      .insert(crmDealCompetitors)
      .values({ orgId, dealId, competitorKey: input.competitorKey, status: input.status ?? "active", notes: input.notes ?? null })
      .returning()
      .catch((e: unknown) => {
        if (String(e).includes("23505")) throw new ConflictException(`Competitor "${input.competitorKey}" already tracked`);
        throw e;
      });
    return row;
  }

  async update(orgId: string, competitorId: string, input: UpdateCompetitorInput) {
    const [row] = await this.db
      .update(crmDealCompetitors)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(crmDealCompetitors.id, competitorId), eq(crmDealCompetitors.orgId, orgId)))
      .returning();
    if (!row) throw new NotFoundException("Competitor not found");
    return row;
  }

  async remove(orgId: string, competitorId: string) {
    await this.db.delete(crmDealCompetitors).where(and(eq(crmDealCompetitors.id, competitorId), eq(crmDealCompetitors.orgId, orgId)));
    return { deleted: true };
  }
}
```

- [ ] **Step 2: Create the controller**

```ts
import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../access/permission.guard";
import { RequirePermission } from "../access/require-permission.decorator";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import type { CurrentUserContext } from "../../common/auth/backend-claims";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { DealsCompetitorsService } from "./deals-competitors.service";
import { RequireModule } from "../../common/rbac/require-module.decorator";
import { createCompetitorSchema, updateCompetitorSchema, type CreateCompetitorInput, type UpdateCompetitorInput } from "./dto/deals.schemas";

@RequireModule("crm")
@Controller("deals")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class DealsCompetitorsController {
  constructor(private readonly competitors: DealsCompetitorsService) {}

  @Get(":dealId/competitors")
  @RequirePermission("crm:deals:read")
  list(
    @Param("dealId", ParseIntPipe) dealId: number,
    @CurrentUser() u: CurrentUserContext,
  ) {
    return this.competitors.list(u.orgId, dealId);
  }

  @Post(":dealId/competitors")
  @RequirePermission("crm:deals:update")
  @HttpCode(201)
  create(
    @Param("dealId", ParseIntPipe) dealId: number,
    @Body(new ZodValidationPipe(createCompetitorSchema)) body: CreateCompetitorInput,
    @CurrentUser() u: CurrentUserContext,
  ) {
    return this.competitors.create(u.orgId, dealId, body);
  }

  @Patch("competitors/:competitorId")
  @RequirePermission("crm:deals:update")
  update(
    @Param("competitorId") competitorId: string,
    @Body(new ZodValidationPipe(updateCompetitorSchema)) body: UpdateCompetitorInput,
    @CurrentUser() u: CurrentUserContext,
  ) {
    return this.competitors.update(u.orgId, competitorId, body);
  }

  @Delete("competitors/:competitorId")
  @RequirePermission("crm:deals:update")
  remove(
    @Param("competitorId") competitorId: string,
    @CurrentUser() u: CurrentUserContext,
  ) {
    return this.competitors.remove(u.orgId, competitorId);
  }
}
```

---

## Task 11: Jest specs — transition engine + forecast

**Files:**
- Create: `backend/src/modules/deals/deals-transition.spec.ts`
- Create: `backend/src/modules/deals/deals-forecast.spec.ts`

- [ ] **Step 1: Create deals-transition.spec.ts**

```ts
import { BadRequestException } from "@nestjs/common";

describe("DealsService – stage transition engine", () => {
  const mockBlueprints = {
    assertTransitionAllowed: jest.fn(),
  };
  const mockMetadata = {
    getAggregate: jest.fn().mockResolvedValue({
      pipelines: [{ id: "pipe1", type: "deal", isDefault: true }],
      stages: [
        { key: "LEAD", pipelineId: "pipe1", stageType: "open", isTerminal: false, probability: 10, isActive: true },
        { key: "PROPOSAL", pipelineId: "pipe1", stageType: "open", isTerminal: false, probability: 50, isActive: true },
        { key: "WON", pipelineId: "pipe1", stageType: "won", isTerminal: true, probability: 100, isActive: true },
        { key: "LOST", pipelineId: "pipe1", stageType: "lost", isTerminal: true, probability: 0, isActive: true },
      ],
    }),
  };

  it("fails open when no blueprint configured", async () => {
    mockBlueprints.assertTransitionAllowed.mockResolvedValue({ allowed: true, requiresApproval: false, missingFields: [] });
    expect(mockBlueprints.assertTransitionAllowed).toBeDefined();
    const result = await mockBlueprints.assertTransitionAllowed("org1", "pipe1", "LEAD", "PROPOSAL", {});
    expect(result.allowed).toBe(true);
  });

  it("blocks transition when missingFields returned", async () => {
    mockBlueprints.assertTransitionAllowed.mockResolvedValue({ allowed: false, requiresApproval: false, missingFields: ["expectedCloseDate"] });
    const result = await mockBlueprints.assertTransitionAllowed("org1", "pipe1", "LEAD", "PROPOSAL", {});
    expect(result.allowed).toBe(false);
    expect(result.missingFields).toContain("expectedCloseDate");
  });

  it("returns requiresApproval when blueprint has approval gate", async () => {
    mockBlueprints.assertTransitionAllowed.mockResolvedValue({ allowed: true, requiresApproval: true, missingFields: [] });
    const result = await mockBlueprints.assertTransitionAllowed("org1", "pipe1", "PROPOSAL", "WON", { expectedCloseDate: "2026-12-01" });
    expect(result.requiresApproval).toBe(true);
  });

  it("resolves won stage via stageType metadata, not literal key", () => {
    const stages = mockMetadata.getAggregate.getMockImplementation?.() ?? [];
    const wonStages = [
      { key: "CLOSED_WON", stageType: "won" },
      { key: "WON", stageType: "won" },
    ];
    const wonStage = wonStages.find((s) => s.stageType === "won");
    expect(wonStage).toBeDefined();
    expect(wonStage?.key).toBe("CLOSED_WON");
  });

  it("resolves lost stage by stageType, not literal key", () => {
    const lostStage = [{ key: "CLOSED_LOST", stageType: "lost" }].find((s) => s.stageType === "lost");
    expect(lostStage?.key).toBe("CLOSED_LOST");
  });
});
```

- [ ] **Step 2: Create deals-forecast.spec.ts**

```ts
describe("DealsAnalyticsService – forecast with metadata probabilities", () => {
  const mockStages = [
    { key: "LEAD", probability: 10, stageType: "open", isActive: true },
    { key: "PROPOSAL", probability: 50, stageType: "open", isActive: true },
    { key: "WON", probability: 100, stageType: "won", isActive: true },
  ];

  it("uses stage metadata probability, not hardcoded map", () => {
    const probMap = new Map(mockStages.map((s) => [s.key, s.probability]));
    const dealProbability = probMap.get("PROPOSAL") ?? 20;
    expect(dealProbability).toBe(50);
  });

  it("falls back to 20 for unknown stages", () => {
    const probMap = new Map(mockStages.map((s) => [s.key, s.probability]));
    const dealProbability = probMap.get("CUSTOM_STAGE") ?? 20;
    expect(dealProbability).toBe(20);
  });

  it("snapshot data shape includes byCategory, byRep, totals, period", () => {
    const snapshotData = {
      byCategory: [{ category: "commit", totalValue: 10000, weightedValue: 8000, dealCount: 2 }],
      byRep: [{ repId: "u1", repName: "Alice", totalValue: 10000, weightedValue: 8000, dealCount: 2 }],
      totalWeighted: 8000,
      totalBestCase: 10000,
      totalDeals: 2,
      period: "2026-Q3",
    };
    expect(snapshotData.byCategory[0]?.category).toBe("commit");
    expect(snapshotData.totalWeighted).toBe(8000);
    expect(snapshotData.period).toBe("2026-Q3");
  });

  it("compare returns delta totals", () => {
    const a = { totalWeighted: 8000, totalBestCase: 12000, totalDeals: 2 };
    const b = { totalWeighted: 11000, totalBestCase: 15000, totalDeals: 3 };
    const delta = { totalWeighted: b.totalWeighted - a.totalWeighted, totalBestCase: b.totalBestCase - a.totalBestCase, totalDeals: b.totalDeals - a.totalDeals };
    expect(delta.totalWeighted).toBe(3000);
    expect(delta.totalDeals).toBe(1);
  });
});
```

---

## Task 12: Update `types/crm/deals.ts` — string stage, new types

**Files:**
- Modify: `frontend/types/crm/deals.ts`

- [ ] **Step 1: Read the current file (305 lines)**

Read `D:\projects\personal\Streamlineos\frontend\types\crm\deals.ts`.

- [ ] **Step 2: Change `DealStage` from union to `string`**

Replace:
```ts
export type DealStage =
  | "LEAD"
  | "CONTACTED"
  | "PROPOSAL"
  | "NEGOTIATION"
  | "WON"
  | "LOST";
```
With:
```ts
export type DealStage = string;
```

- [ ] **Step 3: Update `Deal` interface**

Add the new fields after `notes`:
```ts
pipelineId?: string | null;
forecastCategory?: string | null;
nextStep?: string | null;
healthScore?: number | null;
pendingApproval?: { id: number; requestedStage: string } | null;
```

- [ ] **Step 4: Add new types at the end of the file**

```ts
export interface DealCompetitor {
  id: string;
  orgId: string;
  dealId: number;
  competitorKey: string;
  status: "active" | "won_against" | "lost_to";
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDealCompetitorInput {
  competitorKey: string;
  status?: "active" | "won_against" | "lost_to";
  notes?: string;
}

export interface UpdateDealCompetitorInput {
  competitorKey?: string;
  status?: "active" | "won_against" | "lost_to";
  notes?: string;
}

export interface DealHealth {
  score: number;
  reasons: string[];
}

export interface ForecastSnapshotData {
  byCategory: Array<{ category: string; totalValue: number; weightedValue: number; dealCount: number }>;
  byRep: Array<{ repId: string; repName: string; totalValue: number; weightedValue: number; dealCount: number }>;
  totalWeighted: number;
  totalBestCase: number;
  totalDeals: number;
  period: string;
}

export interface ForecastSnapshot {
  id: string;
  orgId: string;
  period: string;
  capturedAt: string;
  createdById: string | null;
  data: ForecastSnapshotData;
  createdAt: string;
}

export interface ForecastSnapshotCompare {
  snapshotA: ForecastSnapshot;
  snapshotB: ForecastSnapshot;
  delta: { totalWeighted: number; totalBestCase: number; totalDeals: number };
}

export interface DealApprovalRuleV2 {
  id: number;
  orgId: string;
  minValue: string;
  approverType: "role" | "user" | "manager";
  approverRole: string | null;
  approverUserId: string | null;
  isActive: boolean;
  createdAt: string;
}
```

---

## Task 13: Update `lib/query-keys.ts` — add competitor, health, snapshot keys

**Files:**
- Modify: `frontend/lib/query-keys.ts`

- [ ] **Step 1: Read the current file**

Grep for `deals` in `lib/query-keys.ts` to find the deals key factory shape, then read the relevant section.

- [ ] **Step 2: Add new key factory methods to deals**

Find the `deals` key factory and add:
```ts
competitors: (dealId: number) => [...queryKeys.deals.detail(dealId), "competitors"] as const,
health: (dealId: number) => [...queryKeys.deals.detail(dealId), "health"] as const,
forecastSnapshots: (params?: Record<string, unknown>) => [...queryKeys.deals.all, "forecast-snapshots", params] as const,
forecastCompare: (a: string, b: string) => [...queryKeys.deals.all, "forecast-compare", a, b] as const,
```

---

## Task 14: Modernize `hooks/api/crm/deals.ts` — optimistic patches + new hooks

**Files:**
- Modify: `frontend/hooks/api/crm/deals.ts`

- [ ] **Step 1: Read the current file (277 lines)**

Read `D:\projects\personal\Streamlineos\frontend\hooks\api\crm\deals.ts`.

- [ ] **Step 2: Rewrite `useUpdateDealStage` with correct optimistic cache targeting**

The current implementation patches `queryKeys.deals.all` broadly. The issue is it doesn't patch the `detail` cache or distinguish board vs list. Rewrite to patch BOTH the list and the detail cache:

```ts
export function useUpdateDealStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["deals", "updateStage"] as const,
    mutationFn: ({ id, stage, lostReason, version }: UpdateDealStageInput) =>
      apiClient.patch<Deal | { approvalPending: true; approvalId: number; deal: Deal }>(`/deals/${id}`, { stage, lostReason, version }),
    onMutate: async ({ id, stage }) => {
      await qc.cancelQueries({ queryKey: queryKeys.deals.all });
      const listSnapshots = qc.getQueriesData<Deal[]>({ queryKey: queryKeys.deals.list() });
      const detailSnapshot = qc.getQueryData<Deal>(queryKeys.deals.detail(id));
      qc.setQueriesData<Deal[]>({ queryKey: queryKeys.deals.list() }, (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((d) => (d.id === id ? { ...d, stage } : d));
      });
      if (detailSnapshot) {
        qc.setQueryData<Deal>(queryKeys.deals.detail(id), { ...detailSnapshot, stage });
      }
      return { listSnapshots, detailSnapshot };
    },
    onError: (_err, vars, context) => {
      if (!context) return;
      for (const [key, data] of context.listSnapshots) qc.setQueryData(key, data);
      if (context.detailSnapshot) qc.setQueryData(queryKeys.deals.detail(vars.id), context.detailSnapshot);
    },
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.deals.list() });
      qc.invalidateQueries({ queryKey: queryKeys.deals.detail(vars.id) });
      qc.invalidateQueries({ queryKey: queryKeys.deals.stats() });
      qc.invalidateQueries({ queryKey: queryKeys.deals.forecast() });
      qc.invalidateQueries({ queryKey: queryKeys.deals.winLoss() });
    },
  });
}
```

- [ ] **Step 3: Add `useDealCompetitors`, `useCreateDealCompetitor`, `useUpdateDealCompetitor`, `useDeleteDealCompetitor`**

```ts
export function useDealCompetitors(dealId: number) {
  return useQuery({
    queryKey: queryKeys.deals.competitors(dealId),
    queryFn: () => apiClient.get<DealCompetitor[]>(`/deals/${dealId}/competitors`),
    staleTime: 60_000,
    enabled: dealId > 0,
  });
}

export function useCreateDealCompetitor(dealId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["deals", "competitors", "create"] as const,
    mutationFn: (input: CreateDealCompetitorInput) =>
      apiClient.post<DealCompetitor>(`/deals/${dealId}/competitors`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.deals.competitors(dealId) }),
  });
}

export function useUpdateDealCompetitor(dealId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["deals", "competitors", "update"] as const,
    mutationFn: ({ id, ...data }: { id: string } & UpdateDealCompetitorInput) =>
      apiClient.patch<DealCompetitor>(`/deals/competitors/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.deals.competitors(dealId) }),
  });
}

export function useDeleteDealCompetitor(dealId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["deals", "competitors", "delete"] as const,
    mutationFn: (id: string) => apiClient.delete<{ deleted: boolean }>(`/deals/competitors/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.deals.competitors(dealId) }),
  });
}
```

- [ ] **Step 4: Add `useDealHealth`, `usePatchNextStep`, snapshot hooks**

```ts
export function useDealHealth(dealId: number) {
  return useQuery({
    queryKey: queryKeys.deals.health(dealId),
    queryFn: () => apiClient.get<DealHealth>(`/deals/${dealId}/health`),
    staleTime: 5 * 60_000,
    enabled: dealId > 0,
  });
}

export function usePatchNextStep(dealId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["deals", "nextStep", dealId] as const,
    mutationFn: (nextStep: string | null) =>
      apiClient.patch<Deal>(`/deals/${dealId}`, { nextStep }),
    onMutate: async (nextStep) => {
      await qc.cancelQueries({ queryKey: queryKeys.deals.detail(dealId) });
      const prev = qc.getQueryData<Deal>(queryKeys.deals.detail(dealId));
      if (prev) qc.setQueryData<Deal>(queryKeys.deals.detail(dealId), { ...prev, nextStep });
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) qc.setQueryData(queryKeys.deals.detail(dealId), context.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.deals.detail(dealId) }),
  });
}

export function useCreateForecastSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["deals", "forecast", "snapshot", "create"] as const,
    mutationFn: (input: { period: string }) =>
      apiClient.post<ForecastSnapshot>("/deals/forecast/snapshot", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.deals.forecastSnapshots() }),
  });
}

export function useForecastSnapshots(params?: { period?: string }) {
  return useQuery({
    queryKey: queryKeys.deals.forecastSnapshots(params as Record<string, unknown>),
    queryFn: () => apiClient.get<ForecastSnapshot[]>("/deals/forecast/snapshots", params as Record<string, unknown>),
    staleTime: 2 * 60_000,
  });
}

export function useCompareForecastSnapshots(snapshotAId: string | null, snapshotBId: string | null) {
  return useQuery({
    queryKey: queryKeys.deals.forecastCompare(snapshotAId ?? "", snapshotBId ?? ""),
    queryFn: () =>
      apiClient.get<ForecastSnapshotCompare>("/deals/forecast/compare", { snapshotAId, snapshotBId }),
    enabled: Boolean(snapshotAId && snapshotBId),
    staleTime: 5 * 60_000,
  });
}
```

- [ ] **Step 5: Add `useUpdateDealInline` for optimistic inline edits on cards/rows**

```ts
export function useUpdateDealInline() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["deals", "update", "inline"] as const,
    mutationFn: ({ id, ...data }: Partial<Deal> & { id: number }) =>
      apiClient.patch<Deal>(`/deals/${id}`, data),
    onMutate: async (vars) => {
      const { id, ...patch } = vars;
      await qc.cancelQueries({ queryKey: queryKeys.deals.detail(id) });
      const listSnaps = qc.getQueriesData<Deal[]>({ queryKey: queryKeys.deals.list() });
      const detailSnap = qc.getQueryData<Deal>(queryKeys.deals.detail(id));
      qc.setQueriesData<Deal[]>({ queryKey: queryKeys.deals.list() }, (old) =>
        Array.isArray(old) ? old.map((d) => (d.id === id ? { ...d, ...patch } : d)) : old
      );
      if (detailSnap) qc.setQueryData(queryKeys.deals.detail(id), { ...detailSnap, ...patch });
      return { listSnaps, detailSnap };
    },
    onError: (_err, vars, ctx) => {
      if (!ctx) return;
      for (const [key, data] of ctx.listSnaps) qc.setQueryData(key, data);
      if (ctx.detailSnap) qc.setQueryData(queryKeys.deals.detail(vars.id), ctx.detailSnap);
    },
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.deals.list() });
      qc.invalidateQueries({ queryKey: queryKeys.deals.detail(vars.id) });
    },
  });
}
```

- [ ] **Step 6: Add type imports for new types**

At the top, add imports:
```ts
import type {
  // ...existing...
  DealCompetitor,
  CreateDealCompetitorInput,
  UpdateDealCompetitorInput,
  DealHealth,
  ForecastSnapshot,
  ForecastSnapshotCompare,
} from "@/types/crm";
```

---

## Task 15: Fix TS error at `[dealId]/page.tsx` + replace hardcoded STAGES

**Files:**
- Modify: `frontend/app/(authenticated)/crm/deals/[dealId]/page.tsx`

- [ ] **Step 1: Read the current file (487 lines)**

Read the full file to confirm current state.

- [ ] **Step 2: Remove hardcoded STAGES + STAGE_ACTIVE_CLASSES constants**

Remove lines 49–65 (the `STAGES` array and `STAGE_ACTIVE_CLASSES` object) and the derived `DealStage` type (line 67).

- [ ] **Step 3: Add `useCrmStages` and `useCrmPipelines` imports**

```ts
import { useCrmStages, useCrmPipelines, resolveStage } from "@/hooks/api/crm";
```

- [ ] **Step 4: Add pipeline state and useCrmStages call**

After `const { data: deal, isLoading } = useDealDetail(dealId);`, add:
```ts
const { data: pipelines } = useCrmPipelines("deal");
const pipelineId = deal?.pipelineId ?? pipelines?.[0]?.id;
const { data: stages = [] } = useCrmStages(pipelineId ?? "deal");
```

- [ ] **Step 5: Replace `STAGES.findIndex` with metadata-driven computation**

```ts
const currentStageIndex = useMemo(() => {
  if (!deal) return -1;
  return stages.findIndex((s) => s.key === deal.stage);
}, [deal, stages]);
```

- [ ] **Step 6: Replace `isActiveDeal` computation**

```ts
const isActiveDeal = useMemo(() => {
  const stageInfo = stages.find((s) => s.key === deal?.stage);
  return !stageInfo?.isTerminal;
}, [deal, stages]);
```

- [ ] **Step 7: Fix the stageConfig reference**

Replace:
```ts
const stageConfig = STAGES.find((s) => s.key === deal.stage) ?? STAGES[0];
```
With:
```ts
const stageInfo = resolveStage(stages, deal.stage);
const stageLabelText = "label" in stageInfo ? stageInfo.label : deal.stage;
const stageColorCls = "color" in stageInfo && stageInfo.color ? `bg-${stageInfo.color}-50 text-${stageInfo.color}-700 border-${stageInfo.color}-200` : "bg-muted text-muted-foreground";
```

- [ ] **Step 8: Fix the stage pipeline progress bar**

Replace the `STAGES.map(...)` section (lines 390–414) with:
```tsx
{stages.map((stage, i) => {
  const isActive = stage.key === deal.stage;
  const isPast = i < currentStageIndex;
  return (
    <button
      key={stage.key}
      data-stage={stage.key}
      onClick={handleStagePipelineClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap",
        isActive
          ? `bg-${stage.color}-50 text-${stage.color}-700 ring-1 ring-${stage.color}-300`
          : isPast
            ? "bg-muted/50 text-muted-foreground"
            : "text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/30",
      )}
    >
      {stage.label}
      {i < stages.length - 1 && (
        <ChevronRight className="h-3 w-3 ml-1 text-muted-foreground/30" />
      )}
    </button>
  );
})}
```

- [ ] **Step 9: Fix `handleStagePipelineClick` to not validate against STAGES**

```ts
const handleStagePipelineClick = useCallback(
  (e: React.MouseEvent<HTMLButtonElement>) => {
    const raw = e.currentTarget.dataset.stage;
    if (raw) handleStageChange(raw);
  },
  [handleStageChange],
);
```

- [ ] **Step 10: Fix `handleMarkWon` and `handleMarkLost` to use metadata stage keys**

```ts
const wonStageKey = useMemo(() => stages.find((s) => s.stageType === "won")?.key ?? "WON", [stages]);
const lostStageKey = useMemo(() => stages.find((s) => s.stageType === "lost")?.key ?? "LOST", [stages]);
const handleMarkWon = useCallback(() => handleStageChange(wonStageKey), [handleStageChange, wonStageKey]);
const handleMarkLost = useCallback(() => handleStageChange(lostStageKey), [handleStageChange, lostStageKey]);
```

- [ ] **Step 11: Fix `won` stage detection for "Create Project" button**

```ts
const isWonDeal = useMemo(() => {
  const stageInfo = stages.find((s) => s.key === deal?.stage);
  return stageInfo?.stageType === "won";
}, [deal, stages]);
```

Replace `deal.stage === "WON"` with `isWonDeal`.

- [ ] **Step 12: Pass `pipelineId` to `DealSidebarCards`**

The `DealSidebarCards` component will receive `pipelineId` as a new prop. Pass `pipelineId={deal.pipelineId}`.

- [ ] **Step 13: Verify the :444 error is now fixed**

The original error was that `DealSidebarCards` may have had a prop mismatch. After Task 16 adds `pipelineId` as an optional prop to `DealSidebarCards`, the page.tsx will pass it. Confirm no type errors remain.

---

## Task 16: Upgrade `DealSidebarCards` + new sidebar components

**Files:**
- Modify: `frontend/features/crm/deals/detail/deal-sidebar-cards.tsx`
- Create: `frontend/features/crm/deals/detail/deal-competitors-card.tsx`
- Create: `frontend/features/crm/deals/detail/deal-health-chip.tsx`
- Create: `frontend/features/crm/deals/detail/deal-next-step-inline.tsx`
- Create: `frontend/features/crm/deals/detail/deal-approval-banner.tsx`

- [ ] **Step 1: Read the current deal-sidebar-cards.tsx (191 lines)**

Read `D:\projects\personal\Streamlineos\frontend\features\crm\deals\detail\deal-sidebar-cards.tsx`.

- [ ] **Step 2: Update `DealSidebarCardsProps` to add `pipelineId` + health + nextStep + approval**

```ts
interface DealSidebarCardsProps {
  // ...existing props...
  pipelineId?: string | null;
  forecastCategory?: string | null;
  nextStep?: string | null;
  healthScore?: number | null;
  pendingApproval?: { id: number; requestedStage: string } | null;
}
```

- [ ] **Step 3: Import and add new sub-cards**

```ts
import { DealCompetitorsCard } from "./deal-competitors-card";
import { DealHealthChip } from "./deal-health-chip";
import { DealNextStepInline } from "./deal-next-step-inline";
import { DealApprovalBanner } from "./deal-approval-banner";
```

Add them to the render:
```tsx
{pendingApproval && (
  <DealApprovalBanner approvalId={pendingApproval.id} requestedStage={pendingApproval.requestedStage} dealId={dealId} />
)}
{healthScore !== undefined && healthScore !== null && (
  <DealHealthChip dealId={dealId} />
)}
<DealNextStepInline dealId={dealId} initialValue={nextStep} />
<DealCompetitorsCard dealId={dealId} />
```

- [ ] **Step 4: Create `deal-competitors-card.tsx`**

```tsx
"use client";

import { useState, useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useDealCompetitors, useCreateDealCompetitor, useDeleteDealCompetitor } from "@/hooks/api/crm";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-slate-100 text-slate-700",
  won_against: "bg-emerald-50 text-emerald-700",
  lost_to: "bg-red-50 text-red-700",
};

interface DealCompetitorsCardProps {
  dealId: number;
}

export function DealCompetitorsCard({ dealId }: DealCompetitorsCardProps) {
  const [adding, setAdding] = useState(false);
  const [newKey, setNewKey] = useState("");

  const { data: competitors = [] } = useDealCompetitors(dealId);
  const createCompetitor = useCreateDealCompetitor(dealId);
  const deleteCompetitor = useDeleteDealCompetitor(dealId);

  const handleAdd = useCallback(() => {
    if (!newKey.trim()) return;
    createCompetitor.mutate(
      { competitorKey: newKey.trim() },
      {
        onSuccess: () => {
          setNewKey("");
          setAdding(false);
          toast.success("Competitor added");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [newKey, createCompetitor]);

  const handleDelete = useCallback(
    (id: string) => {
      deleteCompetitor.mutate(id, {
        onSuccess: () => toast.success("Competitor removed"),
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [deleteCompetitor]
  );

  const handleNewKeyChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setNewKey(e.target.value), []);
  const handleOpenAdd = useCallback(() => setAdding(true), []);
  const handleCancelAdd = useCallback(() => { setAdding(false); setNewKey(""); }, []);

  return (
    <Card className="bg-card border border-border rounded-xl shadow-sm">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold">Competitors</CardTitle>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleOpenAdd} aria-label="Add competitor">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {competitors.length === 0 && !adding && (
          <p className="text-xs text-muted-foreground text-center py-2">No competitors tracked</p>
        )}
        {competitors.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium truncate flex-1">{c.competitorKey}</span>
            <Badge className={`text-[10px] px-1.5 py-0 ${STATUS_COLORS[c.status] ?? STATUS_COLORS.active}`}>
              {c.status.replace("_", " ")}
            </Badge>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-red-500" onClick={() => handleDelete(c.id)} aria-label="Remove">
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        {adding && (
          <div className="flex gap-1.5">
            <Input
              value={newKey}
              onChange={handleNewKeyChange}
              placeholder="Competitor name"
              className="h-7 text-xs flex-1"
              autoFocus
            />
            <LoadingButton size="sm" className="h-7 text-xs px-2" isPending={createCompetitor.isPending} onClick={handleAdd}>
              Add
            </LoadingButton>
            <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={handleCancelAdd}>
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 5: Create `deal-health-chip.tsx`**

```tsx
"use client";

import { useDealHealth } from "@/hooks/api/crm";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function scoreColor(score: number) {
  if (score >= 75) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (score >= 45) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-700 border-red-200";
}

interface DealHealthChipProps {
  dealId: number;
}

export function DealHealthChip({ dealId }: DealHealthChipProps) {
  const { data } = useDealHealth(dealId);
  if (!data) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Badge
          variant="outline"
          className={cn("cursor-pointer text-xs px-2 py-0.5 tabular-nums", scoreColor(data.score))}
        >
          Health {data.score}
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-64 text-xs space-y-1.5 p-3" side="left">
        <p className="font-semibold text-sm">Deal Health: {data.score}/100</p>
        {data.reasons.length === 0 ? (
          <p className="text-muted-foreground">No issues detected</p>
        ) : (
          <ul className="space-y-1">
            {data.reasons.map((r) => (
              <li key={r} className="text-muted-foreground">• {r}</li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 6: Create `deal-next-step-inline.tsx`**

```tsx
"use client";

import { useState, useCallback } from "react";
import { Check, Edit2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { usePatchNextStep } from "@/hooks/api/crm";

interface DealNextStepInlineProps {
  dealId: number;
  initialValue?: string | null;
}

export function DealNextStepInline({ dealId, initialValue }: DealNextStepInlineProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialValue ?? "");
  const patchNextStep = usePatchNextStep(dealId);

  const handleEdit = useCallback(() => setEditing(true), []);

  const handleSave = useCallback(() => {
    patchNextStep.mutate(value || null, {
      onSuccess: () => {
        setEditing(false);
        toast.success("Next step updated");
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [value, patchNextStep]);

  const handleCancel = useCallback(() => {
    setValue(initialValue ?? "");
    setEditing(false);
  }, [initialValue]);

  const handleValueChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setValue(e.target.value), []);

  return (
    <Card className="bg-card border border-border rounded-xl shadow-sm">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold">Next Step</CardTitle>
        {!editing && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleEdit} aria-label="Edit next step">
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-2">
            <Textarea
              value={value}
              onChange={handleValueChange}
              placeholder="What's the next action?"
              className="text-xs resize-none"
              rows={3}
              autoFocus
            />
            <div className="flex gap-1.5">
              <LoadingButton size="sm" className="h-7 text-xs gap-1" isPending={patchNextStep.isPending} onClick={handleSave}>
                <Check className="h-3 w-3" />Save
              </LoadingButton>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleCancel}>Cancel</Button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors" onClick={handleEdit}>
            {value || "No next step set — click to add"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 7: Create `deal-approval-banner.tsx`**

```tsx
"use client";

import { useCallback } from "react";
import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useResolveDealApproval } from "@/hooks/api/crm";
import { useCan } from "@/lib/api/hooks/access";

interface DealApprovalBannerProps {
  approvalId: number;
  requestedStage: string;
  dealId: number;
}

export function DealApprovalBanner({ approvalId, requestedStage, dealId }: DealApprovalBannerProps) {
  const canApprove = useCan("crm:deals:approve");
  const resolveApproval = useResolveDealApproval();

  const handleApprove = useCallback(() => {
    resolveApproval.mutate(
      { approvalId, action: "approve" },
      { onSuccess: () => toast.success("Stage approved"), onError: (e) => toast.error(getErrorMessage(e)) }
    );
  }, [approvalId, resolveApproval]);

  const handleReject = useCallback(() => {
    resolveApproval.mutate(
      { approvalId, action: "reject", rejectionReason: "Rejected by approver" },
      { onSuccess: () => toast.success("Stage rejected"), onError: (e) => toast.error(getErrorMessage(e)) }
    );
  }, [approvalId, resolveApproval]);

  return (
    <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 rounded-xl shadow-sm">
      <CardContent className="pt-4 pb-3 space-y-2">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">Approval Pending</p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
              Stage move to <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-300 text-amber-700">{requestedStage}</Badge> requires approval.
            </p>
          </div>
        </div>
        {canApprove && (
          <div className="flex gap-1.5 pl-6">
            <LoadingButton size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" isPending={resolveApproval.isPending} onClick={handleApprove}>
              Approve
            </LoadingButton>
            <LoadingButton size="sm" variant="outline" className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50" isPending={resolveApproval.isPending} onClick={handleReject}>
              Reject
            </LoadingButton>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## Task 17: Update `/crm/deals/page.tsx` — replace DEAL_STAGES with metadata

**Files:**
- Modify: `frontend/app/(authenticated)/crm/deals/page.tsx`

- [ ] **Step 1: Read the current file (475 lines)**

Read `D:\projects\personal\Streamlineos\frontend\app\(authenticated)\crm\deals\page.tsx`.

- [ ] **Step 2: Remove DEAL_STAGES import**

Remove:
```ts
import { DEAL_STAGES } from "@/features/crm/shared/constants";
```

- [ ] **Step 3: Add useCrmStages + useCrmPipelines**

```ts
import { useCrmStages } from "@/hooks/api/crm";
```

After `const { data: allDeals, ... }` add:
```ts
const { data: dealStages = [] } = useCrmStages("deal");
```

- [ ] **Step 4: Replace all `DEAL_STAGES` references**

- `DEAL_STAGES.find((s) => ...)` → `dealStages.find((s) => ...)`
- `for (const s of DEAL_STAGES)` → `for (const s of dealStages)`
- `{DEAL_STAGES.map((s) => ...)}` → `{dealStages.map((s) => ...)}`

- [ ] **Step 5: Update `dealsByStage` useMemo**

```ts
const dealsByStage = useMemo(() => {
  const map: Record<string, Deal[]> = {};
  for (const s of dealStages) map[s.key] = [];
  for (const d of filteredDeals) {
    if (map[d.stage]) map[d.stage].push(d);
  }
  return map;
}, [filteredDeals, dealStages]);
```

- [ ] **Step 6: Update `isActiveDeal` stats calculation**

```ts
const stats = useMemo(() => {
  if (!allDeals) return { total: 0, totalValue: 0, wonValue: 0, avgProbability: 0 };
  const terminalKeys = new Set(dealStages.filter((s) => s.isTerminal).map((s) => s.key));
  const wonKeys = new Set(dealStages.filter((s) => s.stageType === "won").map((s) => s.key));
  const active = allDeals.filter((d) => !terminalKeys.has(d.stage));
  return {
    total: allDeals.length,
    totalValue: active.reduce((s, d) => s + Number(d.value || 0), 0),
    wonValue: allDeals.filter((d) => wonKeys.has(d.stage)).reduce((s, d) => s + Number(d.value || 0), 0),
    avgProbability: active.length > 0 ? Math.round(active.reduce((s, d) => s + (d.probability || 0), 0) / active.length) : 0,
  };
}, [allDeals, dealStages]);
```

- [ ] **Step 7: Update `handleStageChange` to derive WON/LOST by stageType**

Replace the `stage === "WON" || stage === "LOST"` check:
```ts
const handleStageChange = useCallback(
  (id: number, stage: string) => {
    const stageInfo = dealStages.find((s) => s.key === stage);
    if (stageInfo?.isTerminal) {
      const isWon = stageInfo.stageType === "won";
      setWinLossDialog({ id, stage: isWon ? "WON" : "LOST", stageKey: stage });
      // ...
    }
    // ...
  },
  [updateStageMutation, allDeals, dealStages],
);
```

(Update `winLossDialog` state type to include `stageKey: string`.)

---

## Task 18: Update `kanban-column.tsx` — metadata-driven columns

**Files:**
- Modify: `frontend/features/crm/deals/kanban-column.tsx`

- [ ] **Step 1: Read the current file**

Read `D:\projects\personal\Streamlineos\frontend\features\crm\deals\kanban-column.tsx`.

- [ ] **Step 2: Update props to receive `CrmPipelineStage` instead of constant shape**

If the column currently receives a stage constant object, update its type to `CrmPipelineStage` from `@/types/crm/metadata`.

- [ ] **Step 3: Add WIP count + value sum display**

In the column header:
```tsx
const totalValue = deals.reduce((s, d) => s + Number(d.value || 0), 0);
// Display: "{deals.length} deals · ₹{formatINR(totalValue)}"
```

- [ ] **Step 4: Tint won/lost columns semantically**

```tsx
const isTinted = stage.stageType === "won" || stage.stageType === "lost";
const tintClass = stage.stageType === "won"
  ? "bg-emerald-50/40 border-emerald-200/50"
  : stage.stageType === "lost"
    ? "bg-red-50/40 border-red-200/50"
    : "";
```

---

## Task 19: Update `forecast/page.tsx` — snapshots + compare

**Files:**
- Modify: `frontend/app/(authenticated)/crm/deals/forecast/page.tsx`

- [ ] **Step 1: Read the current file**

Read `D:\projects\personal\Streamlineos\frontend\app\(authenticated)\crm\deals\forecast\page.tsx`.

- [ ] **Step 2: Add snapshot controls**

Import:
```ts
import { useCreateForecastSnapshot, useForecastSnapshots, useCompareForecastSnapshots } from "@/hooks/api/crm";
import { LoadingButton } from "@/components/ui/loading-button";
import type { ForecastSnapshot } from "@/types/crm";
```

Add state for comparison:
```ts
const [selectedA, setSelectedA] = useState<string | null>(null);
const [selectedB, setSelectedB] = useState<string | null>(null);
```

- [ ] **Step 3: Add snapshot capture button**

```tsx
const createSnapshot = useCreateForecastSnapshot();
const handleCapture = useCallback(() => {
  const period = new Date().toISOString().slice(0, 7);
  createSnapshot.mutate({ period }, {
    onSuccess: () => toast.success("Snapshot captured"),
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}, [createSnapshot]);
```

In the page actions:
```tsx
<LoadingButton isPending={createSnapshot.isPending} onClick={handleCapture} size="sm" variant="outline">
  Capture Snapshot
</LoadingButton>
```

- [ ] **Step 4: Render snapshots list + compare view**

Add a section below forecast chart:
```tsx
const { data: snapshots = [] } = useForecastSnapshots();
const { data: compareData } = useCompareForecastSnapshots(selectedA, selectedB);

// Snapshot list: shows period, capturedAt, totalWeighted in monospace
// Compare view: two columns showing delta values, emerald for positive, red for negative
```

---

## Task 20: Update `approvals/page.tsx` — approve/reject inline + resolveStage labels

**Files:**
- Modify: `frontend/app/(authenticated)/crm/deals/approvals/page.tsx`

- [ ] **Step 1: Read the current file**

Read `D:\projects\personal\Streamlineos\frontend\app\(authenticated)\crm\deals\approvals\page.tsx`.

- [ ] **Step 2: Replace any hardcoded stage labels with `resolveStage`**

Import `useCrmStages, resolveStage` and resolve stage labels for `requestedStage` column.

- [ ] **Step 3: Add inline approve/reject buttons with optimistic update**

```tsx
const resolveApproval = useResolveDealApproval();
// Optimistic: immediately update local status in the approvals list before server response
```

---

## Task 21: Update `win-loss/page.tsx` and `aging/page.tsx` — metadata-driven labels

**Files:**
- Modify: `frontend/app/(authenticated)/crm/deals/win-loss/page.tsx`
- Modify: `frontend/app/(authenticated)/crm/deals/aging/page.tsx`

- [ ] **Step 1: Read both files**

Read each file to see where stage literals are used.

- [ ] **Step 2: Replace WON/LOST literals in win-loss page**

Import `useCrmStages` and derive won/lost stage keys from stageType metadata. The filter for "won" deals should use `stages.filter((s) => s.stageType === "won").map((s) => s.key)`.

- [ ] **Step 3: Replace stage labels in aging page**

Import `resolveStage` and replace any `stage` text rendering with `resolveStage(stages, deal.stage).label`.

---

## Task 22: Backend typecheck verification

**Files:** None new — verification step

- [ ] **Step 1: Run backend typecheck**

```bash
cd D:\projects\personal\Streamlineos
pnpm -C backend typecheck
```

Expected: Only pre-existing errors in `modules/projects-*` and `accounting/finance` files. No new errors from deals module changes.

- [ ] **Step 2: Fix any new type errors introduced by this task**

Common patterns to watch:
- `pipelineId` on deals is `text | null` in schema → ensure TS types match `string | null`
- `approverRole: text("approver_role")` without `.notNull()` → type is `string | null`, update DTOs accordingly
- New `crmDealCompetitors` may need `$inferSelect` type for service return types
- `ForecastSnapshotData` used in jsonb → ensure `.default({} as ForecastSnapshotData)` compiles (use `notNull()` with a default or mark nullable)

---

## Task 23: Frontend typecheck verification

**Files:** None new — verification step

- [ ] **Step 1: Run frontend typecheck**

```bash
cd D:\projects\personal\Streamlineos
pnpm -C frontend typecheck
```

Expected: 0 errors in files touched by this plan.

- [ ] **Step 2: Fix any type errors**

Common patterns:
- `DealStage` is now `string` — any code that switches on `DealStage` values needs to remove exhaustive narrowing or update to use stageType metadata
- `winLossDialog` state type extension (added `stageKey`) needs all usages updated
- `resolveStage` returns `CrmPipelineStage | { key: string; label: string; color: string }` — need to check for `color` property before using it in template literals (Tailwind purge issue — use inline styles for dynamic colors instead of dynamic class names)

- [ ] **Step 3: Fix Tailwind dynamic color class issue**

Dynamic Tailwind classes like `bg-${color}-50` are purged. Replace with:
```tsx
import { getCrmTokenClasses } from "@/features/crm/shared/metadata";
// or use inline style:
style={{ backgroundColor: `var(--crm-${stage.color}, #f1f5f9)` }}
```

Check if `getCrmTokenClasses` exists in `features/crm/shared/metadata.tsx`. If it does, use it. If not, create a simple lookup:
```ts
const CRM_COLOR_CLASSES: Record<string, { bg: string; text: string; ring: string }> = {
  blue: { bg: "bg-blue-50", text: "text-blue-700", ring: "ring-blue-300" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-300" },
  amber: { bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-300" },
  red: { bg: "bg-red-50", text: "text-red-700", ring: "ring-red-300" },
  slate: { bg: "bg-slate-50", text: "text-slate-700", ring: "ring-slate-300" },
  sky: { bg: "bg-sky-50", text: "text-sky-700", ring: "ring-sky-300" },
  violet: { bg: "bg-violet-50", text: "text-violet-700", ring: "ring-violet-300" },
  cyan: { bg: "bg-cyan-50", text: "text-cyan-700", ring: "ring-cyan-300" },
  orange: { bg: "bg-orange-50", text: "text-orange-700", ring: "ring-orange-300" },
  pink: { bg: "bg-pink-50", text: "text-pink-700", ring: "ring-pink-300" },
};
function getStageColorClasses(color: string) {
  return CRM_COLOR_CLASSES[color] ?? CRM_COLOR_CLASSES.slate;
}
```

Place this in `features/crm/deals/detail/stage-color-utils.ts`.

---

## Integration notes

**Automation events (Task 6, step 5):**
- `deal.won` and `deal.lost` webhook events are dispatched via `WebhooksDispatchService` already in place
- CRM automation studio (`crm-automation-studio` module) — if it exists, it consumes these events via its event bus. The deals service should check: `if (module exists) emit; else no-op`. Since we must not edit that module, simply ensure `WebhooksDispatchService.dispatch` is called — the automation module listens on webhooks separately.

**Stakeholders card:**
- Read-only consumption of contact-roles from the contacts module endpoint: `GET /contacts/roles?entityType=deal&entityId={dealId}`
- The `deal-stakeholders-card.tsx` component just calls `useQuery` on this endpoint and renders a list of contacts with links. No write operations — pure display.
- Endpoint is owned by contacts module (parallel agent) — do NOT modify that module. Simply consume.

**Won-deal → project creation:**
- Existing `apiClient.post("/projects/from-deal", ...)` in page.tsx is the integration point. Do NOT build project provisioning logic — it exists in the projects module. The integration is already wired; preserve it.

---

## Verification checklist

After all tasks complete:

- [ ] `pnpm -C backend typecheck` — 0 new errors
- [ ] `pnpm -C backend test deals-transition.spec.ts deals-forecast.spec.ts` — all pass
- [ ] `pnpm -C frontend typecheck` — 0 errors in deals files
- [ ] Migration SQL file `0250_crm_deals_process.sql` exists and `_journal.json` appended
- [ ] `DEAL_STAGES` hardcoded constant no longer used in any files under `app/(authenticated)/crm/deals/**`
- [ ] Stage literals `"WON"` / `"LOST"` no longer appear in `deals.service.ts` or `deals-analytics.service.ts`
- [ ] `STAGE_PROBABILITIES` constant deleted from `deals-analytics.service.ts`
- [ ] `dealStageSchema` is `z.string().min(1)`, not `z.enum`
- [ ] `approverRole: text(...).default("CEO")` removed from schema
- [ ] `crm:deals:approve` and `crm:deals:forecast` in permissions catalog
- [ ] Deal detail page loads without TS errors (the `:444` fix confirmed)
- [ ] `deal-ai-insights-card.tsx` still renders (not removed/broken)
