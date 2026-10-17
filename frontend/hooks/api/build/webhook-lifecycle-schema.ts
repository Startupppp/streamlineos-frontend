import type { ProjectsWebhooksListDeliveriesResponse } from "@/contracts/build-contracts.generated";

export type WebhookDeliveryItem =
  ProjectsWebhooksListDeliveriesResponse["items"][number];
