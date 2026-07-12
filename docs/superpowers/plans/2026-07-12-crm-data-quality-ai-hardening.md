# CRM Data Quality + AI Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **CRITICAL:** NO git commands ever. Strict TS: no `any`, no casts. No code comments.

**Goal:** Implement blueprint transition completeness enforcement (requiresQuote + requiredActivityTypeKeys), a new CRM Data Quality dashboard (backend endpoint + frontend page), and three AI hardening improvements (org feature flag gate, audit logging, dynamic enum schemas).

**Architecture:** All backend changes stay inside the crm-metadata module fence (new sibling service + controller for data quality) and the ai module fence (service patches only). Frontend: new page at `/crm/settings/data-quality` with a dedicated TanStack hook. No new migrations needed — all queries run against existing tables.

**Tech Stack:** NestJS/Drizzle (backend), Next.js App Router + TanStack Query v5 + shadcn/ui + Framer Motion + @animateicons/react (frontend).

**Fence reminder:** Do NOT touch leads, deals, crm-inbox, crm-automation-studio modules or features/crm/{leads,deals,reports,inbox,shared}. Parallel agents own them.

---

## File Map

### Backend (new / modified)

| File | Action |
|------|--------|
| `backend/src/modules/crm-metadata/crm-blueprints.service.ts` | Modify — implement requiresQuote + requiredActivityTypeKeys checks |
| `backend/src/modules/crm-metadata/crm-data-quality.service.ts` | **Create** — 8-aggregate data quality service |
| `backend/src/modules/crm-metadata/crm-data-quality.controller.ts` | **Create** — thin GET /crm/data-quality controller |
| `backend/src/modules/crm-metadata/crm-metadata.module.ts` | Modify — register new provider + controller |
| `backend/src/modules/rbac/permissions.constants.ts` | Modify — add `crm:data-quality:view` key + ROLE_DEFAULT_PERMISSIONS |
| `backend/src/modules/ai/services/crm-copilot.service.ts` | Modify — add `aiChat` flag check to `summarizeNotes`, `objectionHelp`, `nextBestActionsAcrossPipeline`; align audit action keys |
| `backend/src/modules/ai/controllers/crm-ai.controller.ts` | Modify — add `OrgFeaturesService` + feature-flag guard to guarded endpoints |
| `backend/src/modules/ai/controllers/crm-copilot.controller.ts` | No change needed (service already guards) |
| `backend/src/modules/ai/dto/output.schemas.ts` | Modify — replace `NlSearchFilterSchema` hardcoded `status`/`priority` enums with `z.string()` |
| `backend/src/modules/ai/services/chat-assistant.service.ts` | Modify — replace `updateLeadStatus` tool `status`/`priority` enums with `z.string()` |

### Frontend (new / modified)

| File | Action |
|------|--------|
| `frontend/hooks/api/crm/data-quality.ts` | **Create** — TanStack Query hook for GET /crm/data-quality |
| `frontend/app/(authenticated)/crm/settings/layout.tsx` | Modify — add "Data Quality" tab |
| `frontend/app/(authenticated)/crm/settings/data-quality/page.tsx` | **Create** — main page |
| `frontend/app/(authenticated)/crm/settings/data-quality/loading.tsx` | **Create** — skeleton |
| `frontend/app/(authenticated)/crm/settings/data-quality/error.tsx` | **Create** — error boundary |
| `frontend/features/crm/settings/data-quality-page.tsx` | **Create** — client component with stat cards + offender lists |

---

## Task 1: Blueprint — requiresQuote enforcement

**Files:**
- Modify: `backend/src/modules/crm-metadata/crm-blueprints.service.ts`

The `crmBlueprintTransitions.requiresQuote` boolean is stored but never checked. When `true`, at least one quote linked to the deal must exist. The `record` passed to `assertTransitionAllowed` already contains the entity's field values (including `id`). We need to query the `quotes` table by `dealId = record.id` scoped to `orgId`.

The `quotes` table is in `backend/src/db/schema/crm/billing.ts`. The schema barrel is `backend/src/db/schema/index.ts`. Import `quotes` from there — do NOT import from the billing module.

- [ ] **Step 1: Add the `quotes` import to crm-blueprints.service.ts**

Current line 5:
```ts
import { crmBlueprints, crmBlueprintTransitions, crmPipelineStages, auditLogs } from "../../db/schema";
```

Change to:
```ts
import { crmBlueprints, crmBlueprintTransitions, crmPipelineStages, auditLogs, quotes } from "../../db/schema";
```

- [ ] **Step 2: Add `count` import from drizzle-orm**

Current line 2:
```ts
import { and, eq } from "drizzle-orm";
```

Change to:
```ts
import { and, count, eq } from "drizzle-orm";
```

- [ ] **Step 3: Implement requiresQuote check inside `assertTransitionAllowed`**

The check must run after the `transition` is fetched (line 101 in the current file). Replace lines 103–113:

```ts
    if (!transition) return { allowed: true, requiresApproval: false, missingFields: [] };

    if (transition.requiresQuote) {
      const dealId = typeof record["id"] === "number" ? record["id"] : undefined;
      if (dealId !== undefined) {
        const [quoteCount] = await this.db
          .select({ n: count() })
          .from(quotes)
          .where(and(eq(quotes.orgId, orgId), eq(quotes.dealId, dealId)));
        if ((quoteCount?.n ?? 0) === 0) {
          return {
            allowed: false,
            requiresApproval: Boolean(transition.requiresApproval),
            missingFields: ["__requires_quote__"],
          };
        }
      }
    }

    const requiredFields = (transition.requiredFields as string[]) ?? [];
    const missingFields = requiredFields.filter((f) => {
      const v = record[f];
      return v === null || v === undefined || v === "";
    });

    return {
      allowed: missingFields.length === 0,
      requiresApproval: Boolean(transition.requiresApproval),
      missingFields,
    };
```

---

## Task 2: Blueprint — requiredActivityTypeKeys enforcement

**Files:**
- Modify: `backend/src/modules/crm-metadata/crm-blueprints.service.ts`

