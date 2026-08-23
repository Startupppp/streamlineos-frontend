import type { Metadata } from "next";
import { HydrationBoundary } from "@tanstack/react-query";
import { WorkersPage } from "@/features/directory/workers/workers-page";
import { requirePermission } from "@/lib/rbac/require-permission";
import { prefetchWorkers } from "@/lib/prefetch/directory";

export const metadata: Metadata = {
  title: "Workers | StreamlineOS",
};

export default async function WorkersRoute() {
  const { access } = await requirePermission("directory:workers:view");
  const state = await prefetchWorkers("directory:workers:view" in access.scopes);

  return (
    <HydrationBoundary state={state}>
      <WorkersPage />
    </HydrationBoundary>
  );
}
