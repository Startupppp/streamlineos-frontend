import { z } from "zod";

export const commentDraftContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  membershipId: z.number().int().nullable(),
  ticketId: z.number().int(),
  body: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const commentDraftListContract = z.array(commentDraftContract);

export const commentDraftDeletedContract = z.object({ deleted: z.boolean() });