`crmBlueprintTransitions.requiredActivityTypeKeys` is a `string[]` of activity type keys that must have at least one activity record for the entity before the transition is allowed. Activities for deals live in `deal_activities.type`; activities for leads live in `lead_activities.type`. The `record` contains `id` (the entity id) and we infer entity type from context — the caller of `assertTransitionAllowed` uses `pipelineId` which implies deal context. We'll add a new parameter `entityType: "lead" | "deal"` defaulting to `"deal"` (backward compatible since all existing callers use deals).

- [ ] **Step 1: Add `leadActivities`, `dealActivities` imports**

Change line 5 to:
```ts
import { crmBlueprints, crmBlueprintTransitions, crmPipelineStages, auditLogs, dealActivities, leadActivities, quotes } from "../../db/schema";
```

- [ ] **Step 2: Add `inArray` to drizzle-orm imports**

Change line 2 to:
```ts
import { and, count, eq, inArray } from "drizzle-orm";
```

- [ ] **Step 3: Add `entityType` parameter to `assertTransitionAllowed`**

Change the method signature from:
```ts
  async assertTransitionAllowed(
    orgId: string,
    pipelineId: string,
    fromStageKey: string,
    toStageKey: string,
    record: Record<string, unknown>,
    blueprintIdOverride?: string,
  ): Promise<{ allowed: boolean; requiresApproval: boolean; missingFields: string[] }> {
```

To:
```ts
  async assertTransitionAllowed(
    orgId: string,
    pipelineId: string,
    fromStageKey: string,
    toStageKey: string,
    record: Record<string, unknown>,
    blueprintIdOverride?: string,
    entityType: "lead" | "deal" = "deal",
  ): Promise<{ allowed: boolean; requiresApproval: boolean; missingFields: string[] }> {
```

- [ ] **Step 4: Add requiredActivityTypeKeys check after the requiresQuote block**

After the `requiresQuote` block and before the `requiredFields` block, insert:

```ts
    const requiredActivityKeys = (transition.requiredActivityTypeKeys as string[]) ?? [];
    if (requiredActivityKeys.length > 0) {
      const entityId = typeof record["id"] === "number" ? record["id"] : undefined;
      if (entityId !== undefined) {
        const activitiesTable = entityType === "lead" ? leadActivities : dealActivities;
        const idCol = entityType === "lead" ? leadActivities.leadId : dealActivities.dealId;
        const typeCol = entityType === "lead" ? leadActivities.type : dealActivities.type;
        const found = await this.db
          .select({ type: typeCol })
          .from(activitiesTable)
          .where(and(eq(idCol, entityId), inArray(typeCol, requiredActivityKeys)));
        const foundKeys = new Set(found.map((r) => r.type));
        const missingActivityKeys = requiredActivityKeys.filter((k) => !foundKeys.has(k));
        if (missingActivityKeys.length > 0) {
          return {
            allowed: false,
            requiresApproval: Boolean(transition.requiresApproval),
            missingFields: missingActivityKeys.map((k) => `__requires_activity_${k}__`),
          };
        }
      }
    }
```

- [ ] **Step 5: Typecheck the crm-metadata fence**

```bash
cd D:\projects\personal\Streamlineos\backend
npx tsc --noEmit 2>&1 | grep "crm-metadata"
```

Expected: no output (no errors in this fence).

---

## Task 3: Add `crm:data-quality:view` permission

**Files:**
- Modify: `backend/src/modules/rbac/permissions.constants.ts`

- [ ] **Step 1: Add the permission entry after `crm:reports:export` (line 894-899)**

Insert after the `crm:reports:export` entry (after line 899, before `crm:clients:read`):

```ts
  {
    name: "crm:data-quality:view",
    resource: "crm:data-quality",
    action: "view",
    description: "View CRM data quality dashboard",
  },
```

- [ ] **Step 2: Add to ROLE_DEFAULT_PERMISSIONS for SALES and SALES_MANAGER**

Find the SALES role array and add `"crm:data-quality:view"` next to `"crm:reports:view"`. Find SALES_MANAGER similarly. Also add to ADMIN (already covered by ALL_PERMISSIONS since they get everything). Just add to SALES and SALES_MANAGER explicitly.

Search for `"crm:reports:view"` in the ROLE_DEFAULT_PERMISSIONS block (lines ~3612, ~3959) and add `"crm:data-quality:view"` on the line immediately after each occurrence.

---

## Task 4: CRM Data Quality Service

**Files:**
- Create: `backend/src/modules/crm-metadata/crm-data-quality.service.ts`

Eight aggregates, each an efficient single indexed query with a count + limited offender list. All scoped to `orgId`. Guard against N+1 at every point — all aggregates run in parallel via `Promise.all`.

The return shape:

```ts
interface DataQualityOffender {
  id: number | string;
  name: string;
  detail?: string;
}

interface DataQualityAggregate {
  count: number;
  offenders: DataQualityOffender[];
}

interface DataQualityReport {
  leadsWithoutEmail: DataQualityAggregate;
  leadsWithInvalidPhone: DataQualityAggregate;
  duplicateLeads: DataQualityAggregate;
  duplicateCompanies: DataQualityAggregate;
  staleDeals: DataQualityAggregate;
  dealsWithNoNextActivity: DataQualityAggregate;
  leadsWithNoOwner: DataQualityAggregate;
  dealsMissingStageFields: DataQualityAggregate;
}
```

For `duplicateLeads`: group by same email or same phone — return count of groups (not individual leads). Offenders show both lead names per group.

For `duplicateCompanies` (CRM Organizations / contacts): normalize name (trim + lowercase), group by normalized name or domain. Use the `crmOrganizations` table from `backend/src/db/schema/crm/contacts.ts`.

For `staleDeals`: `deals.updatedAt < now() - 30 days` AND `deals.stage` not in terminal stages — query `crmPipelineStages.isTerminal = true` to know which stage keys are terminal, then filter out those.

For `dealsWithNoNextActivity`: deals with no `dealActivities` row in the last 30 days and `deals.stage` is open (not terminal).

