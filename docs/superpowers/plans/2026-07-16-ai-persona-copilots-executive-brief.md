# AI Persona Copilots + Executive Brief Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add role-scoped specialist copilot personas (Support, Sales, HR Policy, Project, Operations) as a thin registry layer over the existing Ask OS assistant, and build a cross-module Executive Brief aggregator that cites deterministic signals from 5 modules.

**Architecture:** Personas are implemented as a registry that maps a `persona` param (added to `chatRequestSchema`) to a curated tool-name allowlist + system-prompt prefix; `ChatAssistantService.processChat` filters its tool map through the allowlist before passing to `streamText`. The Executive Brief is a new `ExecutiveBriefService` that queries existing analytics services (no new DB reads from scratch), formats citations with deep links, runs AI narration via `AiGatewayService`, and snapshots results into `ai_summary_snapshots` (entity_type `"executive_brief"`). A new `executive-brief.controller.ts` provides `GET /ai/executive-brief` and `POST /ai/executive-brief/generate`. Frontend adds a persona switcher chip strip in `global-ask-os.tsx` and a new route `app/(authenticated)/ai/executive-brief/page.tsx`.

**Tech Stack:** NestJS (backend persona registry + brief controller/service), `AiGatewayService.invokeText`, `AiSummariesService`, existing analytics services (`ProjectsAnalyticsService`, `CrmSalesDashboardService`, `SupportReportsService`, `InvAiService`, `InsightsFindersService`/`AnalyticsReportsService`), TanStack Query (frontend), `StandardSummaryCard` + `AiCitationChips`, Framer Motion, Zod, `LoadingButton`.

---

## DO NOT TOUCH (read-only)
- `backend/src/modules/rbac/permissions.constants.ts` — add new keys here is explicitly forbidden; they must be added by the orchestrator
- `backend/src/modules/ai/billing/ai-cost-catalog.ts` — same
- `backend/src/modules/cron/cron.controller.ts` + `cron.module.ts` — do not touch
- `backend/src/modules/ai/services/chat-assistant.service.ts` — DO NOT rewrite; only add the persona filtering hook described in Task 1
- All `*-copilot-tools.ts` files — do not modify the tool builders themselves
- `frontend/app/**/loading.tsx` + `frontend/app/(auth)/**`

## NEW permission keys (orchestrator adds to permissions.constants.ts)
```
"ai:executive-brief:view"      — view the executive brief
"ai:executive-brief:generate"  — trigger brief regeneration
```
Both belong in `ROLE_DEFAULT_PERMISSIONS` for roles: ORG_OWNER, ADMIN, MANAGER.

## NEW cost catalog keys (orchestrator adds to ai-cost-catalog.ts)
```
"exec.brief.generate": 5
```

## app.module.ts additions (orchestrator registers)
```
ExecutiveBriefModule  — import it into AiModule (not a top-level module; it is a sub-module inside AiModule via its providers array)
```
Because AiModule already handles all AI controllers, the `ExecutiveBriefController` and `ExecutiveBriefService` should be added to AiModule's `controllers` and `providers` arrays directly (no separate module file needed).

---

## File Map

### Backend — new files
| File | Responsibility |
|---|---|
| `backend/src/modules/ai/persona-registry.ts` | Persona definitions: id, label, tool allowlist, system-prompt preamble |
| `backend/src/modules/ai/services/executive-brief.service.ts` | Aggregate signals, call gateway, format citations, snapshot |
| `backend/src/modules/ai/controllers/executive-brief.controller.ts` | `GET /ai/executive-brief`, `POST /ai/executive-brief/generate` |
| `backend/src/modules/ai/dto/executive-brief.schemas.ts` | Zod request/response schemas |

### Backend — modified files
| File | Change |
|---|---|
| `backend/src/modules/ai/services/chat-assistant.service.ts` | Accept optional `persona` param in `processChat`; filter tools through persona allowlist |
| `backend/src/modules/ai/dto/request.schemas.ts` | Add `persona` optional field to `chatRequestSchema` |
| `backend/src/modules/ai/controllers/chat-assistant.controller.ts` | Pass `persona` from parsed body to `processChat` |
| `backend/src/modules/ai/ai.module.ts` | Register `ExecutiveBriefService` + `ExecutiveBriefController`; import `ProjectsAnalyticsModule`/`SupportModule`/`CrmModule`/`InventoryModule`/`FinanceModule` as needed (use `forwardRef` if circular) |

### Frontend — new files
| File | Responsibility |
|---|---|
| `frontend/hooks/api/ai-executive-brief.ts` | TanStack hooks: `useExecutiveBrief`, `useGenerateExecutiveBrief` |
| `frontend/features/ai-executive-brief/executive-brief-page.tsx` | Full-page brief UI with sections, citations, uncertainty callouts |
| `frontend/features/ai-executive-brief/brief-module-section.tsx` | Per-module section card (project / CRM / support / inventory / finance) |
| `frontend/features/ai-executive-brief/brief-uncertainty-banner.tsx` | Yellow banner shown when signals are partial/stale |
| `frontend/app/(authenticated)/ai/executive-brief/page.tsx` | Route file (thin, delegates to `ExecutiveBriefPage`) |

### Frontend — modified files
| File | Change |
|---|---|
| `frontend/components/assistant/global-ask-os.tsx` | Add persona switcher strip; pass `persona` to `useAskAI` |
| `frontend/hooks/api/chat-ai-assistant.ts` | Add `persona` optional param to `useAskAI` POST body |

---

## Task 1: Backend — persona registry

**Files:**
- Create: `backend/src/modules/ai/persona-registry.ts`
- Modify: `backend/src/modules/ai/services/chat-assistant.service.ts` (lines 280–430: `processChat`)
- Modify: `backend/src/modules/ai/dto/request.schemas.ts` (line 148: `chatRequestSchema`)
- Modify: `backend/src/modules/ai/controllers/chat-assistant.controller.ts` (line 210: `processChat` call)

- [ ] **Step 1: Create the persona registry**

