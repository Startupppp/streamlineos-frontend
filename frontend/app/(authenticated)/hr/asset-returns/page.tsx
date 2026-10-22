import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { AssetReturnsPage } from "@/features/hr/asset-returns/asset-returns-page";
import { prefetchHrAssetReturns } from "@/lib/prefetch/hr";
import AssetReturnsLoading from "./loading";

export default async function HrAssetReturnsPage() {
  await requirePermission("hr:assets:view");
  const state = await prefetchHrAssetReturns();
  return (
    <Suspense fallback={<AssetReturnsLoading />}>
      <HydrationBoundary state={state}>
        <AssetReturnsPage />
      </HydrationBoundary>
    </Suspense>
  );
}
