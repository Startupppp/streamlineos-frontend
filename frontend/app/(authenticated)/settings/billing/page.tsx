import type { Metadata } from "next";
import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { BillingSettingsPage } from "@/features/billing/billing-settings-page";
import { resolveBillingTab } from "@/features/billing/billing-tabs";
import { requirePermission } from "@/lib/rbac/require-permission";
import { toSearchParams, type RouteSearchParams } from "@/lib/route-search-params";
import { prefetchBillingSettings } from "@/lib/prefetch/settings-billing";

export const metadata: Metadata = {
  title: "Billing & Plan | StreamlineOS",
};

export default async function BillingSettingsRoute({
  searchParams,
}: {
  searchParams: Promise<RouteSearchParams>;
}) {
  await requirePermission("billing:subscription:view");
  const params = toSearchParams(await searchParams);
  const state = await prefetchBillingSettings(resolveBillingTab(params.get("tab")));
  return (
    <Suspense>
      <HydrationBoundary state={state}>
        <BillingSettingsPage />
      </HydrationBoundary>
    </Suspense>
  );
}
