import { z } from "zod";
import {
  ticketRowContract,
  ticketListRowContract,
  ticketPriorityContract,
  ticketTypeContract,
} from "./build-tickets-core-schema";

const ticketRelationRelatedTicketSchema = z
  .object({
    id: z.number().int(),
    title: z.string(),
    ticketNumber: z.number().int().nullable(),
    status: z.string().nullable(),
    priority: ticketPriorityContract.nullable(),
    type: ticketTypeContract.nullable(),
    points: z.number().nullable(),
    assigneeMembershipId: z.number().int().nullable(),
    projectId: z.number().int().nullable(),
    assignee: z
      .object({
        id: z.string(),
        name: z.string().nullable(),
        firstName: z.string().nullable(),
        lastName: z.string().nullable(),
        email: z.string().nullable(),
        image: z.string().nullable(),
      })
      .nullable(),
    project: z.object({ key: z.string().nullable() }).nullable(),
  })
  .nullable();

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
  blocked: z
    .array(
      z.object({
        ticketId: z.number().int(),
        reason: z.string(),
        dependencyCount: z.number().int(),
      }),
    )
    .optional(),
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

export const ticketRowListContract = z.array(ticketRowContract);

export const subtaskListContract = z.array(ticketListRowContract);

/**
 * `GET /build/:projectId/tickets/:ticketId/comments/:commentId` answers a joined
 * permalink projection — comment, author identity and the parent ticket — not
 * the comment row its `@ResponseSchema(commentRowSchema)` declares.
 */
export const commentPermalinkContract = z.object({
  id: z.number().int(),
  content: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  parentCommentId: z.number().int().nullable(),
  author: z.object({
    id: z.string().nullable(),
    name: z.string().nullable(),
    image: z.string().nullable(),
  }),
  ticket: z.object({
    id: z.number().int(),
    ticketNumber: z.number().int(),
    title: z.string(),
    projectKey: z.string().nullable(),
    projectId: z.number().int(),
  }),
});

export const ticketSearchResultListContract = z.array(
  z.object({
    id: z.number().int(),
    title: z.string(),
    status: z.string(),
    priority: z.string(),
    ticketNumber: z.number().int(),
    projectId: z.number().int(),
    projectKey: z.string(),
    projectName: z.string(),
  }),
);

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

const allWorkAssigneeSchema = z
  .object({
    id: z.string(),
    name: z.string().nullable(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    email: z.string().nullable(),
    image: z.string().nullable(),
  })
  .nullable();

const allWorkItemSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  status: z.string(),
  priority: ticketPriorityContract.nullable(),
  type: ticketTypeContract,
  dueDate: z.string().nullable(),
  startDate: z.string().nullable(),
  ticketNumber: z.number().int(),
  points: z.number().nullable(),
  estimate: z.number().nullable(),
  rank: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  assigneeId: z.string().nullable(),
  cycleId: z.number().int().nullable(),
  epicId: z.number().int().nullable(),
  projectId: z.number().int().nullable(),
  projectKey: z.string().nullable(),
  projectName: z.string().nullable(),
  assignee: allWorkAssigneeSchema,
  labels: z.array(
    z.object({
      id: z.number().int(),
      name: z.string(),
      color: z
        .string()
        .nullable()
        .transform((v) => v ?? ""),
    }),
  ),
});

export const allWorkPageContract = z.object({
  data: z.array(allWorkItemSchema),
  limit: z.number().int(),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
  total: z.number().int().optional(),
});

export const projectActivityPageContract = z.object({
  data: z.array(
    z.object({
      id: z.number().int(),
      action: z.string(),
      label: z.string(),
      fromValue: z.string().nullable(),
      toValue: z.string().nullable(),
      createdAt: z.string(),
      ticketId: z.number().int(),
      ticketTitle: z.string(),
      ticketNumber: z.number().int(),
      projectKey: z.string(),
      user: z
        .object({
          id: z.string().nullable(),
          name: z.string().nullable(),
          image: z.string().nullable(),
        })
        .nullable(),
    }),
  ),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});
