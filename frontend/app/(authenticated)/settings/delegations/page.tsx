import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { DelegationsPage } from "@/features/settings/delegations/delegations-page";
import { readDelegationListState } from "@/features/settings/delegations/delegation-list-state";
import { toSearchParams, type RouteSearchParams } from "@/lib/route-search-params";
import { prefetchSettingsDelegations } from "@/lib/prefetch/settings-admin";

export default async function DelegationsRoute({
  searchParams,
}: {
  searchParams: Promise<RouteSearchParams>;
}) {
  await requirePermission("settings:rbac:manage");
  const params = toSearchParams(await searchParams);
  const state = await prefetchSettingsDelegations(
    { ...readDelegationListState(params, "received"), cursor: undefined },
    { ...readDelegationListState(params, "granted"), cursor: undefined },
  );
  return (
    <Suspense>
      <HydrationBoundary state={state}>
        <DelegationsPage />
      </HydrationBoundary>
    </Suspense>
  );
}
