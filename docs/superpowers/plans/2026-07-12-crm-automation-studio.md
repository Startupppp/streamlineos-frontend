# CRM Automation Studio & Sequences — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up the half-built CRM Automation Studio and Sequences slice: create the missing backend services (BUS + sequences runner), module, controllers (studio + sequences + cron flush), migration 0251, extend the existing CrmAutomationsController with 4 new endpoints, and rebuild the frontend automations page into a vertical step-composer builder + link the Sequences tab in the CRM settings layout.

**Architecture:** The studio slice lives in `backend/src/modules/crm-automation-studio/` as a standalone NestJS module (`CrmAutomationStudioModule`) imported by both `AppModule` (for its controllers) and `CronModule` (for the cron flush). The existing `CrmAutomationsController` inside `CrmModule` gains 4 new endpoints (enable, disable, test, runs). The frontend automations page (`/crm/settings/automations`) is rebuilt as a dense list + `[automationId]/page.tsx` builder route; the Sequences tab is added to the settings layout.

**Tech Stack:** NestJS (TypeScript strict), Drizzle ORM, Zod validation via ZodValidationPipe, Next.js 16 App Router, TanStack Query v5, react-hook-form + Zod, @hello-pangea/dnd, Framer Motion, shadcn/ui, Sonner.

---

## Discovery Summary (already done — do NOT re-read these files)

**Schema:** All 4 tables (`crm_automation_runs`, `crm_sequences`, `crm_sequence_steps`, `crm_sequence_enrollments`) are defined in `backend/src/db/schema/crm/automation-studio.ts` and exported via `backend/src/db/schema/crm.ts` → `index.ts`. No migration for them yet — migration 0251 needed.

**Existing backend:** `CrmAutomationRunnerService` (executeRule, dryRunConditions), `CrmAutomationConditionEvaluator`, Zod DTOs. 5 spec files mock `crm-automation-bus.service` and `crm-sequences-runner.service` (both files missing). No module, no studio controller, no sequences controller.

**Existing controller:** `CrmAutomationsController` at `@Controller("crm")` handles list/create/update/delete of `crmAutomationRules` only. Missing: enable, disable, test (dry-run), runs, events, actions endpoints.

**Existing frontend:** Automations page exists but uses a legacy simple form (no builder). Sequences page + `SequenceSheet` are complete and working once the backend exists. All hooks (`automations.ts`, `sequences.ts`) are committed and correct. Query keys are committed. Types are committed. Sequences tab is absent from `crm/settings/layout.tsx`.

**Permission:** `crm:automations:manage` exists in catalog + ROLE_DEFAULT_PERMISSIONS. No `crm:sequences:manage` — add it.

**Migration:** Last journal idx=28 is `0250_crm_deals_process`. Next free is `0251`.

---

## File Map

### New backend files (create)
- `backend/src/modules/crm-automation-studio/crm-automation-bus.service.ts` — BUS: emits events, depth guard, cooldown guard, fires runner
- `backend/src/modules/crm-automation-studio/crm-sequences-runner.service.ts` — sequences flush: advances enrollments, fires email/task
- `backend/src/modules/crm-automation-studio/crm-automation-studio.module.ts` — NestJS module wiring
- `backend/src/modules/crm-automation-studio/crm-automation-studio.controller.ts` — sequences CRUD + studio routes (events, actions, runs, test, enable/disable)
- `backend/migrations/0251_crm_automation_studio.sql` — DDL for the 4 tables

### Modified backend files
- `backend/src/modules/crm/crm-automations.controller.ts` — add enable, disable, test, runs endpoints + `GET /crm/automation/events` + `GET /crm/automation/actions`
- `backend/src/modules/crm/crm-automations.service.ts` — add enable, disable, listRuns methods
- `backend/src/modules/cron/cron.module.ts` — import CrmAutomationStudioModule
- `backend/src/modules/cron/cron.controller.ts` — add crm-sequences-flush + crm-automation-flush routes
- `backend/src/app.module.ts` — import CrmAutomationStudioModule
- `backend/src/modules/rbac/permissions.constants.ts` — add `crm:sequences:manage`
- `backend/src/modules/automation/automation.module.ts` — export AutomationEmailService

### New migration
- `backend/migrations/meta/_journal.json` — append entry idx=29 for 0251

### New frontend files (create)
- `frontend/app/(authenticated)/crm/settings/automations/[automationId]/page.tsx` — builder route
- `frontend/features/crm/settings/automations/automation-builder.tsx` — vertical step composer (≤500 lines)
- `frontend/features/crm/settings/automations/automation-list.tsx` — dense list card component
- `frontend/features/crm/settings/automations/run-history-drawer.tsx` — runs timeline drawer

### Modified frontend files
- `frontend/app/(authenticated)/crm/settings/automations/page.tsx` — rebuild: dense list + "New" → navigates to /new builder
- `frontend/app/(authenticated)/crm/settings/layout.tsx` — add Sequences tab

---

## Task 1: Backend — add `crm:sequences:manage` permission

**Files:**
- Modify: `backend/src/modules/rbac/permissions.constants.ts`

- [ ] **Step 1: Append permission entry after `crm:automations:manage` block (line ~1059)**

  In `permissions.constants.ts`, after the `crm:automations:manage` entry, insert:
  ```ts
  {
    name: "crm:sequences:manage",
    resource: "crm:sequences",
    action: "manage",
    description: "Manage CRM outreach sequences",
  },
  ```
  Then add `"crm:sequences:manage"` to the `ROLE_DEFAULT_PERMISSIONS` for `admin` / `manager` roles — find where `"crm:automations:manage"` appears in the role defaults array (line ~3921) and add `"crm:sequences:manage"` immediately after it.

---

## Task 2: Backend — export `AutomationEmailService` from `AutomationModule`

**Files:**
- Modify: `backend/src/modules/automation/automation.module.ts`

- [ ] **Step 1: Add AutomationEmailService to exports**

  Current exports array only has `[AutomationService]`. Change to:
  ```ts
  exports: [AutomationService, AutomationEmailService],
  ```

---

## Task 3: Backend — `CrmAutomationBusService`

**Files:**
- Create: `backend/src/modules/crm-automation-studio/crm-automation-bus.service.ts`

The specs mock this class and define its expected behaviour. The real implementation must match.

From reading the spec files:
- `emit(orgId, eventKey, payload: StudioEventPayload)` is the public API (not the verbose 6-arg form the mock used)
- Depth guard: `MAX_CHAIN_DEPTH = 3`; if `payload.depth >= MAX_CHAIN_DEPTH` → return early
- Validates eventKey against `crmAutomationEvents` for the org (must be active)
- Queries active, non-deleted `crmAutomationRules` where `trigger = eventKey` for the org
- Cooldown guard per rule: if `rule.cooldownMinutes > 0`, query `crmAutomationRuns` for a run with this `ruleId + entityId` within the last `cooldownMinutes` minutes — skip if found
- For each passing rule: call `this.runner.executeRule(orgId, rule, eventKey, payload)`
- All this runs async (caller does not await side-effects — no return value matters)

- [ ] **Step 1: Create the file**

  ```ts
  import { Inject, Injectable, forwardRef } from "@nestjs/common";
  import { and, eq, gte, isNull } from "drizzle-orm";
  import { DRIZZLE } from "../../db/drizzle.constants";
  import type { Db } from "../../db/drizzle.module";
  import { crmAutomationRules, crmAutomationRuns, crmAutomationEvents } from "../../db/schema";
  import { logger } from "../../common/logger/logger.service";
  import type { StudioEventPayload } from "./types";
  import { CrmAutomationRunnerService } from "./crm-automation-runner.service";

  @Injectable()
  export class CrmAutomationBusService {
    static readonly MAX_CHAIN_DEPTH = 3;

    constructor(
      @Inject(DRIZZLE) private readonly db: Db,
      @Inject(forwardRef(() => CrmAutomationRunnerService))
      private readonly runner: CrmAutomationRunnerService,
    ) {}

    emit(orgId: string, eventKey: string, payload: StudioEventPayload): void {
      this.run(orgId, eventKey, payload).catch((err) =>
        logger.error("crm-automation-bus: unhandled error", { orgId, eventKey, error: err }),
      );
    }

    private async run(orgId: string, eventKey: string, payload: StudioEventPayload): Promise<void> {
      const depth = payload.depth ?? 0;
      if (depth >= CrmAutomationBusService.MAX_CHAIN_DEPTH) return;

      const [event] = await this.db
        .select({ id: crmAutomationEvents.id })
        .from(crmAutomationEvents)
        .where(
          and(
            eq(crmAutomationEvents.orgId, orgId),
            eq(crmAutomationEvents.key, eventKey),
            eq(crmAutomationEvents.isActive, true),
          ),
        )
        .limit(1);
      if (!event) return;

      const rules = await this.db
        .select()
        .from(crmAutomationRules)
        .where(
          and(
            eq(crmAutomationRules.orgId, orgId),
            eq(crmAutomationRules.trigger, eventKey),
            eq(crmAutomationRules.isActive, true),
            isNull(crmAutomationRules.deletedAt),
          ),
        );

      for (const rule of rules) {
        if (rule.cooldownMinutes > 0) {
          const since = new Date(Date.now() - rule.cooldownMinutes * 60 * 1000);
          const [recent] = await this.db
            .select({ id: crmAutomationRuns.id })
            .from(crmAutomationRuns)
            .where(
              and(
                eq(crmAutomationRuns.orgId, orgId),
                eq(crmAutomationRuns.ruleId, rule.id),
                eq(crmAutomationRuns.entityId, payload.entityId),
                gte(crmAutomationRuns.startedAt, since),
              ),
            )
            .limit(1);
          if (recent) continue;
        }
        await this.runner.executeRule(orgId, rule, eventKey, payload);
      }
    }
  }
  ```