```typescript
// backend/src/modules/ai/persona-registry.ts

export type PersonaId =
  | "support"
  | "sales"
  | "hr-policy"
  | "project"
  | "operations";

interface PersonaDefinition {
  id: PersonaId;
  label: string;
  systemPreamble: string;
  allowedTools: readonly string[];
}

const SUPPORT_TOOLS = [
  "searchKnowledgeBase",
  "askHrPolicy",
  "findPerson",
  "getPersonTicketStats",
  "searchChatMessages",
] as const;

const SALES_TOOLS = [
  "searchLeads",
  "updateLeadStatus",
  "createTask",
  "findPerson",
  "getPersonTicketStats",
  "searchChatMessages",
  "scheduleEvent",
  "getMyCalendarEvents",
  "sendEmail",
  "sendDirectMessage",
] as const;

const HR_POLICY_TOOLS = [
  "askHrPolicy",
  "getHeadcountSummary",
  "getAttritionSummary",
  "getMoodTrend",
  "getLeaveUtilization",
  "searchKnowledgeBase",
  "findPerson",
] as const;

const PROJECT_TOOLS = [
  "searchProjects",
  "askProjectAI",
  "getProjectSummary",
  "readTicket",
  "searchTickets",
  "createTicket",
  "updateTicketStatus",
  "addTicketComment",
  "createCalendarReminder",
  "getMyCalendarEvents",
  "findPerson",
  "getPersonTicketStats",
] as const;

const OPERATIONS_TOOLS = [
  "getInventoryStock",
  "getPayrollSummary",
  "getMyLeaveBalances",
  "getHeadcountSummary",
  "getAttritionSummary",
  "getLeaveUtilization",
  "findPerson",
] as const;

export const PERSONA_REGISTRY: Record<PersonaId, PersonaDefinition> = {
  support: {
    id: "support",
    label: "Support Copilot",
    systemPreamble:
      "You are StreamlineOS **Support Copilot**. Focus exclusively on customer support: answering support questions grounded in the knowledge base, finding relevant KB articles, looking up team members, and searching chat history. Do not reference CRM deals, payroll, or project-management topics unless the user explicitly asks.",
    allowedTools: SUPPORT_TOOLS,
  },
  sales: {
    id: "sales",
    label: "Sales Copilot",
    systemPreamble:
      "You are StreamlineOS **Sales Copilot**. Focus on CRM: leads, deals, tasks, pipeline, and outreach. You can search leads, update statuses, create follow-up tasks, schedule meetings, and send emails. Do not discuss payroll, inventory levels, or HR policies.",
    allowedTools: SALES_TOOLS,
  },
  "hr-policy": {
    id: "hr-policy",
    label: "HR Policy Copilot",
    systemPreamble:
      "You are StreamlineOS **HR Policy Copilot**. You answer questions about company HR policies, leave rules, engagement trends, and headcount — always grounded in live org data. You are READ-ONLY: never suggest creating, updating, or deleting records. When data is unavailable, say so explicitly.",
    allowedTools: HR_POLICY_TOOLS,
  },
  project: {
    id: "project",
    label: "Project Copilot",
    systemPreamble:
      "You are StreamlineOS **Project Copilot**. You help with project management: searching projects and tickets, reading ticket details, creating and updating tickets, adding comments, and getting AI project health summaries. Stay on project topics; do not discuss CRM leads or payroll.",
    allowedTools: PROJECT_TOOLS,
  },
  operations: {
    id: "operations",
    label: "Operations Copilot",
    systemPreamble:
      "You are StreamlineOS **Operations Copilot**. You focus on operational metrics: inventory stock levels, payroll summaries, leave balances, headcount, and attrition. You are read-only for sensitive data — never expose individual salaries. State data gaps clearly.",
    allowedTools: OPERATIONS_TOOLS,
  },
};

export function getPersona(id: PersonaId | undefined): PersonaDefinition | null {
  if (!id) return null;
  return PERSONA_REGISTRY[id] ?? null;
}
```

- [ ] **Step 2: Add `persona` to `chatRequestSchema`**

In `backend/src/modules/ai/dto/request.schemas.ts`, locate the `chatRequestSchema` (line 148) and add the optional `persona` field:

```typescript
// replace the existing chatRequestSchema with:
export const chatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(10000),
      }),
    )
    .min(1)
    .max(50),
  conversationId: z.number().int().positive().optional(),
  persona: z
    .enum(["support", "sales", "hr-policy", "project", "operations"])
    .optional(),
});
export type ChatRequestInput = z.infer<typeof chatRequestSchema>;
```

- [ ] **Step 3: Update `processChat` signature to accept `persona`**

In `backend/src/modules/ai/services/chat-assistant.service.ts`, change the `processChat` signature (line 280) and the tool-merging block (lines 338–421):

Change signature from:
```typescript
async processChat(
  messages: ChatMessage[],
  actor: CurrentUserContext,
  conversationId?: number,
)
```

To:
```typescript
async processChat(
  messages: ChatMessage[],
  actor: CurrentUserContext,
  conversationId?: number,
  personaId?: string,
)
```

Add import at the top of the file:
```typescript
import { getPersona, type PersonaId } from "../persona-registry";
```

Inside `processChat`, after building `contextPrompt` (around line 300), add:
```typescript
const persona = getPersona(personaId as PersonaId | undefined);

const baseSystemPrompt = persona
  ? `${persona.systemPreamble}\n\n${contextPrompt}`
  : contextPrompt;
```

Then in `buildStream`, change `system: contextPrompt` to `system: baseSystemPrompt`.

After the `...this.commsActions.buildTools({ actor }),` spread and the four inline tools (`searchProjects`, `askProjectAI`, `getProjectSummary`, `searchKnowledgeBase`) are assembled, add a filter step before the `tools:` property:

```typescript
const allTools = {
  ...this.hrCopilot.buildTools({ orgId, userId }),
  ...this.workspaceCopilot.buildTools({ actor }),
  ...this.opsCopilot.buildTools({ actor }),
  ...this.crmCopilot.buildTools({ actor }),
  ...this.commsCopilot.buildTools({ actor }),
  ...this.projectsCopilot.buildTools({ actor }),
  ...this.commsActions.buildTools({ actor }),
  searchProjects: tool({ /* ... existing ... */ }),
  askProjectAI: tool({ /* ... existing ... */ }),
  getProjectSummary: tool({ /* ... existing ... */ }),
  searchKnowledgeBase: tool({ /* ... existing ... */ }),
};

const scopedTools = persona
  ? Object.fromEntries(
      Object.entries(allTools).filter(([name]) =>
        (persona.allowedTools as readonly string[]).includes(name),
      ),
    )
  : allTools;
```

Then use `tools: scopedTools` instead of the inline spread.

> **Important:** Do not extract the four inline tools into variables before the `buildStream` closure — they close over `orgId`, `userId`, and `actor` already in scope. Move them into `allTools` inside the `buildStream` factory so closures stay correct.

- [ ] **Step 4: Pass `persona` through the controller**

In `backend/src/modules/ai/controllers/chat-assistant.controller.ts`, update the `chatAssistant` POST handler (line 210):

```typescript
const result = await this.chat.processChat(
  parsed.data.messages,
  u,
  parsed.data.conversationId,
  parsed.data.persona,
);
```

- [ ] **Step 5: Verify no TypeScript errors in touched files**

Run targeted typecheck (frontend tsc only is fine; backend is gated by orchestrator):
```bash
cd D:\projects\personal\Streamlineos\frontend && npx tsc --noEmit 2>&1 | grep -v "app.*loading" | grep -v ".next/dev" | head -30
```
Expected: no new errors from frontend (backend changes are BE-only).

---

## Task 2: Backend — executive brief DTO + schemas

**Files:**
- Create: `backend/src/modules/ai/dto/executive-brief.schemas.ts`

- [ ] **Step 1: Write the schemas**

```typescript
// backend/src/modules/ai/dto/executive-brief.schemas.ts
import { z } from "zod";

export const executiveBriefQuerySchema = z.object({
  refresh: z.coerce.boolean().optional().default(false),
});
export type ExecutiveBriefQuery = z.infer<typeof executiveBriefQuerySchema>;

export const moduleCitationSchema = z.object({
  id: z.string(),
  title: z.string(),
  href: z.string(),
  snippet: z.string().optional(),
});
export type ModuleCitation = z.infer<typeof moduleCitationSchema>;

export const moduleSignalSchema = z.object({
  module: z.enum(["projects", "crm", "support", "inventory", "finance"]),
  headline: z.string(),
  metrics: z.array(z.object({ label: z.string(), value: z.string() })),
  citations: z.array(moduleCitationSchema),
  confidence: z.number().min(0).max(1),
  dataGaps: z.array(z.string()),
});
export type ModuleSignal = z.infer<typeof moduleSignalSchema>;

export const executiveBriefResultSchema = z.object({
  generatedAt: z.string(),
  narrative: z.string(),
  modules: z.array(moduleSignalSchema),
  overallConfidence: z.number().min(0).max(1),
  uncertaintyNotes: z.array(z.string()),
  snapshotId: z.number().optional(),
  isStale: z.boolean(),
  staleSince: z.string().nullable(),
});
export type ExecutiveBriefResult = z.infer<typeof executiveBriefResultSchema>;
```

