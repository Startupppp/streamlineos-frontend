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

export const projectRisksContract = z.object({
  risks: z.array(z.object({
    title: z.string(),
    severity: z.enum(["low", "medium", "high", "critical"]),
    description: z.string(),
  })),
  evidence: z.object({
    totalTasks: z.number().int(),
    done: z.number().int(),
    inProgress: z.number().int(),
    blocked: z.number().int(),
    overdue: z.number().int(),
  }).passthrough(),
});

export const projectClientUpdateContract = z.object({
  headline: z.string(),
  body: z.string(),
  sections: z.array(z.object({ heading: z.string(), content: z.string() })),
});

export const projectPlanContract = z.object({
  goal: z.string(),
  tickets: z.array(ticketSuggestionContract),
  suggestions: z.literal(true),
});

export const projectExtractTasksContract = z.object({
  tickets: z.array(ticketSuggestionContract),
  suggestions: z.literal(true),
});

export const projectAskContract = z.object({
  answer: z.string(),
  evidence: z.object({
    totalTasks: z.number().int(),
    done: z.number().int(),
    inProgress: z.number().int(),
    blocked: z.number().int(),
    overdue: z.number().int(),
  }),
});

export const weeklyUpdateContract = z.object({
  headline: z.string(),
  body: z.string(),
  sections: z.array(z.object({ heading: z.string(), content: z.string() })).optional(),
  dateRange: z.object({ startDate: z.string(), endDate: z.string() }),
  suggestions: z.literal(true),
});

export const changeImpactContract = z.object({
  impact: z.string(),
  risks: z.array(z.string()),
  recommendations: z.array(z.string()),
  evidence: z.object({
    openChangeRequests: z.number().int(),
    openRisks: z.number().int(),
    pendingApprovals: z.number().int(),
  }),
});

export const summarizeTicketContract = z.object({
  summary: z.string(),
  keyPoints: z.array(z.string()),
  actionItems: z.array(z.string()),
  sentiment: z.enum(["positive", "neutral", "negative"]).optional(),
});

export const summarizeCommentsContract = z.object({
  summary: z.string(),
  keyPoints: z.array(z.string()),
  actionItems: z.array(z.string()),
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
  summary: z.string(),
  openItems: z.array(z.string()),
  context: z.string(),
});

export const suggestDraftTitleContract = z.object({ title: z.string() });

export const improveDraftDescriptionContract = z.object({ description: z.string() });

export const suggestDraftFieldsContract = z.object({
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL", "URGENT"]).optional(),
  points: z.number().int().optional(),
  labelIds: z.array(z.number().int()),
  labelNames: z.array(z.string()),
  rationale: z.string(),
});