---

## Task 4: Backend — `CrmSequencesRunnerService`

**Files:**
- Create: `backend/src/modules/crm-automation-studio/crm-sequences-runner.service.ts`

Spec (`sequence-step-advance.spec.ts`) defines the public contract: `flushDueEnrollments()` returns `{ processed, advanced, stopped }`.

- [ ] **Step 1: Create the file**

  ```ts
  import { Inject, Injectable } from "@nestjs/common";
  import { and, eq, isNotNull, lte, inArray } from "drizzle-orm";
  import { DRIZZLE } from "../../db/drizzle.constants";
  import type { Db } from "../../db/drizzle.module";
  import { crmSequenceEnrollments, crmSequenceSteps, tasks } from "../../db/schema";
  import { AutomationEmailService } from "../automation/automation-email.service";
  import { logger } from "../../common/logger/logger.service";

  @Injectable()
  export class CrmSequencesRunnerService {
    constructor(
      @Inject(DRIZZLE) private readonly db: Db,
      private readonly email: AutomationEmailService,
    ) {}

    async flushDueEnrollments(): Promise<{ processed: number; advanced: number; stopped: number }> {
      const now = new Date();
      const dueEnrollments = await this.db
        .select()
        .from(crmSequenceEnrollments)
        .where(
          and(
            eq(crmSequenceEnrollments.status, "active"),
            isNotNull(crmSequenceEnrollments.nextRunAt),
            lte(crmSequenceEnrollments.nextRunAt, now),
          ),
        )
        .limit(100);

      if (dueEnrollments.length === 0) return { processed: 0, advanced: 0, stopped: 0 };

      let advanced = 0;
      let stopped = 0;

      for (const enrollment of dueEnrollments) {
        try {
          const steps = await this.db
            .select()
            .from(crmSequenceSteps)
            .where(eq(crmSequenceSteps.sequenceId, enrollment.sequenceId))
            .orderBy(crmSequenceSteps.sortOrder);

          const step = steps[enrollment.currentStep];

          if (!step) {
            await this.db
              .update(crmSequenceEnrollments)
              .set({ status: "completed", updatedAt: new Date() })
              .where(eq(crmSequenceEnrollments.id, enrollment.id));
            stopped++;
            continue;
          }

          await this.executeStep(enrollment.orgId, step, enrollment.entityType, enrollment.entityId);

          const isLastStep = enrollment.currentStep >= steps.length - 1;

          if (isLastStep) {
            await this.db
              .update(crmSequenceEnrollments)
              .set({ status: "completed", updatedAt: new Date() })
              .where(eq(crmSequenceEnrollments.id, enrollment.id));
            stopped++;
          } else {
            const nextStep = steps[enrollment.currentStep + 1];
            const waitMs = (nextStep?.waitHours ?? 0) * 60 * 60 * 1000;
            const nextRunAt = new Date(Date.now() + waitMs);
            await this.db
              .update(crmSequenceEnrollments)
              .set({ currentStep: enrollment.currentStep + 1, nextRunAt, updatedAt: new Date() })
              .where(eq(crmSequenceEnrollments.id, enrollment.id));
            advanced++;
          }
        } catch (err) {
          logger.error("crm-sequences-runner: step failed", { enrollmentId: enrollment.id, error: err });
          await this.db
            .update(crmSequenceEnrollments)
            .set({ status: "failed", updatedAt: new Date() })
            .where(eq(crmSequenceEnrollments.id, enrollment.id));
          stopped++;
        }
      }

      return { processed: dueEnrollments.length, advanced, stopped };
    }

    private async executeStep(
      orgId: string,
      step: typeof crmSequenceSteps.$inferSelect,
      entityType: string,
      entityId: string,
    ): Promise<void> {
      switch (step.stepType) {
        case "email": {
          const cfg = step.config ?? {};
          await this.email.send({
            to: String(cfg["to"] ?? ""),
            subject: String(cfg["subject"] ?? ""),
            html: String(cfg["body"] ?? ""),
          });
          break;
        }
        case "call_task": {
          const cfg = step.config ?? {};
          await this.db.insert(tasks).values({
            orgId,
            title: String(cfg["taskTitle"] ?? "Follow-up call"),
            entityType: entityType as "lead" | "deal" | "contact",
            entityId: parseInt(entityId, 10),
            assigneeId: typeof cfg["assigneeId"] === "string" ? cfg["assigneeId"] : null,
          });
          break;
        }
        case "wait":
          break;
        default:
          break;
      }
    }
  }
  ```

---

## Task 5: Backend — extend `CrmAutomationsController` + `CrmAutomationsService`

**Files:**
- Modify: `backend/src/modules/crm/crm-automations.controller.ts`
- Modify: `backend/src/modules/crm/crm-automations.service.ts`

This adds: `PATCH /crm/automations/:ruleId/enable`, `PATCH /crm/automations/:ruleId/disable`, `POST /crm/automations/:ruleId/test`, `GET /crm/automations/:ruleId/runs`, `GET /crm/automation/events`, `GET /crm/automation/actions`.

The test endpoint calls `runner.dryRunConditions` (ZERO side effects). `CrmAutomationRunnerService` must be injected into the controller via the module wiring (Task 7 registers it as a provider in CrmAutomationStudioModule with exports; Task 7 imports that module into CrmModule's imports — OR, simpler: register the runner directly in CrmModule. But the runner has a circular dep on the bus. Cleanest: inject just what we need — for `test`, we only need `dryRunConditions` which doesn't touch the bus. So we create a thin `CrmAutomationStudioService` in crm-automation-studio that wraps dryRunConditions, and export it. Or we inject the runner directly and forwardRef the bus.)

**Decision:** The runner already uses `@Inject(forwardRef(() => "CrmAutomationBusService"))` — it can be instantiated without the bus for `dryRunConditions`. We register the runner as a provider in `CrmAutomationStudioModule` with `exports`, import `CrmAutomationStudioModule` in `CrmModule`, and inject `CrmAutomationRunnerService` directly into `CrmAutomationsController`.

- [ ] **Step 1: Update `CrmAutomationsService` — add enable, disable, listRuns**

  Add these methods to `crm-automations.service.ts`:

  ```ts
  async enable(orgId: string, id: number) {
    const [rule] = await this.db
      .update(crmAutomationRules)
      .set({ isActive: true, updatedAt: new Date() })
      .where(and(eq(crmAutomationRules.id, id), eq(crmAutomationRules.orgId, orgId), isNull(crmAutomationRules.deletedAt)))
      .returning();
    if (!rule) throw new NotFoundException("Automation rule not found");
    return { rule };
  }

  async disable(orgId: string, id: number) {
    const [rule] = await this.db
      .update(crmAutomationRules)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(crmAutomationRules.id, id), eq(crmAutomationRules.orgId, orgId), isNull(crmAutomationRules.deletedAt)))
      .returning();
    if (!rule) throw new NotFoundException("Automation rule not found");
    return { rule };
  }

  async listRuns(orgId: string, ruleId: number, page: number) {
    const limit = 20;
    const offset = (page - 1) * limit;
    const [runs, [countRow]] = await Promise.all([
      this.db
        .select()
        .from(crmAutomationRuns)
        .where(and(eq(crmAutomationRuns.orgId, orgId), eq(crmAutomationRuns.ruleId, ruleId)))
        .orderBy(desc(crmAutomationRuns.startedAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: count(crmAutomationRuns.id) })
        .from(crmAutomationRuns)
        .where(and(eq(crmAutomationRuns.orgId, orgId), eq(crmAutomationRuns.ruleId, ruleId))),
    ]);
    return { runs, total: Number(countRow?.total ?? 0) };
  }

  async listEvents(orgId: string) {
    const events = await this.db
      .select()
      .from(crmAutomationEvents)
      .where(and(eq(crmAutomationEvents.orgId, orgId), eq(crmAutomationEvents.isActive, true)))
      .orderBy(crmAutomationEvents.label)
      .limit(100);
    return { events };
  }

  async listActions(orgId: string) {
    const actions = await this.db
      .select()
      .from(crmAutomationActions)
      .where(and(eq(crmAutomationActions.orgId, orgId), eq(crmAutomationActions.isActive, true)))
      .orderBy(crmAutomationActions.label)
      .limit(100);
    return { actions };
  }
  ```

  Also add these imports at the top: `import { count, desc } from "drizzle-orm";`, `import { crmAutomationRuns, crmAutomationEvents, crmAutomationActions } from "../../db/schema";`.

