import { z } from "zod";
import { HELPDESK_CATEGORIES, SUPPORT_QUEUES } from "@/lib/employee-support";

export const supportQueueContract = z.enum(SUPPORT_QUEUES);
export const helpdeskCategoryContract = z.enum(HELPDESK_CATEGORIES);
export const ticketStatusContract = z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]);
export const ticketPriorityContract = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

const cursorPagination = z.object({
  limit: z.number().int(),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
});

const helpdeskCommentContract = z.object({
  id: z.number().int(),
  ticketId: z.number().int(),
  orgId: z.string(),
  authorId: z.string(),
  authorMembershipId: z.number().int().nullable(),
  body: z.string(),
  createdAt: z.string(),
  authorName: z.string().nullable(),
  authorImage: z.string().nullable(),
});

const helpdeskTicketContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  userId: z.string(),
  userMembershipId: z.number().int().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  category: z.string().nullable(),
  queue: supportQueueContract,
  priority: ticketPriorityContract,
  status: ticketStatusContract,
  assigneeId: z.string().nullable(),
  assigneeMembershipId: z.number().int().nullable(),
  assigneeName: z.string().nullable(),
  isConfidential: z.boolean(),
  firstResponseDueAt: z.string().nullable(),
  firstRespondedAt: z.string().nullable(),
  slaDueAt: z.string().nullable(),
  escalatedAt: z.string().nullable(),
  escalationLevel: z.number().int(),
  resolvedAt: z.string().nullable(),
  resolution: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  authorName: z.string().nullable(),
  authorImage: z.string().nullable(),
});

export const helpdeskTicketListContract = z.object({
  data: z.array(helpdeskTicketContract),
  pagination: cursorPagination,
});

export const helpdeskTicketDetailContract = helpdeskTicketContract.extend({
  comments: z.array(helpdeskCommentContract),
});

export const helpdeskCommentSingleContract = helpdeskCommentContract;

export const helpdeskSuggestContract = z.object({
  results: z.array(
    z.object({
      id: z.number().int(),
      title: z.string(),
      slug: z.string(),
      excerpt: z.string().nullable(),
      source: z.string(),
    }),
  ),
});

export const helpdeskRoutingRuleContract = z.object({
  category: z.string(),
  queue: supportQueueContract,
  source: z.enum(["default", "org"]),
  ruleId: z.number().int().nullable(),
  assigneeUserId: z.string().nullable(),
  assigneeName: z.string().nullable(),
  assigneeImage: z.string().nullable(),
});

export const helpdeskRoutingListContract = z.array(helpdeskRoutingRuleContract);

export const helpdeskQueueSummaryContract = z.object({
  queue: supportQueueContract,
  label: z.string(),
  isMember: z.boolean(),
  source: z.enum(["default", "org"]),
  firstResponseHours: z.number().int(),
  resolutionHours: z.number().int(),
  escalationUserId: z.string().nullable(),
  escalationName: z.string().nullable(),
  openCount: z.number().int().nullable(),
  overdueCount: z.number().int().nullable(),
});

export const helpdeskQueueListContract = z.array(helpdeskQueueSummaryContract);

export const successResponseContract = z.object({ success: z.boolean() });

export type TicketStatus = z.infer<typeof ticketStatusContract>;
export type TicketPriority = z.infer<typeof ticketPriorityContract>;
export type HelpdeskTicket = z.infer<typeof helpdeskTicketContract>;
export type HelpdeskComment = z.infer<typeof helpdeskCommentContract>;
export type HelpdeskTicketDetail = z.infer<typeof helpdeskTicketDetailContract>;
export type HelpdeskListResult = z.infer<typeof helpdeskTicketListContract>;
export type HelpdeskRoutingRule = z.infer<typeof helpdeskRoutingRuleContract>;
export type HelpdeskQueueSummary = z.infer<typeof helpdeskQueueSummaryContract>;
export type SuggestResult = z.infer<typeof helpdeskSuggestContract>;
