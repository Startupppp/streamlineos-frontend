import { z } from "zod";

/**
 * Response contract for `GET /me/inbox/unified`.
 * Derived from backend `unifiedInboxResponseSchema`.
 * NOT `.strict()`.
 */

const inboxActorContract = z
  .object({
    id: z.string(),
    name: z.string().nullable(),
    image: z.string().nullable(),
  })
  .nullable();

const inboxItemBase = {
  sourceModule: z.string(),
  actor: inboxActorContract,
  subject: z.string(),
  timestamp: z.string(),
  isRead: z.boolean(),
  deepLink: z.string().nullable(),
  dedupKey: z.string(),
};

export const unifiedInboxContract = z.object({
  items: z.array(
    z.discriminatedUnion("kind", [
      z.object({
        ...inboxItemBase,
        kind: z.literal("notification"),
        id: z.number().int(),
        notifType: z.string(),
        priority: z.string(),
        category: z.string(),
        eventKey: z.string().nullable(),
        body: z.string(),
        pinned: z.boolean(),
      }),
      z.object({
        ...inboxItemBase,
        kind: z.literal("broadcast"),
        id: z.number().int(),
        notifType: z.string(),
        priority: z.string(),
        category: z.string(),
        body: z.string(),
      }),
      z.object({
        ...inboxItemBase,
        kind: z.literal("mail"),
        id: z.string(),
        threadId: z.string().nullable(),
        accountId: z.number().int(),
        snippet: z.string(),
        hasAttachments: z.boolean(),
      }),
      z.object({
        ...inboxItemBase,
        kind: z.literal("build_approval"),
        id: z.number().int(),
        status: z.string(),
        projectId: z.number().int(),
        ticketId: z.number().int().nullable(),
        dueAt: z.string().nullable(),
      }),
    ]),
  ),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
  sources: z.array(
    z.object({
      kind: z.enum(["notification", "broadcast", "mail", "build_approval"]),
      included: z.boolean(),
      reason: z.string().nullable(),
    }),
  ),
});
