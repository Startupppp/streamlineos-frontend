import { z } from "zod";

import { chatMessageContract } from "./message-schema";

/** `chatThreadPageSchema` — parent message + replies keyset page. */
export const chatThreadPageContract = z.object({
  parentMessage: chatMessageContract,
  replies: z.array(chatMessageContract),
  nextCursor: z.number().nullable(),
});

/** `chatPinsListResponseSchema` — array of pinned message items. */
export const chatPinItemContract = z.object({
  id: z.number().int(),
  channelId: z.number().int(),
  messageId: z.number().int(),
  pinnedAt: z.string(),
  pinnedBy: z.object({ id: z.string(), name: z.string().nullable() }),
  message: chatMessageContract,
});

export const chatPinsContract = z.array(chatPinItemContract);

/**
 * `chatSavedListResponseSchema` — backend uses `membershipId`, not `userId`.
 * The client maps this after fetch.
 */
export const chatSavedMessagesContract = z.object({
  items: z.array(
    z.object({
      id: z.number().int(),
      membershipId: z.number().int(),
      savedAt: z.string(),
      message: chatMessageContract,
    }),
  ),
  nextCursor: z.number().optional(),
});
