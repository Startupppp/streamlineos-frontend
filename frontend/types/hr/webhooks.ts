import type { HrAutomationEvent } from "./automations";

export type HrWebhookDeliveryStatus = "pending" | "delivered" | "failed" | "dead";

export interface HrWebhookSubscription {
  id: number;
  orgId: string;
  name: string;
  url: string;
  events: HrAutomationEvent[];
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HrWebhookDelivery {
  id: number;
  orgId: string;
  subscriptionId: number;
  event: string;
  payload: Record<string, unknown>;
  status: HrWebhookDeliveryStatus;
  attempts: number;
  lastAttemptAt: string | null;
  responseStatus: number | null;
  error: string | null;
  createdAt: string;
}

export interface HrWebhookEventDef {
  value: HrAutomationEvent;
  fields: Array<{ field: string; label: string; type: string }>;
  samplePayload: Record<string, unknown>;
}

export interface HrWebhookEventsResponse {
  events: HrWebhookEventDef[];
}

export interface CreateHrWebhookInput {
  name: string;
  url: string;
  events: HrAutomationEvent[];
  isActive: boolean;
}

export interface UpdateHrWebhookInput {
  name?: string;
  url?: string;
  events?: HrAutomationEvent[];
  isActive?: boolean;
}
