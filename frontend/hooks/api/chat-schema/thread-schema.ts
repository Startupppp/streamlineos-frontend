import { z } from "zod";

import { chatMessageContract } from "./message-schema";

/** `chatThreadPageSchema` — parent message + replies keyset page. */
export const chatThreadPageContract = z.object({
  parentMessage: chatMessageContract,
  replies: z.array(chatMessageContract),
  nextCursor: z.number().nullable(),
});

/**
 * `chatPinItemSchema` (`ChatPinsService.listPins`). `pinnedBy` is the pinner's user id and the
 * person is `pinnedByUser`; the joined message is loaded without `replyTo`, and its `sender` is
 * null once the sender's membership is gone. Modelled on the timeline message, both rejected
 * every pin list (CHAT-012).
 */
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
  // buildIdCursorPage sends null on the last page; declaring only optional rejected every final page.
  nextCursor: z.number().nullable().optional(),
});