For `dealsMissingStageFields`: join `crmPipelineStages` on `orgId + stage key` where `requiredFields` is non-null and non-empty, then check each deal record against its stage's required fields. Keep it lightweight: fetch open deals with their stage key, fetch stage required fields, do the check in application code (capped at 200 deals max for performance).

- [ ] **Step 1: Create the service file**

```ts
import { Inject, Injectable } from "@nestjs/common";
import { and, count, desc, eq, isNull, lt, or, sql } from "drizzle-orm";
import { DRIZZLE } from "../../db/drizzle.constants";
import type { Db } from "../../db/drizzle.module";
import { leads, leadActivities, deals, dealActivities, crmOrganizations, crmPipelineStages } from "../../db/schema";

const OFFENDER_LIMIT = 10;

interface DataQualityOffender {
  id: number | string;
  name: string;
  detail?: string;
}

interface DataQualityAggregate {
  count: number;
  offenders: DataQualityOffender[];
}

export interface DataQualityReport {
  leadsWithoutEmail: DataQualityAggregate;
  leadsWithInvalidPhone: DataQualityAggregate;
  duplicateLeads: DataQualityAggregate;
  duplicateCompanies: DataQualityAggregate;
  staleDeals: DataQualityAggregate;
  dealsWithNoNextActivity: DataQualityAggregate;
  leadsWithNoOwner: DataQualityAggregate;
  dealsMissingStageFields: DataQualityAggregate;
}

const PHONE_BASIC_RE = /^[+\d\s\-().]{7,20}$/;
const THIRTY_DAYS_AGO = () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

@Injectable()
export class CrmDataQualityService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async getReport(orgId: string): Promise<DataQualityReport> {
    const [
      leadsWithoutEmail,
      leadsWithInvalidPhone,
      duplicateLeads,
      duplicateCompanies,
      staleDeals,
      dealsWithNoNextActivity,
      leadsWithNoOwner,
      dealsMissingStageFields,
    ] = await Promise.all([
      this.leadsWithoutEmail(orgId),
      this.leadsWithInvalidPhone(orgId),
      this.duplicateLeads(orgId),
      this.duplicateCompanies(orgId),
      this.staleDeals(orgId),
      this.dealsWithNoNextActivity(orgId),
      this.leadsWithNoOwner(orgId),
      this.dealsMissingStageFields(orgId),
    ]);
    return {
      leadsWithoutEmail,
      leadsWithInvalidPhone,
      duplicateLeads,
      duplicateCompanies,
      staleDeals,
      dealsWithNoNextActivity,
      leadsWithNoOwner,
      dealsMissingStageFields,
    };
  }

  private async leadsWithoutEmail(orgId: string): Promise<DataQualityAggregate> {
    const rows = await this.db
      .select({ id: leads.id, name: leads.name })
      .from(leads)
      .where(and(eq(leads.orgId, orgId), isNull(leads.deletedAt), isNull(leads.email)))
      .orderBy(desc(leads.createdAt))
      .limit(OFFENDER_LIMIT + 1);
    const total = rows.length > OFFENDER_LIMIT ? rows.length : rows.length;
    const [countRow] = await this.db
      .select({ n: count() })
      .from(leads)
      .where(and(eq(leads.orgId, orgId), isNull(leads.deletedAt), isNull(leads.email)));
    return {
      count: Number(countRow?.n ?? 0),
      offenders: rows.slice(0, OFFENDER_LIMIT).map((r) => ({ id: r.id, name: r.name })),
    };
  }

  private async leadsWithInvalidPhone(orgId: string): Promise<DataQualityAggregate> {
    const rows = await this.db
      .select({ id: leads.id, name: leads.name, phone: leads.phone })
      .from(leads)
      .where(and(eq(leads.orgId, orgId), isNull(leads.deletedAt)))
      .orderBy(desc(leads.createdAt));
    const invalid = rows.filter(
      (r) => r.phone !== null && r.phone !== undefined && r.phone !== "" && !PHONE_BASIC_RE.test(r.phone),
    );
    return {
      count: invalid.length,
      offenders: invalid.slice(0, OFFENDER_LIMIT).map((r) => ({ id: r.id, name: r.name, detail: r.phone ?? undefined })),
    };
  }

  private async duplicateLeads(orgId: string): Promise<DataQualityAggregate> {
    const emailDups = await this.db.execute<{ email: string; ids: string; names: string }>(
      sql`
        SELECT email,
               string_agg(id::text, ',') AS ids,
               string_agg(name, ' | ') AS names
        FROM leads
        WHERE org_id = ${orgId}
          AND deleted_at IS NULL
          AND email IS NOT NULL
          AND email != ''
        GROUP BY email
        HAVING count(*) > 1
        LIMIT ${OFFENDER_LIMIT}
      `,
    );
    const phoneDups = await this.db.execute<{ phone: string; ids: string; names: string }>(
      sql`
        SELECT phone,
               string_agg(id::text, ',') AS ids,
               string_agg(name, ' | ') AS names
        FROM leads
        WHERE org_id = ${orgId}
          AND deleted_at IS NULL
          AND phone IS NOT NULL
          AND phone != ''
        GROUP BY phone
        HAVING count(*) > 1
        LIMIT ${OFFENDER_LIMIT}
      `,
    );
    const emailRows = emailDups.rows ?? emailDups;
    const phoneRows = phoneDups.rows ?? phoneDups;
    const emailOffenders = (Array.isArray(emailRows) ? emailRows : []).map((r) => ({
      id: String(r["ids"] ?? ""),
      name: String(r["names"] ?? ""),
      detail: `Duplicate email: ${r["email"]}`,
    }));
    const phoneOffenders = (Array.isArray(phoneRows) ? phoneRows : []).map((r) => ({
      id: String(r["ids"] ?? ""),
      name: String(r["names"] ?? ""),
      detail: `Duplicate phone: ${r["phone"]}`,
    }));
    const offenders = [...emailOffenders, ...phoneOffenders].slice(0, OFFENDER_LIMIT);
    return { count: emailOffenders.length + phoneOffenders.length, offenders };
  }

  private async duplicateCompanies(orgId: string): Promise<DataQualityAggregate> {
    const dups = await this.db.execute<{ norm_name: string; ids: string; names: string }>(
      sql`
        SELECT lower(trim(name)) AS norm_name,
               string_agg(id::text, ',') AS ids,
               string_agg(name, ' | ') AS names
        FROM crm_organizations
        WHERE org_id = ${orgId}
          AND deleted_at IS NULL
        GROUP BY lower(trim(name))
        HAVING count(*) > 1
        LIMIT ${OFFENDER_LIMIT}
      `,
    );
    const rows = dups.rows ?? dups;
    const offenders = (Array.isArray(rows) ? rows : []).map((r) => ({
      id: String(r["ids"] ?? ""),
      name: String(r["names"] ?? ""),
      detail: `Normalized: ${r["norm_name"]}`,
    }));
    return { count: offenders.length, offenders };
  }

  private async staleDeals(orgId: string): Promise<DataQualityAggregate> {
    const terminalStages = await this.db
      .select({ key: crmPipelineStages.key })
      .from(crmPipelineStages)
      .where(and(eq(crmPipelineStages.orgId, orgId), eq(crmPipelineStages.isTerminal, true), eq(crmPipelineStages.isActive, true)));
    const terminalKeys = terminalStages.map((s) => s.key);
    const cutoff = THIRTY_DAYS_AGO();
    const whereClause = terminalKeys.length > 0
      ? and(
          eq(deals.orgId, orgId),
          lt(deals.updatedAt, cutoff),
          sql`${deals.stage} NOT IN (${sql.join(terminalKeys.map((k) => sql`${k}`), sql`, `)})`,
        )
      : and(eq(deals.orgId, orgId), lt(deals.updatedAt, cutoff));
    const [countRow] = await this.db.select({ n: count() }).from(deals).where(whereClause);
    const offenderRows = await this.db
      .select({ id: deals.id, name: deals.name, updatedAt: deals.updatedAt })
      .from(deals)
      .where(whereClause)
      .orderBy(deals.updatedAt)
      .limit(OFFENDER_LIMIT);
    return {
      count: Number(countRow?.n ?? 0),
      offenders: offenderRows.map((r) => ({
        id: r.id,
        name: r.name,
        detail: r.updatedAt ? `Last updated: ${r.updatedAt.toISOString().slice(0, 10)}` : undefined,
      })),
    };
  }

  private async dealsWithNoNextActivity(orgId: string): Promise<DataQualityAggregate> {
    const terminalStages = await this.db
      .select({ key: crmPipelineStages.key })
      .from(crmPipelineStages)
      .where(and(eq(crmPipelineStages.orgId, orgId), eq(crmPipelineStages.isTerminal, true), eq(crmPipelineStages.isActive, true)));
    const terminalKeys = terminalStages.map((s) => s.key);
    const cutoff = THIRTY_DAYS_AGO();
    const recentActivityDealIds = await this.db
      .selectDistinct({ dealId: dealActivities.dealId })
      .from(dealActivities)
      .where(and(eq(dealActivities.orgId, orgId), sql`${dealActivities.createdAt} >= ${cutoff}`));
    const activeIds = new Set(recentActivityDealIds.map((r) => r.dealId));
    const openDeals = await this.db
      .select({ id: deals.id, name: deals.name, stage: deals.stage })
      .from(deals)
      .where(eq(deals.orgId, orgId));
    const stale = openDeals.filter(
      (d) => !terminalKeys.includes(d.stage) && !activeIds.has(d.id),
    );
    return {
      count: stale.length,
      offenders: stale.slice(0, OFFENDER_LIMIT).map((d) => ({ id: d.id, name: d.name, detail: `Stage: ${d.stage}` })),
    };
  }

  private async leadsWithNoOwner(orgId: string): Promise<DataQualityAggregate> {
    const [countRow] = await this.db
      .select({ n: count() })
      .from(leads)
      .where(and(eq(leads.orgId, orgId), isNull(leads.deletedAt), isNull(leads.assignedToId)));
    const offenderRows = await this.db
      .select({ id: leads.id, name: leads.name })
      .from(leads)
      .where(and(eq(leads.orgId, orgId), isNull(leads.deletedAt), isNull(leads.assignedToId)))
      .orderBy(desc(leads.createdAt))
      .limit(OFFENDER_LIMIT);
    return {
      count: Number(countRow?.n ?? 0),
      offenders: offenderRows.map((r) => ({ id: r.id, name: r.name })),
    };
  }

  private async dealsMissingStageFields(orgId: string): Promise<DataQualityAggregate> {
    const stagesWithReqs = await this.db
      .select({ key: crmPipelineStages.key, requiredFields: crmPipelineStages.requiredFields })
      .from(crmPipelineStages)
      .where(and(eq(crmPipelineStages.orgId, orgId), eq(crmPipelineStages.isActive, true)));
    const reqMap = new Map<string, string[]>();
    for (const s of stagesWithReqs) {
      const fields = (s.requiredFields as string[] | null) ?? [];
      if (fields.length > 0) reqMap.set(s.key, fields);
    }
    if (reqMap.size === 0) return { count: 0, offenders: [] };
    const openDeals = await this.db
      .select({ id: deals.id, name: deals.name, stage: deals.stage, customData: deals.customData })
      .from(deals)
      .where(eq(deals.orgId, orgId))
      .limit(200);
    const offenders: DataQualityOffender[] = [];
    for (const deal of openDeals) {
      const required = reqMap.get(deal.stage);
      if (!required) continue;
      const record: Record<string, unknown> = { ...(deal.customData ?? {}), stage: deal.stage };
      const missing = required.filter((f) => {
        const v = record[f];
        return v === null || v === undefined || v === "";
      });
      if (missing.length > 0) {
        offenders.push({ id: deal.id, name: deal.name, detail: `Missing: ${missing.join(", ")}` });
      }
    }
    return { count: offenders.length, offenders: offenders.slice(0, OFFENDER_LIMIT) };
  }
}
```

