import { z } from "zod";

import { chatPreviewUserContract } from "./user-schema";

/**
 * The huddle.
 *
 * `HUDDLE_WIRE_KEYS` and `HUDDLE_PARTICIPANT_WIRE_KEYS` in
 * `chat-huddles.service.ts` pin both key sets and a backend spec asserts them,
 * so `.strict()` here is checked on both sides of the wire.
 *
 * `userId` is NULLABLE, and that is the defect in one line. The read path
 * carried `membership` with `columns: {}` — an empty selection selects nothing —
 * so `userId` was never on the payload at all, every tile read "Unknown",
 * `isInHuddle` was permanently false and the WebRTC mesh had no peer ids to dial.
 * A required-and-nullable field rejects a MISSING key; an optional one would
 * have waved the whole defect through.
 *
 * `startedBy` is the host's USER id, not a membership id — a distinction no
 * static check can make, which is why it is written down here.
 */
export const chatHuddleParticipantContract = z
  .object({
    id: z.number(),
    huddleId: z.number(),
    joinedAt: z.string(),
    leftAt: z.string().nullable(),
    isMuted: z.boolean(),
    handRaised: z.boolean(),
    isScreenSharing: z.boolean(),
    userId: z.string().nullable(),
    user: chatPreviewUserContract.nullable(),
  })
  .strict();

export const chatHuddleContract = z
  .object({
    id: z.number(),
    channelId: z.number(),
    status: z.enum(["active", "ended"]),
    calendarEventId: z.number().nullable(),
    startedAt: z.string(),
    endedAt: z.string().nullable(),
    startedBy: z.string().nullable(),
    startedByUser: z.object({ id: z.string(), name: z.string().nullable() }).strict().nullable(),
    participants: z.array(chatHuddleParticipantContract),
  })
  .strict();

/** No active huddle is a 200 with a `null` body, not a 404. */
export const chatActiveHuddleContract = chatHuddleContract.nullable();

export type ChatHuddleWire = z.infer<typeof chatHuddleContract>;
