import { z } from "zod";

const wireDate = () => z.string().nullable();

const emailInboundConnectionItemSchema = z.object({
  id: z.number().int(),
  provider: z.enum(["postmark", "mailgun", "sendgrid"]),
  inboundAddress: z.string(),
  defaultProjectId: z.number().int().nullable(),
  webhookUrl: z.string(),
  isActive: z.boolean(),
  lastEventAt: wireDate(),
  lastErrorAt: wireDate(),
  createdAt: z.string(),
});

export const emailInboundConnectionListContract = z.object({
  data: z.array(emailInboundConnectionItemSchema),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const emailInboundConnectionCreateContract = z.object({
  id: z.number().int(),
  provider: z.enum(["postmark", "mailgun", "sendgrid"]),
  inboundAddress: z.string(),
  defaultProjectId: z.number().int().nullable(),
  webhookUrl: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
});

export const emailInboundConnectionDeleteContract = z.object({ success: z.literal(true) });