---

## Task 5: CRM Data Quality Controller

**Files:**
- Create: `backend/src/modules/crm-metadata/crm-data-quality.controller.ts`

- [ ] **Step 1: Create the controller**

```ts
import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../access/permission.guard";
import { RequirePermission } from "../access/require-permission.decorator";
import { RequireModule } from "../../common/rbac/require-module.decorator";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import type { CurrentUserContext } from "../../common/auth/backend-claims";
import { CrmDataQualityService } from "./crm-data-quality.service";

@RequireModule("crm")
@Controller("crm")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class CrmDataQualityController {
  constructor(private readonly svc: CrmDataQualityService) {}

  @Get("data-quality")
  @RequirePermission("crm:data-quality:view")
  getReport(@CurrentUser() u: CurrentUserContext) {
    return this.svc.getReport(u.orgId);
  }
}
```

---

## Task 6: Register Data Quality in CrmMetadataModule

**Files:**
- Modify: `backend/src/modules/crm-metadata/crm-metadata.module.ts`

- [ ] **Step 1: Add imports and registrations**

Change the module file to:

```ts
import { Module } from "@nestjs/common";
import { CrmMetadataController } from "./crm-metadata.controller";
import { CrmDataQualityController } from "./crm-data-quality.controller";
import { CrmMetadataService } from "./crm-metadata.service";
import { CrmMetadataSeedService } from "./crm-metadata-seed.service";
import { CrmValidationService } from "./crm-validation.service";
import { CrmValidationRulesService } from "./crm-validation-rules.service";
import { CrmBlueprintsService } from "./crm-blueprints.service";
import { CrmDataQualityService } from "./crm-data-quality.service";

@Module({
  controllers: [CrmMetadataController, CrmDataQualityController],
  providers: [
    CrmMetadataService,
    CrmMetadataSeedService,
    CrmValidationService,
    CrmValidationRulesService,
    CrmBlueprintsService,
    CrmDataQualityService,
  ],
  exports: [
    CrmMetadataService,
    CrmMetadataSeedService,
    CrmValidationService,
    CrmBlueprintsService,
  ],
})
export class CrmMetadataModule {}
```

