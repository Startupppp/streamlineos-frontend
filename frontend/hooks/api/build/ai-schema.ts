import { z } from "zod";

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
