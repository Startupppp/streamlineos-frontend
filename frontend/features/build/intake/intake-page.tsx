"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useIntakeRequests } from "@/hooks/api/build/intake";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyInboxIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import {
  CONTENT_FILL_PANEL,
  PAGE_BODY_EMPTY_CLASS,
} from "@/components/ui/content-fill-panel";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TABS_CONTENT_PAGE_BODY_CLASS,
} from "@/components/ui/tabs";
import { TablePagination } from "@/components/ui/table-pagination";
import { ListChecks } from "lucide-react";
import {
  BUILD_FILTER_ALL,
  useBuildListFilters,
} from "@/features/build/shared/use-build-list-filters";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { BuildPaginatedContent } from "@/features/build/shared/build-paginated-content";
import { useBuildCursorPager } from "@/features/build/shared/use-build-cursor-pager";
import { IntakeDecisionDialog } from "@/features/build/intake/components/intake-decision-dialog";
import { IntakeItemCard } from "@/features/build/intake/intake-item-card";
import { IntakeTriageMode } from "@/features/build/intake/intake-triage-mode";
import { IntakeCreateSheet } from "@/features/build/intake/components/intake-create-sheet";
import { IntakeShareControls } from "@/features/build/intake/intake-share-controls";
import { PmPageShell, PmSection, PmStaggerList } from "@/components/pm-chrome";
import type {
  IntakeSource,
  IntakeStatus,
  IntakeStatusCounts,
} from "@/types/projects";

const PAGE_SIZE = 50;
const EMPTY_STATUS_COUNTS: IntakeStatusCounts = {
  pending: 0,
  accepted: 0,
  declined: 0,
  duplicate: 0,
};
const INTAKE_STATUS_OPTIONS = [
  "pending",
  "accepted",
  "declined",
  "duplicate",
] as const satisfies readonly IntakeStatus[];
const INTAKE_TAB_OPTIONS = [...INTAKE_STATUS_OPTIONS, "all"] as const;
const INTAKE_MODE_OPTIONS = ["triage"] as const;
const INTAKE_SOURCE_OPTIONS = [
  "manual",
  "web_form",
  "email",
  "feedbucket",
  "portal_client",
] as const;
const INTAKE_SOURCE_FILTERS = [
  { value: BUILD_FILTER_ALL, label: "All sources" },
  { value: "manual", label: "Manual" },
  { value: "web_form", label: "Form" },
  { value: "email", label: "Email" },
  { value: "feedbucket", label: "Feedbucket" },
  { value: "portal_client", label: "Portal" },
] as const;
const INTAKE_FILTER_DEFINITIONS = [
  { param: "tab", all: "pending", options: INTAKE_TAB_OPTIONS },
  { param: "mode", all: "list", options: INTAKE_MODE_OPTIONS },
  { param: "source", options: INTAKE_SOURCE_OPTIONS },
  { param: "view", options: ["bug-reports"] as const },
] as const;

