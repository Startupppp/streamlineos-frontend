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

const commentReactionSchema = z.object({
  emoji: z.string(),
  userId: z.string(),
});

const ticketDetailCommentSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  ticketId: z.number().int(),
  userId: z.string(),
  content: z.string(),
  parentCommentId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  user: userSummarySchema,
  reactions: z.array(commentReactionSchema).default([]),
});

export const ticketDetailContract = ticketRowContract.extend({
  comments: z
    .array(ticketDetailCommentSchema)
    .default([])
    .transform((items) =>
      items.map((c) => ({ ...c, user: c.user ?? undefined })),
    ),
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
  assignees: z
    .array(
      z.object({
        id: z.number().int(),
        ticketId: z.number().int(),
        assignedAt: z.string(),
        assignedBy: z.string().nullable(),
        user: z.object({ userId: z.string(), user: userSummarySchema }),
      }),
    )
    .transform((items) =>
      items.map((assignment) => ({
        id: assignment.id,
        ticketId: assignment.ticketId,
        assignedAt: assignment.assignedAt,
        assignedBy: assignment.assignedBy,
        userId: assignment.user.userId,
        user: assignment.user.user ?? undefined,
      })),
    ),
  watchers: z
    .array(
      z.object({
        user: userSummarySchema,
      }),
    )
    .transform((items) =>
      items.map((w, i) => ({
        id: i,
        ticketId: 0,
        userId: w.user?.id ?? null,
        createdAt: null,
        user: w.user,
      })),
    ),
  attachments: z
    .array(
      z.object({
        id: z.number().int(),
        filename: z.string(),
        url: z.string(),
        uploader: userSummarySchema,
      }),
    )
    .transform((items) =>
      items.map((a) => ({
        id: a.id,
        orgId: "",
        ticketId: 0,
        fileUrl: a.url,
        fileName: a.filename,
        fileSize: null,
        mimeType: null,
        uploadedBy: a.uploader?.id ?? null,
        createdAt: null,
        uploader: a.uploader ?? undefined,
      })),
    ),
  labels: z
    .array(
      z.object({
        id: z.number().int(),
        name: z.string(),
        color: z.string().nullable(),
      }),
    )
    .transform((items) =>
      items.map((l) => ({
        id: l.id,
        ticketId: 0,
        labelId: l.id,
        createdAt: null,
        label: {
          id: l.id,
          orgId: "",
          name: l.name,
          color: l.color,
          createdAt: null,
        },
      })),
    ),
});

const paginationContract = z.object({
  limit: z.number().int(),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
});

export const ticketListRowContract = ticketRowContract
  .pick({
    id: true,
    orgId: true,
    title: true,
    type: true,
    status: true,
    priority: true,
    projectId: true,
    ticketNumber: true,
    epicId: true,
    assigneeMembershipId: true,
    reporterId: true,
    points: true,
    storyPoints: true,
    link: true,
    rank: true,
    parentTicketId: true,
    originalEstimate: true,
    timeSpent: true,
    startDate: true,
    dueDate: true,
    moduleId: true,
    cycleId: true,
    sequenceId: true,
    estimate: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    descriptionExcerpt: z.string().optional(),
    assigneeId: z.string().nullable(),
    assignee: userSummarySchema,
    assignees: z.array(
      z.object({
        id: z.number().int(),
        ticketId: z.number().int(),
        assignedAt: z.string(),
        assignedBy: z.string().nullable(),
        userId: z.string(),
        user: userSummarySchema.unwrap(),
      }),
    ),
    labels: z.array(
      z.object({
        id: z.number().int(),
        ticketId: z.number().int(),
        labelId: z.number().int(),
        createdAt: z.string(),
        label: z.object({
          id: z.number().int(),
          orgId: z.string(),
          name: z.string(),
          color: z.string().nullable(),
          createdAt: z.string(),
        }),
      }),
    ),
    cycle: z
      .object({
        id: z.number().int(),
        name: z.string(),
        status: z.string(),
        startDate: z.string(),
        endDate: z.string(),
      })
      .nullable(),
  });

export const ticketListPageContract = z.object({
  data: z.array(ticketListRowContract),
  pagination: paginationContract,
});

export const ticketActivityActionContract = z.enum([
  "created",
  "status_changed",
  "priority_changed",
  "assignee_changed",
  "title_changed",
  "sprint_changed",
  "due_date_changed",
  "comment_added",
  "comment_updated",
  "comment_deleted",
  "label_changed",
  "estimate_changed",
  "cycle_changed",
  "type_changed",
]);

export const ticketActivityPageContract = z.object({
  data: z.array(
    z.object({
      id: z.number().int(),
      action: ticketActivityActionContract,
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
