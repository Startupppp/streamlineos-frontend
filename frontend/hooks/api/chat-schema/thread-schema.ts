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
 * `chatSavedListResponseSchema`. The saved row carries `membershipId`, never a
 * `userId`, and the joined message carries the `channel` the panel jumps to — a
 * `z.object` strips what it does not list, so both are named here.
 */
export const chatSavedMessagesContract = z.object({
  items: z.array(
    z.object({
      id: z.number().int(),
      orgId: z.string(),
      membershipId: z.number().int(),
      messageId: z.number().int(),
      savedAt: z.string(),
      message: chatMessageContract.extend({
        channel: z
          .object({
            id: z.number().int(),
            name: z.string().nullable(),
            type: z.string(),
          })
          .nullable(),
      }),
    }),
  ),
  nextCursor: z.number().optional(),
});
