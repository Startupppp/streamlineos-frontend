import { z } from "zod";

const webhookContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  url: z.string(),
  events: z.array(z.string()),
  isActive: z.boolean(),
  secret: z.string().nullable(),
  lastTriggeredAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const listWebhooksContract = z.object({
  items: z.array(webhookContract),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});

export const webhookDetailContract = webhookContract;

const webhookEventContract = z.object({
  id: z.number().int(),
  webhookId: z.number().int(),
  eventType: z.string(),
  status: z.string(),
  payload: z.record(z.string(), z.unknown()),
  response: z.record(z.string(), z.unknown()).nullable(),
  attempts: z.number().int(),
  nextRetryAt: z.string().nullable(),
  deliveredAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const listWebhookEventsContract = z.object({
  items: z.array(webhookEventContract),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});

export const retryEventContract = webhookEventContract;

export const deleteWebhookContract = z.object({
  deleted: z.boolean(),
  id: z.number().int(),
});

export const webhooksArrayContract = z.array(webhookContract);
