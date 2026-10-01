import { z } from "zod";
import {
  genTicketDetailWireSchema,
  projectsTicketsCreateTicketResponseSchema,
  projectsTicketsListTicketsResponseSchema,
  projectsTicketsGetActivityResponseSchema,
} from "@/contracts/build-contracts.generated";

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

export const ticketTypeContract = projectsTicketsCreateTicketResponseSchema.shape.type;

export const ticketPriorityContract = projectsTicketsCreateTicketResponseSchema.shape.priority;

export const ticketRowContract = projectsTicketsCreateTicketResponseSchema;

export const ticketListRowContract = projectsTicketsListTicketsResponseSchema.shape.data.element;

export const ticketListPageContract = projectsTicketsListTicketsResponseSchema;

export const ticketActivityActionContract =
  projectsTicketsGetActivityResponseSchema.shape.data.element.shape.action;

export type KnownTicketActivityAction = z.infer<typeof ticketActivityActionContract>;

export const ticketActivityPageContract = projectsTicketsGetActivityResponseSchema;

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

export const ticketDetailContract = genTicketDetailWireSchema.extend({
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
        mimeType: z.string().nullable(),
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
        mimeType: a.mimeType,
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