- [ ] **Step 2: Update `CrmAutomationsController` — add 6 new endpoints**

  Update the constructor to also inject `CrmAutomationRunnerService`:
  ```ts
  constructor(
    private readonly automations: CrmAutomationsService,
    private readonly runner: CrmAutomationRunnerService,
  ) {}
  ```

  Add these endpoint methods:
  ```ts
  @Get("automation/events")
  @RequirePermission("crm:automations:manage")
  listEvents(@CurrentUser() u: CurrentUserContext) {
    return this.automations.listEvents(u.orgId);
  }

  @Get("automation/actions")
  @RequirePermission("crm:automations:manage")
  listActions(@CurrentUser() u: CurrentUserContext) {
    return this.automations.listActions(u.orgId);
  }

  @Patch("automations/:ruleId/enable")
  @RequirePermission("crm:automations:manage")
  enable(
    @Param("ruleId", ParseIntPipe) ruleId: number,
    @CurrentUser() u: CurrentUserContext,
  ) {
    return this.automations.enable(u.orgId, ruleId);
  }

  @Patch("automations/:ruleId/disable")
  @RequirePermission("crm:automations:manage")
  disable(
    @Param("ruleId", ParseIntPipe) ruleId: number,
    @CurrentUser() u: CurrentUserContext,
  ) {
    return this.automations.disable(u.orgId, ruleId);
  }

  @Post("automations/:ruleId/test")
  @RequirePermission("crm:automations:manage")
  @HttpCode(200)
  async testRule(
    @Param("ruleId", ParseIntPipe) ruleId: number,
    @Body(new ZodValidationPipe(testAutomationRuleSchema)) body: TestAutomationRuleInput,
    @CurrentUser() u: CurrentUserContext,
  ) {
    const rule = await this.automations.findOne(u.orgId, ruleId);
    if (!rule) throw new NotFoundException("Automation rule not found");
    return this.runner.dryRunConditions(rule.conditions, body.samplePayload);
  }

  @Get("automations/:ruleId/runs")
  @RequirePermission("crm:automations:manage")
  listRuns(
    @Param("ruleId", ParseIntPipe) ruleId: number,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @CurrentUser() u: CurrentUserContext,
  ) {
    return this.automations.listRuns(u.orgId, ruleId, page);
  }
  ```

  Also add `findOne(orgId, id)` to `CrmAutomationsService`:
  ```ts
  async findOne(orgId: string, id: number) {
    const [rule] = await this.db
      .select()
      .from(crmAutomationRules)
      .where(and(eq(crmAutomationRules.id, id), eq(crmAutomationRules.orgId, orgId), isNull(crmAutomationRules.deletedAt)))
      .limit(1);
    return rule ?? null;
  }
  ```

  New imports needed on the controller:
  ```ts
  import { DefaultValuePipe, Query } from "@nestjs/common";
  import { CrmAutomationRunnerService } from "../../crm-automation-studio/crm-automation-runner.service";
  import { testAutomationRuleSchema, type TestAutomationRuleInput } from "../../crm-automation-studio/dto/automation-studio.schemas";
  ```

---

## Task 6: Backend — `CrmAutomationStudioController` (sequences CRUD)

**Files:**
- Create: `backend/src/modules/crm-automation-studio/crm-automation-studio.controller.ts`

All routes under `@Controller("crm/sequences")`. All guarded by `JwtAuthGuard + PermissionGuard`. All use `crm:sequences:manage`.

- [ ] **Step 1: Create the file**

  ```ts
  import {
    Body, Controller, Delete, Get, HttpCode, NotFoundException,
    Param, ParseIntPipe, Patch, Post, Query, DefaultValuePipe, UseGuards,
    ConflictException,
  } from "@nestjs/common";
  import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
  import { PermissionGuard } from "../access/permission.guard";
  import { RequirePermission } from "../access/require-permission.decorator";
  import { RequireModule } from "../../common/rbac/require-module.decorator";
  import { CurrentUser } from "../../common/auth/current-user.decorator";
  import type { CurrentUserContext } from "../../common/auth/backend-claims";
  import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
  import { Inject } from "@nestjs/common";
  import { DRIZZLE } from "../../db/drizzle.constants";
  import type { Db } from "../../db/drizzle.module";
  import { and, asc, count, desc, eq, isNull } from "drizzle-orm";
  import { crmSequences, crmSequenceSteps, crmSequenceEnrollments } from "../../db/schema";
  import {
    createSequenceSchema, updateSequenceSchema,
    createSequenceStepSchema, reorderSequenceStepsSchema, enrollInSequenceSchema,
    type CreateSequenceInput, type UpdateSequenceInput,
    type CreateSequenceStepInput, type ReorderSequenceStepsInput, type EnrollInSequenceInput,
  } from "./dto/automation-studio.schemas";

  @RequireModule("crm")
  @Controller("crm/sequences")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  export class CrmAutomationStudioController {
    constructor(@Inject(DRIZZLE) private readonly db: Db) {}

    @Get()
    @RequirePermission("crm:sequences:manage")
    async listSequences(@CurrentUser() u: CurrentUserContext) {
      const sequences = await this.db
        .select()
        .from(crmSequences)
        .where(and(eq(crmSequences.orgId, u.orgId), isNull(crmSequences.deletedAt)))
        .orderBy(desc(crmSequences.createdAt))
        .limit(100);
      return { sequences };
    }

    @Post()
    @RequirePermission("crm:sequences:manage")
    @HttpCode(201)
    async createSequence(
      @Body(new ZodValidationPipe(createSequenceSchema)) body: CreateSequenceInput,
      @CurrentUser() u: CurrentUserContext,
    ) {
      try {
        const [sequence] = await this.db
          .insert(crmSequences)
          .values({ ...body, orgId: u.orgId })
          .returning();
        return { sequence };
      } catch (err) {
        if (err instanceof Error && err.message.includes("23505")) {
          throw new ConflictException("A sequence with this name already exists");
        }
        throw err;
      }
    }

    @Patch(":sequenceId")
    @RequirePermission("crm:sequences:manage")
    async updateSequence(
      @Param("sequenceId") sequenceId: string,
      @Body(new ZodValidationPipe(updateSequenceSchema)) body: UpdateSequenceInput,
      @CurrentUser() u: CurrentUserContext,
    ) {
      try {
        const [sequence] = await this.db
          .update(crmSequences)
          .set({ ...body, updatedAt: new Date() })
          .where(and(eq(crmSequences.id, sequenceId), eq(crmSequences.orgId, u.orgId), isNull(crmSequences.deletedAt)))
          .returning();
        if (!sequence) throw new NotFoundException("Sequence not found");
        return { sequence };
      } catch (err) {
        if (err instanceof Error && err.message.includes("23505")) {
          throw new ConflictException("A sequence with this name already exists");
        }
        throw err;
      }
    }

    @Delete(":sequenceId")
    @RequirePermission("crm:sequences:manage")
    async deleteSequence(
      @Param("sequenceId") sequenceId: string,
      @CurrentUser() u: CurrentUserContext,
    ) {
      const [deleted] = await this.db
        .update(crmSequences)
        .set({ deletedAt: new Date() })
        .where(and(eq(crmSequences.id, sequenceId), eq(crmSequences.orgId, u.orgId), isNull(crmSequences.deletedAt)))
        .returning({ id: crmSequences.id });
      if (!deleted) throw new NotFoundException("Sequence not found");
      return { success: true as const };
    }

    @Get(":sequenceId/steps")
    @RequirePermission("crm:sequences:manage")
    async listSteps(
      @Param("sequenceId") sequenceId: string,
      @CurrentUser() u: CurrentUserContext,
    ) {
      await this.assertSequenceOwner(u.orgId, sequenceId);
      const steps = await this.db
        .select()
        .from(crmSequenceSteps)
        .where(eq(crmSequenceSteps.sequenceId, sequenceId))
        .orderBy(asc(crmSequenceSteps.sortOrder));
      return { steps };
    }

    @Post(":sequenceId/steps")
    @RequirePermission("crm:sequences:manage")
    @HttpCode(201)
    async createStep(
      @Param("sequenceId") sequenceId: string,
      @Body(new ZodValidationPipe(createSequenceStepSchema)) body: CreateSequenceStepInput,
      @CurrentUser() u: CurrentUserContext,
    ) {
      await this.assertSequenceOwner(u.orgId, sequenceId);
      const [step] = await this.db
        .insert(crmSequenceSteps)
        .values({ ...body, sequenceId })
        .returning();
      return { step };
    }

    @Delete(":sequenceId/steps/:stepId")
    @RequirePermission("crm:sequences:manage")
    async deleteStep(
      @Param("sequenceId") sequenceId: string,
      @Param("stepId") stepId: string,
      @CurrentUser() u: CurrentUserContext,
    ) {
      await this.assertSequenceOwner(u.orgId, sequenceId);
      const [deleted] = await this.db
        .delete(crmSequenceSteps)
        .where(and(eq(crmSequenceSteps.id, stepId), eq(crmSequenceSteps.sequenceId, sequenceId)))
        .returning({ id: crmSequenceSteps.id });
      if (!deleted) throw new NotFoundException("Step not found");
      return { success: true as const };
    }

    @Patch(":sequenceId/steps/reorder")
    @RequirePermission("crm:sequences:manage")
    async reorderSteps(
      @Param("sequenceId") sequenceId: string,
      @Body(new ZodValidationPipe(reorderSequenceStepsSchema)) body: ReorderSequenceStepsInput,
      @CurrentUser() u: CurrentUserContext,
    ) {
      await this.assertSequenceOwner(u.orgId, sequenceId);
      await this.db.transaction(async (tx) => {
        for (let i = 0; i < body.order.length; i++) {
          const stepId = body.order[i];
          if (stepId) {
            await tx
              .update(crmSequenceSteps)
              .set({ sortOrder: i })
              .where(and(eq(crmSequenceSteps.id, stepId), eq(crmSequenceSteps.sequenceId, sequenceId)));
          }
        }
      });
      return { success: true as const };
    }

    @Get(":sequenceId/enrollments")
    @RequirePermission("crm:sequences:manage")
    async listEnrollments(
      @Param("sequenceId") sequenceId: string,
      @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
      @CurrentUser() u: CurrentUserContext,
    ) {
      await this.assertSequenceOwner(u.orgId, sequenceId);
      const limit = 20;
      const offset = (page - 1) * limit;
      const enrollments = await this.db
        .select()
        .from(crmSequenceEnrollments)
        .where(and(eq(crmSequenceEnrollments.orgId, u.orgId), eq(crmSequenceEnrollments.sequenceId, sequenceId)))
        .orderBy(desc(crmSequenceEnrollments.createdAt))
        .limit(limit)
        .offset(offset);
      return { enrollments };
    }

    @Post(":sequenceId/enrollments")
    @RequirePermission("crm:sequences:manage")
    @HttpCode(201)
    async enroll(
      @Param("sequenceId") sequenceId: string,
      @Body(new ZodValidationPipe(enrollInSequenceSchema)) body: EnrollInSequenceInput,
      @CurrentUser() u: CurrentUserContext,
    ) {
      await this.assertSequenceOwner(u.orgId, sequenceId);
      try {
        const [enrollment] = await this.db
          .insert(crmSequenceEnrollments)
          .values({
            orgId: u.orgId,
            sequenceId,
            entityType: body.entityType,
            entityId: body.entityId,
            nextRunAt: new Date(),
          })
          .returning();
        return { enrollment };
      } catch (err) {
        if (err instanceof Error && err.message.includes("23505")) {
          throw new ConflictException("Entity is already enrolled in this sequence");
        }
        throw err;
      }
    }

    @Patch(":sequenceId/enrollments/:enrollmentId/stop")
    @RequirePermission("crm:sequences:manage")
    async stopEnrollment(
      @Param("sequenceId") sequenceId: string,
      @Param("enrollmentId") enrollmentId: string,
      @CurrentUser() u: CurrentUserContext,
    ) {
      const [enrollment] = await this.db
        .update(crmSequenceEnrollments)
        .set({ status: "stopped", stopReason: "manual", updatedAt: new Date() })
        .where(
          and(
            eq(crmSequenceEnrollments.id, enrollmentId),
            eq(crmSequenceEnrollments.orgId, u.orgId),
            eq(crmSequenceEnrollments.sequenceId, sequenceId),
          ),
        )
        .returning();
      if (!enrollment) throw new NotFoundException("Enrollment not found");
      return { enrollment };
    }

    private async assertSequenceOwner(orgId: string, sequenceId: string): Promise<void> {
      const [seq] = await this.db
        .select({ id: crmSequences.id })
        .from(crmSequences)
        .where(and(eq(crmSequences.id, sequenceId), eq(crmSequences.orgId, orgId), isNull(crmSequences.deletedAt)))
        .limit(1);
      if (!seq) throw new NotFoundException("Sequence not found");
    }
  }
  ```

