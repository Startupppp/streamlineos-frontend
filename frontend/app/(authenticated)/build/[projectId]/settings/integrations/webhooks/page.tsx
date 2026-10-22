import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ProjectWebhooksPage } from "@/features/build/webhooks/project-webhooks-page";
import { prefetchProjectWebhooks } from "@/lib/prefetch/build-project-extras";
import ProjectSettingsWebhooksLoading from "./loading";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

async function WebhooksHydrated({ projectId }: { projectId: number }) {
  const state = await prefetchProjectWebhooks(projectId);
  return (
    <HydrationBoundary state={state}>
      <ProjectWebhooksPage projectId={String(projectId)} />
    </HydrationBoundary>
  );
}

export default async function ProjectSettingsIntegrationsWebhooksRoute({
  params,
}: PageProps) {
  await enforceRouteAccess("/build/[projectId]/settings/integrations/webhooks");
  const { projectId } = await params;
  return (
    <Suspense fallback={<ProjectSettingsWebhooksLoading />}>
      <WebhooksHydrated projectId={parseInt(projectId, 10)} />
    </Suspense>
  );
}
