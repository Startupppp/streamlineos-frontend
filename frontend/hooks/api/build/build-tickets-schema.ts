import { z } from "zod";

const userSummarySchema = z
  .object({
    id: z.string(),
    name: z.string().nullable(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    email: z.string(),
    image: z.string().nullable(),
  })
  .nullable();

export const ticketRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  type: z.string(),
  status: z.string(),
  priority: z.string(),
  projectId: z.number().int().nullable(),
  ticketNumber: z.number().int(),
  sprintId: z.number().int().nullable(),
  epicId: z.number().int().nullable(),
  assigneeMembershipId: z.number().int().nullable(),
  reporterId: z.string().nullable(),
  reporterMembershipId: z.number().int().nullable(),
  points: z.number().nullable(),
  storyPoints: z.number().nullable(),
  link: z.string().nullable(),
  rank: z.string(),
  parentTicketId: z.number().int().nullable(),
  originalEstimate: z.string().nullable(),
  timeSpent: z.string(),
  startDate: z.string().nullable(),
  dueDate: z.string().nullable(),
  moduleId: z.number().int().nullable(),
  cycleId: z.number().int().nullable(),
  sequenceId: z.string().nullable(),
  estimate: z.number().nullable(),
  completionPercentage: z.number(),
  clientVisible: z.boolean(),
  isRecurring: z.boolean(),
  recurrenceRule: z.unknown(),
  recurrenceParentId: z.number().int().nullable(),
  recurrenceNextRunAt: z.string().nullable(),
  customerId: z.number().int().nullable(),
  version: z.number().int(),
  deletedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ticketDetailContract = ticketRowContract.extend({
  project: z
    .object({
      id: z.number().int(),
      name: z.string(),
      key: z.string(),
      orgId: z.string(),
    })
    .nullable(),
  epic: z
    .object({
      id: z.number().int(),
      name: z.string(),
    })
    .nullable(),
  assignee: z
    .object({
      user: userSummarySchema,
    })
    .nullable()
    .transform((a) => a?.user ?? null),
  reporter: userSummarySchema,
  members: z.array(
    z.object({
      user: z.object({ user: userSummarySchema }),
    }),
  ),
  watchers: z.array(
    z.object({
      user: userSummarySchema,
    }),
  ).transform((items) =>
    items.map((w, i) => ({
      id: i,
      ticketId: 0,
      userId: w.user?.id ?? null,
      createdAt: null as null,
      user: w.user,
    })),
  ),
  attachments: z.array(
    z.object({
      id: z.number().int(),
      filename: z.string(),
      url: z.string(),
      uploader: userSummarySchema,
    }),
  ).transform((items) =>
    items.map((a) => ({
      id: a.id,
      orgId: "",
      ticketId: 0,
      fileUrl: a.url,
      fileName: a.filename,
      fileSize: null as null,
      mimeType: null as null,
      uploadedBy: a.uploader?.id ?? null,
      createdAt: null as null,
      uploader: a.uploader ?? undefined,
    })),
  ),
  labels: z.array(
    z.object({
      id: z.number().int(),
      name: z.string(),
      color: z.string().nullable(),
    }),
  ).transform((items) =>
    items.map((l) => ({
      id: l.id,
      ticketId: 0,
      labelId: l.id,
      createdAt: null as null,
      label: { id: l.id, orgId: "", name: l.name, color: l.color, createdAt: null as null },
    })),
  ),
});

const paginationContract = z.object({
  limit: z.number().int(),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
});

export const ticketListPageContract = z.object({
  data: z.array(ticketRowContract),
  pagination: paginationContract,
});

export const ticketActivityPageContract = z.object({
  data: z.array(
    z.object({
      id: z.number().int(),
      action: z.string(),
      label: z.string(),
      fromValue: z.string().nullable(),
      toValue: z.string().nullable(),
      createdAt: z.string(),
      user: z
        .object({
          id: z.string().nullable(),
          name: z.string().nullable(),
          image: z.string().nullable(),
        })
        .nullable(),
    }),
  ),
  pagination: paginationContract,
});

const ticketRelationRelatedTicketSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  ticketNumber: z.number().int().nullable(),
  status: z.string().nullable(),
  priority: z.string().nullable(),
  type: z.string().nullable(),
  points: z.number().nullable(),
  assigneeId: z.string().nullable(),
  projectId: z.number().int().nullable(),
  assignee: z.object({
    id: z.string(),
    name: z.string().nullable(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    email: z.string().nullable(),
    image: z.string().nullable(),
  }).nullable(),
  project: z.object({ key: z.string().nullable() }).nullable(),
}).nullable();

