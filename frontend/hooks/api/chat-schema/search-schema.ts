import { z } from "zod";

import { chatMessageAttachmentContract } from "./message-schema";

/** `chatSearchMessagesResponseSchema` */
export const chatSearchMessagesContract = z.object({
  results: z.array(
    z.object({
      id: z.number().int(),
      orgId: z.string(),
      channelId: z.number().int(),
      senderMembershipId: z.number().int().nullable(),
      content: z.string().nullable(),
      isEdited: z.boolean(),
      isDeleted: z.boolean(),
      messageType: z.string(),
      channelPosition: z.number().int(),
      createdAt: z.string(),
      updatedAt: z.string(),
      senderId: z.string().nullable(),
      sender: z.object({
        id: z.string(),
        name: z.string().nullable(),
        image: z.string().nullable(),
      }).nullable(),
      reactions: z.record(z.string(), z.array(z.string())),
      attachments: z.array(chatMessageAttachmentContract),
      channel: z.object({
        id: z.number().int(),
        name: z.string(),
        type: z.string(),
      }).nullable(),
    }),
  ),
  nextCursor: z.number().optional(),
});

/** `chatSearchChannelsResponseSchema` */
export const chatSearchChannelsContract = z.array(
  z.object({
    id: z.number().int(),
    name: z.string(),
    type: z.string(),
    description: z.string().nullable(),
    avatarUrl: z.string().nullable(),
    isMember: z.boolean(),
  }),
);

/** `chatSearchUsersResponseSchema` */
export const chatSearchUsersContract = z.array(
  z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string(),
    image: z.string().nullable(),
  }),
);
