"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageTabsToolbar } from "@/components/ui/page-tabs-toolbar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { PmPageShell, PmSection } from "@/components/pm-chrome";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { ViewSwitcher } from "@/features/build/views/view-switcher";
import { DisplayOptionsPanel } from "@/features/build/views/display-options-panel";
import { useDisplayOptions } from "@/features/build/views/use-display-options";
import { Button } from "@/components/ui/button";
import { PanelRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAfterLoad } from "@/hooks/common/use-after-load";
import { useOrgCustomStates } from "@/hooks/api/build/custom-states";
import { MY_WORK_VIEWS } from "./my-work-view";
import { MyWorkViewBody } from "./my-work-view-body-lazy";
import { BucketSection, AllWorkListSkeleton, BUCKET_ORDER } from "./my-work-rows";
import {
  useMyWorkData,
  parseWorkTab,
  parseMyWorkView,
  WORK_TABS,
  TAB_CONFIG,
  MY_WORK_FILTER_PARAMS,
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

const DISPLAY_STORAGE_ID = -1;

interface MyWorkPageProps {
  pmWorkspaceId?: string;
}

export function MyWorkPage({ pmWorkspaceId }: MyWorkPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeTab = parseWorkTab(searchParams.get("tab"));
  const activeView = parseMyWorkView(searchParams.get("view"));

  const [showGroupingSidebar, setShowGroupingSidebar] = useState(false);
  const [groupingMounted, setGroupingMounted] = useState(false);
  const [displayOptions, setDisplayOptions] = useDisplayOptions(DISPLAY_STORAGE_ID);
  const filterBarReady = useAfterLoad();
  const { data: orgStates } = useOrgCustomStates();

  const {
    hasActiveFilters,
    isLoading,
    isError,
    activeData,
    handleRetry,
    filtersActive,
    handleClearFilters,
    kanbanTickets,
    ticketMeta,
    dueBuckets,
    showViewSwitcher,
    showBucketList,
    emptyTitle,
    emptyDescription,
  } = useMyWorkData({ activeTab, activeView, pmWorkspaceId });

  const handleTabChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "assigned") params.delete("tab");
      else params.set("tab", value);
      params.delete("view");
      router.replace(
        params.toString() ? `${pathname}?${params.toString()}` : pathname,
        { scroll: false },
      );
    },
    [router, pathname, searchParams],
  );

  const handleViewChange = useCallback(
    (next: string) => {
      if (!MY_WORK_VIEWS.includes(next as (typeof MY_WORK_VIEWS)[number])) return;
      const params = new URLSearchParams(searchParams.toString());
      if (next === "list") params.delete("view");
      else params.set("view", next);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const handleDisplayOptionsChange = useCallback(
    (opts: typeof displayOptions) => {
      setDisplayOptions(opts);
    },
    [setDisplayOptions],
  );

  function handleToggleSidebar() {
    setGroupingMounted(true);
    setShowGroupingSidebar((prev) => !prev);
  }

  const groupingSidebarButton = (
    <Button
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
  );

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden"
    >
      <PageWrapper
        title="My Issues"
        subtitle="Your tickets across all projects"
        noInternalScroll
        filtersClassName="flex-col items-stretch gap-0 overflow-visible pb-2 [&>*]:w-full [&>*]:min-w-0 [&>*]:shrink"
        filters={
          <PageTabsToolbar
            tabs={
              <TabsList>
                {WORK_TABS.map((tab) => (
                  <TabsTrigger key={tab} value={tab}>
                    {TAB_CONFIG[tab].label}
                  </TabsTrigger>
                ))}
              </TabsList>
            }
            filters={() =>
              filterBarReady ? (
                <TicketFilterBar
                  showSprintFilter={false}
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
                  <ViewSwitcher
                    activeView={activeView}
                    onViewChange={handleViewChange}
                    allowedViews={MY_WORK_VIEWS}
                    className="shrink-0"
                  />
                  <DisplayOptionsPanel
                    viewType={activeView}
                    options={displayOptions}
                    onChange={handleDisplayOptionsChange}
                  />
                  {groupingSidebarButton}
                </>
              ) : null
            }
          />
        }
      >
        <PmPageShell className="min-h-0 flex-1 overflow-hidden">
          <PmSection
            index={0}
            className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden"
          >
            <div className="flex min-h-0 flex-1 gap-3 overflow-hidden">
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                {isLoading ? (
                  <AllWorkListSkeleton />
                ) : isError ? (
                  <ErrorState
                    className="min-h-[14rem]"
                    title="Failed to load your issues"
                    description="Could not fetch tickets. Please try again."
                    onRetry={handleRetry}
                  />
                ) : !activeData?.data || activeData.data.length === 0 ? (
                  <EmptyState
                    illustrationPreset="projects"
                    title={emptyTitle}
                    description={filtersActive ? undefined : emptyDescription}
                    filtersActive={filtersActive}
                    onClearFilters={handleClearFilters}
                    className={CONTENT_FILL_PANEL}
                  />
                ) : showBucketList ? (
                  <ScrollArea className="min-h-0 flex-1" hideScrollbar>
                    <div className="flex flex-col gap-3">
                      {BUCKET_ORDER.map((bucket) => {
                        const items =
                          dueBuckets?.[bucket]?.map((t) => ({
                            id: t.id,
                            projectId: t.projectId ?? 0,
                            projectName: t.projectName ?? "",
                            projectKey: t.projectKey ?? "",
                            ticketNumber: t.ticketNumber,
                            title: t.title,
                            status: t.status,
                            priority: t.priority,
                            type: t.type,
                            dueDate: t.dueDate,
                          })) ?? [];
                        if (items.length === 0) return null;
                        return (
                          <BucketSection key={bucket} bucket={bucket} items={items} />
                        );
                      })}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <MyWorkViewBody
                      view={activeView}
                      tickets={kanbanTickets}
                      displayOptions={displayOptions}
                      ticketMeta={ticketMeta}
                    />
                  </div>
                )}
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