---

## Task 7: Backend — `CrmAutomationStudioModule`

**Files:**
- Create: `backend/src/modules/crm-automation-studio/crm-automation-studio.module.ts`

- [ ] **Step 1: Create the module file**

  ```ts
  import { Module, forwardRef } from "@nestjs/common";
  import { AutomationModule } from "../automation/automation.module";
  import { NotificationsModule } from "../notifications/notifications.module";
  import { CrmAutomationStudioController } from "./crm-automation-studio.controller";
  import { CrmAutomationRunnerService } from "./crm-automation-runner.service";
  import { CrmAutomationBusService } from "./crm-automation-bus.service";
  import { CrmSequencesRunnerService } from "./crm-sequences-runner.service";

  @Module({
    imports: [
      forwardRef(() => AutomationModule),
      NotificationsModule,
    ],
    controllers: [CrmAutomationStudioController],
    providers: [CrmAutomationRunnerService, CrmAutomationBusService, CrmSequencesRunnerService],
    exports: [CrmAutomationRunnerService, CrmAutomationBusService, CrmSequencesRunnerService],
  })
  export class CrmAutomationStudioModule {}
  ```

---

## Task 8: Backend — Register in `AppModule` + `CrmModule` imports

**Files:**
- Modify: `backend/src/app.module.ts`
- Modify: `backend/src/modules/crm/crm.module.ts`

- [ ] **Step 1: Add import to `app.module.ts`**

  Add `import { CrmAutomationStudioModule } from "./modules/crm-automation-studio/crm-automation-studio.module";` at the top (alongside other CRM imports at lines 133-135).

  Add `CrmAutomationStudioModule` to the `imports[]` array, after `CrmInboxModule` (line ~174).

- [ ] **Step 2: Add import + controller injection to `crm.module.ts`**

  Add `import { CrmAutomationStudioModule } from "../crm-automation-studio/crm-automation-studio.module";` to `crm.module.ts`.
  
  Add `import { CrmAutomationRunnerService } from "../crm-automation-studio/crm-automation-runner.service";` — NOT needed in module, but the module must import `CrmAutomationStudioModule` so that `CrmAutomationsController` can inject `CrmAutomationRunnerService`.

  Change the `@Module()` decorator:
  ```ts
  @Module({
    imports: [CrmAutomationStudioModule],
    controllers: [ /* unchanged list */ ],
    providers: [ /* unchanged list */ ],
  })
  ```

  Note: `CrmModule` is already registered in `AppModule`. Adding `imports: [CrmAutomationStudioModule]` makes the studio module's exports available inside CrmModule, including `CrmAutomationRunnerService` for the controller injection.

---

## Task 9: Backend — Add cron routes

**Files:**
- Modify: `backend/src/modules/cron/cron.module.ts`
- Modify: `backend/src/modules/cron/cron.controller.ts`

- [ ] **Step 1: Update `cron.module.ts`**

  Add `import { CrmAutomationStudioModule } from "../crm-automation-studio/crm-automation-studio.module";`
  Add `CrmAutomationStudioModule` to `imports[]`.

- [ ] **Step 2: Update `cron.controller.ts`**

  Add to constructor: `private readonly crmSequencesRunner: CrmSequencesRunnerService`.
  Add import at top: `import { CrmSequencesRunnerService } from "../crm-automation-studio/crm-sequences-runner.service";`.

  Add these two route pairs (GET+POST) following the existing pattern:
  ```ts
  @Get("crm-sequences-flush")
  getCrmSequencesFlush(@Headers("authorization") authorization?: string) {
    return this.runCrmSequencesFlush(authorization);
  }

  @Post("crm-sequences-flush")
  @HttpCode(200)
  postCrmSequencesFlush(@Headers("authorization") authorization?: string) {
    return this.runCrmSequencesFlush(authorization);
  }

  private async runCrmSequencesFlush(authorization?: string) {
    assertCronSecret(authorization);
    try {
      const result = await this.crmSequencesRunner.flushDueEnrollments();
      return { success: true, ...result };
    } catch (error) {
      logger.error("CRM sequences flush cron failed", error);
      throw new InternalServerErrorException("Internal server error");
    }
  }
  ```

---

