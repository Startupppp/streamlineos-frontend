export interface ProjectWebhook {
  id: number;
  orgId: string;
  projectId: number;
  url: string;
  events: string[];
  isActive: boolean;
  hasSecret: boolean;
  secretSetAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  lastDeliveryAt?: string | null;
  lastDeliveryStatus?: "success" | "failed" | "pending" | null;
  failureRate?: number | null;
}

export interface WebhookDelivery {
  id: number;
  webhookId: number;
  event: string;
  status: "success" | "failed" | "pending";
  responseCode: number | null;
  attempts: number;
  lastError: string | null;
  deliveredAt: string;
}
