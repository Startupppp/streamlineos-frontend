import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { OrgDepartmentsPage } from "@/features/settings/organization/hierarchy/departments-page";
import { prefetchOrgDepartments } from "@/lib/prefetch/settings";

export default async function DepartmentsRoute() {
  await requirePermission("settings:view");
  const state = await prefetchOrgDepartments();
  return (
    <Suspense>
      <HydrationBoundary state={state}>
        <OrgDepartmentsPage />
      </HydrationBoundary>
    </Suspense>
  );
}
