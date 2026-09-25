"use client";

import { useCallback, useMemo, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageTabsToolbar } from "@/components/ui/page-tabs-toolbar";
import { Skeleton } from "@/components/ui/skeleton";
import { PmPageShell, PmSection, PM_FILL_SECTION } from "@/components/pm-chrome";
import { ViewSwitcher, type ViewType } from "@/features/build/views/view-switcher";
import { useDisplayOptions } from "@/features/build/views/use-display-options";
import { Button } from "@/components/ui/button";
import { PanelRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAfterLoad } from "@/hooks/common/use-after-load";
import { useOrgCustomStates } from "@/hooks/api/build/custom-states";
import { MY_WORK_VIEWS } from "./my-work-view";
import { MyWorkSortControl } from "./my-work-sort-control";
import { useMyWorkBulk } from "./use-my-work-bulk";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";
import { useNavigationLeave } from "@/components/shared/dirty-state-context";
import {
  useMyWorkData,
  parseWorkTab,
  parseMyWorkView,
  WORK_TABS,
  TAB_CONFIG,
} from "./use-my-work-data";

const GroupingSidebar = dynamic(
  () => import("./grouping-sidebar").then((m) => ({ default: m.GroupingSidebar })),
  { ssr: false, loading: () => null },
);
const TicketFilterBar = dynamic(
  () =>
    import("@/features/build/shared/ticket-filter-bar").then((m) => ({
      default: m.TicketFilterBar,
    })),
  { ssr: false },
);
const DisplayOptionsPanel = dynamic(
  () => import("@/features/build/views/display-options-panel").then((m) => ({
    default: m.DisplayOptionsPanel,
  })),
  { ssr: false },
);
const MyWorkContent = dynamic(
  () => import("./my-work-content").then((m) => ({ default: m.MyWorkContent })),
  { loading: () => null },
);

const DISPLAY_STORAGE_ID = -1;

