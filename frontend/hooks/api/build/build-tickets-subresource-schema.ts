import { z } from "zod";
import {
  projectsTicketAssociationsListRelationsResponseSchema,
  projectsTicketAssociationsAddRelatedLinkResponseSchema,
  projectsTicketAssociationsListRelatedLinksResponseSchema,
  projectsTicketChecklistsCreateChecklistItemResponseSchema,
  projectsTicketChecklistsCreateChecklistResponseSchema,
  projectsTicketChecklistsGetChecklistsResponseSchema,
  projectsTicketCommentsAddCommentResponseSchema,
  projectsTicketCommentsEditCommentResponseSchema,
  projectsTicketCommentsAddReactionResponseSchema,
  projectsTicketAssociationsAddAttachmentResponseSchema,
  projectsTicketsBulkUpdateResponseSchema,
  projectsTicketsRankTicketResponseSchema,
  projectsTicketsUpdateTicketResponseSchema,
  projectsTicketsUpdateTicketBodySchema,
  projectsTicketsGetColumnCountsResponseSchema,
  projectsTicketAssociationsGetSubtasksResponseSchema,
  projectsTicketCommentsGetCommentResponseSchema,
  projectsTicketsSearchTicketsResponseSchema,
  projectsListLabelsResponseSchema,
  projectsTicketsGetAllWorkResponseSchema,
  projectsActivityFeedGetProjectActivityResponseSchema,
  projectsTicketAssociationsAddLabelResponseSchema,
} from "@/contracts/build-contracts.generated";

export const ticketRelationListContract = projectsTicketAssociationsListRelationsResponseSchema;

export const relatedLinkCreateContract = projectsTicketAssociationsAddRelatedLinkResponseSchema;
export const relatedLinkListContract = projectsTicketAssociationsListRelatedLinksResponseSchema;

export const checklistItemContract = projectsTicketChecklistsCreateChecklistItemResponseSchema;

export const checklistRowContract = projectsTicketChecklistsCreateChecklistResponseSchema.extend({
  items: projectsTicketChecklistsCreateChecklistResponseSchema.shape.items.unwrap().default([]),
});

const checklistListElementSchema = projectsTicketChecklistsGetChecklistsResponseSchema.element.extend({
  items: projectsTicketChecklistsGetChecklistsResponseSchema.element.shape.items.unwrap().default([]),
});
export const checklistListContract = z.array(checklistListElementSchema);

export const commentRowContract = projectsTicketCommentsAddCommentResponseSchema;

export const commentEditResultContract = projectsTicketCommentsEditCommentResponseSchema;

export const reactionContract = projectsTicketCommentsAddReactionResponseSchema;

export const attachmentCreateResultContract = projectsTicketAssociationsAddAttachmentResponseSchema;

export const bulkUpdateResultContract = projectsTicketsBulkUpdateResponseSchema;

export const rankTicketResultContract = projectsTicketsRankTicketResponseSchema;

export const ticketUpdateResultContract = projectsTicketsUpdateTicketResponseSchema;

export const ticketUpdateRequestContract = projectsTicketsUpdateTicketBodySchema;

export const columnCountsContract = projectsTicketsGetColumnCountsResponseSchema;

export const subtaskListContract = projectsTicketAssociationsGetSubtasksResponseSchema;

export const commentPermalinkContract = projectsTicketCommentsGetCommentResponseSchema;

export const ticketSearchResultListContract = projectsTicketsSearchTicketsResponseSchema;

export const successContract = projectsTicketAssociationsAddLabelResponseSchema;

export const ticketLabelListContract = projectsListLabelsResponseSchema;

export const allWorkPageContract = projectsTicketsGetAllWorkResponseSchema.transform((page) => ({
  ...page,
  data: page.data.map((ticket) => ({
    ...ticket,
    labels: ticket.labels.map((label) => ({
      ...label,
      color: label.color ?? "",
    })),
  })),
}));

export const projectActivityPageContract = projectsActivityFeedGetProjectActivityResponseSchema;

export const allWorkIdsContract = z.object({
  entries: z.array(z.object({ projectId: z.number().int(), ids: z.array(z.number().int()) })),
  total: z.number().int(),
  capped: z.boolean(),
  cap: z.number().int(),
});