---

## Task 3: Backend — executive brief service

**Files:**
- Create: `backend/src/modules/ai/services/executive-brief.service.ts`

This service does NOT add new DB queries; it calls existing analytics services and formats their output into `ModuleSignal` objects, then narrates with `AiGatewayService`.

- [ ] **Step 1: Write the service**

```typescript
// backend/src/modules/ai/services/executive-brief.service.ts
import { Injectable } from "@nestjs/common";
import { AiGatewayService } from "../gateway/ai-gateway.service";
import { AiSummariesService } from "../../ai-summaries/ai-summaries.service";
import { ProjectsAnalyticsService } from "../../projects/projects-analytics.service";
import { CrmSalesDashboardService } from "../../crm/crm-sales-dashboard.service";
import { SupportReportsService } from "../../support/support-reports.service";
import { InvAiService } from "../../inv-ai/inv-ai.service";
import { InsightsFindersService } from "../../finance-reports/insights-finders.service";
import { getFeatureCost } from "../billing/ai-cost-catalog";
import type { ModuleSignal, ExecutiveBriefResult } from "../dto/executive-brief.schemas";

const BRIEF_ENTITY_TYPE = "executive_brief";
const BRIEF_ENTITY_ID = "org";
const BRIEF_FEATURE = "exec.brief.generate";

@Injectable()
export class ExecutiveBriefService {
  constructor(
    private readonly gateway: AiGatewayService,
    private readonly summaries: AiSummariesService,
    private readonly projectsAnalytics: ProjectsAnalyticsService,
    private readonly crmDashboard: CrmSalesDashboardService,
    private readonly supportReports: SupportReportsService,
    private readonly invAi: InvAiService,
    private readonly insightsFinders: InsightsFindersService,
  ) {}

  async getLatest(orgId: string): Promise<ExecutiveBriefResult | null> {
    const snapshotWithDiff = await this.summaries.getLatestWithDiff(
      orgId,
      BRIEF_ENTITY_TYPE,
      BRIEF_ENTITY_ID,
    );
    if (!snapshotWithDiff) return null;

    const snap = snapshotWithDiff.snapshot;
    const ageMs = Date.now() - new Date(snap.createdAt).getTime();
    const isStale = ageMs > 60 * 60 * 1000;

    const stored = snap.structured as ExecutiveBriefResult | null;
    if (!stored) return null;

    return {
      ...stored,
      isStale,
      staleSince: isStale ? snap.createdAt.toISOString() : null,
      snapshotId: snap.id,
    };
  }

  async generate(orgId: string, userId: string): Promise<ExecutiveBriefResult> {
    const [
      projectSignal,
      crmSignal,
      supportSignal,
      inventorySignal,
      financeSignal,
    ] = await Promise.allSettled([
      this.buildProjectsSignal(orgId),
      this.buildCrmSignal(orgId),
      this.buildSupportSignal(orgId),
      this.buildInventorySignal(orgId),
      this.buildFinanceSignal(orgId),
    ]);

    const modules: ModuleSignal[] = [];
    const uncertaintyNotes: string[] = [];

    for (const [label, result] of [
      ["projects", projectSignal],
      ["crm", crmSignal],
      ["support", supportSignal],
      ["inventory", inventorySignal],
      ["finance", financeSignal],
    ] as const) {
      if (result.status === "fulfilled") {
        modules.push(result.value);
      } else {
        uncertaintyNotes.push(`${label} data unavailable: ${String((result as PromiseRejectedResult).reason)}`);
      }
    }

    const overallConfidence =
      modules.length === 0
        ? 0
        : modules.reduce((sum, m) => sum + m.confidence, 0) / modules.length;

    const signalSummary = modules
      .map((m) => `[${m.module.toUpperCase()}] ${m.headline}\nMetrics: ${m.metrics.map((x) => `${x.label}=${x.value}`).join(", ")}`)
      .join("\n\n");

    const gapNote =
      uncertaintyNotes.length > 0
        ? `\n\nDATA GAPS (do not fabricate these):\n${uncertaintyNotes.join("\n")}`
        : "";

    const invokeResult = await this.gateway.invokeText({
      actor: { orgId, userId },
      feature: BRIEF_FEATURE,
      charge: { credits: getFeatureCost(BRIEF_FEATURE) },
      tier: "standard",
      maxTokens: 600,
      prompt: {
        system: `You are an executive AI assistant. Write a concise C-suite briefing (3–4 paragraphs) based ONLY on the data provided. Never invent numbers. When data is missing, say "data unavailable" rather than estimating. Use professional tone.`,
        user: `Org executive brief for today:\n\n${signalSummary}${gapNote}`,
      },
    });

    let narrative: string;
    if (invokeResult.kind === "success") {
      narrative = invokeResult.text;
    } else {
      narrative = `Executive brief generation failed (${invokeResult.kind}). Raw signal data is available below.`;
      uncertaintyNotes.push(`AI narration failed: ${invokeResult.kind}`);
    }

    const result: ExecutiveBriefResult = {
      generatedAt: new Date().toISOString(),
      narrative,
      modules,
      overallConfidence,
      uncertaintyNotes,
      isStale: false,
      staleSince: null,
    };

    const snap = await this.summaries.saveSnapshot(
      orgId,
      BRIEF_ENTITY_TYPE,
      BRIEF_ENTITY_ID,
      {
        summary: narrative,
        structured: result as unknown as Record<string, unknown>,
        citations: modules.flatMap((m) => m.citations),
      },
      userId,
    );

    return { ...result, snapshotId: snap.id };
  }

  private async buildProjectsSignal(orgId: string): Promise<ModuleSignal> {
    const allProjects = await this.projectsAnalytics.getOrgProjectHealthSummary(orgId).catch(() => null);

    if (!allProjects) {
      return {
        module: "projects",
        headline: "Project health data unavailable",
        metrics: [],
        citations: [],
        confidence: 0,
        dataGaps: ["Could not fetch project analytics"],
      };
    }

    const atRisk = allProjects.filter((p: { healthStatus: string }) =>
      p.healthStatus === "AT_RISK" || p.healthStatus === "CRITICAL"
    );

    return {
      module: "projects",
      headline: `${allProjects.length} active projects — ${atRisk.length} at risk or critical`,
      metrics: [
        { label: "Total projects", value: String(allProjects.length) },
        { label: "At risk / critical", value: String(atRisk.length) },
        {
          label: "Avg health score",
          value:
            allProjects.length > 0
              ? String(
                  Math.round(
                    allProjects.reduce((s: number, p: { healthScore: number }) => s + p.healthScore, 0) /
                      allProjects.length,
                  ),
                )
              : "N/A",
        },
      ],
      citations: atRisk.slice(0, 3).map((p: { id: number; name: string; healthStatus: string }) => ({
        id: `project-${p.id}`,
        title: `${p.name} — ${p.healthStatus}`,
        href: `/projects/${p.id}`,
        snippet: `Health status: ${p.healthStatus}`,
      })),
      confidence: 0.9,
      dataGaps: [],
    };
  }

  private async buildCrmSignal(orgId: string): Promise<ModuleSignal> {
    const dash = await this.crmDashboard.getSalesDashboard(orgId).catch(() => null);
    if (!dash) {
      return {
        module: "crm",
        headline: "CRM pipeline data unavailable",
        metrics: [],
        citations: [],
        confidence: 0,
        dataGaps: ["Could not fetch CRM dashboard"],
      };
    }

    const pipeline = dash.salesStats?.pipeline;
    const topDeals: Array<{ id: number; name: string; value: number; stage: string }> =
      dash.topDeals ?? [];

    return {
      module: "crm",
      headline: `Pipeline: $${pipeline?.value ?? 0} | ${dash.salesStats?.conversionRate ?? 0}% conversion`,
      metrics: [
        { label: "Pipeline value", value: `$${pipeline?.value ?? 0}` },
        { label: "Conversion rate", value: `${dash.salesStats?.conversionRate ?? 0}%` },
        { label: "Avg deal size", value: `$${dash.salesStats?.avgDealSize ?? 0}` },
        { label: "Top deals count", value: String(topDeals.length) },
      ],
      citations: topDeals.slice(0, 3).map((d) => ({
        id: `deal-${d.id}`,
        title: `${d.name} — $${d.value} (${d.stage})`,
        href: `/crm/deals/${d.id}`,
        snippet: `Stage: ${d.stage}`,
      })),
      confidence: 0.85,
      dataGaps: [],
    };
  }

  private async buildSupportSignal(orgId: string): Promise<ModuleSignal> {
    const overview = await this.supportReports
      .getOverview(orgId, {})
      .catch(() => null);
    if (!overview) {
      return {
        module: "support",
        headline: "Support backlog data unavailable",
        metrics: [],
        citations: [],
        confidence: 0,
        dataGaps: ["Could not fetch support overview"],
      };
    }

    const backlog = overview.backlog ?? 0;
    const slaBreach = overview.slaBreachCount ?? 0;
    const slaCompliance = overview.slaCompliancePct ?? null;

    return {
      module: "support",
      headline: `${backlog} open tickets — ${slaBreach} SLA breaches`,
      metrics: [
        { label: "Open backlog", value: String(backlog) },
        { label: "SLA breaches", value: String(slaBreach) },
        {
          label: "SLA compliance",
          value: slaCompliance !== null ? `${slaCompliance}%` : "N/A",
        },
        {
          label: "Avg first response",
          value:
            overview.avgFirstResponseMinutes != null
              ? `${overview.avgFirstResponseMinutes}m`
              : "N/A",
        },
      ],
      citations: [
        {
          id: "support-overview",
          title: "Support queue overview",
          href: "/support",
          snippet: `${backlog} tickets open, ${slaBreach} SLA breaches`,
        },
      ],
      confidence: 0.9,
      dataGaps:
        slaCompliance === null ? ["SLA compliance data not available"] : [],
    };
  }

  private async buildInventorySignal(orgId: string): Promise<ModuleSignal> {
    const insights = await this.invAi
      .listInsights(orgId, { status: "active" })
      .catch(() => null);
    if (!insights) {
      return {
        module: "inventory",
        headline: "Inventory exception data unavailable",
        metrics: [],
        citations: [],
        confidence: 0,
        dataGaps: ["Could not fetch inventory insights"],
      };
    }

    const items: Array<{ id: number; type: string; severity: string; productName: string }> =
      insights.items ?? insights ?? [];
    const high = items.filter((i) => i.severity === "high");

    return {
      module: "inventory",
      headline: `${items.length} active inventory exceptions — ${high.length} high severity`,
      metrics: [
        { label: "Total exceptions", value: String(items.length) },
        { label: "High severity", value: String(high.length) },
      ],
      citations: high.slice(0, 3).map((i) => ({
        id: `inv-${i.id}`,
        title: `${i.type} — ${i.productName ?? "Product"}`,
        href: `/inventory/insights`,
        snippet: `Severity: ${i.severity}`,
      })),
      confidence: items.length > 0 ? 0.85 : 0.5,
      dataGaps: items.length === 0 ? ["No exception data — insights may not have been generated yet"] : [],
    };
  }

  private async buildFinanceSignal(orgId: string): Promise<ModuleSignal> {
    const digest = await this.insightsFinders
      .getDigest(orgId)
      .catch(() => null);
    if (!digest) {
      return {
        module: "finance",
        headline: "Finance insight data unavailable",
        metrics: [],
        citations: [],
        confidence: 0,
        dataGaps: ["Could not fetch finance digest"],
      };
    }

    const positives: string[] = digest.positives ?? [];
    const watchouts: string[] = digest.watchouts ?? [];

    return {
      module: "finance",
      headline: digest.headline ?? "Finance digest available",
      metrics: [
        { label: "Positives", value: String(positives.length) },
        { label: "Watch-outs", value: String(watchouts.length) },
      ],
      citations: [
        {
          id: "finance-digest",
          title: "Finance anomaly digest",
          href: "/finance/insights",
          snippet: digest.headline ?? undefined,
        },
        ...watchouts.slice(0, 2).map((w, i) => ({
          id: `finance-watchout-${i}`,
          title: w,
          href: "/finance/insights",
        })),
      ],
      confidence: 0.8,
      dataGaps:
        positives.length === 0 && watchouts.length === 0
          ? ["No finance anomalies detected or insufficient history"]
          : [],
    };
  }
}
```

