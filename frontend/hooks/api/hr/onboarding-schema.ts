import { z } from "zod";

export const onboardingStatusListContract = z.array(
  z.object({
    userId: z.string().nullable(),
    userName: z.string(),
    totalTasks: z.number().int(),
    completedTasks: z.number().int(),
    percentComplete: z.number().int(),
    lastCompletedAt: z.string().nullable(),
  }),
);

const onboardingTaskRowSchema = z.object({
  id: z.number().int(),
  userId: z.string(),
  userMembershipId: z.number().int().nullable(),
  orgId: z.string(),
  templateStepId: z.number().int().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  ownerRole: z.string(),
  dueDate: z.string().nullable(),
  status: z.string(),
  completedAt: z.string().nullable(),
  completedBy: z.string().nullable(),
  dependsOnTaskIds: z.array(z.number().int()).nullable(),
  rowVersion: z.number().int(),
  createdByMembershipId: z.number().int().nullable(),
  updatedByMembershipId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  canComplete: z.boolean(),
});

export const onboardingTaskListContract = z.array(onboardingTaskRowSchema);

export const completeOnboardingTaskContract = z.object({ success: z.literal(true) });

export const initiateOnboardingContract = z.object({
  success: z.literal(true),
  tasksCreated: z.number().int(),
});

export const onboardingTemplateDepartmentsContract = z.array(
  z.object({ id: z.string(), name: z.string() }),
);

const onboardingTemplateStepSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  templateId: z.number().int(),
  title: z.string(),
  description: z.string().nullable(),
  ownerRole: z.string(),
  dueOffsetDays: z.number().int(),
  isRequired: z.boolean(),
  isComplianceItem: z.boolean(),
  sortOrder: z.number().int(),
});

const onboardingTemplateRowSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  departmentId: z.string().nullable(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  steps: z.array(onboardingTemplateStepSchema),
});

export const onboardingTemplateListContract = z.array(onboardingTemplateRowSchema);

export const createOnboardingTemplateContract = z.object({
  success: z.literal(true),
  templateId: z.number().int(),
});

const onboardingDocListItemSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  userId: z.string(),
  documentTypeId: z.number().int(),
  documentTypeName: z.string(),
  isMandatory: z.boolean(),
  hasFile: z.boolean(),
  fileName: z.string(),
  fileSize: z.number().int().nullable(),
  mimeType: z.string().nullable(),
  version: z.number().int(),
  status: z.string(),
  reviewedBy: z.string().nullable(),
  reviewedAt: z.string().nullable(),
  remarks: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  reviewerName: z.string().nullable(),
});

export const myOnboardingDocsContract = z.object({
  data: z.array(onboardingDocListItemSchema),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const submitOnboardingDocContract = z.unknown();
