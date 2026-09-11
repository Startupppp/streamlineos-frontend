import { z } from "zod";

const userMinimalContract = z.object({
  id: z.string(),
  name: z.string().nullable(),
  image: z.string().nullable(),
});

const userNoImageContract = z.object({
  id: z.string(),
  name: z.string().nullable(),
});

const membershipMinimalContract = z.object({
  id: z.number().int(),
  user: userMinimalContract.nullable(),
});

const membershipNoImageContract = z.object({
  id: z.number().int(),
  user: userNoImageContract.nullable(),
});

const clientMinimalContract = z.object({
  id: z.number().int(),
  name: z.string(),
});

export const supportTicketRowContract = z.object({
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
});

export const ticketWithRelationsContract = supportTicketRowContract.and(
  z.object({
    client: clientMinimalContract.nullable(),
    assigneeMembership: membershipMinimalContract.nullable(),
    creatorMembership: membershipNoImageContract.nullable(),
  }),
);

export const supportTicketListContract = z.object({
  items: z.array(ticketWithRelationsContract),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});

const supportTicketMessageRowContract = z.object({
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

export const supportTicketMessageContract = supportTicketMessageRowContract.and(
  z.object({ author: userMinimalContract.nullable() }),
);

export const supportTicketDetailContract = ticketWithRelationsContract.and(
  z.object({
    messages: z.array(supportTicketMessageContract),
    customFieldValues: z.array(
      z.object({
        fieldId: z.number().int(),
        key: z.string(),
        value: z.string().nullable(),
      }),
    ),
  }),
);

export const createTicketContract = supportTicketRowContract.and(
  z.object({
    possibleDuplicateOf: z.object({ id: z.number().int(), title: z.string() }).nullable(),
  }),
);

export const updateTicketContract = z.object({
  success: z.literal(true),
  updatedAt: z.string(),
});

export const supportTicketStatsContract = z.object({
  open: z.number().int(),
  in_progress: z.number().int(),
  waiting: z.number().int(),
  resolved: z.number().int(),
  closed: z.number().int(),
  sla_breached: z.number().int(),
});

export const supportTicketActivityListContract = z.array(
  z.object({
    id: z.number().int(),
    orgId: z.string(),
    supportTicketId: z.number().int(),
    userId: z.string().nullable(),
    action: z.enum([
      "created", "status_changed", "priority_changed", "assignee_changed",
      "replied", "internal_note", "resolved", "reopened", "merged", "linked",
      "split", "snoozed", "unsnoozed",
    ]),
    fromValue: z.string().nullable(),
    toValue: z.string().nullable(),
    createdAt: z.string(),
    label: z.string(),
    userName: z.string().nullable(),
    userImage: z.string().nullable(),
  }),
);

const supportTicketLinkRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  ticketId: z.number().int(),
  linkedTicketId: z.number().int(),
  relation: z.enum(["duplicate", "related", "split"]),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  linkedTicket: z.object({ id: z.number().int(), title: z.string(), status: z.string() }).nullable(),
});

export const supportTicketLinkListContract = z.array(supportTicketLinkRowContract);

export const addTicketLinkContract = z.union([
  supportTicketLinkRowContract,
  z.object({ success: z.literal(true) }),
]);

export const mergeTicketContract = z.object({
  success: z.literal(true),
  mergedIntoTicketId: z.number().int(),
});

export const snoozeTicketContract = z.object({
  success: z.literal(true),
  snoozedUntil: z.string(),
});

export const splitTicketContract = z.object({ id: z.number().int() });

export const supportTicketDraftContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  ticketId: z.number().int(),
  userMembershipId: z.number().int(),
  body: z.string(),
  isInternal: z.boolean(),
  updatedAt: z.string(),
}).nullable();

const supportTicketExternalLinkRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  ticketId: z.number().int(),
  entityType: z.enum(["project", "invoice", "calendar_event", "chat_channel"]),
  entityId: z.number().int(),
  label: z.string(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
});

export const supportTicketExternalLinkListContract = z.array(supportTicketExternalLinkRowContract);

export const addExternalLinkContract = z.union([
  supportTicketExternalLinkRowContract,
  z.object({ success: z.literal(true) }),
]);

export const successContract = z.object({ success: z.literal(true) });