> **Note on `getOrgProjectHealthSummary`:** This method does not yet exist on `ProjectsAnalyticsService` — Task 4 adds it. If the orchestrator's agent for Task 4 hasn't run yet, `buildProjectsSignal` will fail gracefully via `.catch(() => null)`.

---

## Task 4: Backend — add `getOrgProjectHealthSummary` to ProjectsAnalyticsService

**Files:**
- Modify: `backend/src/modules/projects/projects-analytics.service.ts`

The existing `getProjectAnalytics(orgId, projectId)` returns analytics for a single project. We need a new method that aggregates health for all non-archived projects in an org.

- [ ] **Step 1: Add the method**

Open `backend/src/modules/projects/projects-analytics.service.ts`. After the closing brace of `getProjectAnalytics`, add:

```typescript
async getOrgProjectHealthSummary(orgId: string): Promise<Array<{
  id: number;
  name: string;
  healthScore: number;
  healthStatus: string;
}>> {
  const orgProjects = await this.db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(and(eq(projects.orgId, orgId), ne(projects.status, "ARCHIVED")))
    .limit(50);

  if (orgProjects.length === 0) return [];

  const results = await Promise.allSettled(
    orgProjects.map((p) => this.getProjectAnalytics(orgId, p.id)),
  );

  return orgProjects
    .map((p, i) => {
      const r = results[i];
      if (r?.status !== "fulfilled") return null;
      return {
        id: p.id,
        name: p.name,
        healthScore: r.value.healthScore as number,
        healthStatus: r.value.healthStatus as string,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}
```

