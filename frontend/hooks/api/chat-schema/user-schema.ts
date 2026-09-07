import { z } from "zod";

/**
 * THREE different person sub-objects ship from this module, and they are not
 * interchangeable. The bounded channel-list preview builds `{id, name, image}`
 * by hand (`chat-channel-member-preview.ts`); the members and channel-detail
 * routes select `{id, name, image, email}` via `CHANNEL_MEMBER_MEMBERSHIP_WITH`,
 * where `users.email` is `.notNull()`; the huddle participant selects
 * `{id, name, image}` and the huddle host only `{id, name}`. One shared object
 * would have to be loose enough to accept all four, which is how a contract
 * stops catching anything.
 */
export const chatPreviewUserContract = z
  .object({
    id: z.string(),
    name: z.string().nullable(),
    image: z.string().nullable(),
  })
  .strict();

export const chatMemberUserContract = z
  .object({
    id: z.string(),
    name: z.string().nullable(),
    image: z.string().nullable(),
    email: z.string(),
  })
  .strict();
