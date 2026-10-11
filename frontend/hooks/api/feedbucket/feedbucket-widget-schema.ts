import { z } from "zod";

const feedbucketWidgetThemeContract = z.object({
  color: z.string().optional(),
  position: z.enum(["bottom-right", "bottom-left"]).optional(),
  label: z.string().optional(),
});

export const feedbucketWidgetRowContract = z.object({
  id: z.number(),
  orgId: z.string(),
  projectId: z.number().nullable(),
  managedProductId: z.number().nullable(),
  defaultProjectId: z.number().nullable().optional(),
  defaultAssigneeMembershipId: z.number().nullable().optional(),
  assigneeRules: z
    .object({
      bug: z.number().optional(),
      idea: z.number().optional(),
      feature: z.number().optional(),
      question: z.number().optional(),
      praise: z.number().optional(),
      other: z.number().optional(),
    })
    .nullable()
    .optional(),
  name: z.string(),
  publicKey: z.string(),
  allowedDomains: z.array(z.string()),
  autoCreateTicket: z.boolean(),
  defaultTicketType: z.string(),
  isActive: z.boolean(),
  aiAssistEnabled: z.boolean(),
  theme: feedbucketWidgetThemeContract.nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

const projectMinimalContract = z.object({
  id: z.number(),
  name: z.string(),
  key: z.string(),
  orgId: z.string(),
});

const feedbucketWidgetListItemContract = feedbucketWidgetRowContract.and(
  z.object({
    project: projectMinimalContract.nullable(),
    submissionCount: z.number(),
    openCount: z.number(),
  }),
);

export const feedbucketWidgetListContract = z.array(
  feedbucketWidgetListItemContract,
);

export const feedbucketWidgetWithProjectContract =
  feedbucketWidgetRowContract.and(
    z.object({ project: projectMinimalContract.nullable() }),
  );
