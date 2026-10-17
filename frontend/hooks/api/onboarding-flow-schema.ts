import { z } from "zod";

/**
 * Contracts for `OnboardingController` handlers (onboarding session, module
 * checklists, guided tours). Timestamps are ISO strings over JSON. NOT `.strict()`.
 */

const persistedOnboardingFlowSessionContract = z.object({
  id: z.number().int().positive(),
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

const initialOnboardingFlowSessionContract = persistedOnboardingFlowSessionContract
  .omit({ lastSeenAt: true, createdAt: true, updatedAt: true })
  .extend({
    id: z.literal(0),
    status: z.literal("not_started"),
    currentStep: z.null(),
    source: z.null(),
    startedAt: z.null(),
    completedAt: z.null(),
  });

export const onboardingFlowSessionContract = z.union([
  persistedOnboardingFlowSessionContract,
  initialOnboardingFlowSessionContract,
]);

const persistedChecklistItemContract = z.object({
  id: z.number().int().positive(),
  orgId: z.string(),
  checklistId: z.number().int().positive(),
  itemKey: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  actionHref: z.string().nullable(),
  status: z.enum(["todo", "in_progress", "done", "skipped", "blocked"]),
  required: z.boolean(),
  sortOrder: z.number().int(),
  completedAt: z.string().nullable(),
  skippedAt: z.string().nullable(),
});

const newSeedItemContract = persistedChecklistItemContract.extend({
  id: z.null(),
  completedAt: z.null(),
  skippedAt: z.null(),
});

const virtualChecklistItemContract = newSeedItemContract.extend({ checklistId: z.null() });

const persistedModuleChecklistContract = z.object({
  id: z.number().int().positive(),
  orgId: z.string(),
  moduleKey: z.string(),
  status: z.enum(["not_started", "in_progress", "completed"]),
  progress: z.number().int().min(0).max(100),
  dismissedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  items: z.array(z.union([persistedChecklistItemContract, newSeedItemContract])),
});

const virtualModuleChecklistContract = persistedModuleChecklistContract
  .omit({ items: true })
  .extend({
    id: z.null(),
    dismissedAt: z.null(),
    completedAt: z.null(),
    createdAt: z.null(),
    updatedAt: z.null(),
    items: z.array(virtualChecklistItemContract),
  });

const moduleChecklistContract = z.union([
  persistedModuleChecklistContract,
  virtualModuleChecklistContract,
]).superRefine((checklist, ctx) => {
  checklist.items.forEach((item, index) => {
    if (item.orgId !== checklist.orgId) {
      ctx.addIssue({ code: "custom", path: ["items", index, "orgId"], message: "Item organization must match checklist" });
    }
    if (item.checklistId !== checklist.id) {
      ctx.addIssue({ code: "custom", path: ["items", index, "checklistId"], message: "Item checklist ID must match parent" });
    }
  });
});

export const moduleChecklistListContract = z.array(moduleChecklistContract);

export const checklistProgressContract = z.object({
  progress: z.number(),
  status: z.string(),
  requiredIncomplete: z.boolean(),
});

export const moduleChecklistRowContract = persistedModuleChecklistContract.omit({ items: true });

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