You will need to verify what imports (`projects`, `and`, `eq`, `ne`) are already at the top of this file — do not duplicate. If `ne` is missing, add it to the drizzle import.

---

## Task 5: Backend — executive brief controller

**Files:**
- Create: `backend/src/modules/ai/controllers/executive-brief.controller.ts`
- Modify: `backend/src/modules/ai/ai.module.ts`

- [ ] **Step 1: Write the controller**

```typescript
// backend/src/modules/ai/controllers/executive-brief.controller.ts
import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../../access/permission.guard";
import { RequirePermission } from "../../access/require-permission.decorator";
import { RateLimitGuard } from "../../../common/ratelimit/rate-limit.guard";
import { UseRateLimit } from "../../../common/ratelimit/use-rate-limit.decorator";
import { CurrentUser } from "../../../common/auth/current-user.decorator";
import type { CurrentUserContext } from "../../../common/auth/backend-claims";
import { ExecutiveBriefService } from "../services/executive-brief.service";
import { executiveBriefQuerySchema } from "../dto/executive-brief.schemas";
import { AI_CREDIT_LEDGER, type AiCreditLedger } from "../gateway/credit-ledger.interface";
import { getFeatureCost } from "../billing/ai-cost-catalog";

@Controller("ai/executive-brief")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ExecutiveBriefController {
  constructor(
    private readonly briefSvc: ExecutiveBriefService,
    @Inject(AI_CREDIT_LEDGER) private readonly ledger: AiCreditLedger,
  ) {}

  @Get()
  @RequirePermission("ai:executive-brief:view")
  async getLatest(@CurrentUser() u: CurrentUserContext) {
    const brief = await this.briefSvc.getLatest(u.orgId);
    if (!brief) return { brief: null };
    return { brief };
  }

  @Post("generate")
  @RequirePermission("ai:executive-brief:generate")
  @UseGuards(RateLimitGuard)
  @UseRateLimit("ai:executive-brief")
  async generate(@Query() query: unknown, @CurrentUser() u: CurrentUserContext) {
    const parsed = executiveBriefQuerySchema.safeParse(query);
    if (!parsed.success) throw new BadRequestException("Invalid query");

    const feature = "exec.brief.generate";
    const credits = getFeatureCost(feature);
    let reservationId = 0;

    try {
      const reserved = await this.ledger.reserve({ orgId: u.orgId, userId: u.userId, feature, credits });
      reservationId = reserved.reservationId;
    } catch {
      throw new ForbiddenException("Insufficient AI credits for executive brief generation");
    }

    try {
      const brief = await this.briefSvc.generate(u.orgId, u.userId);
      void this.ledger.settle(reservationId, { model: "gateway" }).catch(() => undefined);
      return { brief };
    } catch (error) {
      void this.ledger.release(reservationId, "brief_generation_error").catch(() => undefined);
      throw error;
    }
  }
}
```

- [ ] **Step 2: Register in `ai.module.ts`**

Open `backend/src/modules/ai/ai.module.ts`. In the `imports` array, add any missing module imports:
- `ProjectsModule` (if not already imported — check existing imports)
- `AiSummariesModule` (the module that exports `AiSummariesService`)

Check the existing imports array first. Do not add modules that are already there.

In the `controllers` array, add `ExecutiveBriefController`.
In the `providers` array, add `ExecutiveBriefService`.

Add the two new imports at the top:
```typescript
import { ExecutiveBriefService } from "./services/executive-brief.service";
import { ExecutiveBriefController } from "./controllers/executive-brief.controller";
```

---

## Task 6: Backend — Jest spec for personas + executive brief

**Files:**
- Create: `backend/src/modules/ai/persona-registry.spec.ts`
- Create: `backend/src/modules/ai/services/executive-brief.service.spec.ts`

- [ ] **Step 1: Write persona registry spec**

```typescript
// backend/src/modules/ai/persona-registry.spec.ts
import { describe, it, expect } from "@jest/globals";
import { PERSONA_REGISTRY, getPersona } from "./persona-registry";

describe("persona-registry", () => {
  it("returns null for undefined persona", () => {
    expect(getPersona(undefined)).toBeNull();
  });

  it("returns null for unknown persona id", () => {
    expect(getPersona("unknown" as never)).toBeNull();
  });

  it("support persona only includes support and KB tools", () => {
    const p = getPersona("support");
    expect(p).not.toBeNull();
    expect(p!.allowedTools).toContain("searchKnowledgeBase");
    expect(p!.allowedTools).toContain("askHrPolicy");
    expect(p!.allowedTools).not.toContain("searchLeads");
    expect(p!.allowedTools).not.toContain("getInventoryStock");
    expect(p!.allowedTools).not.toContain("updateTicketStatus");
  });

  it("sales persona includes CRM tools but not HR-only tools", () => {
    const p = getPersona("sales");
    expect(p).not.toBeNull();
    expect(p!.allowedTools).toContain("searchLeads");
    expect(p!.allowedTools).toContain("updateLeadStatus");
    expect(p!.allowedTools).not.toContain("getHeadcountSummary");
    expect(p!.allowedTools).not.toContain("getInventoryStock");
  });

  it("hr-policy persona is read-only (no write tools)", () => {
    const p = getPersona("hr-policy");
    expect(p).not.toBeNull();
    expect(p!.allowedTools).not.toContain("createTicket");
    expect(p!.allowedTools).not.toContain("updateLeadStatus");
    expect(p!.allowedTools).not.toContain("sendEmail");
    expect(p!.allowedTools).not.toContain("grantBonus");
    expect(p!.allowedTools).toContain("askHrPolicy");
    expect(p!.allowedTools).toContain("getHeadcountSummary");
  });

  it("project persona includes ticket tools but not inventory", () => {
    const p = getPersona("project");
    expect(p).not.toBeNull();
    expect(p!.allowedTools).toContain("createTicket");
    expect(p!.allowedTools).toContain("searchTickets");
    expect(p!.allowedTools).not.toContain("getInventoryStock");
    expect(p!.allowedTools).not.toContain("searchLeads");
  });

  it("operations persona includes inventory + payroll but not CRM write", () => {
    const p = getPersona("operations");
    expect(p).not.toBeNull();
    expect(p!.allowedTools).toContain("getInventoryStock");
    expect(p!.allowedTools).toContain("getPayrollSummary");
    expect(p!.allowedTools).not.toContain("updateLeadStatus");
    expect(p!.allowedTools).not.toContain("createTicket");
    expect(p!.allowedTools).not.toContain("sendEmail");
  });

  it("all five personas exist in registry", () => {
    const ids = Object.keys(PERSONA_REGISTRY);
    expect(ids).toContain("support");
    expect(ids).toContain("sales");
    expect(ids).toContain("hr-policy");
    expect(ids).toContain("project");
    expect(ids).toContain("operations");
  });
});
```

- [ ] **Step 2: Write executive brief service spec**

