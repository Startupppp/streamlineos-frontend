"use client";

import { use, useCallback } from "react";
import { PortalHeader } from "@/features/portal/components/portal-header";
import { usePortalGuard } from "@/hooks/api/portal/use-portal-guard";
import { usePortalProjectOverview } from "@/hooks/api/portal/use-portal-project-overview";
import {
  PortalProjectDetail,
  PortalProjectDetailLoading,
  PortalProjectDetailError,
  PortalProjectDetailNotFound,
} from "@/features/portal/components/portal-project-detail";

interface PortalProjectPageProps {
  params: Promise<{ projectId: string }>;
}

export default function PortalProjectPage({ params }: PortalProjectPageProps) {
  const { projectId: projectIdParam } = use(params);
  const projectId = parseInt(projectIdParam, 10);

  const { isReady } = usePortalGuard();
  const { data, isLoading, isError, refetch } = usePortalProjectOverview(
    isNaN(projectId) ? 0 : projectId,
  );

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (!isReady || isLoading)
    return <PortalProjectDetailLoading />;

  if (isError || isNaN(projectId))
    return <PortalProjectDetailError onRetry={handleRetry} />;

  if (!data)
    return <PortalProjectDetailNotFound />;

  return (
    <div className="flex flex-col min-h-dvh bg-background">
      <PortalHeader showProjectsLink />
      <main className="flex-1 px-4 sm:px-6 py-8 max-w-3xl mx-auto w-full">
        <PortalProjectDetail data={data} />
      </main>
    </div>
  );
}
