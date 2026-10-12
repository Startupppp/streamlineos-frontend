"use client";

import { useCallback, useMemo, useState } from "react";
import {
  usePortalPreviewFiles,
  usePortalPreviewRequests,
  usePortalPreviewUpdates,
  usePortalProjectOverview,
} from "@/hooks/api/build/client-portal";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Diamond, CheckSquare } from "lucide-react";
import { PortalCrSheet } from "./portal-cr-sheet";
import {
  PmPageShell,
  PmPanel,
  PmSection,
  PM_ROW,
} from "@/components/pm-chrome";
import { cn } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-text";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { SectionTitle, DashboardSkeleton } from "./portal-dashboard-sections";
import {
  PreviewFilesSection,
  PreviewRequestsSection,
  PreviewUpdatesSection,
} from "./portal-dashboard-paged-sections";

interface PortalDashboardPageProps {
  projectId: number;
}

export function PortalDashboardPage({ projectId }: PortalDashboardPageProps) {
  const [crSheetOpen, setCrSheetOpen] = useState(false);

  const {
    data: overview,
    isLoading: loadingOverview,
    isError: isErrorOverview,
    error: overviewError,
    refetch: refetchOverview,
  } = usePortalProjectOverview(projectId);

  const filesQuery = usePortalPreviewFiles(projectId);
  const updatesQuery = usePortalPreviewUpdates(projectId);
  const requestsQuery = usePortalPreviewRequests(projectId);

  const pageState = usePageState({
    permission: "build:portal:view",
    isLoading: loadingOverview,
    isError:
      isErrorOverview ||
      filesQuery.isError ||
      updatesQuery.isError ||
      requestsQuery.isError,
    error:
      overviewError ??
      filesQuery.error ??
      updatesQuery.error ??
      requestsQuery.error ??
      undefined,
  });

  const handleLoadMoreFiles = useCallback(() => {
    void filesQuery.fetchNextPage();
  }, [filesQuery]);
  const handleLoadMoreUpdates = useCallback(() => {
    void updatesQuery.fetchNextPage();
  }, [updatesQuery]);
  const handleLoadMoreRequests = useCallback(() => {
    void requestsQuery.fetchNextPage();
  }, [requestsQuery]);

  const filesPage = useMemo(
    () => ({
      items: filesQuery.items,
      isLoading: filesQuery.isLoading,
      hasMore: filesQuery.hasMore,
      isFetchingNextPage: filesQuery.isFetchingNextPage,
      onLoadMore: handleLoadMoreFiles,
    }),
    [filesQuery, handleLoadMoreFiles],
  );
  const updatesPage = useMemo(
    () => ({
      items: updatesQuery.items,
      isLoading: updatesQuery.isLoading,
      hasMore: updatesQuery.hasMore,
      isFetchingNextPage: updatesQuery.isFetchingNextPage,
      onLoadMore: handleLoadMoreUpdates,
    }),
    [updatesQuery, handleLoadMoreUpdates],
  );
  const requestsPage = useMemo(
    () => ({
      items: requestsQuery.items,
      isLoading: requestsQuery.isLoading,
      hasMore: requestsQuery.hasMore,
      isFetchingNextPage: requestsQuery.isFetchingNextPage,
      onLoadMore: handleLoadMoreRequests,
    }),
    [requestsQuery, handleLoadMoreRequests],
  );

  function handleRetry() {
    void refetchOverview();
    void filesQuery.refetch();
    void updatesQuery.refetch();
    void requestsQuery.refetch();
  }

  function handleOpenCrSheet() {
    setCrSheetOpen(true);
  }

  const isReady = pageState.kind === "ready";

  return (
    <PageWrapper
      title={isReady && overview ? overview.project.name : "Project Dashboard"}
      backHref="/portal"
      badge={
        isReady && overview ? (
          <Badge variant="outline" className="text-micro capitalize">
            {overview.project.status}
          </Badge>
        ) : undefined
      }
    >
      <PageState
        resolution={pageState}
        loading={<DashboardSkeleton />}
        onRetry={handleRetry}
        className="flex-1"
      >
        {!overview ? (
          <ErrorState className="min-h-[14rem]" onRetry={handleRetry} />
        ) : (
          <>
            <PmPageShell>
              {overview.capabilities?.canViewMilestones && (
                <PmSection index={0}>
                  <SectionTitle
                    icon={Diamond}
                    title="Milestones & Deliverables"
                  />
                  {overview.milestones.length === 0 ? (
                    <PmPanel className="flex items-center justify-center p-4">
                      <EmptyState
                        illustrationPreset="calendar"
                        title="No milestones"
                        description="No milestones have been shared yet."
                        compact
                        className="min-h-[100px]"
                      />
                    </PmPanel>
                  ) : (
                    <PmPanel>
                      {overview.milestones.map((m) => (
                        <div
                          key={m.id}
                          className={cn(PM_ROW, "overflow-hidden")}
                        >
                          <TruncatedText
                            text={m.name}
                            className="min-w-0 flex-1 text-dense font-medium"
                          />
                          {m.dueDate ? (
                            <span className="shrink-0 text-micro text-muted-foreground">
                              Due{" "}
                              {new Date(m.dueDate).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                              })}
                            </span>
                          ) : null}
                          {m.status ? (
                            <Badge
                              variant="outline"
                              className="shrink-0 text-micro capitalize"
                            >
                              {m.status}
                            </Badge>
                          ) : null}
                        </div>
                      ))}
                    </PmPanel>
                  )}
                </PmSection>
              )}

              {overview.capabilities?.canViewTasks && (
                <PmSection index={1}>
                  <SectionTitle icon={CheckSquare} title="Tasks" />
                  {overview.tasks.length === 0 ? (
                    <PmPanel className="flex items-center justify-center p-4">
                      <EmptyState
                        illustrationPreset="ticket"
                        title="No tasks"
                        description="No tasks have been shared yet."
                        compact
                        className="min-h-[100px]"
                      />
                    </PmPanel>
                  ) : (
                    <PmPanel>
                      {overview.tasks.map((t) => (
                        <div
                          key={t.id}
                          className={cn(PM_ROW, "overflow-hidden")}
                        >
                          <span className="w-16 shrink-0 font-mono text-micro text-muted-foreground">
                            #{t.ticketNumber}
                          </span>
                          <TruncatedText
                            text={t.title}
                            className="min-w-0 flex-1 text-dense"
                          />
                          {t.dueDate ? (
                            <span className="hidden shrink-0 text-micro text-muted-foreground sm:block">
                              {new Date(t.dueDate).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                              })}
                            </span>
                          ) : null}
                          <Badge
                            variant="outline"
                            className="shrink-0 text-micro capitalize"
                          >
                            {t.status}
                          </Badge>
                        </div>
                      ))}
                    </PmPanel>
                  )}
                </PmSection>
              )}

              {overview.capabilities?.canViewAttachments && (
                <PreviewFilesSection index={2} page={filesPage} />
              )}

              {overview.capabilities?.canViewComments && (
                <PreviewUpdatesSection index={3} page={updatesPage} />
              )}

              {overview.capabilities?.canViewRequests === true && (
                <PreviewRequestsSection
                  index={4}
                  page={requestsPage}
                  canSubmit={
                    overview.capabilities.canSubmitChangeRequests === true
                  }
                  onSubmitRequest={handleOpenCrSheet}
                />
              )}
            </PmPageShell>

            <PortalCrSheet
              projectId={projectId}
              open={crSheetOpen}
              onOpenChange={setCrSheetOpen}
            />
          </>
        )}
      </PageState>
    </PageWrapper>
  );
}
