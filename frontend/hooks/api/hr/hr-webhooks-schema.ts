import { z } from "zod";
import { cursorPaginationContract } from "@/hooks/api/cursor-page-schema";
import { queryKeyBase } from "@/lib/query-keys/base";

const WEBHOOKS_BASE = [...queryKeyBase, "hr", "webhooks"] as const;

export const hrWebhooksListKey = (params?: Record<string, unknown>) =>
  [...WEBHOOKS_BASE, "list", params] as const;
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
  data: z.array(hrWebhookSubscriptionContract),
  pagination: cursorPaginationContract,
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
  data: z.array(hrWebhookDeliveryContract),
  pagination: cursorPaginationContract,
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

export const successResponseContract = z.object({ success: z.boolean() });
