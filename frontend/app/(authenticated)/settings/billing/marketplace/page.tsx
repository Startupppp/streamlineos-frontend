import type { Metadata } from "next";
import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { MarketplacePage } from "@/features/billing/marketplace/marketplace-page";
import { requirePermission } from "@/lib/rbac/require-permission";
import { prefetchMarketplace } from "@/lib/prefetch/settings-billing";

export const metadata: Metadata = {
  title: "Marketplace | StreamlineOS",
};

export default async function MarketplaceRoute() {
  await requirePermission("billing:marketplace:view");
  const state = await prefetchMarketplace();
  return (
    <Suspense>
      <HydrationBoundary state={state}>
        <MarketplacePage />
      </HydrationBoundary>
    </Suspense>
  );
}
