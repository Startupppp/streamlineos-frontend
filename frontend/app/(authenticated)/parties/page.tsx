import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { PartiesPage } from "@/features/party/parties/parties-page";
import { prefetchParties } from "@/lib/prefetch/parties";

export default async function PartiesRoute() {
  await requirePermission("party:parties:view");
  const state = await prefetchParties();
  return (
    <HydrationBoundary state={state}>
      <PartiesPage />
    </HydrationBoundary>
  );
}