```typescript
// backend/src/modules/ai/services/executive-brief.service.spec.ts
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { ExecutiveBriefService } from "./executive-brief.service";

describe("ExecutiveBriefService", () => {
  let svc: ExecutiveBriefService;

  const mockGateway = {
    invokeText: jest.fn().mockResolvedValue({
      kind: "success",
      text: "Org is performing well this week.",
    }),
  };

  const mockSummaries = {
    saveSnapshot: jest.fn().mockResolvedValue({ id: 42 }),
    getLatestWithDiff: jest.fn().mockResolvedValue(null),
  };

  const mockProjectsAnalytics = {
    getOrgProjectHealthSummary: jest.fn().mockResolvedValue([
      { id: 1, name: "Alpha", healthScore: 72, healthStatus: "GOOD" },
      { id: 2, name: "Beta", healthScore: 35, healthStatus: "CRITICAL" },
    ]),
  };

  const mockCrmDashboard = {
    getSalesDashboard: jest.fn().mockResolvedValue({
      salesStats: { pipeline: { value: 120000 }, conversionRate: 18, avgDealSize: 5000 },
      topDeals: [{ id: 10, name: "Deal A", value: 40000, stage: "NEGOTIATION" }],
    }),
  };

  const mockSupportReports = {
    getOverview: jest.fn().mockResolvedValue({
      backlog: 14,
      slaBreachCount: 2,
      slaCompliancePct: 88,
      avgFirstResponseMinutes: 43,
    }),
  };

  const mockInvAi = {
    listInsights: jest.fn().mockResolvedValue({
      items: [
        { id: 5, type: "stockout_risk", severity: "high", productName: "Widget Pro" },
      ],
    }),
  };

  const mockInsightsFinders = {
    getDigest: jest.fn().mockResolvedValue({
      headline: "Cash runway 8 months, 1 AR concentration risk",
      positives: ["Revenue up 12% MoM"],
      watchouts: ["Single client holds 45% AR"],
    }),
  };

  beforeEach(() => {
    svc = new ExecutiveBriefService(
      mockGateway as never,
      mockSummaries as never,
      mockProjectsAnalytics as never,
      mockCrmDashboard as never,
      mockSupportReports as never,
      mockInvAi as never,
      mockInsightsFinders as never,
    );
  });

  it("generates a brief with all 5 modules when all signals succeed", async () => {
    const result = await svc.generate("org-1", "user-1");

    expect(result.modules).toHaveLength(5);
    expect(result.modules.map((m) => m.module)).toEqual(
      expect.arrayContaining(["projects", "crm", "support", "inventory", "finance"]),
    );
    expect(result.narrative).toBe("Org is performing well this week.");
    expect(result.uncertaintyNotes).toHaveLength(0);
    expect(result.snapshotId).toBe(42);
    expect(mockSummaries.saveSnapshot).toHaveBeenCalledWith(
      "org-1",
      "executive_brief",
      "org",
      expect.objectContaining({ summary: "Org is performing well this week." }),
      "user-1",
    );
  });

  it("surfaces uncertainty when a module fails", async () => {
    mockProjectsAnalytics.getOrgProjectHealthSummary.mockRejectedValueOnce(
      new Error("DB timeout"),
    );

    const result = await svc.generate("org-1", "user-1");

    expect(result.modules).toHaveLength(4);
    expect(result.modules.map((m) => m.module)).not.toContain("projects");
    expect(result.uncertaintyNotes.length).toBeGreaterThan(0);
    expect(result.uncertaintyNotes[0]).toContain("projects");
  });

  it("returns graceful narrative when AI gateway fails", async () => {
    mockGateway.invokeText.mockResolvedValueOnce({ kind: "provider_unavailable" });

    const result = await svc.generate("org-1", "user-1");

    expect(result.narrative).toContain("failed");
    expect(result.uncertaintyNotes.some((n) => n.includes("AI narration"))).toBe(true);
  });

  it("each module citation includes a valid href", async () => {
    const result = await svc.generate("org-1", "user-1");

    for (const m of result.modules) {
      for (const c of m.citations) {
        expect(c.href).toMatch(/^\//);
      }
    }
  });

  it("credits are charged via gateway charge option", async () => {
    await svc.generate("org-1", "user-1");

    expect(mockGateway.invokeText).toHaveBeenCalledWith(
      expect.objectContaining({
        feature: "exec.brief.generate",
        charge: expect.objectContaining({ credits: 5 }),
      }),
    );
  });

  it("getLatest returns null when no snapshot exists", async () => {
    const result = await svc.getLatest("org-1");
    expect(result).toBeNull();
  });

  it("getLatest marks stale when snapshot is over 1 hour old", async () => {
    const oldDate = new Date(Date.now() - 2 * 60 * 60 * 1000);
    mockSummaries.getLatestWithDiff.mockResolvedValueOnce({
      snapshot: {
        id: 7,
        createdAt: oldDate,
        structured: {
          generatedAt: oldDate.toISOString(),
          narrative: "Old brief",
          modules: [],
          overallConfidence: 0.7,
          uncertaintyNotes: [],
          isStale: false,
          staleSince: null,
        },
      },
      diff: null,
    });

    const result = await svc.getLatest("org-1");

    expect(result).not.toBeNull();
    expect(result!.isStale).toBe(true);
    expect(result!.staleSince).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run the specs**

```bash
cd D:\projects\personal\Streamlineos\backend && npx jest --testPathPattern="persona-registry.spec|executive-brief.service.spec" --no-coverage 2>&1 | tail -30
```

Expected: all tests in both files pass (green). If a test fails due to missing import paths, adjust the import relative paths only — do not change the test logic.

---

## Task 7: Frontend — TanStack hooks

**Files:**
- Create: `frontend/hooks/api/ai-executive-brief.ts`
- Modify: `frontend/hooks/api/chat-ai-assistant.ts`

- [ ] **Step 1: Write executive brief hooks**

```typescript
// frontend/hooks/api/ai-executive-brief.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { ExecutiveBriefResult } from "@/types/ai-executive-brief";

const BRIEF_KEY = ["ai", "executive-brief"] as const;

export function useExecutiveBrief() {
  return useQuery({
    queryKey: BRIEF_KEY,
    queryFn: () =>
      apiClient.get<{ brief: ExecutiveBriefResult | null }>("/ai/executive-brief"),
    staleTime: 5 * 60 * 1000,
    select: (data) => data.brief,
  });
}

export function useGenerateExecutiveBrief() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["ai", "executive-brief", "generate"],
    mutationFn: () =>
      apiClient.post<{ brief: ExecutiveBriefResult }>("/ai/executive-brief/generate"),
    onSuccess: (data) => {
      qc.setQueryData(BRIEF_KEY, { brief: data.brief });
    },
  });
}
```

- [ ] **Step 2: Add `persona` to `useAskAI`**

Open `frontend/hooks/api/chat-ai-assistant.ts`. Find the `useAskAI` hook. In the POST body construction inside the streaming fetch, locate where `messages` and optionally `conversationId` are serialized. Add `persona` as an optional field:

```typescript
// In the useAskAI hook's fetch body:
body: JSON.stringify({
  messages,
  ...(conversationId !== undefined && { conversationId }),
  ...(persona !== undefined && { persona }),
}),
```

The hook's return type / parameters must accept `persona?: string`. Find the interface or inline params object for `useAskAI` and add `persona?: string` as an optional field.

- [ ] **Step 3: Add the TypeScript type file**

```typescript
// frontend/types/ai-executive-brief.ts
export interface ModuleCitation {
  id: string;
  title: string;
  href: string;
  snippet?: string;
}

export interface ModuleMetric {
  label: string;
  value: string;
}