export function MyWorkPage() {
  const router = useRouter();
  const requestLeave = useNavigationLeave();
  const searchParams = useSearchParams();

  const activeTab = parseWorkTab(searchParams.get("tab"));
  const activeView = parseMyWorkView(searchParams.get("view"));

  const [showGroupingSidebar, setShowGroupingSidebar] = useState(false);
  const [groupingMounted, setGroupingMounted] = useState(false);
  const [displayOptions, setDisplayOptions] = useDisplayOptions(DISPLAY_STORAGE_ID);
  const filterBarReady = useAfterLoad();
  const { data: orgStates } = useOrgCustomStates();
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const {
    hasActiveFilters,
    isLoading,
    isError,
    error,
    isEmpty,
    activeData,
    handleRetry,
    filtersActive,
    handleClearFilters,
    setListParams,
    setCursor,
    sortField,
    sortDirection,
    grouping,
    cursor,
    kanbanTickets,
    ticketMeta,
    dueBuckets,
    showViewSwitcher,
    showBucketList,
    emptyTitle,
    emptyDescription,
  } = useMyWorkData({ activeTab, activeView });

  const [storedTrail, setStoredTrail] = useState<(string | null)[]>([null]);
  const cursorTrail = useMemo(
    () =>
      storedTrail[storedTrail.length - 1] === cursor ? storedTrail : [cursor],
    [cursor, storedTrail],
  );
  const hasPrevious = cursorTrail.length > 1;
  const pageNumber = cursorTrail.length;

  const handleNextPage = useCallback(() => {
    const nextCursor = activeData?.nextCursor ?? null;
    if (!nextCursor) return;
    setStoredTrail([...cursorTrail, nextCursor]);
    setCursor(nextCursor);
  }, [activeData?.nextCursor, cursorTrail, setCursor]);

  const handlePreviousPage = useCallback(() => {
    if (cursorTrail.length <= 1) return;
    const trimmed = cursorTrail.slice(0, -1);
    setStoredTrail(trimmed);
    setCursor(trimmed[trimmed.length - 1] ?? null);
  }, [cursorTrail, setCursor]);

  const bulk = useMyWorkBulk(activeData?.data ?? [], sortField, sortDirection);

  useBuildListKeyboard({
    itemCount: kanbanTickets.length,
    onOpen: (index) => {
      const ticket = kanbanTickets[index];
      if (ticket) {
        const meta = ticketMeta.get(ticket.id);
        if (meta) {
          requestLeave(() =>
            router.push(`/build/${meta.projectId}/${meta.projectKey}-${meta.ticketNumber}`),
          );
        }
      }
    },
    onClearSelection: bulk.handleClearSelection,
    searchInputRef,
  });

  const pageState = usePageState({
    permission: "build:tickets:view",
    isLoading,
    isError,
    error,
    isEmpty,
  });

  const handleTabChange = useCallback(
    (value: string) => {
      setListParams({
        tab: value === "assigned" ? null : value,
        view: null,
        cursor: null,
      });
    },
    [setListParams],
  );

  const handleViewChange = useCallback(
    (next: ViewType) => {
      setListParams({
        view: next === "list" ? null : next,
        cursor: null,
      });
    },
    [setListParams],
  );

  const handleSortChange = useCallback(
    (field: string, direction: "asc" | "desc") =>
      setListParams({ sort: field, dir: direction }),
    [setListParams],
  );

  function handleToggleSidebar() {
    setGroupingMounted(true);
    setShowGroupingSidebar((prev) => !prev);
  }

  const isGateState =
    pageState.kind !== "ready" &&
    pageState.kind !== "empty" &&
    pageState.kind !== "error" &&
    pageState.kind !== "loading";

  if (isGateState)
    return (
      <PageWrapper title="My Work" subtitle="Your tickets across all projects">
        <PageState resolution={pageState} loading={null} onRetry={handleRetry} className="flex-1">
          {null}
        </PageState>
      </PageWrapper>
    );

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden"
    >
      <PageWrapper
        title="My Work"
        subtitle="Your tickets across all projects"
        noInternalScroll
        filtersClassName="flex-col items-stretch gap-0 overflow-visible pb-2 [&>*]:w-full [&>*]:min-w-0 [&>*]:shrink"
        filters={
          <PageTabsToolbar
            collapseBelow="xl"
            tabs={
              <TabsList>
                {WORK_TABS.map((tab) => (
                  <TabsTrigger key={tab} value={tab}>
                    {TAB_CONFIG[tab].label}
                  </TabsTrigger>
                ))}
              </TabsList>
            }
            search={
              filterBarReady ? (
                <TicketFilterBar
                  className="w-full"
                  showAssigneeFilter={false}
                  statuses={orgStates}
                />
              ) : (
                <div className={cn("flex w-full flex-col gap-1.5", hasActiveFilters && "pb-1")}>
                  <Skeleton className="h-9 w-full" />
                  {hasActiveFilters && <Skeleton className="h-6 w-2/3" />}
                </div>
              )
            }
            actions={
              showViewSwitcher ? (
                <>
                  <MyWorkSortControl
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSortChange={handleSortChange}
                  />
                  <ViewSwitcher
                    activeView={activeView}
                    onViewChange={handleViewChange}
                    allowedViews={MY_WORK_VIEWS}
                    className="shrink-0"
                  />
                  <DisplayOptionsPanel
                    viewType={activeView}
                    options={displayOptions}
                    onChange={setDisplayOptions}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className={cn(
                      "size-9 shrink-0",
                      showGroupingSidebar && "border-primary bg-primary/10 text-primary",
                    )}
                    aria-label="Toggle grouping sidebar"
                    aria-pressed={showGroupingSidebar}
                    onClick={handleToggleSidebar}
                  >
                    <PanelRight className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : null
            }
          />
        }
      >
        <PmPageShell>
          <PmSection index={0} className={cn(PM_FILL_SECTION, "gap-3")}>
            <div className="flex min-h-0 flex-1 gap-3 overflow-hidden">
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <MyWorkContent
                  pageState={pageState}
                  view={activeView}
                  grouping={grouping}
                  showBucketList={showBucketList}
                  activeData={activeData}
                  kanbanTickets={kanbanTickets}
                  ticketMeta={ticketMeta}
                  dueBuckets={dueBuckets}
                  displayOptions={displayOptions}
                  emptyTitle={emptyTitle}
                  emptyDescription={emptyDescription}
                  filtersActive={filtersActive}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  pageNumber={pageNumber}
                  hasPrevious={hasPrevious}
                  onRetry={handleRetry}
                  onClearFilters={handleClearFilters}
                  onSortChange={handleSortChange}
                  onNextPage={handleNextPage}
                  onPreviousPage={handlePreviousPage}
                  bulk={bulk}
                  orgStatuses={orgStates}
                />
              </div>
              {groupingMounted ? (
                <GroupingSidebar
                  open={showGroupingSidebar}
                  onOpenChange={setShowGroupingSidebar}
                  tickets={activeData?.data}
                  isLoading={isLoading}
                />
              ) : null}
            </div>
          </PmSection>
        </PmPageShell>
      </PageWrapper>
    </Tabs>
  );
}