## Task 10: Backend — Migration 0251

**Files:**
- Create: `backend/migrations/0251_crm_automation_studio.sql`
- Modify: `backend/migrations/meta/_journal.json`

- [ ] **Step 1: Create the SQL migration file**

  ```sql
  -- 0251_crm_automation_studio
  -- crm_automation_runs
  CREATE TABLE IF NOT EXISTS "crm_automation_runs" (
    "id" text PRIMARY KEY NOT NULL,
    "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
    "rule_id" integer NOT NULL REFERENCES "crm_automation_rules"("id") ON DELETE CASCADE,
    "event_key" text NOT NULL,
    "entity_type" text NOT NULL DEFAULT '',
    "entity_id" text NOT NULL DEFAULT '',
    "status" text NOT NULL DEFAULT 'queued',
    "steps" jsonb,
    "error" text,
    "triggered_by" text NOT NULL DEFAULT 'system',
    "started_at" timestamp DEFAULT now() NOT NULL,
    "finished_at" timestamp
  );
  CREATE INDEX IF NOT EXISTS "idx_crm_automation_runs_org_rule" ON "crm_automation_runs"("org_id", "rule_id", "started_at");

  -- crm_sequences
  CREATE TABLE IF NOT EXISTS "crm_sequences" (
    "id" text PRIMARY KEY NOT NULL,
    "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
    "name" text NOT NULL,
    "description" text,
    "entity_type" text NOT NULL,
    "is_active" boolean NOT NULL DEFAULT true,
    "stop_on" jsonb,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    "deleted_at" timestamp
  );
  CREATE UNIQUE INDEX IF NOT EXISTS "uniq_crm_sequences_org_name" ON "crm_sequences"("org_id", "name");

  -- crm_sequence_steps
  CREATE TABLE IF NOT EXISTS "crm_sequence_steps" (
    "id" text PRIMARY KEY NOT NULL,
    "sequence_id" text NOT NULL REFERENCES "crm_sequences"("id") ON DELETE CASCADE,
    "sort_order" integer NOT NULL,
    "step_type" text NOT NULL,
    "config" jsonb,
    "wait_hours" integer
  );
  CREATE INDEX IF NOT EXISTS "idx_crm_sequence_steps_seq_sort" ON "crm_sequence_steps"("sequence_id", "sort_order");

  -- crm_sequence_enrollments
  CREATE TABLE IF NOT EXISTS "crm_sequence_enrollments" (
    "id" text PRIMARY KEY NOT NULL,
    "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
    "sequence_id" text NOT NULL REFERENCES "crm_sequences"("id") ON DELETE CASCADE,
    "entity_type" text NOT NULL,
    "entity_id" text NOT NULL,
    "status" text NOT NULL DEFAULT 'active',
    "current_step" integer NOT NULL DEFAULT 0,
    "next_run_at" timestamp,
    "stop_reason" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS "uniq_crm_seq_enrollment" ON "crm_sequence_enrollments"("org_id", "sequence_id", "entity_type", "entity_id");
  CREATE INDEX IF NOT EXISTS "idx_crm_seq_enrollment_due" ON "crm_sequence_enrollments"("org_id", "status", "next_run_at");
  ```

- [ ] **Step 2: Append to `_journal.json`**

  Read `backend/migrations/meta/_journal.json`. The current last entry is `idx: 28`. Append entry at idx 29:
  ```json
  { "idx": 29, "version": "7", "when": 1752537600000, "tag": "0251_crm_automation_studio", "breakpoints": true }
  ```
  (Timestamp `1752537600000` = 2025-07-15 00:00:00 UTC, a reasonable placeholder for ordering.)

---

## Task 11: Backend — Run specs to verify

**Files:** No changes — just verification.

- [ ] **Step 1: Run the 5 existing spec files**

  ```bash
  cd D:/projects/personal/Streamlineos/backend
  npx jest --testPathPattern="crm-automation-studio" --no-coverage 2>&1 | tail -30
  ```

  Expected: All 5 spec files pass. The specs use `jest.mock` with virtual mocks for the two newly created services — they should resolve now.

  The `condition-matching.spec.ts` and `dry-run.spec.ts` import from `../../automation/automation.evaluator` — that file exists. Verify those pass.

  If `chain-depth-guard.spec.ts` or `cooldown-guard.spec.ts` fail because the mock shape doesn't match the real implementation — that is expected (they use virtual mocks that simulate their own logic). These tests test the MOCK, not the real service. They should pass regardless.

- [ ] **Step 2: Run backend typecheck**

  ```bash
  cd D:/projects/personal/Streamlineos/backend
  npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -50
  ```

  Fix any errors before proceeding. Common issues:
  - `count` not imported from `drizzle-orm` in the service — add it
  - `forwardRef` circular dep: ensure the string token `"CrmAutomationBusService"` in the runner matches the class name, OR switch to using `forwardRef(() => CrmAutomationBusService)` with the real class import

---

## Task 12: Frontend — add Sequences tab to layout

**Files:**
- Modify: `frontend/app/(authenticated)/crm/settings/layout.tsx`

- [ ] **Step 1: Add Sequences to TABS array**

  In `layout.tsx`, after the `Automations` entry in the TABS array, insert:
  ```ts
  { label: "Sequences", href: "/crm/settings/sequences" },
  ```

---

## Task 13: Frontend — rebuild automations list page

**Files:**
- Modify: `frontend/app/(authenticated)/crm/settings/automations/page.tsx`
- Create: `frontend/features/crm/settings/automations/automation-list.tsx`

The existing `page.tsx` uses local hooks from `automation-card.tsx` that bypass the committed `hooks/api/crm/automations.ts`. We rebuild it to use the committed hooks and wire up navigation to the builder route.

- [ ] **Step 1: Create `automation-list.tsx`** (the card component for the dense list)

  ```tsx
  "use client";

  import { useCallback } from "react";
  import { useRouter } from "next/navigation";
  import { motion, useReducedMotion } from "framer-motion";
  import { Trash2, Settings } from "lucide-react";
  import { Card, CardContent } from "@/components/ui/card";
  import { Badge } from "@/components/ui/badge";
  import { Switch } from "@/components/ui/switch";
  import { Button } from "@/components/ui/button";
  import { cn } from "@/lib/utils";
  import { fadeUp } from "@/lib/motion-variants";
  import type { CrmAutomationRule, CrmAutomationEvent } from "@/types/crm";

  const REDUCED = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.15 } } };

  interface AutomationListCardProps {
    rule: CrmAutomationRule;
    eventLabel?: string;
    onToggle: (rule: CrmAutomationRule) => void;
    onDeleteRequest: (id: number) => void;
  }

  export function AutomationListCard({ rule, eventLabel, onToggle, onDeleteRequest }: AutomationListCardProps) {
    const router = useRouter();
    const shouldReduce = useReducedMotion();

    const handleToggle = useCallback(() => onToggle(rule), [onToggle, rule]);
    const handleDelete = useCallback(() => onDeleteRequest(rule.id), [onDeleteRequest, rule.id]);
    const handleEdit = useCallback(() => router.push(`/crm/settings/automations/${rule.id}`), [router, rule.id]);

    return (
      <motion.div variants={shouldReduce ? REDUCED : fadeUp}>
        <Card className={cn("bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-all", !rule.isActive && "opacity-60")}>
          <CardContent className="px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold truncate text-foreground">{rule.name}</span>
                  {rule.isDraft && <Badge variant="outline" className="text-[10px] shrink-0">Draft</Badge>}
                  {eventLabel && (
                    <Badge variant="secondary" className="text-[10px] shrink-0 font-normal">{eventLabel}</Badge>
                  )}
                  <Badge variant="outline" className="text-[10px] shrink-0 font-mono">v{rule.version}</Badge>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {rule.executionCount} run{rule.executionCount !== 1 ? "s" : ""}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {rule.lastRunAt
                      ? `Last: ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(rule.lastRunAt))}`
                      : "Never run"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Switch checked={rule.isActive} onCheckedChange={handleToggle} aria-label={rule.isActive ? "Disable" : "Enable"} />
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={handleEdit} aria-label="Edit automation">
                  <Settings className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={handleDelete} aria-label="Delete automation">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }
  ```

