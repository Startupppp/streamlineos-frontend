import { z } from "zod";

const portalTicketSummaryContract = z.object({
  id: z.number().int(),
  title: z.string(),
  category: z.string().nullable(),
  status: z.enum(["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  createdAt: z.string(),
  updatedAt: z.string(),
  resolvedAt: z.string().nullable(),
  closedAt: z.string().nullable(),
});

export const portalTicketListContract = z.array(portalTicketSummaryContract);

export const portalMessageContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  ticketId: z.number().int(),
  authorId: z.string().nullable(),
  body: z.string(),
  isInternal: z.boolean(),
  sourceChannel: z.string(),
  sourceMessageId: z.string().nullable(),
  sourceContactEmail: z.string().nullable(),
  sourceContactName: z.string().nullable(),
  createdAt: z.string(),
});

export const portalTicketDetailContract = z.object({
  id: z.number().int(),
  title: z.string(),
  category: z.string().nullable(),
  description: z.string().nullable(),
  status: z.enum(["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  createdAt: z.string(),
  updatedAt: z.string(),
  resolvedAt: z.string().nullable(),
  closedAt: z.string().nullable(),
  messages: z.array(portalMessageContract),
});

export const portalCreateTicketContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  clientId: z.number().int().nullable(),
  assigneeMembershipId: z.number().int().nullable(),
  title: z.string(),
  category: z.string().nullable(),
  description: z.string().nullable(),
  requesterEmail: z.string().nullable(),
  requesterName: z.string().nullable(),
  status: z.enum(["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  slaDeadline: z.string().nullable(),
  firstResponseDueAt: z.string().nullable(),
  firstRespondedAt: z.string().nullable(),
  slaPausedAt: z.string().nullable(),
  slaPausedMinutes: z.number().int(),
  slaEscalationLevel: z.number().int(),
  resolvedAt: z.string().nullable(),
  closedAt: z.string().nullable(),
  queueId: z.number().int().nullable(),
  mergedIntoTicketId: z.number().int().nullable(),
  snoozedUntil: z.string().nullable(),
  snoozedBy: z.string().nullable(),
  createdByMembershipId: z.number().int(),
  sourceChannel: z.string(),
  sourceMessageId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  possibleDuplicateOf: z.object({ id: z.number().int(), title: z.string() }).nullable(),
});
