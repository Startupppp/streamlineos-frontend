"use client";

import { type Dispatch, type MouseEvent, type SetStateAction } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { TabsList, TabsTrigger, TabsNavigation, TabsNavigationLink } from "@/components/ui/tabs";
import { PageTabsToolbar } from "@/components/ui/page-tabs-toolbar";
import { Skeleton } from "@/components/ui/skeleton";
import { PmPageShell, PmSection, PM_FILL_SECTION } from "@/components/pm-chrome";
import { ViewSwitcher, type ViewType } from "@/features/build/views/view-switcher";
import { Button } from "@/components/ui/button";
import { PanelRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigationLeave } from "@/components/shared/dirty-state-context";
import { useAfterLoad } from "@/hooks/common/use-after-load";
import { MY_WORK_VIEWS } from "./my-work-view";
import { MyWorkSortControl } from "./my-work-sort-control";
import { WORK_TABS, TAB_CONFIG } from "./my-work-data-model";
import type { DisplayOptions, StatusOptionSource } from "@/features/build/shared/types";

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
const InboxDraftsPanel = dynamic(
  () =>
    import("@/features/build/inbox/inbox-drafts-panel").then((m) => ({
      default: m.InboxDraftsPanel,
    })),
  { ssr: false },
);

export function MyWorkSectionNavigation({
  activeSection,
}: {
  activeSection: "tickets" | "drafts";
}) {
  const router = useRouter();
  const requestLeave = useNavigationLeave();
  const searchParams = useSearchParams();
  const ticketsParams = new URLSearchParams(searchParams.toString());
  ticketsParams.delete("section");
  const draftsParams = new URLSearchParams(searchParams.toString());
  draftsParams.set("section", "drafts");
  const ticketQuery = ticketsParams.toString();
  const ticketsHref = ticketQuery ? `/build/my-work?${ticketQuery}` : "/build/my-work";
  const draftsHref = `/build/my-work?${draftsParams}`;

  function handleNavigate(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    requestLeave(() => router.push(href, { scroll: false }));
  }

  function handleTicketsNavigate(event: MouseEvent<HTMLAnchorElement>) {
    handleNavigate(event, ticketsHref);
  }

  function handleDraftsNavigate(event: MouseEvent<HTMLAnchorElement>) {
    handleNavigate(event, draftsHref);
  }

  return (
    <TabsNavigation aria-label="My Work sections">
      <TabsNavigationLink active={activeSection === "tickets"}>
        <Link href={ticketsHref} onClick={handleTicketsNavigate}>Tickets</Link>
      </TabsNavigationLink>
      <TabsNavigationLink active={activeSection === "drafts"}>
        <Link href={draftsHref} onClick={handleDraftsNavigate}>Drafts</Link>
      </TabsNavigationLink>
    </TabsNavigation>
  );
}

export function MyWorkDraftsPage() {
  return (
    <PageWrapper
      title="My Work"
      subtitle="Your tickets and saved comment drafts"
      noInternalScroll
      filters={<MyWorkSectionNavigation activeSection="drafts" />}
    >
      <PmPageShell>
        <PmSection index={0} className={cn(PM_FILL_SECTION, "overflow-hidden")}>
          <InboxDraftsPanel />
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}

interface MyWorkTicketsFiltersProps {
  activeView: ViewType;
  hasActiveFilters: boolean;
  showViewSwitcher: boolean;
  sortField: string;
  sortDirection: "asc" | "desc";
  orgStates: readonly StatusOptionSource[] | undefined;
  displayOptions: DisplayOptions;
  showGroupingSidebar: boolean;
  onSortChange: (field: string, direction: "asc" | "desc") => void;
  onViewChange: (next: ViewType) => void;
  onDisplayOptionsChange: Dispatch<SetStateAction<DisplayOptions>>;
  onToggleSidebar: () => void;
}

export function MyWorkTicketsFilters({
  activeView,
  hasActiveFilters,
  showViewSwitcher,
  sortField,
  sortDirection,
  orgStates,
  displayOptions,
  showGroupingSidebar,
  onSortChange,
  onViewChange,
  onDisplayOptionsChange,
  onToggleSidebar,
}: MyWorkTicketsFiltersProps) {
  const filterBarReady = useAfterLoad();

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <MyWorkSectionNavigation activeSection="tickets" />
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
                onSortChange={onSortChange}
              />
              <ViewSwitcher
                activeView={activeView}
                onViewChange={onViewChange}
                allowedViews={MY_WORK_VIEWS}
                className="shrink-0"
              />
              <DisplayOptionsPanel
                viewType={activeView}
                options={displayOptions}
                onChange={onDisplayOptionsChange}
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
                onClick={onToggleSidebar}
              >
                <PanelRight className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : null
        }
      />
    </div>
  );
}
