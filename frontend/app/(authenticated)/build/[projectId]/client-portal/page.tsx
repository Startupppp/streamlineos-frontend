import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ClientPortalManagementPage } from "@/features/build/client-portal/client-portal-management-page";
import { prefetchProjectPortalSettings } from "@/lib/prefetch/build-project-extras";
import ClientPortalLoading from "./loading";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

async function ClientPortalHydrated({ projectId }: { projectId: number }) {
  const state = await prefetchProjectPortalSettings(projectId);
  return (
    <HydrationBoundary state={state}>
      <ClientPortalManagementPage projectId={projectId} />
    </HydrationBoundary>
  );
}

export default async function ClientPortalRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/client-portal");
  const { projectId: projectIdStr } = await params;
  return (
    <Suspense fallback={<ClientPortalLoading />}>
      <ClientPortalHydrated projectId={parseInt(projectIdStr, 10)} />
    </Suspense>
  );
}
