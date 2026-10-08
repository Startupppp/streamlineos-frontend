"use client";

import { type MouseEvent, type RefObject, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  TabsNavigation,
  TabsNavigationLink,
} from "@/components/ui/tabs";
import { PageTabsToolbar } from "@/components/ui/page-tabs-toolbar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PmPageShell,
  PmSection,
  PM_FILL_SECTION,
} from "@/components/pm-chrome";
import type { ViewType } from "@/features/build/views/view-switcher";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useNavigationLeave } from "@/components/shared/dirty-state-context";
import { useAfterLoad } from "@/hooks/common/use-after-load";
import { useIsBelowLg } from "@/hooks/common/use-mobile";
import { parseWorkTab, TAB_CONFIG, type WorkTab } from "./my-work-data-model";
import { MyWorkToolbarActions } from "./my-work-toolbar-actions";
import type {
  DisplayOptions,
  StatusOptionSource,
} from "@/features/build/shared/types";
import type {
  BuildListSortField,
  BuildListSortDirection,
} from "@/features/build/shared/use-build-list-url-state";

const TicketFilterBar = dynamic(
  () =>
    import("@/features/build/shared/ticket-filter-bar").then((m) => ({
      default: m.TicketFilterBar,
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
  ticketsParams.delete("draftCursors");
  const draftsParams = new URLSearchParams(searchParams.toString());
  draftsParams.delete("draftCursors");
  draftsParams.set("section", "drafts");
  const ticketQuery = ticketsParams.toString();
  const ticketsHref = ticketQuery
    ? `/build/my-work?${ticketQuery}`
    : "/build/my-work";
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
        <Link href={ticketsHref} onClick={handleTicketsNavigate}>
          Tickets
        </Link>
      </TabsNavigationLink>
      <TabsNavigationLink active={activeSection === "drafts"}>
        <Link href={draftsHref} onClick={handleDraftsNavigate}>
          Drafts
        </Link>
      </TabsNavigationLink>
    </TabsNavigation>
  );
}

export function MyWorkDraftsPage() {
  return (
    <PageWrapper
      title="Comment drafts"
      subtitle="Resume your saved ticket comments"
      noInternalScroll
      actions={<MyWorkSectionNavigation activeSection="drafts" />}
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
  activeTab: WorkTab;
  activeView: ViewType;
  hasActiveFilters: boolean;
  showViewSwitcher: boolean;
  sortField: BuildListSortField;
  sortDirection: BuildListSortDirection;
  orgStates: readonly StatusOptionSource[] | undefined;
  displayOptions: DisplayOptions;
  showGroupingSidebar: boolean;
  searchInputRef: RefObject<HTMLInputElement | null>;
  onTabChange: (next: WorkTab) => void;
  onSortChange: (
    field: BuildListSortField,
    direction: BuildListSortDirection,
  ) => void;
  onViewChange: (next: ViewType) => void;
  onDisplayOptionsChange: (next: DisplayOptions) => void;
  onToggleSidebar: () => void;
}

export function MyWorkTicketsFilters({
  activeTab,
  activeView,
  hasActiveFilters,
  showViewSwitcher,
  sortField,
  sortDirection,
  orgStates,
  displayOptions,
  showGroupingSidebar,
  searchInputRef,
  onTabChange,
  onSortChange,
  onViewChange,
  onDisplayOptionsChange,
  onToggleSidebar,
}: MyWorkTicketsFiltersProps) {
  const filterBarReady = useAfterLoad();
  const isBelowLg = useIsBelowLg();
  const [desktopSearchExpanded, setDesktopSearchExpanded] = useState(false);
  function handleFocusChange(value: string) {
    onTabChange(parseWorkTab(value));
  }

  return (
    <div className="h-auto min-w-0 flex-none">
      <PageTabsToolbar
        tabsDensity="icons"
        className="h-auto flex-col items-stretch lg:flex-row lg:flex-nowrap lg:items-center"
        searchClassName="!min-w-0 !flex-none !basis-auto lg:!min-w-[12rem] lg:!flex-1 lg:!basis-0"
        tabs={
          <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto_auto] gap-2 lg:flex lg:w-auto lg:flex-none lg:items-center">
            <Select value={activeTab} onValueChange={handleFocusChange}>
              <SelectTrigger
                aria-label="Work scope"
                className="h-9 w-full min-w-0 bg-muted/35 px-3 font-medium lg:w-40"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectGroup>
                  <SelectLabel>Ownership</SelectLabel>
                  {RELATION_TABS.map((tab) => (
                    <SelectItem key={tab} value={tab}>
                      {TAB_CONFIG[tab].label}
                    </SelectItem>
                  ))}
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Focused work</SelectLabel>
                  {FOCUS_TABS.map((tab) => (
                    <SelectItem key={tab} value={tab}>
                      {TAB_CONFIG[tab].label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {filterBarReady ? (
              <TicketFilterBar
                className="w-full flex-1 shrink-0 lg:w-auto lg:flex-none"
                showSearch={false}
                showChips={false}
                iconOnlyFilters
                desktopIconOnlyFilters
                showAssigneeFilter={false}
                statuses={orgStates}
                presentation="all-work"
              />
            ) : (
              <Skeleton className="size-9 shrink-0" />
            )}
            <MyWorkToolbarActions
              activeView={activeView}
              displayOptions={displayOptions}
              showGroupingSidebar={showGroupingSidebar}
              showViewSwitcher={showViewSwitcher}
              sortDirection={sortDirection}
              sortField={sortField}
              onDisplayOptionsChange={onDisplayOptionsChange}
              onSortChange={onSortChange}
              onToggleSidebar={onToggleSidebar}
              onViewChange={onViewChange}
            />
          </div>
        }
        search={
          filterBarReady ? (
            <TicketFilterBar
              className="w-full"
              showFilters={false}
              showChips={false}
              fillSearch
              collapsibleSearch={!isBelowLg}
              searchExpanded={isBelowLg || desktopSearchExpanded}
              onSearchExpandedChange={setDesktopSearchExpanded}
              showAssigneeFilter={false}
              statuses={orgStates}
              presentation="all-work"
              searchInputRef={searchInputRef}
            />
          ) : (
            <div
              className={cn(
                "flex w-full flex-col gap-1.5",
                hasActiveFilters && "pb-1",
              )}
            >
              <Skeleton className="h-9 w-full" />
              {hasActiveFilters && <Skeleton className="h-6 w-2/3" />}
            </div>
          )
        }
      />
    </div>
  );
}

const RELATION_TABS = ["assigned", "created", "subscribed"] as const;
const FOCUS_TABS = [
  "overdue",
  "due-soon",
  "today",
  "upcoming",
  "activity",
  "blocked",
  "waiting",
  "done",
] as const satisfies readonly WorkTab[];
