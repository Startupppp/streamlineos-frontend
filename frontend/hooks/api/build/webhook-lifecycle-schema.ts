import { z } from "zod";

const webhookDeliveryStatusSchema = z.enum(["pending", "success", "failed"]);

export const webhookDeliveryItemSchema = z.object({
  id: z.number().int(),
  webhookId: z.number().int().nullable(),
  event: z.string(),
  status: webhookDeliveryStatusSchema,
  responseCode: z.number().int().nullable(),
  attempts: z.number().int(),
  lastError: z.string().nullable(),
  createdAt: z.string(),
  deliveredAt: z.string().nullable(),
});

export type WebhookDeliveryItem = z.infer<typeof webhookDeliveryItemSchema>;

export const webhookDeliveryPageContract = z.object({
  items: z.array(webhookDeliveryItemSchema),
  nextCursor: z.number().int().nullable(),
});

export type WebhookDeliveryPage = z.infer<typeof webhookDeliveryPageContract>;

export const projectWebhookRotateSecretContract = z.object({
  id: z.number().int(),
  secret: z.string(),
  secretHint: z.string(),
});

export type ProjectWebhookRotateSecret = z.infer<typeof projectWebhookRotateSecretContract>;

export const webhookImpactContract = z.object({
  webhookId: z.number().int(),
  events: z.array(z.string()),
  totalDeliveries: z.number().int(),
  successfulDeliveries: z.number().int(),
  lastSuccessAt: z.string().nullable(),
  lastFailureAt: z.string().nullable(),
});

export type WebhookImpact = z.infer<typeof webhookImpactContract>;

export const webhookRetryResultContract = z.object({
  success: z.boolean(),
  responseCode: z.number().int().nullable(),
});