export function IntakePage({
  projectId,
  highlightId,
  highlightRequested = highlightId !== undefined,
}: {
  projectId: number;
  highlightId?: number;
  highlightRequested?: boolean;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const highlightRef = useRef<HTMLDivElement>(null);
  const listFilters = useBuildListFilters({
    filters: INTAKE_FILTER_DEFINITIONS,
    withSearch: false,
  });
  const pager = useBuildCursorPager(listFilters.resetKey);
  const urlTab = listFilters.value("tab");
  const triageMode = listFilters.value("mode") === "triage";
  const sourceValue = listFilters.value("source");
  const bugReportsView = listFilters.value("view") === "bug-reports";
  const widenForHighlight = Boolean(
    highlightRequested && urlTab === "pending" && !triageMode,
  );
  const activeTab = widenForHighlight ? "all" : urlTab;
  const sourceParam: IntakeSource | undefined =
    sourceValue !== BUILD_FILTER_ALL
      ? (INTAKE_SOURCE_OPTIONS.find((source) => source === sourceValue) ??
        (bugReportsView ? "feedbucket" : undefined))
      : bugReportsView
        ? "feedbucket"
        : undefined;
  const statusParam: IntakeStatus | undefined = triageMode
    ? "pending"
    : INTAKE_STATUS_OPTIONS.find((status) => status === activeTab);

  const {
    data: intakeData,
    isLoading,
    isError,
    error,
    refetch,
  } = useIntakeRequests(projectId, {
    status: statusParam,
    source: sourceParam,
    cursor: pager.cursor,
    limit: PAGE_SIZE,
  });
  const canManage = useCan("build:workspace:manage");
  const pageState = usePageState({
    permission: "build:view",
    isLoading,
    isError,
    error,
  });

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  function handleOpenCreate(): void {
    setCreateOpen(true);
  }
  function handleEnterTriage(): void {
    listFilters.setValue("mode", "triage");
  }
  function handleExitTriage(): void {
    listFilters.setValue("mode", "list");
  }
  function handleTabChange(value: string): void {
    listFilters.setValue("tab", value);
  }
  function handleSourceChange(value: string): void {
    listFilters.setValue("source", value);
  }
  function handleNextPage(): void {
    pager.goNext(intakeData?.pagination?.nextCursor);
  }
  const items = useMemo(() => intakeData?.data ?? [], [intakeData]);
  const statusCounts = intakeData?.statusCounts ?? EMPTY_STATUS_COUNTS;

  const highlightedItem =
    highlightId !== undefined
      ? (items.find((i) => i.id === highlightId) ?? null)
      : null;
  const highlightFound = highlightedItem !== null;
  const listSettled = !isLoading && intakeData !== undefined;
  const highlightNotFound =
    highlightRequested && listSettled && highlightedItem === null;

  useEffect(() => {
    if (highlightRef.current) {
      highlightRef.current.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    }
  }, [highlightFound]);

  const pendingItems = useMemo(
    () => items.filter((i) => i.status === "pending"),
    [items],
  );
  const pendingCount = statusCounts.pending;
  const sourceFiltered = sourceValue !== BUILD_FILTER_ALL || bugReportsView;

  if (
    pageState.kind !== "ready" &&
    pageState.kind !== "empty" &&
    pageState.kind !== "loading"
  )
    return (
      <PageWrapper
        title="Intake"
        subtitle="Collect and triage incoming requests from your team or clients"
      >
        <PmPageShell>
          <PageState
            resolution={pageState}
            loading={null}
            onRetry={handleRetry}
          >
            {null}
          </PageState>
        </PmPageShell>
      </PageWrapper>
    );

  if (pageState.kind === "loading")
    return (
      <PageWrapper
        title="Intake"
        subtitle="Collect and triage incoming requests from your team or clients"
      >
        <PmPageShell>
          <div className="flex flex-1 min-h-0 flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        </PmPageShell>
      </PageWrapper>
    );

  return (
    <IntakeDecisionDialog projectId={projectId}>
      {({ onAccept, onDecline, onDuplicate }) => (
        <PageWrapper
          title="Intake"
          subtitle={
            bugReportsView
              ? "Bug reports captured through Feedbucket and other intake sources"
              : "Collect and triage incoming requests from your team or clients"
          }
          filters={
            triageMode ? undefined : (
              <BuildFilterSelect
                label="Source"
                value={sourceValue}
                onValueChange={handleSourceChange}
                options={INTAKE_SOURCE_FILTERS}
              />
            )
          }
          actions={
            <div className="flex w-full flex-wrap items-center gap-2">
              {canManage && !triageMode ? (
                <Button variant="outline" size="sm" onClick={handleEnterTriage}>
                  <ListChecks className="h-4 w-4 mr-1" /> Triage
                </Button>
              ) : null}
              <IntakeShareControls projectId={projectId} />
              {canManage && !triageMode ? (
                <IntakeCreateSheet
                  projectId={projectId}
                  open={createOpen}
                  onOpenChange={setCreateOpen}
                />
              ) : null}
            </div>
          }
        >
          <PmPageShell>
            {triageMode && canManage ? (
              <IntakeTriageMode
                items={pendingItems}
                onAccept={onAccept}
                onDecline={onDecline}
                onDuplicate={onDuplicate}
                onExit={handleExitTriage}
              />
            ) : null}
            {!triageMode || !canManage ? (
              <Tabs
                value={activeTab}
                onValueChange={handleTabChange}
                className="flex min-h-0 flex-1 flex-col gap-0"
              >
                <PmSection index={0} className="shrink-0">
                  <TabsList>
                    <TabsTrigger value="pending">
                      Pending
                      {pendingCount > 0 ? (
                        <Badge
                          variant="secondary"
                          className="ml-1.5 h-5 px-1.5 text-xs tabular-nums"
                        >
                          {pendingCount}
                        </Badge>
                      ) : null}
                    </TabsTrigger>
                    <TabsTrigger value="accepted">
                      Accepted
                      {statusCounts.accepted > 0 ? (
                        <Badge
                          variant="secondary"
                          className="ml-1.5 h-5 px-1.5 text-xs tabular-nums"
                        >
                          {statusCounts.accepted}
                        </Badge>
                      ) : null}
                    </TabsTrigger>
                    <TabsTrigger value="declined">
                      Declined
                      {statusCounts.declined > 0 ? (
                        <Badge
                          variant="secondary"
                          className="ml-1.5 h-5 px-1.5 text-xs tabular-nums"
                        >
                          {statusCounts.declined}
                        </Badge>
                      ) : null}
                    </TabsTrigger>
                    <TabsTrigger value="duplicate">
                      Duplicate
                      {statusCounts.duplicate > 0 ? (
                        <Badge
                          variant="secondary"
                          className="ml-1.5 h-5 px-1.5 text-xs tabular-nums"
                        >
                          {statusCounts.duplicate}
                        </Badge>
                      ) : null}
                    </TabsTrigger>
                    <TabsTrigger value="all">All</TabsTrigger>
                  </TabsList>
                </PmSection>

                <TabsContent
                  value={activeTab}
                  className={`${TABS_CONTENT_PAGE_BODY_CLASS} mt-4 min-h-0 flex-1 max-md:pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))]`}
                >
                  {highlightNotFound ? (
                    <p
                      className="mb-3 shrink-0 rounded-lg border border-warning/40 bg-warning/10 px-4 py-2.5 text-sm text-warning-foreground"
                      role="status"
                      data-testid="intake-item-not-found"
                    >
                      The linked item is not in this view. It may have been
                      deleted or moved to a different status.
                    </p>
                  ) : null}
                  {items.length === 0 ? (
                    <div
                      data-testid="intake-empty-panel"
                      className={`${CONTENT_FILL_PANEL} ${PAGE_BODY_EMPTY_CLASS}`}
                    >
                      <EmptyState
                        illustration={<EmptyInboxIllustration />}
                        title={
                          sourceFiltered
                            ? "No items match this source"
                            : activeTab === "pending"
                              ? "No pending items"
                              : `No ${activeTab} items`
                        }
                        description={
                          sourceFiltered
                            ? "Try another source or clear the filter to see more requests."
                            : activeTab === "pending"
                              ? "Share the form URL to start receiving submissions."
                              : "Items will appear here once triaged."
                        }
                        action={
                          activeTab === "pending" && !sourceFiltered
                            ? {
                                label: "Create First Item",
                                onClick: handleOpenCreate,
                              }
                            : undefined
                        }
                        className={`${CONTENT_FILL_PANEL} ${PAGE_BODY_EMPTY_CLASS}`}
                      />
                    </div>
                  ) : (
                    <PmSection index={1} className="flex min-h-0 flex-1 flex-col">
                      <BuildPaginatedContent
                        ariaLabel="Intake items"
                        footer={
                          <TablePagination
                            mode="cursor"
                            rowCount={items.length}
                            pageNumber={pager.pageNumber}
                            hasMore={Boolean(intakeData?.pagination?.hasMore)}
                            hasPrevious={pager.hasPrevious}
                            onNext={handleNextPage}
                            onPrevious={pager.goPrevious}
                            hideOnSinglePage
                          />
                        }
                      >
                        <PmStaggerList className="space-y-2.5 pb-2">
                          {items.map((item) => {
                            const isHighlighted = item.id === highlightId;
                            return (
                              <div
                                key={item.id}
                                ref={isHighlighted ? highlightRef : undefined}
                                className={
                                  isHighlighted
                                    ? "ring-2 ring-primary ring-offset-2 rounded-xl"
                                    : undefined
                                }
                                data-highlighted={
                                  isHighlighted ? "true" : undefined
                                }
                              >
                                <IntakeItemCard
                                  item={item}
                                  canManage={canManage}
                                  onAccept={onAccept}
                                  onDecline={onDecline}
                                  onDuplicate={onDuplicate}
                                />
                              </div>
                            );
                          })}
                        </PmStaggerList>
                      </BuildPaginatedContent>
                    </PmSection>
                  )}
                </TabsContent>
              </Tabs>
            ) : null}
          </PmPageShell>
        </PageWrapper>
      )}
    </IntakeDecisionDialog>
  );
}
