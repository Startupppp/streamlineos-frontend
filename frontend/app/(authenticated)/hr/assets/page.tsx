import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { AssetsPage } from "@/features/hr/assets/assets-page";
import { prefetchHrAssets } from "@/lib/prefetch/hr";

export default async function HrAssetsPage() {
  await requirePermission("hr:assets:view");
  const state = await prefetchHrAssets();
  return (
    <HydrationBoundary state={state}>
      <AssetsPage />
    </HydrationBoundary>
  );
}
