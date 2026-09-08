import { z } from "zod";

const webhookContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  url: z.string(),
  events: z.array(z.string()),
  isActive: z.boolean(),
  lastDeliveryAt: z.string().nullable(),
  lastDeliveryStatus: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const webhooksArrayContract = z.array(webhookContract);

export const webhookDetailContract = webhookContract;

const webhookEventContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  webhookId: z.number().int().nullable(),
  eventType: z.string(),
  payload: z.record(z.string(), z.unknown()),
  status: z.string(),
  attempts: z.number().int(),
  deliveredAt: z.string().nullable(),
  createdAt: z.string(),
});

export const listWebhookEventsContract = z.object({
  items: z.array(webhookEventContract),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});

export const retryEventContract = webhookEventContract;

export const deleteWebhookContract = z.object({
  deleted: z.literal(true),
});

export const listWebhooksContract = z.object({
  items: z.array(webhookContract),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});