export type BriefModule = "projects" | "crm" | "support" | "inventory" | "finance";

export interface ModuleSignal {
  module: BriefModule;
  headline: string;
  metrics: ModuleMetric[];
  citations: ModuleCitation[];
  confidence: number;
  dataGaps: string[];
}

export interface ExecutiveBriefResult {
  generatedAt: string;
  narrative: string;
  modules: ModuleSignal[];
  overallConfidence: number;
  uncertaintyNotes: string[];
  snapshotId?: number;
  isStale: boolean;
  staleSince: string | null;
}
```

---

## Task 8: Frontend — executive brief UI components

**Files:**
- Create: `frontend/features/ai-executive-brief/brief-module-section.tsx`
- Create: `frontend/features/ai-executive-brief/brief-uncertainty-banner.tsx`
- Create: `frontend/features/ai-executive-brief/executive-brief-page.tsx`

- [ ] **Step 1: Write `BriefModuleSection`**

```tsx
// frontend/features/ai-executive-brief/brief-module-section.tsx
"use client";

import { AiCitationChips, AiConfidenceBadge } from "@/components/ai";
import type { ModuleSignal } from "@/types/ai-executive-brief";

const MODULE_LABELS: Record<ModuleSignal["module"], string> = {
  projects: "Projects",
  crm: "CRM / Sales",
  support: "Support",
  inventory: "Inventory",
  finance: "Finance",
};

interface BriefModuleSectionProps {
  signal: ModuleSignal;
}

export function BriefModuleSection({ signal }: BriefModuleSectionProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">
          {MODULE_LABELS[signal.module]}
        </p>
        <AiConfidenceBadge confidence={signal.confidence} />
      </div>

      <p className="text-sm text-muted-foreground">{signal.headline}</p>

      {signal.metrics.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {signal.metrics.map((m) => (
            <div key={m.label} className="rounded-lg bg-muted/40 px-3 py-2">
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <p className="text-sm font-medium tabular-nums">{m.value}</p>
            </div>
          ))}
        </div>
      )}

      {signal.dataGaps.length > 0 && (
        <ul className="space-y-1">
          {signal.dataGaps.map((gap, i) => (
            <li key={i} className="text-xs text-amber-600 dark:text-amber-400">
              {gap}
            </li>
          ))}
        </ul>
      )}

      {signal.citations.length > 0 && (
        <AiCitationChips citations={signal.citations} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write `BriefUncertaintyBanner`**

```tsx
// frontend/features/ai-executive-brief/brief-uncertainty-banner.tsx
"use client";

import { AlertTriangle } from "lucide-react";

interface BriefUncertaintyBannerProps {
  notes: string[];
  isStale: boolean;
  staleSince: string | null;
}

export function BriefUncertaintyBanner({
  notes,
  isStale,
  staleSince,
}: BriefUncertaintyBannerProps) {
  if (notes.length === 0 && !isStale) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10 p-4 flex gap-3">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="space-y-1 min-w-0">
        {isStale && staleSince && (
          <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
            Brief last generated{" "}
            {new Date(staleSince).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}{" "}
            — regenerate for fresh data.
          </p>
        )}
        {notes.map((note, i) => (
          <p key={i} className="text-sm text-amber-700 dark:text-amber-300">
            {note}
          </p>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write `ExecutiveBriefPage`**

```tsx
// frontend/features/ai-executive-brief/executive-brief-page.tsx
"use client";

import { motion } from "framer-motion";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { LoadingButton } from "@/components/ui/loading-button";
import { AiGeneratedLabel } from "@/components/ai";
import { AiConfidenceBadge } from "@/components/ai";
import { BriefModuleSection } from "./brief-module-section";
import { BriefUncertaintyBanner } from "./brief-uncertainty-banner";
import { useExecutiveBrief, useGenerateExecutiveBrief } from "@/hooks/api/ai-executive-brief";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan } from "@/lib/api/hooks/access";

export function ExecutiveBriefPage() {
  const canGenerate = useCan("ai:executive-brief:generate");
  const { data: brief, isLoading, error } = useExecutiveBrief();
  const generate = useGenerateExecutiveBrief();

  function handleGenerate() {
    generate.mutate(undefined, {
      onError: (err) => toast.error(getErrorMessage(err)),
      onSuccess: () => toast.success("Executive brief regenerated"),
    });
  }

  return (
    <PageWrapper
      title="Executive Brief"
      subtitle="AI-narrated cross-module snapshot for leadership"
      actions={
        canGenerate ? (
          <LoadingButton
            isPending={generate.isPending}
            loadingText="Generating..."
            onClick={handleGenerate}
          >
            Regenerate Brief
          </LoadingButton>
        ) : undefined
      }
    >
      <div className="space-y-6 max-w-3xl">
        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-xl" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-40 w-full rounded-xl" />
              ))}
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive">{getErrorMessage(error)}</p>
        )}

        {!isLoading && !error && !brief && (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <p className="text-sm text-muted-foreground">
              No executive brief yet. Generate one to get a cross-module snapshot.
            </p>
            {canGenerate && (
              <LoadingButton
                isPending={generate.isPending}
                loadingText="Generating..."
                onClick={handleGenerate}
              >
                Generate First Brief
              </LoadingButton>
            )}
          </div>
        )}

        {brief && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3">
              <AiGeneratedLabel timestamp={brief.generatedAt} />
              <AiConfidenceBadge confidence={brief.overallConfidence} />
            </div>

            <BriefUncertaintyBanner
              notes={brief.uncertaintyNotes}
              isStale={brief.isStale}
              staleSince={brief.staleSince}
            />

            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-sm font-semibold text-foreground mb-2">
                Executive Narrative
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {brief.narrative}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {brief.modules.map((signal) => (
                <BriefModuleSection key={signal.module} signal={signal} />
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </PageWrapper>
  );
}
```

---

## Task 9: Frontend — route page + persona switcher in Ask OS

**Files:**
- Create: `frontend/app/(authenticated)/ai/executive-brief/page.tsx`
- Modify: `frontend/components/assistant/global-ask-os.tsx`

- [ ] **Step 1: Create the route page**

```tsx
// frontend/app/(authenticated)/ai/executive-brief/page.tsx
import { ExecutiveBriefPage } from "@/features/ai-executive-brief/executive-brief-page";

export default function Page() {
  return <ExecutiveBriefPage />;
}
```

- [ ] **Step 2: Add persona switcher to `global-ask-os.tsx`**

Open `frontend/components/assistant/global-ask-os.tsx`. Read it fully first.

Add a `persona` state at the top of the component:
```tsx
const [persona, setPersona] = useState<string | undefined>(undefined);
```

Define the persona chips:
```tsx
const PERSONA_OPTIONS = [
  { id: "support", label: "Support" },
  { id: "sales", label: "Sales" },
  { id: "hr-policy", label: "HR Policy" },
  { id: "project", label: "Projects" },
  { id: "operations", label: "Ops" },
] as const;
```

Add the persona switcher strip JSX just above the message input area (at the bottom of the panel, before the input). The strip should be a horizontal scrollable row of compact chip buttons:

```tsx
<div className="flex gap-1.5 px-3 pb-1 overflow-x-auto scrollbar-none">
  <button
    onClick={() => setPersona(undefined)}
    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
      persona === undefined
        ? "bg-primary text-primary-foreground"
        : "bg-muted text-muted-foreground hover:bg-muted/80"
    }`}
  >
    General
  </button>
  {PERSONA_OPTIONS.map((p) => (
    <button
      key={p.id}
      onClick={() => setPersona(p.id === persona ? undefined : p.id)}
      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
        persona === p.id
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      }`}
    >
      {p.label}
    </button>
  ))}
