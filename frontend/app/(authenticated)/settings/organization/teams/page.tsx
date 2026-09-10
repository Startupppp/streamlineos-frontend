import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { OrgTeamsPage } from "@/features/settings/organization/hierarchy/teams-page";
import { prefetchOrgTeams } from "@/lib/prefetch/settings";

export default async function OrgTeamsRoute() {
  await requirePermission("settings:view");
  const state = await prefetchOrgTeams();
  return (
    <Suspense>
      <HydrationBoundary state={state}>
        <OrgTeamsPage />
      </HydrationBoundary>
    </Suspense>
  );
}