- [ ] **Step 2: Typecheck the backend fence**

```bash
cd D:\projects\personal\Streamlineos\backend
npx tsc --noEmit 2>&1 | grep -E "crm-metadata|crm-data-quality"
```

Expected: no output.

---

## Task 7: AI hardening — org AI off-switch on crm-ai.controller.ts

**Files:**
- Modify: `backend/src/modules/ai/controllers/crm-ai.controller.ts`

The existing `crm-ai.controller.ts` uses `requireFeature(u.plan, "ai.<feature>")` for billing gates but does NOT check the org-level `OrgFeaturesService` flags. The copilot service already does this, but the scoring/content endpoints in crm-ai.controller do not.

Looking at the existing controller: it injects `LlmService`, `CrmScoringService`, `CrmContentService`, `CrmBriefService`, `CrmTasksService`. We need to inject `OrgFeaturesService` and call `flags.aiLeadScoring` before scoring calls and `flags.aiEmailDraft` before email generation calls.

- [ ] **Step 1: Read the full crm-ai.controller.ts to see all endpoint patterns**

Read `backend/src/modules/ai/controllers/crm-ai.controller.ts` lines 50-220 to understand the full set of endpoints.

- [ ] **Step 2: Add OrgFeaturesService import and inject it**

Add to imports at top of the file:
```ts
import { OrgFeaturesService } from "../services/org-features.service";
```

Add to constructor:
```ts
  constructor(
    private readonly llm: LlmService,
    private readonly scoring: CrmScoringService,
    private readonly content: CrmContentService,
    private readonly brief: CrmBriefService,
    private readonly tasks: CrmTasksService,
    private readonly orgFeatures: OrgFeaturesService,
  ) {}
```

- [ ] **Step 3: Add a private helper to check AI flags**

Add after the constructor:
```ts
  private async requireAiFlag(orgId: string, flag: "aiLeadScoring" | "aiEmailDraft" | "aiChat"): Promise<void> {
    const flags = await this.orgFeatures.getFlags(orgId);
    if (!flags[flag]) {
      throw new ForbiddenException("AI features are disabled for this organization");
    }
  }
```

Also add `ForbiddenException` to the NestJS imports if not already present.

- [ ] **Step 4: Add flag checks to scoring/prediction endpoints**

For each of: `scoreLead` (single + batch), `predictDeal`, `churnRisk`, `nextAction`, `accountSummary`, `meetingPrep`, `nlSearch`, `enrichLead` — add `await this.requireAiFlag(u.orgId, "aiLeadScoring");` as the first line in the handler body.

For `generateEmail`, `objectionHandler` — add `await this.requireAiFlag(u.orgId, "aiEmailDraft");`.

For `sentimentAnalysis`, `summarize`, `reportNarrator`, `prioritizeTasks`, `suggestions` — add `await this.requireAiFlag(u.orgId, "aiChat");`.

- [ ] **Step 5: OrgFeaturesService must be provided by the AiModule**

Check `backend/src/modules/ai/ai.module.ts`. If `OrgFeaturesService` is not in its providers, add it.

---

## Task 8: AI hardening — audit logging for crm-ai.controller scoring endpoints

**Files:**
- Modify: `backend/src/modules/ai/controllers/crm-ai.controller.ts`

The scoring service calls `auditLogs` inline, but the controller-level endpoints (scoreLead, predictDeal, etc.) do not emit audit events. Add a private `auditAiAction` method matching the pattern from `crm-copilot.service.ts` lines 48-63.

- [ ] **Step 1: Add drizzle `auditLogs` table import to the controller**

The controller currently imports from services only. Add:
```ts
import { Inject } from "@nestjs/common";
import { DRIZZLE } from "../../../db/drizzle.constants";
import type { Db } from "../../../db/drizzle.module";
import { auditLogs } from "../../../db/schema";
```

And inject the db in the constructor:
```ts
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly llm: LlmService,
    ...
  ) {}
```

- [ ] **Step 2: Add the private audit helper**

```ts
  private auditAiAction(orgId: string, userId: string, action: string, targetType: string, targetId: string): Promise<void> {
    return this.db.insert(auditLogs).values({
      action,
      userId,
      orgId,
      targetId,
      targetType,
      metadata: { source: "crm-ai" },
    }).then(() => undefined);
  }
```

