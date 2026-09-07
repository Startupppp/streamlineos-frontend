import { z } from "zod";

const userRefSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  image: z.string().nullable(),
});

const clientAccountRowSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  branchId: z.string().nullable(),
  leadId: z.number().int(),
  salesRepId: z.string(),
  salesRepMembershipId: z.number().int().nullable(),
  assignedCrmId: z.string().nullable(),
  assignedCrmMembershipId: z.number().int().nullable(),
  clientName: z.string(),
  clientEmail: z.string().nullable(),
  clientPhone: z.string().nullable(),
  clientWhatsapp: z.string().nullable(),
  status: z.string(),
  investmentAmount: z.string().nullable(),
  planName: z.string().nullable(),
  investmentDate: z.string().nullable(),
  transactionRef: z.string().nullable(),
  conversionNotes: z.string().nullable(),
  estimatedInvestment: z.string().nullable(),
  convertedAt: z.string(),
  investedAt: z.string().nullable(),
  renewalStage: z.string(),
  renewalDate: z.string().nullable(),
  renewalNotes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const clientAccountsListContract = z.object({
  accounts: z.array(clientAccountRowSchema.extend({ salesRep: userRefSchema, assignedCrm: userRefSchema.nullable() })),
  totalCount: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});

const activityRowSchema = z.object({
  id: z.number().int(),
  clientAccountId: z.number().int(),
  userId: z.string(),
  userMembershipId: z.number().int().nullable(),
  activityType: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string(),
  user: userRefSchema.optional(),
});

const userRefWithEmailSchema = userRefSchema.extend({ email: z.string().nullable() });

export const clientAccountDetailContract = clientAccountRowSchema.extend({
  salesRep: userRefWithEmailSchema,
  assignedCrm: userRefWithEmailSchema.nullable(),
  lead: z.object({
    id: z.number().int(),
    name: z.string().nullable(),
    source: z.string().nullable(),
    priority: z.string().nullable(),
  }).nullable(),
  activities: z.array(activityRowSchema),
});

export const clientTimelineContract = z.object({
  events: z.array(z.object({
    type: z.string(),
    title: z.string(),
    description: z.string(),
    date: z.string(),
  })),
  total: z.number().int(),
});

export const simpleClientsListContract = z.array(
  z.object({ id: z.number().int(), name: z.string().nullable() }),
);

const opportunityRowSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  clientId: z.number().int(),
  title: z.string(),
  type: z.string(),
  stage: z.string(),
  value: z.string().nullable(),
  notes: z.string().nullable(),
  expectedCloseDate: z.string().nullable(),
  createdBy: z.string(),
  createdByMembershipId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const clientOpportunitiesContract = z.array(opportunityRowSchema);

const onboardingItemRowSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  clientId: z.number().int(),
  templateId: z.number().int().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  assignedTo: z.string().nullable(),
  assignedToMembershipId: z.number().int().nullable(),
  dueDate: z.string().nullable(),
  completedAt: z.string().nullable(),
  completedBy: z.string().nullable(),
  completedByMembershipId: z.number().int().nullable(),
  sortOrder: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const onboardingItemsListContract = z.array(onboardingItemRowSchema);
export const onboardingItemContract = onboardingItemRowSchema;
