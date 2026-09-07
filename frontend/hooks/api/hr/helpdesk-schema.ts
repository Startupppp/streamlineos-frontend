import { z } from "zod";

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
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]),
  assigneeId: z.string().nullable(),
  assigneeMembershipId: z.number().int().nullable(),
  isConfidential: z.boolean(),
  slaDueAt: z.string().nullable(),
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
  id: z.number().int(),
  orgId: z.string(),
  category: z.string(),
  assigneeUserId: z.string(),
  assigneeMembershipId: z.number().int().nullable(),
  assigneeName: z.string().nullable(),
  assigneeImage: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const helpdeskRoutingListContract = z.array(helpdeskRoutingRuleContract);
