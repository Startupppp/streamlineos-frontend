import type { Metadata } from "next";
import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { OrganizationStructurePage } from "@/features/organization/organization-structure-page";
import { prefetchOrgStructure } from "@/lib/prefetch/settings";

export const metadata: Metadata = {
  title: "Organization Structure | StreamlineOS",
};

export default async function OrganizationStructureRoute() {
  await requirePermission("settings:view");
  const state = await prefetchOrgStructure();
  return (
    <Suspense>
      <HydrationBoundary state={state}>
        <OrganizationStructurePage />
      </HydrationBoundary>
    </Suspense>
  );
}