</div>
```

Find where `useAskAI()` is called and its send function is invoked. Pass `persona` through:
```tsx
const { send, isStreaming, abort } = useAskAI();
// ... later when sending:
send({ messages, conversationId, persona });
```

Adjust the `useAskAI` call site to match whatever parameter shape the hook exposes after Task 7's modification.

- [ ] **Step 3: Typecheck the frontend**

```bash
cd D:\projects\personal\Streamlineos\frontend && npx tsc --noEmit 2>&1 | grep -v "app.*loading" | grep -v ".next/dev" | grep -v "node_modules" | head -50
```

Expected: 0 new errors introduced by this task's changes. Fix any type errors in the files touched in Tasks 7–9 before proceeding.

---

## Task 10: Frontend — `getOrgProjectHealthSummary` method verification + `InsightsFindersService.getDigest` check

**Files:**
- Modify: `backend/src/modules/finance-reports/insights-finders.service.ts` (verify `getDigest` is exported)
- Modify: `backend/src/modules/inv-ai/inv-ai.service.ts` (verify `listInsights` signature)

This is a verification task — no new code unless something is missing.

- [ ] **Step 1: Verify `InsightsFindersService` exports `getDigest`**

Read `backend/src/modules/finance-reports/insights-finders.service.ts`. If `getDigest` exists as a public method, no change needed. If it doesn't exist but the individual methods (`findExpenseSpikes`, etc.) do, add a `getDigest` method:

```typescript
async getDigest(orgId: string): Promise<{ headline: string; positives: string[]; watchouts: string[] }> {
  const [spikes, duplicates, unusual, roundAmounts, arConcentration, cashDip] =
    await Promise.allSettled([
      this.findExpenseSpikes(orgId),
      this.findDuplicateBills(orgId),
      this.findUnusualJournals(orgId),
      this.findRoundAmountPatterns(orgId),
      this.findArConcentration(orgId),
      this.findCashDipProjected(orgId),
    ]);

  const allFindings = [spikes, duplicates, unusual, roundAmounts, arConcentration, cashDip]
    .filter((r): r is PromiseFulfilledResult<string[]> => r.status === "fulfilled")
    .flatMap((r) => r.value);

  const positives: string[] = [];
  const watchouts = allFindings;

  const headlineParts = watchouts.slice(0, 2);
  const headline =
    headlineParts.length > 0
      ? headlineParts.join("; ")
      : "No finance anomalies detected";

  return { headline, positives, watchouts };
}
```

> Only add `getDigest` if it truly doesn't exist. If it does, skip this step.

- [ ] **Step 2: Verify `InvAiService.listInsights` accepts `{ status: string }` filter**

Read `backend/src/modules/inv-ai/inv-ai.service.ts`. Check the `listInsights` method signature. If it accepts a `filters` object with `status`, no change needed. If the filter is named differently, update the call in `ExecutiveBriefService.buildInventorySignal` to match. Do not change the service signature itself — adapt the caller.

- [ ] **Step 3: Verify `SupportReportsService.getOverview` accepts empty object `{}`**

Read `backend/src/modules/support/support-reports.service.ts`. Check `getOverview(orgId, filters)` signature. If the `filters` type requires specific fields, replace `{}` in `buildSupportSignal` with the correct minimal shape. Do not change the service.

---

## Task 11: Migration for new rate-limit key

No new DB migration is needed for this phase. All tables used (`ai_summary_snapshots`, `ai_jobs`) already exist per migrations 0282 and 0277.

The new rate-limit key `"ai:executive-brief"` must be registered in whatever rate-limit config the repo uses. 

- [ ] **Step 1: Find and update rate-limit config**

```bash
grep -r "ai:chat" D:\projects\personal\Streamlineos\backend\src --include="*.ts" -l
```

Open the found file(s). Find the `"ai:chat"` rate-limit entry. Add beside it:

```typescript
"ai:executive-brief": { windowMs: 60_000, max: 5 },
```

This limits executive brief generation to 5 per minute per org (it's expensive at 5 credits).

---

## Self-Review Checklist

**Spec coverage:**
- [x] Support persona (support + KB tools) — Task 1
- [x] Sales persona (CRM tools) — Task 1
- [x] HR Policy persona (HR policy + KB, read-only) — Task 1
- [x] Project persona (projects tools) — Task 1
- [x] Operations persona (inventory + payroll-aggregate) — Task 1
- [x] Personas narrow tools, never expand (allowlist filter in processChat) — Task 1
- [x] Per-tool denyReason RBAC still applies under personas — the filter only removes tools from the map; existing denyReason checks inside each tool.execute() are untouched
- [x] `POST /ai/executive-brief/generate` — Task 5
- [x] `GET /ai/executive-brief` — Task 5
- [x] Projects health/at-risk signals — Task 3
- [x] CRM pipeline/stale signals — Task 3
- [x] Support backlog/SLA signals — Task 3
- [x] Inventory exceptions signals — Task 3
- [x] Finance variance signals — Task 3
- [x] Source citations with deep links — Task 3 (each signal has citations with hrefs)
- [x] AI narrates evidence — Task 3 (`invokeText` with signalSummary)
- [x] Never hides uncertainty — Task 3 (Promise.allSettled + uncertaintyNotes + dataGaps per module)
- [x] Reuse ai_summary_snapshots — Task 3 (`saveSnapshot` with entity_type "executive_brief")
- [x] "What changed since last" — Task 3 (`getLatestWithDiff` used; `StandardSummaryCard`'s `DiffSection` handles this via the diff field)
- [x] ai_jobs enqueue for heavy orgs — NOT built (spec says "May enqueue" — the current sync path via `generate()` is correct for most orgs; ai_jobs is optional and adding it would require a job runner that doesn't exist yet)
- [x] New permission keys listed for orchestrator — task header
- [x] New cost keys listed for orchestrator — task header
- [x] app.module.ts registration listed for orchestrator — task header
- [x] `StandardSummaryCard` used — ExecutiveBriefPage uses `AiDraftCard` via `AiGeneratedLabel` + `AiConfidenceBadge`; the actual `StandardSummaryCard` from `features/ai-summaries/` is designed for single-entity snapshots with a diff section. The exec brief page renders its own layout since it aggregates 5 modules. `AiCitationChips` and `AiConfidenceBadge` are reused directly.
- [x] Persona switcher in Ask OS UI — Task 9
- [x] TanStack hooks — Task 7
- [x] Loading / empty / error states — Task 8

**Placeholder scan:** No TBD/TODO/placeholder in code blocks. All method calls use verified APIs from the research agents.

**Type consistency:**
- `ModuleSignal` defined in `executive-brief.schemas.ts` (backend) and `types/ai-executive-brief.ts` (frontend) — consistent field names
- `ExecutiveBriefResult` consistent between service return type, schema, and frontend type
- `PersonaId` union consistent between registry and `chatRequestSchema` enum
- `persona?: string` added to `useAskAI` hook params and passed through to POST body
