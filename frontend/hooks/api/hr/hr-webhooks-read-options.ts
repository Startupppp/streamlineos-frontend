import { hrWebhooksListKey } from "@/hooks/api/hr/hr-webhooks-schema";

export function hrWebhooksQueryOptions(params?: { limit?: number }) {
  return {
    queryKey: hrWebhooksListKey(params),
    staleTime: 30_000,
  } as const;
}
