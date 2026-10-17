import { z } from "zod";

const wireDate = () => z.string().nullable();

const slackConnectionItemSchema = z.object({
  id: z.number().int(),
  teamId: z.string(),
  teamName: z.string().nullable(),
  defaultChannelId: z.string().nullable(),
  webhookUrl: z.string(),
  isActive: z.boolean(),
  lastEventAt: wireDate(),
  lastErrorAt: wireDate(),
  createdAt: z.string(),
});

export const slackConnectionListContract = z.object({
  data: z.array(slackConnectionItemSchema),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const slackConnectionCreateContract = z.object({
  id: z.number().int(),
  teamId: z.string(),
  teamName: z.string().nullable(),
  defaultChannelId: z.string().nullable(),
  webhookUrl: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
});

export const slackConnectionDeleteContract = z.object({ success: z.literal(true) });
