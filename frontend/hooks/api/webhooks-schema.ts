import { z } from "zod";

const wireDate = () => z.string();

const webhookEndpointSafeSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  url: z.string(),
  description: z.string().nullable(),
  events: z.array(z.string()),
  isActive: z.boolean(),
  createdBy: z.string(),
  createdAt: wireDate(),
  updatedAt: wireDate(),
});

export const webhookListContract = z.object({
  data: z.array(webhookEndpointSafeSchema),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const webhookCreateContract = webhookEndpointSafeSchema.extend({
  secret: z.string(),
  secretHint: z.string(),
});

/** `WebhooksService.update` returns the row with `secret` stripped. */
export const webhookUpdateContract = webhookEndpointSafeSchema;

/** `WebhooksService.remove` answers 200 with `{ success: true }`, never 204. */
export const webhookDeleteContract = z.object({ success: z.literal(true) });

export const webhookRotateSecretContract = z.object({
  id: z.number().int(),
  secret: z.string(),
  secretHint: z.string(),
});

const webhookLogSchema = z.object({
  id: z.number().int(),
  endpointId: z.number().int(),
  orgId: z.string(),
  event: z.string(),
  payload: z.record(z.string(), z.unknown()).nullable(),
  statusCode: z.number().int().nullable(),
  responseBody: z.string().nullable(),
  attempt: z.number().int(),
  success: z.boolean(),
  createdAt: wireDate(),
});

export const webhookListLogsContract = z.object({
  data: z.array(webhookLogSchema),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const webhookRetryContract = z.object({ success: z.boolean() });
