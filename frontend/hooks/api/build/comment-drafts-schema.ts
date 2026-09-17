import { z } from "zod";

const commentDraftTicketSchema = z.object({
  id: z.number().int(),
  type: z.string(),
  title: z.string(),
  projectId: z.number().int().nullable(),
  status: z.string(),
  ticketNumber: z.number().int(),
  projectKey: z.string().nullable(),
  priority: z.string().nullable(),
  projectName: z.string().nullable(),
  assignee: z.object({
    id: z.string(),
    name: z.string().nullable(),
    image: z.string().nullable(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
  }).nullable(),
});

export const commentDraftContract = z.object({
  id: z.number().int(),
  ticketId: z.number().int(),
  body: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  ticket: commentDraftTicketSchema.optional(),
});

export const commentDraftListItemContract = commentDraftContract.extend({
  ticket: commentDraftTicketSchema,
});

export const commentDraftListContract = z.array(commentDraftListItemContract);

export const commentDraftDeletedContract = z.object({ deleted: z.boolean() });
