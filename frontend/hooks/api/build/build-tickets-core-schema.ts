import {
  projectsTicketsGetTicketResponseSchema,
  projectsTicketsCreateTicketResponseSchema,
  projectsTicketsListTicketsResponseSchema,
  projectsTicketsGetActivityResponseSchema,
} from "@/contracts/build-contracts.generated";

export const ticketPriorityContract = projectsTicketsCreateTicketResponseSchema.shape.priority;

export const ticketRowContract = projectsTicketsCreateTicketResponseSchema.extend({
  storyPoints: projectsTicketsCreateTicketResponseSchema.shape.storyPoints.optional().default(null),
  estimate: projectsTicketsCreateTicketResponseSchema.shape.estimate.optional().default(null),
});

export const ticketListPageContract = projectsTicketsListTicketsResponseSchema;

export const ticketActivityActionContract =
  projectsTicketsGetActivityResponseSchema.shape.data.element.shape.action;

export type KnownTicketActivityAction = import("zod").infer<typeof ticketActivityActionContract>;

export const ticketActivityPageContract = projectsTicketsGetActivityResponseSchema;

export const ticketDetailContract = projectsTicketsGetTicketResponseSchema.extend({
  storyPoints: projectsTicketsGetTicketResponseSchema.shape.storyPoints.optional().default(null),
  estimate: projectsTicketsGetTicketResponseSchema.shape.estimate.optional().default(null),
  comments: projectsTicketsGetTicketResponseSchema.shape.comments
    .unwrap()
    .default([])
    .transform((items) =>
      items.map((c) => ({ ...c, reactions: c.reactions ?? [], user: c.user ?? undefined })),
    ),
  assignee: projectsTicketsGetTicketResponseSchema.shape.assignee.transform(
    (a) => a?.user ?? null,
  ),
  assignees: projectsTicketsGetTicketResponseSchema.shape.assignees.transform((items) =>
    items.map((assignment) => ({
      id: assignment.id,
      ticketId: assignment.ticketId,
      assignedAt: assignment.assignedAt,
      assignedBy: assignment.assignedBy,
      userId: assignment.user.userId,
      user: assignment.user.user ?? undefined,
    })),
  ),
  watchers: projectsTicketsGetTicketResponseSchema.shape.watchers.transform((items) =>
    items.map((w, i) => ({
      id: i,
      ticketId: 0,
      userId: w.user?.id ?? null,
      createdAt: null,
      user: w.user,
    })),
  ),
  attachments: projectsTicketsGetTicketResponseSchema.shape.attachments.transform((items) =>
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
  labels: projectsTicketsGetTicketResponseSchema.shape.labels.transform((items) =>
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