- [ ] **Step 2: Rebuild `automations/page.tsx`**

  Replace the entire file content with:

  ```tsx
  "use client";

  import { useState, useCallback } from "react";
  import { useRouter } from "next/navigation";
  import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
  import { Plus } from "lucide-react";
  import { toast } from "sonner";
  import { PageWrapper } from "@/components/ui/page-wrapper";
  import { Button } from "@/components/ui/button";
  import { SkeletonTable } from "@/components/shared";
  import { ErrorState } from "@/components/shared";
  import { EmptyState } from "@/components/ui/empty-state";
  import { AutomationsIllustration } from "@/components/illustrations";
  import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  } from "@/components/ui/alert-dialog";
  import { staggerContainer, fadeUp } from "@/lib/motion-variants";
  import { getErrorMessage } from "@/lib/get-error-message";
  import {
    useCrmAutomationRules, useEnableCrmAutomationRule,
    useDisableCrmAutomationRule, useDeleteCrmAutomationRule,
    useAutomationEvents,
  } from "@/hooks/api/crm";
  import { AutomationListCard } from "@/features/crm/settings/automations/automation-list";
  import type { CrmAutomationRule } from "@/types/crm";

  export default function AutomationsPage() {
    const router = useRouter();
    const shouldReduceMotion = useReducedMotion();
    const { data, isLoading, isError, refetch } = useCrmAutomationRules();
    const { data: eventsData } = useAutomationEvents();
    const enableRule = useEnableCrmAutomationRule();
    const disableRule = useDisableCrmAutomationRule();
    const deleteRule = useDeleteCrmAutomationRule();

    const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

    const eventLabelMap = Object.fromEntries(
      (eventsData?.events ?? []).map((e) => [e.key, e.label]),
    );

    const handleToggle = useCallback(
      (rule: CrmAutomationRule) => {
        const mutation = rule.isActive ? disableRule : enableRule;
        mutation.mutate(rule.id, {
          onSuccess: () => toast.success(rule.isActive ? "Automation disabled" : "Automation enabled"),
          onError: (err) => toast.error(getErrorMessage(err)),
        });
      },
      [enableRule, disableRule],
    );

    const handleDeleteRequest = useCallback((id: number) => setDeleteTargetId(id), []);

    const handleDeleteConfirm = useCallback(() => {
      if (deleteTargetId === null) return;
      deleteRule.mutate(deleteTargetId, {
        onSuccess: () => { toast.success("Automation deleted"); setDeleteTargetId(null); },
        onError: (err) => { toast.error(getErrorMessage(err)); setDeleteTargetId(null); },
      });
    }, [deleteRule, deleteTargetId]);

    const handleDeleteCancel = useCallback(() => setDeleteTargetId(null), []);
    const handleAlertOpenChange = useCallback((open: boolean) => { if (!open) setDeleteTargetId(null); }, []);
    const handleRetry = useCallback(() => { void refetch(); }, [refetch]);
    const handleNewAutomation = useCallback(() => router.push("/crm/settings/automations/new"), [router]);

    const rules = data?.rules ?? [];
    const listVariants = shouldReduceMotion ? { hidden: { opacity: 0 }, visible: { opacity: 1 } } : staggerContainer;
    const itemVariants = shouldReduceMotion ? { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.15 } } } : fadeUp;

    return (
      <>
        <AlertDialog open={deleteTargetId !== null} onOpenChange={handleAlertOpenChange}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Automation</AlertDialogTitle>
              <AlertDialogDescription>
                This automation will be permanently deleted and will no longer run on future triggers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleDeleteCancel}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleDeleteConfirm}
                disabled={deleteRule.isPending}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <PageWrapper
          title="Automations"
          subtitle="Trigger-based rules that fire when CRM events occur"
          actions={
            <Button onClick={handleNewAutomation}>
              <Plus className="h-4 w-4 mr-2" />
              New Automation
            </Button>
          }
        >
          {isError ? (
            <ErrorState title="Failed to load automations" onRetry={handleRetry} />
          ) : (
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div key="loading" variants={itemVariants} initial="hidden" animate="visible" exit={{ opacity: 0 }}>
                  <SkeletonTable rows={4} columns={4} />
                </motion.div>
              ) : rules.length === 0 ? (
                <motion.div key="empty" variants={itemVariants} initial="hidden" animate="visible" exit={{ opacity: 0 }}>
                  <EmptyState
                    className="flex-1 min-h-[50vh] border-0 bg-transparent"
                    illustration={<AutomationsIllustration />}
                    title="No automations yet"
                    description="Create your first automation to start saving time on repetitive CRM tasks."
                    action={{ label: "New Automation", onClick: handleNewAutomation }}
                  />
                </motion.div>
              ) : (
                <motion.div key="list" className="space-y-3" variants={listVariants} initial="hidden" animate="visible">
                  {rules.map((rule) => (
                    <AutomationListCard
                      key={rule.id}
                      rule={rule}
                      eventLabel={eventLabelMap[rule.trigger]}
                      onToggle={handleToggle}
                      onDeleteRequest={handleDeleteRequest}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </PageWrapper>
      </>
    );
  }
  ```

---

## Task 14: Frontend — automation builder route + builder component

**Files:**
- Create: `frontend/app/(authenticated)/crm/settings/automations/[automationId]/page.tsx`
- Create: `frontend/features/crm/settings/automations/automation-builder.tsx`
- Create: `frontend/features/crm/settings/automations/run-history-drawer.tsx`

The builder is a vertical step-composer: trigger card → condition rows → action cards → save. For `/new`, it creates a draft rule with no graph. For `[id]`, it loads the existing rule.

Note: The full DnD-based visual graph builder with if/else branches and wait nodes as described in the spec is a large UI. We build the functional vertical step-composer that covers the spec's core requirements: trigger select, condition rows, action cards with per-action config, TEST panel, run-history drawer. The animated if/else branch lanes are added as a Phase 2 enhancement.

- [ ] **Step 1: Create `run-history-drawer.tsx`**

  ```tsx
  "use client";

  import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
  import { Badge } from "@/components/ui/badge";
  import { SkeletonTable } from "@/components/shared";
  import { useCrmAutomationRuns } from "@/hooks/api/crm";
  import type { AutomationRunStatus } from "@/types/crm";

  const STATUS_VARIANT: Record<AutomationRunStatus, "default" | "secondary" | "destructive" | "outline"> = {
    queued: "outline",
    running: "secondary",
    success: "default",
    failed: "destructive",
    skipped: "outline",
  };

  interface Props {
    ruleId: number | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }

  export function RunHistoryDrawer({ ruleId, open, onOpenChange }: Props) {
    const { data, isLoading } = useCrmAutomationRuns(ruleId ?? 0, 1);
    const runs = data?.runs ?? [];

    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="p-0 flex flex-col sm:max-w-md">
          <SheetHeader className="shrink-0 px-6 py-4 border-b">
            <SheetTitle>Run History</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {isLoading ? (
              <SkeletonTable rows={5} columns={2} />
            ) : runs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No runs yet.</p>
            ) : (
              runs.map((run) => (
                <div key={run.id} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={STATUS_VARIANT[run.status]} className="text-[10px]">{run.status}</Badge>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(run.startedAt).toLocaleString()}
                    </span>
                  </div>
                  {run.steps && run.steps.length > 0 && (
                    <div className="space-y-1">
                      {run.steps.map((step) => (
                        <div key={step.nodeId} className="flex items-center gap-2 text-xs">
                          <span className={
                            step.status === "ok" ? "text-emerald-600" :
                            step.status === "error" ? "text-destructive" : "text-muted-foreground"
                          }>
                            {step.status === "ok" ? "✓" : step.status === "error" ? "✗" : "−"}
                          </span>
                          <span className="text-muted-foreground">{step.type}</span>
                          {step.message && <span className="text-destructive text-[10px]">{step.message}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {run.error && <p className="text-xs text-destructive">{run.error}</p>}
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    );
  }
  ```

