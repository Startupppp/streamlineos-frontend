import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { RolesPage } from "@/features/settings/roles/roles-page";
import { prefetchRoles } from "@/lib/prefetch/roles";

export default async function Page() {
  await requirePermission("settings:rbac:manage");
  const state = await prefetchRoles();
  return (
    <Suspense>
      <HydrationBoundary state={state}>
        <RolesPage />
      </HydrationBoundary>
    </Suspense>
  );
}
