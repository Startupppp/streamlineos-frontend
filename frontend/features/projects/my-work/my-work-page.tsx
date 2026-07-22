"use client";

import { useMemo, useCallback, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PmPageShell, PmSection } from "@/features/projects/shared/pm-chrome";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { TicketFilterBar } from "@/features/projects/shared/ticket-filter-bar";
import { ViewSwitcher } from "@/features/projects/views/view-switcher";
import { DisplayOptionsPanel } from "@/features/projects/views/display-options-panel";
import { useDisplayOptions } from "@/features/projects/views/use-display-options";
import { Button } from "@/components/ui/button";
import { PanelRight } from "lucide-react";
import { useAllWork } from "@/hooks/api/projects/all-work";
import type { AllWorkTicket } from "@/types/projects";
import { cn } from "@/lib/utils";
import { isPast, isToday, parseISO } from "date-fns";
import { MY_WORK_VIEWS, parseMyWorkView } from "./my-work-view";
import { MyWorkViewBody } from "./my-work-view-body";
import { GroupingSidebar } from "./grouping-sidebar";
import { mapAllWorkTicketToKanban, buildTicketMetaMap } from "./map-all-work-ticket";
import { BucketSection, AllWorkListSkeleton, BUCKET_ORDER } from "./my-work-rows";
import type { DueBucket } from "./my-work-rows";

const DISPLAY_STORAGE_ID = -1;

type WorkTab = "assigned" | "created" | "subscribed" | "activity";

const TAB_CONFIG: Record<WorkTab, { label: string }> = {
  assigned: { label: "Assigned" },
  created: { label: "Created" },
  subscribed: { label: "Subscribed" },
  activity: { label: "Activity" },
};

const WORK_TABS: readonly WorkTab[] = [
  "assigned",
  "created",
  "subscribed",
  "activity",
];

function parseWorkTab(value: string | null): WorkTab {
  if (
    value === "created" ||
    value === "subscribed" ||
    value === "activity"
  )
    return value;
  return "assigned";
}

function getDueBucket(dueDate: string | null): DueBucket {
  if (!dueDate) return "none";
  try {
    const d = parseISO(dueDate);
    if (isToday(d)) return "today";
    if (isPast(d)) return "overdue";
    return "upcoming";
  } catch {
    return "none";
  }
}

function buildAllWorkFilters(params: URLSearchParams) {
  const q = params.get("q") ?? "";
  const status = params.get("status") ?? "";
  const priority = params.get("priority") ?? "";
  const type = params.get("type") ?? "";
  const assigneeId = params.get("assigneeId") ?? "";
  const labels = params.get("labels") ?? "";
  const projectIds = params.get("projectIds") ?? "";
  return {
    ...(q ? { search: q } : {}),
    ...(status ? { status } : {}),
    ...(priority ? { priority } : {}),
    ...(type ? { type } : {}),
    ...(assigneeId ? { assigneeId } : {}),
    ...(labels ? { labelIds: labels } : {}),
    ...(projectIds ? { projectIds } : {}),
  };
}

function toDueBucketMap(
  tickets: AllWorkTicket[],
): Record<DueBucket, AllWorkTicket[]> {
  const buckets: Record<DueBucket, AllWorkTicket[]> = {
    overdue: [],
    today: [],
    upcoming: [],
    none: [],
  };
  for (const t of tickets) {
    buckets[getDueBucket(t.dueDate)].push(t);
  }
  return buckets;
}