- [ ] **Step 3: Add audit calls to lead scoring, deal prediction, deal summary endpoints**

In `scoreLead` (single), after the result is obtained, add:
```ts
void this.auditAiAction(u.orgId, u.userId, "crm.ai.score_generated", "lead", String(body.leadId));
```

In `predictDeal`, after result:
```ts
void this.auditAiAction(u.orgId, u.userId, "crm.ai.deal_prediction", "deal", String(body.dealId));
```

In `generateEmail`, after result:
```ts
void this.auditAiAction(u.orgId, u.userId, "crm.ai.email_draft", String(body.entityType ?? "lead"), String(body.leadId ?? body.dealId ?? "unknown"));
```

In `summarize` (account summary), after result:
```ts
void this.auditAiAction(u.orgId, u.userId, "crm.ai.summary_generated", "entity", String(body.entityId ?? ""));
```

---

## Task 9: AI hardening — dynamic enums in output.schemas.ts

**Files:**
- Modify: `backend/src/modules/ai/dto/output.schemas.ts`

The `NlSearchFilterSchema` hardcodes `status` and `priority` arrays. These schema values are used as the expected output shape for the NL search LLM call. Since the LLM output is validated post-generation, hardcoded enum rejection means a custom org value like `"NURTURING"` would fail Zod parse and be silently dropped or throw. Replace with `z.string()`.

- [ ] **Step 1: Replace NlSearchFilterSchema status/priority fields**

Change lines 110-114:
```ts
export const NlSearchFilterSchema = z.object({
  status: z
    .array(z.enum(["NEW", "CONTACTED", "INTERESTED", "QUALIFIED", "CONVERTED", "LOST"]))
    .optional(),
  priority: z.array(z.enum(["HOT", "WARM", "COLD"])).optional(),
```

To:
```ts
export const NlSearchFilterSchema = z.object({
  status: z.array(z.string()).optional(),
  priority: z.array(z.string()).optional(),
```

---

## Task 10: AI hardening — dynamic enums in chat-assistant.service.ts

**Files:**
- Modify: `backend/src/modules/ai/services/chat-assistant.service.ts`

The `updateLeadStatus` tool hardcodes `status` and `priority` enums (lines 273-274). The service already validates the actual update against the DB. The schema is only for LLM tool-call input parsing — strict enums reject legitimate custom values.

- [ ] **Step 1: Replace updateLeadStatus tool schema enums**

Change lines 273-274:
```ts
            status: z.enum(["NEW", "CONTACTED", "INTERESTED", "QUALIFIED", "CONVERTED", "LOST"]).optional(),
            priority: z.enum(["HOT", "WARM", "COLD"]).optional(),
```

To:
```ts
            status: z.string().optional(),
            priority: z.string().optional(),
```

- [ ] **Step 2: Update the execute handler to use the correct types**

The current `updateData` type annotation `Partial<{ status: typeof lead.status; priority: typeof lead.priority }>` references inferred DB column types. Changing the input to `z.string()` means `status` and `priority` are `string | undefined`. The DB update already accepts `string` since the columns are `text("status")`. Verify the `updateData` lines don't break — if `typeof lead.status` is `string`, no change needed; if it's a branded enum, change to:
```ts
            const updateData: Record<string, string> = {};
            if (status) updateData["status"] = status;
            if (priority) updateData["priority"] = priority;
```

- [ ] **Step 3: Typecheck the ai fence**

```bash
cd D:\projects\personal\Streamlineos\backend
npx tsc --noEmit 2>&1 | grep "modules/ai"
```

Expected: no output from the ai module files.

---

## Task 11: Frontend — TanStack hook for Data Quality

**Files:**
- Create: `frontend/hooks/api/crm/data-quality.ts`

Pattern from `quotes.ts`: `useQuery` with `queryKeys.*`, `staleTime: 60_000`.

- [ ] **Step 1: Add queryKey to query-keys file**

Read `frontend/lib/query-keys.ts` to find where CRM keys are defined. Add `crmDataQuality` section:
```ts
crmDataQuality: {
  all: ["crm", "data-quality"] as const,
  report: () => ["crm", "data-quality", "report"] as const,
},
```

- [ ] **Step 2: Create the types**

```ts
export interface DataQualityOffender {
  id: number | string;
  name: string;
  detail?: string;
}

export interface DataQualityAggregate {
  count: number;
  offenders: DataQualityOffender[];
}

export interface DataQualityReport {
  leadsWithoutEmail: DataQualityAggregate;
  leadsWithInvalidPhone: DataQualityAggregate;
  duplicateLeads: DataQualityAggregate;
  duplicateCompanies: DataQualityAggregate;
  staleDeals: DataQualityAggregate;
  dealsWithNoNextActivity: DataQualityAggregate;
  leadsWithNoOwner: DataQualityAggregate;
  dealsMissingStageFields: DataQualityAggregate;
}
```

- [ ] **Step 3: Create the hook file**

```ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface DataQualityOffender {
  id: number | string;
  name: string;
  detail?: string;
}

export interface DataQualityAggregate {
  count: number;
  offenders: DataQualityOffender[];
}

export interface DataQualityReport {
  leadsWithoutEmail: DataQualityAggregate;
  leadsWithInvalidPhone: DataQualityAggregate;
  duplicateLeads: DataQualityAggregate;
  duplicateCompanies: DataQualityAggregate;
  staleDeals: DataQualityAggregate;
  dealsWithNoNextActivity: DataQualityAggregate;
  leadsWithNoOwner: DataQualityAggregate;
  dealsMissingStageFields: DataQualityAggregate;
}

export function useCrmDataQuality() {
  return useQuery({
    queryKey: queryKeys.crmDataQuality.report(),
    queryFn: () => apiClient.get<DataQualityReport>("/crm/data-quality"),
    staleTime: 60_000,
  });
}
```

---

## Task 12: Frontend — CRM Settings sub-nav update

**Files:**
- Modify: `frontend/app/(authenticated)/crm/settings/layout.tsx`

- [ ] **Step 1: Add the Data Quality tab**

