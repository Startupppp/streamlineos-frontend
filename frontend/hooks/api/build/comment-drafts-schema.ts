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

const generatedCommentDraftAiUsageSchema = z.object({
  model: z.string(),
  promptTokens: z.number().int().nonnegative(),
  completionTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
  credits: z.number(),
  costUsd: z.number(),
});

export const generatedCommentDraftSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  membershipId: z.number().int().nullable(),
  ticketId: z.number().int(),
  body: z.string(),
  evidence: z.string().nullable(),
  proposedChange: z.string().nullable(),
  impact: z.string().nullable(),
  confidence: z.number().int().nullable(),
  affectedRecordIds: z.string().nullable(),
  retryCount: z.number().int().nullable(),
  lastError: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  aiUsage: generatedCommentDraftAiUsageSchema,
});

export type GeneratedCommentDraft = z.infer<typeof generatedCommentDraftSchema>;