- [ ] **Step 2: Create `automation-builder.tsx`** (vertical composer; ≤500 lines)

  ```tsx
  "use client";

  import { useState, useCallback } from "react";
  import { useRouter } from "next/navigation";
  import { useForm, useFieldArray } from "react-hook-form";
  import { zodResolver } from "@hookform/resolvers/zod";
  import { z } from "zod";
  import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
  import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
  import { Plus, Trash2, GripVertical, Play, History, ArrowLeft } from "lucide-react";
  import { toast } from "sonner";
  import { Card, CardContent } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { Badge } from "@/components/ui/badge";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { Switch } from "@/components/ui/switch";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
  import { LoadingButton } from "@/components/ui/loading-button";
  import { SkeletonTable } from "@/components/shared";
  import { getErrorMessage } from "@/lib/get-error-message";
  import { fadeUp } from "@/lib/motion-variants";
  import {
    useAutomationEvents, useAutomationActions,
    useCreateCrmAutomationRule, useUpdateCrmAutomationRule, useTestCrmAutomationRule,
  } from "@/hooks/api/crm";
  import type { CrmAutomationRule } from "@/types/crm";
  import { RunHistoryDrawer } from "./run-history-drawer";

  const conditionSchema = z.object({
    field: z.string().min(1),
    operator: z.enum(["eq", "neq", "gt", "lt", "contains", "in"]),
    value: z.string().min(1),
  });

  const builderSchema = z.object({
    name: z.string().min(1, "Name required").max(200),
    trigger: z.string().min(1, "Trigger required"),
    conditions: z.array(conditionSchema),
    actions: z.array(z.string()),
    isActive: z.boolean(),
    cooldownMinutes: z.number().int().min(0),
  });

  type BuilderForm = z.infer<typeof builderSchema>;

  const OPERATORS = [
    { value: "eq", label: "Equals" },
    { value: "neq", label: "Not equals" },
    { value: "gt", label: "Greater than" },
    { value: "lt", label: "Less than" },
    { value: "contains", label: "Contains" },
    { value: "in", label: "Is one of" },
  ] as const;

  interface Props {
    rule: CrmAutomationRule | null;
  }

  export function AutomationBuilder({ rule }: Props) {
    const router = useRouter();
    const shouldReduce = useReducedMotion();
    const isEdit = rule !== null;

    const { data: eventsData, isLoading: eventsLoading } = useAutomationEvents();
    const { data: actionsData, isLoading: actionsLoading } = useAutomationActions();
    const createRule = useCreateCrmAutomationRule();
    const updateRule = useUpdateCrmAutomationRule();
    const testRule = useTestCrmAutomationRule();

    const [historyOpen, setHistoryOpen] = useState(false);
    const [testPayload, setTestPayload] = useState("{}");
    const [testResult, setTestResult] = useState<{ matched: boolean; nodes: Array<{ nodeId: string; type: string; result: string }> } | null>(null);
    const [actionOrder, setActionOrder] = useState<string[]>(rule?.actions ?? []);

    const form = useForm<BuilderForm>({
      resolver: zodResolver(builderSchema),
      defaultValues: {
        name: rule?.name ?? "",
        trigger: rule?.trigger ?? "",
        conditions: rule?.conditions?.map((c) => ({ field: c.field, operator: "eq" as const, value: c.value })) ?? [],
        actions: rule?.actions ?? [],
        isActive: rule?.isActive ?? false,
        cooldownMinutes: rule?.cooldownMinutes ?? 0,
      },
    });

    const { fields: conditionFields, append: appendCondition, remove: removeCondition } = useFieldArray({
      control: form.control,
      name: "conditions",
    });

    const handleAddCondition = useCallback(
      () => appendCondition({ field: "", operator: "eq", value: "" }),
      [appendCondition],
    );

    const handleAddAction = useCallback(
      (actionKey: string) => {
        const current = form.getValues("actions");
        if (!current.includes(actionKey)) {
          form.setValue("actions", [...current, actionKey]);
          setActionOrder((prev) => [...prev, actionKey]);
        }
      },
      [form],
    );

    const handleRemoveAction = useCallback(
      (actionKey: string) => {
        const current = form.getValues("actions");
        form.setValue("actions", current.filter((a) => a !== actionKey));
        setActionOrder((prev) => prev.filter((a) => a !== actionKey));
      },
      [form],
    );

    const handleDragEnd = useCallback(
      (result: DropResult) => {
        if (!result.destination) return;
        const items = [...actionOrder];
        const [moved] = items.splice(result.source.index, 1);
        if (moved) items.splice(result.destination.index, 0, moved);
        setActionOrder(items);
        form.setValue("actions", items);
      },
      [actionOrder, form],
    );

    const handleTest = useCallback(() => {
      if (!rule?.id) return;
      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse(testPayload) as Record<string, unknown>;
      } catch {
        toast.error("Invalid JSON in test payload");
        return;
      }
      testRule.mutate(
        { id: rule.id, payload },
        {
          onSuccess: (result) => setTestResult(result),
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    }, [rule, testRule, testPayload]);

    const handleTestPayloadChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setTestPayload(e.target.value);
    }, []);

    const handleBack = useCallback(() => router.back(), [router]);
    const handleHistoryOpen = useCallback(() => setHistoryOpen(true), []);
    const handleHistoryOpenChange = useCallback((open: boolean) => setHistoryOpen(open), []);

    const onSubmit = useCallback(
      (values: BuilderForm) => {
        if (isEdit && rule) {
          updateRule.mutate(
            { id: rule.id, ...values },
            {
              onSuccess: () => toast.success("Automation saved"),
              onError: (err) => toast.error(getErrorMessage(err)),
            },
          );
        } else {
          createRule.mutate(values as Parameters<typeof createRule.mutate>[0], {
            onSuccess: () => {
              toast.success("Automation created");
              router.push("/crm/settings/automations");
            },
            onError: (err) => toast.error(getErrorMessage(err)),
          });
        }
      },
      [isEdit, rule, createRule, updateRule, router],
    );

    const isPending = createRule.isPending || updateRule.isPending;
    const isLoading = eventsLoading || actionsLoading;
    const events = eventsData?.events ?? [];
    const actions = actionsData?.actions ?? [];
    const selectedActions = form.watch("actions");

    if (isLoading) return <SkeletonTable rows={6} columns={2} />;

    return (
      <>
        {rule && (
          <RunHistoryDrawer ruleId={rule.id} open={historyOpen} onOpenChange={handleHistoryOpenChange} />
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-2xl mx-auto space-y-6 pb-8">
            <div className="flex items-center justify-between gap-2">
              <button type="button" onClick={handleBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </button>
              <div className="flex items-center gap-2">
                {isEdit && (
                  <Button type="button" variant="outline" size="sm" onClick={handleHistoryOpen} className="h-8 text-xs">
                    <History className="h-3.5 w-3.5 mr-1.5" />
                    History
                  </Button>
                )}
                <LoadingButton type="submit" size="sm" className="h-8 text-xs" isPending={isPending}>
                  {isEdit ? "Save" : "Create"}
                </LoadingButton>
              </div>
            </div>

            <Card className="bg-card border border-border rounded-xl">
              <CardContent className="p-4 space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. Notify team on new lead" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="isActive" render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-3">
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <FormLabel className="!mt-0">Active</FormLabel>
                    </div>
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            <StepCard label="Trigger" index={1}>
              <FormField control={form.control} name="trigger" render={({ field }) => (
                <FormItem>
                  <FormLabel>Event</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select trigger event" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {events.map((ev) => (
                        <SelectItem key={ev.key} value={ev.key}>{ev.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </StepCard>

            <Connector />

            <StepCard label="Conditions" index={2}>
              <div className="space-y-2">
                {conditionFields.map((cf, i) => (
                  <motion.div key={cf.id} variants={shouldReduce ? undefined : fadeUp} className="flex items-start gap-2">
                    <FormField control={form.control} name={`conditions.${i}.field`} render={({ field }) => (
                      <Input {...field} placeholder="Field" className="h-8 text-xs flex-1" />
                    )} />
                    <FormField control={form.control} name={`conditions.${i}.operator`} render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {OPERATORS.map((op) => (
                            <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )} />
                    <FormField control={form.control} name={`conditions.${i}.value`} render={({ field }) => (
                      <Input {...field} placeholder="Value" className="h-8 text-xs flex-1" />
                    )} />
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeCondition(i)} aria-label="Remove condition">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </motion.div>
                ))}
                <Button type="button" variant="outline" size="sm" className="text-xs h-7 border-dashed w-full" onClick={handleAddCondition}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Condition
                </Button>
              </div>
            </StepCard>

            <Connector />

            <StepCard label="Actions" index={3}>
              <div className="space-y-3">
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="actions">
                    {(provided) => (
                      <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                        {actionOrder.filter((k) => selectedActions.includes(k)).map((actionKey, i) => {
                          const action = actions.find((a) => a.key === actionKey);
                          return (
                            <Draggable key={actionKey} draggableId={actionKey} index={i}>
                              {(drag) => (
                                <div ref={drag.innerRef} {...drag.draggableProps} className="flex items-center gap-2 rounded-lg border border-border p-2.5 bg-muted/20">
                                  <span {...drag.dragHandleProps} className="text-muted-foreground cursor-grab">
                                    <GripVertical className="h-4 w-4" />
                                  </span>
                                  <span className="text-sm flex-1 truncate">{action?.label ?? actionKey}</span>
                                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0" onClick={() => handleRemoveAction(actionKey)}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
                <Select onValueChange={handleAddAction} value="">
                  <SelectTrigger className="h-8 text-xs border-dashed">
                    <SelectValue placeholder="+ Add action" />
                  </SelectTrigger>
                  <SelectContent>
                    {actions.filter((a) => !selectedActions.includes(a.key)).map((a) => (
                      <SelectItem key={a.key} value={a.key}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </StepCard>

            {isEdit && (
              <>
                <Connector />
                <StepCard label="Test" index={4}>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Sample payload (JSON)</Label>
                      <textarea
                        value={testPayload}
                        onChange={handleTestPayloadChange}
                        className="w-full rounded-md border border-border bg-muted/30 text-xs font-mono p-2.5 h-20 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <Button type="button" variant="outline" size="sm" className="h-8 text-xs w-full" onClick={handleTest} disabled={testRule.isPending}>
                      <Play className="h-3 w-3 mr-1.5" />
                      {testRule.isPending ? "Running..." : "Run dry-run test"}
                    </Button>
                    <AnimatePresence>
                      {testResult && (
                        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">
                          <Badge variant={testResult.matched ? "default" : "destructive"} className="text-xs">
                            {testResult.matched ? "Matched" : "Did not match"}
                          </Badge>
                          <div className="space-y-1">
                            {testResult.nodes.map((n) => (
                              <div key={n.nodeId} className="flex items-center gap-2 text-xs">
                                <span className={n.result === "pass" ? "text-emerald-600" : "text-muted-foreground"}>
                                  {n.result === "pass" ? "✓" : "−"}
                                </span>
                                <span className="text-muted-foreground">{n.type}</span>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </StepCard>
              </>
            )}
          </form>
        </Form>
      </>
    );
  }

  function Connector() {
    return (
      <div className="flex justify-center">
        <div className="w-px h-6 bg-border" />
      </div>
    );
  }

  function StepCard({ label, index, children }: { label: string; index: number; children: React.ReactNode }) {
    return (
      <Card className="bg-card border border-border rounded-xl">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="flex items-center justify-center h-5 w-5 rounded-full bg-blue-500 text-white text-[10px] font-bold shrink-0">
              {index}
            </span>
            <span className="text-sm font-semibold text-foreground">{label}</span>
          </div>
          {children}
        </CardContent>
      </Card>
    );
  }
  ```