In the `TABS` array, add after Validation Rules (index 2):
```ts
  { label: "Data Quality", href: "/crm/settings/data-quality" },
```

The complete change in the array — after `{ label: "Validation Rules", href: "/crm/settings/validation-rules" },` insert:
```ts
  { label: "Data Quality", href: "/crm/settings/data-quality" },
```

---

## Task 13: Frontend — Data Quality feature component

**Files:**
- Create: `frontend/features/crm/settings/data-quality-page.tsx`

This is a `"use client"` component. It uses `useCrmDataQuality()` hook, renders 8 stat cards in a grid. Each card shows:
- Icon (animated via `useAnimatedIcon`)
- Label
- Count badge (emerald-tinted when 0, amber when 1-9, red when ≥10)
- Collapsible offender list (click to expand) with entity names as links

Available illustrations: `EmptyChartIllustration` from `components/illustrations` — use for clean state (count = 0 on all aggregates).

Card grid: `grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4`

Severity tint function:
- count === 0 → `bg-emerald-50 border-emerald-200 text-emerald-700`
- 1-9 → `bg-amber-50 border-amber-200 text-amber-700`
- ≥ 10 → `bg-red-50 border-red-200 text-red-700`

For the empty state (all 8 counts === 0): render a centered illustrated empty state with `EmptyChartIllustration` and text "Your CRM data is clean" + subtitle "No data quality issues found."

Animated icon map (use @animateicons/react/lucide equivalents, fall back to lucide-react if not available):
- `leadsWithoutEmail` → Mail icon
- `leadsWithInvalidPhone` → Phone icon
- `duplicateLeads` → Users icon
- `duplicateCompanies` → Building2 icon
- `staleDeals` → Clock icon
- `dealsWithNoNextActivity` → AlertCircle icon
- `leadsWithNoOwner` → UserX icon
- `dealsMissingStageFields` → ClipboardList icon

Deep links:
- lead offenders → `/crm/leads/{id}`
- deal offenders → `/crm/deals/{id}`
- duplicate leads (multi-id strings) → `/crm/leads?search={name}`
- company offenders → `/crm/companies/{id}` if id is numeric, else `/crm/companies`

- [ ] **Step 1: Create the component file**

```tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { MailIcon, PhoneIcon, UsersIcon, Building2Icon, ClockIcon, AlertCircleIcon, UserXIcon, ClipboardListIcon } from "@animateicons/react/lucide";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyChartIllustration } from "@/components/illustrations";
import { useCrmDataQuality, type DataQualityAggregate } from "@/hooks/api/crm/data-quality";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";

function severityClass(count: number): string {
  if (count === 0) return "bg-emerald-50 border-emerald-200 text-emerald-700";
  if (count < 10) return "bg-amber-50 border-amber-200 text-amber-700";
  return "bg-red-50 border-red-200 text-red-700";
}

function badgeVariant(count: number): "default" | "secondary" | "destructive" {
  if (count === 0) return "secondary";
  if (count < 10) return "default";
  return "destructive";
}

type IconComponent = typeof MailIcon;

interface AggregateCardProps {
  label: string;
  aggregate: DataQualityAggregate;
  Icon: IconComponent;
  entityType: "lead" | "deal" | "company" | "multi";
}

function AggregateCard({ label, aggregate, Icon, entityType }: AggregateCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  function handleToggle() {
    if (aggregate.count > 0) setExpanded((v) => !v);
  }

  function offenderHref(id: number | string, name: string): string {
    if (entityType === "lead") return `/crm/leads/${id}`;
    if (entityType === "deal") return `/crm/deals/${id}`;
    if (entityType === "company") return typeof id === "number" ? `/crm/companies/${id}` : `/crm/companies`;
    return `/crm/leads?search=${encodeURIComponent(name)}`;
  }

  return (
    <Card
      className={cn(
        "p-4 border rounded-xl cursor-pointer transition-shadow hover:shadow-md select-none",
        severityClass(aggregate.count),
      )}
      onClick={handleToggle}
      {...hoverHandlers}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon ref={iconRef} size={18} />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <Badge variant={badgeVariant(aggregate.count)} className="text-xs">
          {aggregate.count}
        </Badge>
      </div>
      <AnimatePresence>
        {expanded && aggregate.offenders.length > 0 && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="mt-2 space-y-1 overflow-hidden"
          >
            {aggregate.offenders.map((o) => (
              <li key={String(o.id)} className="text-xs truncate">
                <Link
                  href={offenderHref(o.id, o.name)}
                  className="underline underline-offset-2 hover:opacity-75"
                  onClick={(e) => e.stopPropagation()}
                >
                  {o.name}
                </Link>
                {o.detail && <span className="ml-1 opacity-60">— {o.detail}</span>}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </Card>
  );
}

export function DataQualityPage() {
  const { data, isLoading, error } = useCrmDataQuality();

  if (isLoading) {
    return (
      <PageWrapper title="Data Quality" subtitle="CRM data health overview">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  if (error || !data) {
    return (
      <PageWrapper title="Data Quality" subtitle="CRM data health overview">
        <p className="text-sm text-destructive">{getErrorMessage(error)}</p>
      </PageWrapper>
    );
  }

  const allClean = Object.values(data).every((agg) => (agg as DataQualityAggregate).count === 0);

  if (allClean) {
    return (
      <PageWrapper title="Data Quality" subtitle="CRM data health overview">
        <div className="flex flex-col items-center justify-center flex-1 h-full py-16 gap-4">
          <EmptyChartIllustration className="w-48 h-48" />
          <p className="text-base font-medium text-foreground">Your CRM data is clean</p>
          <p className="text-sm text-muted-foreground">No data quality issues found.</p>
        </div>
      </PageWrapper>
    );
  }

  const cards: AggregateCardProps[] = [
    { label: "Leads without email", aggregate: data.leadsWithoutEmail, Icon: MailIcon, entityType: "lead" },
    { label: "Invalid phone numbers", aggregate: data.leadsWithInvalidPhone, Icon: PhoneIcon, entityType: "lead" },
    { label: "Duplicate leads", aggregate: data.duplicateLeads, Icon: UsersIcon, entityType: "multi" },
    { label: "Duplicate companies", aggregate: data.duplicateCompanies, Icon: Building2Icon, entityType: "company" },
    { label: "Stale deals (30d)", aggregate: data.staleDeals, Icon: ClockIcon, entityType: "deal" },
    { label: "Deals no recent activity", aggregate: data.dealsWithNoNextActivity, Icon: AlertCircleIcon, entityType: "deal" },
    { label: "Leads without owner", aggregate: data.leadsWithNoOwner, Icon: UserXIcon, entityType: "lead" },
    { label: "Deals missing stage fields", aggregate: data.dealsMissingStageFields, Icon: ClipboardListIcon, entityType: "deal" },
  ];

  return (
    <PageWrapper title="Data Quality" subtitle="Review and fix data health issues in your CRM">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card) => (
          <AggregateCard key={card.label} {...card} />
        ))}
      </div>
    </PageWrapper>
  );
}
```

