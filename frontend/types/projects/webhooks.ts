export interface ProjectWebhook {
  id: number;
  projectId: number;
  url: string;
  events: string[];
  isActive: boolean;
  secret?: string;
  createdAt: string;
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
