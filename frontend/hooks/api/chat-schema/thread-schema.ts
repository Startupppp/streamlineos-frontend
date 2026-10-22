import { z } from "zod";

import { chatMessageContract } from "./message-schema";

export const chatThreadPageContract = z.object({
  parentMessage: chatMessageContract,
  replies: z.array(chatMessageContract),
  nextCursor: z.number().nullable(),
});

export const chatPinItemContract = z.object({
  id: z.number().int(),
  channelId: z.number().int(),
  messageId: z.number().int(),
  pinnedAt: z.string(),
  pinnedBy: z.string().nullable(),
  pinnedByUser: z.object({ id: z.string(), name: z.string().nullable() }).nullable(),
  message: chatMessageContract
    .omit({ replyTo: true, metadata: true, actionStatus: true })
    .extend({
      sender: z
        .object({ id: z.string(), name: z.string().nullable(), image: z.string().nullable() })
        .nullable(),
    }),
});

export const chatPinsContract = z.array(chatPinItemContract);

export const chatSavedMessagesContract = z.object({
  items: z.array(
    z.object({
      id: z.number().int(),
      orgId: z.string(),
      membershipId: z.number().int(),
      messageId: z.number().int(),
      savedAt: z.string(),
      message: chatMessageContract.omit({ replyTo: true }).extend({
        sender: z
          .object({ id: z.string(), name: z.string().nullable(), image: z.string().nullable() })
          .nullable(),
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
  nextCursor: z.number().nullable().optional().transform((v) => v ?? undefined),
});
