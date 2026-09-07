import { z } from "zod";
import type { HrAutomationEvent } from "@/types/hr/automations";

const hrAutomationEventContract = z.custom<HrAutomationEvent>((v) => typeof v === "string");

export const hrWebhookSubscriptionContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  url: z.string(),
  events: z.array(hrAutomationEventContract),
  isActive: z.boolean(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const hrWebhookSubscriptionWithSecretContract = hrWebhookSubscriptionContract.extend({
  secret: z.string(),
});

export const hrWebhookSubscriptionListContract = z.object({
  items: z.array(hrWebhookSubscriptionContract),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  totalPages: z.number().int(),
});

export const hrWebhookDeliveryContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  subscriptionId: z.number().int(),
  event: z.string(),
  payload: z.record(z.string(), z.unknown()),
  status: z.enum(["pending", "delivered", "failed", "dead"]),
  attempts: z.number().int(),
  lastAttemptAt: z.string().nullable(),
  responseStatus: z.number().int().nullable(),
  error: z.string().nullable(),
  createdAt: z.string(),
});

export const hrWebhookDeliveryListContract = z.object({
  items: z.array(hrWebhookDeliveryContract),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  totalPages: z.number().int(),
});

export const hrWebhookEventsResponseContract = z.object({
  events: z.array(
    z.object({
      value: hrAutomationEventContract,
      fields: z.array(
        z.object({
          field: z.string(),
          label: z.string(),
          type: z.string(),
        }),
      ),
      samplePayload: z.record(z.string(), z.unknown()),
    }),
  ),
});

export const hrWebhookTestResponseContract = z.object({
  deliveryId: z.number().int(),
  event: z.string(),
});