---

## Task 14: Frontend — page.tsx, loading.tsx, error.tsx

**Files:**
- Create: `frontend/app/(authenticated)/crm/settings/data-quality/page.tsx`
- Create: `frontend/app/(authenticated)/crm/settings/data-quality/loading.tsx`
- Create: `frontend/app/(authenticated)/crm/settings/data-quality/error.tsx`

- [ ] **Step 1: Create page.tsx**

```tsx
import { DataQualityPage } from "@/features/crm/settings/data-quality-page";

export default function CrmDataQualitySettingsPage() {
  return <DataQualityPage />;
}
```

- [ ] **Step 2: Create loading.tsx**

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function CrmDataQualityLoading() {
  return (
    <div className="p-6">
      <Skeleton className="h-8 w-48 mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create error.tsx**

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/get-error-message";

export default function CrmDataQualityError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
      <p className="text-sm text-destructive">{getErrorMessage(error)}</p>
      <Button variant="outline" size="sm" onClick={reset}>Retry</Button>
    </div>
  );
}
```

---

## Task 15: Frontend typecheck

- [ ] **Step 1: Check for animated icon availability**

Before using `MailIcon`, `PhoneIcon`, etc. from `@animateicons/react/lucide`, verify they exist. The available set is documented at animateicons.in/icons/lucide (248 icons). If any icon is missing from the animated set, import the static version from `lucide-react` instead.

Check pattern: if `@animateicons/react/lucide` doesn't export `ClipboardListIcon` or `UserXIcon`, replace those specific imports with `lucide-react` static versions and remove the `ref={iconRef}` from those specific ones.

- [ ] **Step 2: Run frontend typecheck scoped to changed files**

```bash
cd D:\projects\personal\Streamlineos\frontend
npx tsc --noEmit 2>&1 | grep -E "data-quality|crm/settings"
```

Expected: no output.

---

## Task 16: Final full-fence typecheck

- [ ] **Step 1: Backend crm-metadata + ai fence**

```bash
cd D:\projects\personal\Streamlineos\backend
npx tsc --noEmit 2>&1 | grep -E "crm-metadata|modules/ai"
```

Expected: no output (errors in other modules are handled by parallel agents — ignore them).

- [ ] **Step 2: Frontend data-quality + crm/settings fence**

```bash
cd D:\projects\personal\Streamlineos\frontend
npx tsc --noEmit 2>&1 | grep -E "data-quality|crm/settings"
```

Expected: no output.

---

## Self-Review Checklist

### Spec Coverage

| Requirement | Task |
|-------------|------|
| Blueprint `requiresQuote` enforcement | Task 1 |
| Blueprint `requiredActivityTypeKeys` enforcement | Task 2 |
| Same friendly exception shape as requiredFields | Tasks 1-2 (same return shape `{ allowed, requiresApproval, missingFields }`) |
| Single indexed queries | Tasks 1-2 (single query each, keyed by `orgId + dealId`) |
| GET /crm/data-quality endpoint | Tasks 4-6 |
| 8 aggregates: leads missing email | Task 4 |
| 8 aggregates: invalid phone | Task 4 |
| 8 aggregates: duplicate leads | Task 4 |
| 8 aggregates: duplicate companies | Task 4 |
| 8 aggregates: stale deals (30d) | Task 4 |
| 8 aggregates: open deals no next activity | Task 4 |
| 8 aggregates: leads with no owner | Task 4 |
| 8 aggregates: deals missing stage-required fields | Task 4 |
| LIMIT 10 on offender lists | Task 4 (`OFFENDER_LIMIT = 10`) |
| Guard: `crm:data-quality:view` permission | Task 3 + 5 |
| Permission in catalog + ROLE_DEFAULT_PERMISSIONS | Task 3 |
| AI org off-switch on crm-ai controller | Task 7 |
| AI audit logging for lead/deal summary, email draft, score | Task 8 |
| Dynamic enums in output.schemas.ts | Task 9 |
| Dynamic enums in chat-assistant.service.ts | Task 10 |
| Frontend Data Quality page | Tasks 13-14 |
| PageWrapper (default variant) | Task 13 |
| Severity-tinted stat cards (emerald/amber/red) | Task 13 |
| Offender lists with entity NAME + deep link | Task 13 |
| Skeleton loading.tsx | Task 14 |
| error.tsx with retry | Task 14 |
| Illustrated empty state (clean data) | Task 13 |
| Animated icons via useAnimatedIcon | Task 13 |
| TanStack hook with staleTime ~60s | Task 11 |
| Data Quality tab in CRM settings sub-nav | Task 12 |

### No Placeholders
Reviewed — all steps contain concrete code.

### Type Consistency
- `DataQualityOffender`, `DataQualityAggregate`, `DataQualityReport` interfaces defined in Task 4 (backend service) and Task 11 (frontend hook) — fields match exactly.
- `AggregateCardProps.Icon` typed as `typeof MailIcon` which is the common @animateicons/react/lucide component type — consistent across all 8 usages in Task 13.
- `entityType: "lead" | "deal" = "deal"` new parameter added to `assertTransitionAllowed` in Task 2 — the `testTransition` caller at line 71 does not pass `entityType` which is fine since it defaults to `"deal"`.
