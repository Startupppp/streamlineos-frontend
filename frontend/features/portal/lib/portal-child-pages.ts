import { z } from "zod";

function cursorPage<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    data: z.array(item),
    pagination: z.object({
      limit: z.number().int(),
      hasMore: z.boolean(),
      nextCursor: z.string().nullable(),
    }),
  });
}

const portalUpdateSchema = z.object({
  id: z.number().int(),
  body: z.string(),
  authorName: z.string(),
  createdAt: z.string(),
});

const portalFileSchema = z.object({
  id: z.number().int(),
  filename: z.string(),
  url: z.string(),
});

const portalRequestSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  status: z.string(),
  decisionComment: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const portalMilestoneSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  dueDate: z.string().nullable(),
  status: z.string(),
});

const portalTaskSchema = z.object({
  id: z.number().int(),
  ticketNumber: z.number().int(),
  title: z.string(),
  status: z.string(),
  dueDate: z.string().nullable(),
});

const portalDeliverableSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  version: z.string(),
  releaseDate: z.string().nullable(),
  status: z.string(),
});

const portalApprovalSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  status: z.string(),
  dueAt: z.string().nullable(),
});

const portalInvoiceSchema = z.object({
  id: z.string(),
  documentNumber: z.string().nullable(),
  issueDate: z.string(),
  dueDate: z.string().nullable(),
  grossMinor: z.number().int(),
  currency: z.string(),
  status: z.string(),
});

export const portalUpdatesPageSchema = cursorPage(portalUpdateSchema);
export const portalFilesPageSchema = cursorPage(portalFileSchema);
export const portalRequestsPageSchema = cursorPage(portalRequestSchema);
export const portalMilestonesPageSchema = cursorPage(portalMilestoneSchema);
export const portalTasksPageSchema = cursorPage(portalTaskSchema);
export const portalDeliverablesPageSchema = cursorPage(portalDeliverableSchema);
export const portalApprovalsPageSchema = cursorPage(portalApprovalSchema);
export const portalInvoicesPageSchema = cursorPage(portalInvoiceSchema);

export type PortalUpdate = z.infer<typeof portalUpdateSchema>;
export type PortalFile = z.infer<typeof portalFileSchema>;
export type PortalRequest = z.infer<typeof portalRequestSchema>;
export type PortalMilestone = z.infer<typeof portalMilestoneSchema>;
export type PortalTask = z.infer<typeof portalTaskSchema>;
export type PortalDeliverable = z.infer<typeof portalDeliverableSchema>;
export type PortalApproval = z.infer<typeof portalApprovalSchema>;
export type PortalInvoice = z.infer<typeof portalInvoiceSchema>;

export const PORTAL_CHILD_PAGE_SIZE = 25;
