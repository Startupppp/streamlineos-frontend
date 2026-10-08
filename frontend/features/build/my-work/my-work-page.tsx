"use client";

import { useCallback, useMemo, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { Tabs } from "@/components/ui/tabs";
import {
  PmPageShell,
  PmSection,
  PM_FILL_SECTION,
} from "@/components/pm-chrome";
import type { ViewType } from "@/features/build/views/view-switcher";
import { useDisplayOptions } from "@/features/build/views/use-display-options";
import { cn } from "@/lib/utils";
import { useOrgCustomStates } from "@/hooks/api/build/custom-states";
import { useMyWorkBulk } from "./use-my-work-bulk";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";
import { useNavigationLeave } from "@/components/shared/dirty-state-context";
import {
  buildMyWorkReturnHref,
  getMyWorkTicketHref,
} from "@/features/build/ticket-details/build-ticket-detail-url";
import {
  useMyWorkData,
  parseWorkTab,
  parseMyWorkView,
} from "./use-my-work-data";
import {
  MyWorkDraftsPage,
  MyWorkSectionNavigation,
  MyWorkTicketsFilters,
} from "./my-work-sections";

const GroupingSidebar = dynamic(
  () =>
    import("./grouping-sidebar").then((m) => ({ default: m.GroupingSidebar })),
  { ssr: false, loading: () => null },
);
const MyWorkContent = dynamic(
  () => import("./my-work-content").then((m) => ({ default: m.MyWorkContent })),
  { loading: () => null },
);

const DISPLAY_STORAGE_ID = -1;

export function MyWorkPage() {
  const searchParams = useSearchParams();
  return searchParams.get("section") === "drafts" ? (
    <MyWorkDraftsPage />
  ) : (
    <MyWorkTicketsPage />
  );
}

function MyWorkTicketsPage() {
  const router = useRouter();
  const requestLeave = useNavigationLeave();
  const searchParams = useSearchParams();
  const returnHref = buildMyWorkReturnHref(searchParams);

  const activeTab = parseWorkTab(
    searchParams.get("relation") ?? searchParams.get("tab"),
  );
  const activeView = parseMyWorkView(searchParams.get("view"));

  const [showGroupingSidebar, setShowGroupingSidebar] = useState(false);
  const [groupingMounted, setGroupingMounted] = useState(false);
  const [displayOptions, setDisplayOptions] =
    useDisplayOptions(DISPLAY_STORAGE_ID);
  const { data: orgStates } = useOrgCustomStates();
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const {
    hasActiveFilters,
    isLoading,
    isError,
    error,
    isEmpty,
    activeData,
    boardFilters,
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
            router.push(
              getMyWorkTicketHref(
                meta.projectId,
                meta.projectKey,
                meta.ticketNumber,
                returnHref,
              ),
            ),
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
      const relation =
        value === "assigned"
          ? null
          : value === "subscribed"
            ? "watching"
            : value;
      setListParams({
        relation,
        tab: null,
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
        <PageState
          resolution={pageState}
          loading={null}
          onRetry={handleRetry}
          className="flex-1"
        >
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
        actions={<MyWorkSectionNavigation activeSection="tickets" />}
        noInternalScroll
        filtersClassName="flex-col items-stretch gap-0 overflow-visible pb-2 [&>*]:w-full [&>*]:min-w-0 [&>*]:shrink"
        filters={
          <MyWorkTicketsFilters
            activeTab={activeTab}
            activeView={activeView}
            hasActiveFilters={hasActiveFilters}
            showViewSwitcher={showViewSwitcher}
            sortField={sortField}
            sortDirection={sortDirection}
            orgStates={orgStates}
            displayOptions={displayOptions}
            showGroupingSidebar={showGroupingSidebar}
            searchInputRef={searchInputRef}
            onTabChange={handleTabChange}
            onSortChange={handleSortChange}
            onViewChange={handleViewChange}
            onDisplayOptionsChange={setDisplayOptions}
            onToggleSidebar={handleToggleSidebar}
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
                  boardFilters={boardFilters}
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
