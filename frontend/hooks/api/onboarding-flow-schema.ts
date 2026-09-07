import { z } from "zod";

/**
 * Contracts for `OnboardingController` handlers (onboarding session, module
 * checklists, guided tours) and `WorkspaceOnboardingController`.
 *
 * DISAGREEMENT FOUND: The frontend `WorkspaceGenerationResult` declared four
 * number fields (`businessUnits`, `branches`, `departments`, `teams`), but the
 * backend `generateWorkspaceResponseSchema` returns four STRING ARRAYS — the
 * names of created units, not counts. Corrected here; the hook file is updated
 * to use the correct type.
 *
 * Timestamps are ISO strings over JSON. NOT `.strict()`.
 */

export const onboardingFlowSessionContract = z.object({
  id: z.number(),
  orgId: z.string(),
  userId: z.string(),
  membershipId: z.number().nullable(),
  type: z.string(),
  status: z.enum(["not_started", "in_progress", "completed", "skipped", "abandoned"]),
  currentStep: z.string().nullable(),
  completedSteps: z.array(z.string()),
  skippedSteps: z.array(z.string()),
  data: z.record(z.string(), z.unknown()),
  source: z.string().nullable(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  lastSeenAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const checklistItemContract = z.object({
  id: z.number(),
  orgId: z.string(),
  checklistId: z.number(),
  itemKey: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  actionHref: z.string().nullable(),
  status: z.enum(["todo", "in_progress", "done", "skipped", "blocked"]),
  required: z.boolean(),
  sortOrder: z.number(),
});

const moduleChecklistContract = z.object({
  id: z.number(),
  orgId: z.string(),
  moduleKey: z.string(),
  status: z.enum(["not_started", "in_progress", "completed"]),
  progress: z.number(),
  dismissedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  items: z.array(checklistItemContract),
});

export const moduleChecklistListContract = z.array(moduleChecklistContract);

export const checklistProgressContract = z.object({
  progress: z.number(),
  status: z.string(),
  requiredIncomplete: z.boolean(),
});

export const moduleChecklistRowContract = moduleChecklistContract.omit({ items: true });

const tourProgressContract = z.object({
  id: z.number(),
  orgId: z.string(),
  userId: z.string(),
  membershipId: z.number().nullable(),
  tourKey: z.string(),
  status: z.enum(["not_started", "in_progress", "completed", "dismissed"]),
  currentStep: z.number(),
  completedAt: z.string().nullable(),
  dismissedAt: z.string().nullable(),
  updatedAt: z.string(),
});

const guidedTourContract = z.object({
  id: z.number(),
  orgId: z.string().nullable(),
  tourKey: z.string(),
  moduleKey: z.string().nullable(),
  role: z.string().nullable(),
  steps: z.array(z.record(z.string(), z.unknown())),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  progress: tourProgressContract.nullable(),
});

export const guidedTourListContract = z.array(guidedTourContract);
export const tourProgressRowContract = tourProgressContract;

export const generateWorkspaceContract = z.object({
  businessUnits: z.array(z.string()),
  branches: z.array(z.string()),
  departments: z.array(z.string()),
  teams: z.array(z.string()),
});

export type GenerateWorkspaceResult = z.infer<typeof generateWorkspaceContract>;
