import { z } from "zod";

const ticketSuggestionContract = z.object({
  title: z.string(),
  type: z.string(),
  priority: z.string(),
  description: z.string(),
});

export const projectSummaryContract = z.object({
  summary: z.string(),
  highlights: z.array(z.string()),
  atRisk: z.boolean(),
  evidence: z.object({
    totalTasks: z.number().int(),
    done: z.number().int(),
    inProgress: z.number().int(),
    blocked: z.number().int(),
    overdue: z.number().int(),
  }).passthrough(),
});

const riskEvidenceSchema = z.object({
  totalTasks: z.number().int(),
  done: z.number().int(),
  inProgress: z.number().int(),
  blocked: z.number().int(),
  overdue: z.number().int(),
});

export const projectRisksContract = z.object({
  risks: z.array(z.object({
    title: z.string(),
    severity: z.enum(["high", "medium", "low"]),
    rationale: z.string(),
    mitigation: z.string(),
  })),
  evidence: riskEvidenceSchema,
});

export const projectClientUpdateContract = z.object({
  headline: z.string(),
  body: z.string(),
  sections: z.array(z.object({ heading: z.string(), content: z.string() })),
});

export const projectPlanContract = z.object({
  summary: z.string(),
  milestones: z.array(z.object({
    name: z.string(),
    tasks: z.array(z.object({
      title: z.string(),
      estimateHours: z.number(),
      priority: z.enum(["high", "medium", "low"]),
    })),
  })),
  suggestions: z.literal(true),
});

export const projectExtractTasksContract = z.object({
  tasks: z.array(z.object({
    title: z.string(),
    priority: z.enum(["high", "medium", "low"]),
    suggestedAssignee: z.string(),
    dueHint: z.string(),
  })),
  suggestions: z.literal(true),
});

export const projectAskContract = z.object({
  answer: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
  evidence: riskEvidenceSchema,
});

export const weeklyUpdateContract = z.object({
  headline: z.string(),
  completedHighlights: z.array(z.string()),
  blockers: z.array(z.string()),
  upcomingFocus: z.array(z.string()),
  citations: z.array(z.object({
    source: z.enum(["ticket", "blocker", "risk", "decision", "discussion"]),
    label: z.string(),
  })),
  dateRange: z.object({ startDate: z.string(), endDate: z.string() }),
  suggestions: z.literal(true),
});

export const changeImpactContract = z.object({
  headline: z.string(),
  scopeImpact: z.string(),
  scheduleImpact: z.string(),
  budgetImpact: z.string(),
  riskSummary: z.array(z.string()),
  pendingApprovals: z.array(z.string()),
  citations: z.array(z.object({
    source: z.enum(["change_request", "risk", "approval", "plan"]),
    label: z.string(),
  })),
  evidence: z.object({
    openChangeRequests: z.number().int(),
    openRisks: z.number().int(),
    pendingApprovals: z.number().int(),
  }),
});

export const summarizeTicketContract = z.object({
  summary: z.string(),
  keyPoints: z.array(z.string()),
  blockers: z.array(z.string()),
  actionItems: z.array(z.string()).optional(),
  sentiment: z.enum(["positive", "neutral", "negative"]).optional(),
});

export const summarizeCommentsContract = z.object({
  summary: z.string(),
  themes: z.array(z.string()),
  openQuestions: z.array(z.string()),
  keyPoints: z.array(z.string()).optional(),
});

export const improveTicketDescriptionContract = z.object({ description: z.string() });

export const suggestSubtasksContract = z.object({
  subtasks: z.array(z.object({
    title: z.string(),
    description: z.string().optional(),
  })),
});

export const generateChecklistContract = z.object({
  title: z.string(),
  items: z.array(z.object({
    text: z.string(),
    completed: z.boolean().optional(),
  })),
});

export const ticketHandoffContract = z.object({
  currentState: z.string(),
  keyDecisions: z.array(z.string()),
  nextAction: z.string(),
  blockers: z.array(z.string()),
  citations: z.array(z.object({
    source: z.enum(["description", "comment", "decision"]),
    excerpt: z.string(),
  })),
});

export const suggestDraftTitleContract = z.object({ title: z.string() });

export const improveDraftDescriptionContract = z.object({ description: z.string() });

export const suggestDraftFieldsContract = z.object({
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  points: z.number().int().optional(),
  labelIds: z.array(z.number().int()),
  labelNames: z.array(z.string()),
  rationale: z.string(),
});
