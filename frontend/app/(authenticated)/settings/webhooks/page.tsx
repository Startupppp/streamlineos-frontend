import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { WebhooksPage } from "@/features/settings/webhooks/webhooks-page";
import { parsePageSize } from "@/lib/list-pagination";
import { toSearchParams, type RouteSearchParams } from "@/lib/route-search-params";
import { prefetchSettingsWebhooks } from "@/lib/prefetch/settings-admin";

export default async function WebhooksRoute({
  searchParams,
}: {
  searchParams: Promise<RouteSearchParams>;
}) {
  await requirePermission("settings:webhooks:manage");
  const params = toSearchParams(await searchParams);
  const state = await prefetchSettingsWebhooks({
    cursor: undefined,
    limit: parsePageSize(params.get("size")),
  });
  return (
    <Suspense>
      <HydrationBoundary state={state}>
        <WebhooksPage />
      </HydrationBoundary>
    </Suspense>
  );
}
