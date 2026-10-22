import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { AssetsPage } from "@/features/hr/assets/assets-page";
import { prefetchHrAssets } from "@/lib/prefetch/hr";
import AssetsLoading from "./loading";

export default async function HrAssetsPage() {
  await requirePermission("hr:assets:view");
  const state = await prefetchHrAssets();
  return (
    <Suspense fallback={<AssetsLoading />}>
      <HydrationBoundary state={state}>
        <AssetsPage />
      </HydrationBoundary>
    </Suspense>
  );
}