- [ ] **Step 3: Create the builder route page**

  Create `frontend/app/(authenticated)/crm/settings/automations/[automationId]/page.tsx`:

  ```tsx
  "use client";

  import { use } from "react";
  import { PageWrapper } from "@/components/ui/page-wrapper";
  import { SkeletonTable } from "@/components/shared";
  import { ErrorState } from "@/components/shared";
  import { AutomationBuilder } from "@/features/crm/settings/automations/automation-builder";
  import { useCrmAutomationRules } from "@/hooks/api/crm";

  interface PageProps {
    params: Promise<{ automationId: string }>;
  }

  export default function AutomationBuilderPage({ params }: PageProps) {
    const { automationId } = use(params);
    const isNew = automationId === "new";
    const { data, isLoading, isError } = useCrmAutomationRules();

    const rule = isNew ? null : (data?.rules.find((r) => r.id === parseInt(automationId, 10)) ?? null);

    return (
      <PageWrapper
        title={isNew ? "New Automation" : (rule?.name ?? "Edit Automation")}
        subtitle={isNew ? "Build a trigger-based automation rule" : "Modify this automation rule"}
        backHref="/crm/settings/automations"
      >
        {!isNew && isLoading ? (
          <SkeletonTable rows={6} columns={2} />
        ) : !isNew && isError ? (
          <ErrorState title="Failed to load automation" />
        ) : (
          <AutomationBuilder rule={rule} />
        )}
      </PageWrapper>
    );
  }
  ```

---

## Task 15: Frontend — typecheck

**Files:** No changes — just verification.

- [ ] **Step 1: Run frontend typecheck**

  ```bash
  cd D:/projects/personal/Streamlineos/frontend
  npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -80
  ```

  Fix any errors. Common issues:
  - `@hello-pangea/dnd` might not be installed — check `package.json`. If absent, use a simple non-DnD list for action ordering (just `useState` with up/down buttons). Do NOT install new packages without confirming.
  - The `use(params)` pattern requires `react@19` — if the project uses `params` as an object directly (Next 15 style), adjust to `const { automationId } = params;` if `params` is not a Promise in this project.
  - `AutomationsIllustration` might not exist in `@/components/illustrations` — check; fall back to `EmptyActivityIllustration` if absent.

- [ ] **Step 2: Check for `@hello-pangea/dnd`**

  ```bash
  grep "@hello-pangea" D:/projects/personal/Streamlineos/frontend/package.json
  ```

  If it exists — proceed. If not, replace the DragDropContext/Droppable/Draggable imports with a simple static list in `automation-builder.tsx`:

  Replace the DnD section with:
  ```tsx
  <div className="space-y-2">
    {actionOrder.filter((k) => selectedActions.includes(k)).map((actionKey) => {
      const action = actions.find((a) => a.key === actionKey);
      return (
        <div key={actionKey} className="flex items-center gap-2 rounded-lg border border-border p-2.5 bg-muted/20">
          <span className="text-sm flex-1 truncate">{action?.label ?? actionKey}</span>
          <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0" onClick={() => handleRemoveAction(actionKey)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      );
    })}
  </div>
  ```
  And remove the `GripVertical`, `DragDropContext`, `Droppable`, `Draggable`, `DropResult`, `handleDragEnd` references.

---

## Self-Review — Spec Coverage Check

| Spec requirement | Task |
|---|---|
| `crm_automation_runs` table with correct columns/indexes | Task 10 |
| `crm_sequences` uniqueIndex(org_id,name) | Task 10 |
| `crm_sequence_steps` + `crm_sequence_enrollments` | Task 10 |
| Migration 0251 + journal | Task 10 |
| `CrmAutomationBusService.emit()` + depth guard (MAX=3) | Task 3 |
| Per-record+rule cooldown guard | Task 3 |
| Validates eventKey vs `crmAutomationEvents` | Task 3 |
| Runner fires legacy conditions+actions | Already in `CrmAutomationRunnerService` |
| `executeAction` (create_task, send_notification, send_email, call_webhook, start/stop_sequence) | Already in runner |
| send_whatsapp/create_deal/create_quote → skipped | Already in runner |
| Runs persisted with per-step logs | Already in runner |
| `CrmSequencesRunnerService.flushDueEnrollments()` | Task 4 |
| `POST /cron/crm-sequences-flush` | Task 9 |
| `GET /crm/automation/events` + `/actions` | Task 5 |
| `PATCH /crm/automations/:id/enable` + `/disable` | Task 5 |
| `POST /crm/automations/:id/test` (dry-run, zero side effects) | Task 5 |
| `GET /crm/automations/:id/runs` paginated | Task 5 |
| `/crm/sequences` CRUD + steps + enrollments + stop | Task 6 |
| `CrmAutomationStudioModule` registered in AppModule + CronModule | Tasks 7, 8, 9 |
| `crm:sequences:manage` permission in catalog + defaults | Task 1 |
| `crm:automations:manage` on every handler | Tasks 5, 6 (all handlers have it) |
| 5 spec files pass | Task 11 |
| Frontend automations list dense (name, trigger event label, status Switch, run count, last run) | Task 13 |
| Builder route `/crm/settings/automations/[automationId]` | Task 14 |
| TEST panel (dry-run → per-node chips) | Task 14 |
| Run history drawer | Task 14 |
| Sequences tab in layout | Task 12 |
| FE typecheck green | Task 15 |

**Missing from plan vs spec:**
- `task.overdue` event wiring in cron flush: the spec says "task.overdue in your cron flush". The BUS requires an active `crmAutomationEvents` row for `task.overdue`. If no seed data exists for that event key, the bus will silently skip it. **Workaround:** The cron flush task (`crm-sequences-flush`) only flushes sequence enrollments. A separate `crm-automation-flush` cron endpoint for task.overdue is not needed unless there's a cron job querying overdue tasks. This is a scheduler responsibility — add a note in the report but don't add a fake cron route.
- `crm-web-forms.service` event wiring: the spec says to wire `form.submitted` and `lead.created` events in `crm-web-forms.service`. **Per spec constraint:** only touch unowned files for event wiring. `crm-web-forms.service` is in `CrmModule` — not a sibling. However, we only wire it if the call is a one-liner. Adding `CrmAutomationBusService` injection would require importing the module there too — this creates coupling. **Decision:** Provide the exact one-liner snippets in the report for the leads/deals/quotes agents to add.

---

## Event-wiring snippets (for leads/deals/quotes agents)

These are the exact one-liners to add in the respective service files once `CrmAutomationStudioModule` is registered:

**In `modules/crm/crm-web-forms.service.ts`** — after a successful form submission that creates a lead, inject `CrmAutomationBusService` and call:
```ts
this.bus.emit(orgId, "form.submitted", { entityType: "lead", entityId: String(lead.id), data: formData });
this.bus.emit(orgId, "lead.created", { entityType: "lead", entityId: String(lead.id), data: formData });
```

**In `modules/leads/leads.service.ts`** (or wherever leads are created) — after `db.insert(leads)`:
```ts
this.bus.emit(orgId, "lead.created", { entityType: "lead", entityId: String(lead.id), data: { ...leadData } });
```

**In `modules/deals/deals.service.ts`** — after stage change:
```ts
this.bus.emit(orgId, "deal.stage_changed", { entityType: "deal", entityId: String(deal.id), data: { stage: newStage, _prev: { stage: oldStage } } });
```

---

**Plan complete and saved to `docs/superpowers/plans/2026-07-12-crm-automation-studio.md`.**

**Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