const ticketRelationSchema = z.object({
  id: z.number().int(),
  relationType: z.enum(["blocks", "blocked_by", "duplicate_of", "relates_to"]),
  relatedTicket: ticketRelationRelatedTicketSchema,
  direction: z.enum(["outgoing", "incoming"]),
});

export const ticketRelationListContract = z.array(ticketRelationSchema);

const relatedLinkSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  projectId: z.number().int(),
  ticketId: z.number().int(),
  url: z.string(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const relatedLinkCreateContract = relatedLinkSchema;

const checklistItemSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  checklistId: z.number().int(),
  text: z.string(),
  isCompleted: z.boolean(),
  order: z.number().int(),
  assigneeId: z.string().nullable(),
  dueDate: z.string().nullable(),
  createdAt: z.string(),
});

export const checklistItemContract = checklistItemSchema;

const checklistRowSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  ticketId: z.number().int(),
  title: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  items: z.array(checklistItemSchema).default([]),
});

export const checklistRowContract = checklistRowSchema;

export const checklistListContract = z.array(checklistRowSchema);

const commentRowSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  ticketId: z.number().int(),
  body: z.string(),
  clientVisible: z.boolean(),
  isEdited: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  author: z
    .object({
      id: z.string().nullable(),
      name: z.string().nullable(),
      image: z.string().nullable(),
      email: z.string().nullable(),
    })
    .nullable(),
});

export const commentRowContract = commentRowSchema;

export const commentEditResultContract = z.object({
  updated: z.literal(true),
});

export const commentDeleteResultContract = z.object({
  deleted: z.literal(true),
});

export const reactionContract = z.object({
  commentId: z.number().int(),
  userId: z.string(),
  emoji: z.string(),
});

export const attachmentCreateResultContract = z.object({
  id: z.number().int(),
});

export const bulkUpdateResultContract = z.object({
  updated: z.number().int(),
  ticketIds: z.array(z.number().int()),
});

export const rankTicketResultContract = z.object({
  id: z.number().int(),
  rank: z.string(),
  status: z.string(),
});

export const ticketUpdateResultContract = z.object({
  updated: z.literal(true),
  updatedAt: z.string(),
});

export const columnCountsContract = z.record(z.string(), z.number().int());

export const successContract = z.object({
  success: z.literal(true),
});

const ticketLabelSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  color: z.string(),
  createdAt: z.string(),
});

export const ticketLabelListContract = z.array(ticketLabelSchema);

const allWorkAssigneeSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  email: z.string().nullable(),
  image: z.string().nullable(),
}).nullable();

const allWorkItemSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  status: z.string(),
  priority: z.string().nullable(),
  type: z.string(),
  dueDate: z.string().nullable(),
  startDate: z.string().nullable(),
  ticketNumber: z.number().int(),
  points: z.number().nullable(),
  estimate: z.number().nullable(),
  rank: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  assigneeId: z.string().nullable(),
  sprintId: z.number().int().nullable(),
  cycleId: z.number().int().nullable(),
  epicId: z.number().int().nullable(),
  projectId: z.number().int().nullable(),
  projectKey: z.string().nullable(),
  projectName: z.string().nullable(),
  assignee: allWorkAssigneeSchema,
  labels: z.array(z.object({
    id: z.number().int(),
    name: z.string(),
    color: z.string().nullable().transform((v) => v ?? ""),
  })),
});

export const allWorkPageContract = z.object({
  data: z.array(allWorkItemSchema),
  limit: z.number().int(),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
  total: z.number().int().optional(),
});
