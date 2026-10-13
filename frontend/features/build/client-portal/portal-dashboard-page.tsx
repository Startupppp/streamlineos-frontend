"use client";

import { useCallback, useMemo, useState } from "react";
import {
  usePortalPreviewApprovals,
  usePortalPreviewDeliverables,
  usePortalPreviewFiles,
  usePortalPreviewInvoices,
  usePortalPreviewMilestones,
  usePortalPreviewRequests,
  usePortalPreviewTasks,
  usePortalPreviewUpdates,
  usePortalProjectOverview,
} from "@/hooks/api/build/client-portal";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/shared/error-state";
import { PortalCrSheet } from "./portal-cr-sheet";
import { PmPageShell } from "@/components/pm-chrome";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { DashboardSkeleton } from "./portal-dashboard-sections";
import {
  PreviewApprovalsSection,
  PreviewDeliverablesSection,
  PreviewFilesSection,
  PreviewInvoicesSection,
  PreviewMilestonesSection,
  PreviewRequestsSection,
  PreviewTasksSection,
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
  const milestonesQuery = usePortalPreviewMilestones(projectId);
  const tasksQuery = usePortalPreviewTasks(projectId);
  const deliverablesQuery = usePortalPreviewDeliverables(projectId);
  const approvalsQuery = usePortalPreviewApprovals(projectId);
  const invoicesQuery = usePortalPreviewInvoices(projectId);

  const pageState = usePageState({
    permission: "build:portal:view",
    isLoading: loadingOverview,
    isError:
      isErrorOverview ||
      filesQuery.isError ||
      updatesQuery.isError ||
      requestsQuery.isError ||
      milestonesQuery.isError ||
      tasksQuery.isError ||
      deliverablesQuery.isError ||
      approvalsQuery.isError ||
      invoicesQuery.isError,
    error:
      overviewError ??
      filesQuery.error ??
      updatesQuery.error ??
      requestsQuery.error ??
      milestonesQuery.error ??
      tasksQuery.error ??
      deliverablesQuery.error ??
      approvalsQuery.error ??
      invoicesQuery.error ??
      undefined,
  });

  const handleLoadMoreFiles = useCallback(() => { void filesQuery.fetchNextPage(); }, [filesQuery]);
  const handleLoadMoreUpdates = useCallback(() => { void updatesQuery.fetchNextPage(); }, [updatesQuery]);
  const handleLoadMoreRequests = useCallback(() => { void requestsQuery.fetchNextPage(); }, [requestsQuery]);
  const handleLoadMoreMilestones = useCallback(() => { void milestonesQuery.fetchNextPage(); }, [milestonesQuery]);
  const handleLoadMoreTasks = useCallback(() => { void tasksQuery.fetchNextPage(); }, [tasksQuery]);
  const handleLoadMoreDeliverables = useCallback(() => { void deliverablesQuery.fetchNextPage(); }, [deliverablesQuery]);
  const handleLoadMoreApprovals = useCallback(() => { void approvalsQuery.fetchNextPage(); }, [approvalsQuery]);
  const handleLoadMoreInvoices = useCallback(() => { void invoicesQuery.fetchNextPage(); }, [invoicesQuery]);

  const filesPage = useMemo(() => ({ items: filesQuery.items, isLoading: filesQuery.isLoading, hasMore: filesQuery.hasMore, isFetchingNextPage: filesQuery.isFetchingNextPage, onLoadMore: handleLoadMoreFiles }), [filesQuery, handleLoadMoreFiles]);
  const updatesPage = useMemo(() => ({ items: updatesQuery.items, isLoading: updatesQuery.isLoading, hasMore: updatesQuery.hasMore, isFetchingNextPage: updatesQuery.isFetchingNextPage, onLoadMore: handleLoadMoreUpdates }), [updatesQuery, handleLoadMoreUpdates]);
  const requestsPage = useMemo(() => ({ items: requestsQuery.items, isLoading: requestsQuery.isLoading, hasMore: requestsQuery.hasMore, isFetchingNextPage: requestsQuery.isFetchingNextPage, onLoadMore: handleLoadMoreRequests }), [requestsQuery, handleLoadMoreRequests]);
  const milestonesPage = useMemo(() => ({ items: milestonesQuery.items, isLoading: milestonesQuery.isLoading, hasMore: milestonesQuery.hasMore, isFetchingNextPage: milestonesQuery.isFetchingNextPage, onLoadMore: handleLoadMoreMilestones }), [milestonesQuery, handleLoadMoreMilestones]);
  const tasksPage = useMemo(() => ({ items: tasksQuery.items, isLoading: tasksQuery.isLoading, hasMore: tasksQuery.hasMore, isFetchingNextPage: tasksQuery.isFetchingNextPage, onLoadMore: handleLoadMoreTasks }), [tasksQuery, handleLoadMoreTasks]);
  const deliverablesPage = useMemo(() => ({ items: deliverablesQuery.items, isLoading: deliverablesQuery.isLoading, hasMore: deliverablesQuery.hasMore, isFetchingNextPage: deliverablesQuery.isFetchingNextPage, onLoadMore: handleLoadMoreDeliverables }), [deliverablesQuery, handleLoadMoreDeliverables]);
  const approvalsPage = useMemo(() => ({ items: approvalsQuery.items, isLoading: approvalsQuery.isLoading, hasMore: approvalsQuery.hasMore, isFetchingNextPage: approvalsQuery.isFetchingNextPage, onLoadMore: handleLoadMoreApprovals }), [approvalsQuery, handleLoadMoreApprovals]);
  const invoicesPage = useMemo(() => ({ items: invoicesQuery.items, isLoading: invoicesQuery.isLoading, hasMore: invoicesQuery.hasMore, isFetchingNextPage: invoicesQuery.isFetchingNextPage, onLoadMore: handleLoadMoreInvoices }), [invoicesQuery, handleLoadMoreInvoices]);

  function handleRetry() {
    void refetchOverview();
    void filesQuery.refetch();
    void updatesQuery.refetch();
    void requestsQuery.refetch();
    void milestonesQuery.refetch();
    void tasksQuery.refetch();
    void deliverablesQuery.refetch();
    void approvalsQuery.refetch();
    void invoicesQuery.refetch();
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
                <PreviewMilestonesSection index={0} page={milestonesPage} />
              )}
              {overview.capabilities?.canViewTasks && (
                <PreviewTasksSection index={1} page={tasksPage} />
              )}
              {overview.capabilities?.canViewMilestones && (
                <PreviewDeliverablesSection index={2} page={deliverablesPage} />
              )}
              {overview.capabilities?.canViewApprovals && (
                <PreviewApprovalsSection index={3} page={approvalsPage} />
              )}
              {overview.capabilities?.canViewInvoices && (
                <PreviewInvoicesSection index={4} page={invoicesPage} />
              )}
              {overview.capabilities?.canViewAttachments && (
                <PreviewFilesSection index={5} page={filesPage} />
              )}
              {overview.capabilities?.canViewComments && (
                <PreviewUpdatesSection index={6} page={updatesPage} />
              )}
              {overview.capabilities?.canViewRequests === true && (
                <PreviewRequestsSection
                  index={7}
                  page={requestsPage}
                  canSubmit={overview.capabilities.canSubmitChangeRequests === true}
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
