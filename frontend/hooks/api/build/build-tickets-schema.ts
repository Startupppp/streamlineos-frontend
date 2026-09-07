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
    .nullable(),
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
  ),
  attachments: z.array(
    z.object({
      id: z.number().int(),
      filename: z.string(),
      url: z.string(),
      uploader: userSummarySchema,
    }),
  ),
  labels: z.array(
    z.object({
      id: z.number().int(),
      name: z.string(),
      color: z.string().nullable(),
    }),
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

const ticketRelationSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  workItemId: z.number().int(),
  relatedWorkItemId: z.number().int(),
  createdAt: z.string(),
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
  title: z.string(),
  isCompleted: z.boolean(),
  position: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const checklistItemContract = checklistItemSchema;

const checklistRowSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  projectId: z.number().int(),
  ticketId: z.number().int(),
  title: z.string(),
  position: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
  items: z.array(checklistItemSchema).optional(),
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

const allWorkItemSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  title: z.string(),
  type: z.string(),
  status: z.string(),
  priority: z.string(),
  projectId: z.number().int().nullable(),
  ticketNumber: z.number().int(),
  dueDate: z.string().nullable(),
  assigneeMembershipId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const allWorkPageContract = z.object({
  data: z.array(allWorkItemSchema),
  limit: z.number().int(),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
  total: z.number().int().optional(),
});