export function MyWorkPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rawTab = searchParams.get("tab");
  const activeTab = parseWorkTab(rawTab);
  const rawView = searchParams.get("view");
  const activeView = parseMyWorkView(rawView);

  const [showGroupingSidebar, setShowGroupingSidebar] = useState(false);
  const [displayOptions, setDisplayOptions] = useDisplayOptions(DISPLAY_STORAGE_ID);

  const extraFilters = useMemo(
    () => buildAllWorkFilters(searchParams),
    [searchParams],
  );

  const assignedFilters = useMemo(
    () => ({ scope: "mine" as const, ...extraFilters, limit: 100 }),
    [extraFilters],
  );
  const createdFilters = useMemo(
    () => ({
      scope: "created" as const,
      ...extraFilters,
      orderBy: "created" as const,
      orderDir: "desc" as const,
      limit: 100,
    }),
    [extraFilters],
  );
  const subscribedFilters = useMemo(
    () => ({
      scope: "subscribed" as const,
      ...extraFilters,
      orderBy: "updated" as const,
      orderDir: "desc" as const,
      limit: 100,
    }),
    [extraFilters],
  );
  const activityFilters = useMemo(
    () => ({
      scope: "mine" as const,
      ...extraFilters,
      orderBy: "updated" as const,
      orderDir: "desc" as const,
      limit: 100,
    }),
    [extraFilters],
  );

  const {
    data: assignedData,
    isLoading: assignedLoading,
    isError: assignedError,
    refetch: refetchAssigned,
  } = useAllWork(assignedFilters, { enabled: activeTab === "assigned" });

  const {
    data: createdData,
    isLoading: createdLoading,
    isError: createdError,
    refetch: refetchCreated,
  } = useAllWork(createdFilters, { enabled: activeTab === "created" });

  const {
    data: subscribedData,
    isLoading: subscribedLoading,
    isError: subscribedError,
    refetch: refetchSubscribed,
  } = useAllWork(subscribedFilters, { enabled: activeTab === "subscribed" });

  const {
    data: activityData,
    isLoading: activityLoading,
    isError: activityError,
    refetch: refetchActivity,
  } = useAllWork(activityFilters, { enabled: activeTab === "activity" });

  const isLoading =
    activeTab === "assigned"
      ? assignedLoading
      : activeTab === "created"
        ? createdLoading
        : activeTab === "subscribed"
          ? subscribedLoading
          : activityLoading;

  const isError =
    activeTab === "assigned"
      ? assignedError
      : activeTab === "created"
        ? createdError
        : activeTab === "subscribed"
          ? subscribedError
          : activityError;

  const activeData =
    activeTab === "assigned"
      ? assignedData
      : activeTab === "created"
        ? createdData
        : activeTab === "subscribed"
          ? subscribedData
          : activityData;

  const handleRetry = useCallback(() => {
    if (activeTab === "assigned") void refetchAssigned();
    else if (activeTab === "created") void refetchCreated();
    else if (activeTab === "subscribed") void refetchSubscribed();
    else void refetchActivity();
  }, [activeTab, refetchAssigned, refetchCreated, refetchSubscribed, refetchActivity]);

  const handleTabChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "assigned") {
        params.delete("tab");
      } else {
        params.set("tab", value);
      }
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
      if (next === "list") {
        params.delete("view");
      } else {
        params.set("view", next);
      }
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
    setShowGroupingSidebar((prev) => !prev);
  }

  const kanbanTickets = useMemo(() => {
    if (!activeData?.data) return [];
    return activeData.data.map(mapAllWorkTicketToKanban);
  }, [activeData]);

  const ticketMeta = useMemo(() => {
    if (!activeData?.data) return buildTicketMetaMap([]);
    return buildTicketMetaMap(activeData.data);
  }, [activeData]);

  const dueBuckets = useMemo(() => {
    if (activeTab !== "assigned" || activeView !== "list") return null;
    if (!activeData?.data) return null;
    return toDueBucketMap(activeData.data);
  }, [activeTab, activeView, activeData]);

  const showViewSwitcher = activeTab === "assigned";
  const showBucketList = activeTab === "assigned" && activeView === "list";

  const emptyTitle =
    activeTab === "created"
      ? "No tickets created by you"
      : activeTab === "subscribed"
        ? "No subscribed tickets"
        : activeTab === "activity"
          ? "No recently updated tickets"
          : "Nothing assigned to you";

  const emptyDescription =
    activeTab === "created"
      ? "Tickets you reported or created across all projects will appear here."
      : activeTab === "subscribed"
        ? "Tickets you are watching will appear here."
        : activeTab === "activity"
          ? "Your recently updated assigned tickets will appear here."
          : "Tickets assigned to you across all projects will appear here.";

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
        filtersClassName="flex-col items-stretch gap-2 overflow-x-visible pb-2 md:w-full md:flex-row md:flex-nowrap md:items-center md:justify-between md:gap-2"
        filters={
          <>
            <div className="min-w-0 w-full overflow-x-auto scrollbar-hide md:w-auto md:shrink-0">
              <TabsList>
                {WORK_TABS.map((tab) => (
                  <TabsTrigger key={tab} value={tab}>
                    {TAB_CONFIG[tab].label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            <div className="flex min-w-0 w-full items-center gap-2 md:ml-auto md:w-auto md:max-w-full md:shrink-0">
              <TicketFilterBar
                className="min-w-0 w-full md:w-auto"
                showSprintFilter={false}
                showAssigneeFilter={false}
                align="end"
                mobileSearchFirst
                leading={
                  showViewSwitcher ? (
                    <ViewSwitcher
                      activeView={activeView}
                      onViewChange={handleViewChange}
                      allowedViews={MY_WORK_VIEWS}
                    />
                  ) : undefined
                }
                trailing={
                  <>
                    {showViewSwitcher ? (
                      <DisplayOptionsPanel
                        viewType={activeView}
                        options={displayOptions}
                        onChange={handleDisplayOptionsChange}
                      />
                    ) : null}
                    {groupingSidebarButton}
                  </>
                }
              />
            </div>
          </>
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
                    description={emptyDescription}
                    className={CONTENT_FILL_PANEL}
                  />
                ) : showBucketList ? (
                  <div className="flex flex-col gap-3 overflow-y-auto">
                    {BUCKET_ORDER.map((bucket) => {
                      const items =
                        dueBuckets?.[bucket]?.map((t) => ({
                          id: t.id,
                          projectId: t.projectId,
                          projectName: t.projectName,
                          projectKey: t.projectKey,
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

              <GroupingSidebar
                open={showGroupingSidebar}
                onOpenChange={setShowGroupingSidebar}
                tickets={activeData?.data}
                isLoading={isLoading}
              />
            </div>
          </PmSection>
        </PmPageShell>
      </PageWrapper>
    </Tabs>
  );
}
