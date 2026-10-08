"use client";

import { type MouseEvent, type RefObject } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  TabsList,
  TabsTrigger,
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
import {
  ViewSwitcher,
  type ViewType,
} from "@/features/build/views/view-switcher";
import { Button } from "@/components/ui/button";
import { PanelRight } from "lucide-react";
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
import { MY_WORK_VIEWS } from "./my-work-view";
import { MyWorkSortControl } from "./my-work-sort-control";
import { parseWorkTab, TAB_CONFIG, type WorkTab } from "./my-work-data-model";
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
const DisplayOptionsPanel = dynamic(
  () =>
    import("@/features/build/views/display-options-panel").then((m) => ({
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
  const focusedTab = isFocusTab(activeTab) ? activeTab : "focus";

  function handleFocusChange(value: string) {
    onTabChange(parseWorkTab(value));
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <PageTabsToolbar
        className="rounded-xl border border-border/80 bg-card/55 p-2 shadow-sm md:!flex-col md:!items-stretch 2xl:!flex-row 2xl:!items-center 2xl:!flex-nowrap"
        searchClassName="md:basis-auto 2xl:basis-[14rem]"
        tabs={
          <>
            <Select value={activeTab} onValueChange={handleFocusChange}>
              <SelectTrigger
                aria-label="Work scope"
                className="h-10 w-full bg-muted/35 px-3 font-medium md:hidden"
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
            <div className="hidden min-w-0 items-center gap-1.5 md:flex">
              <TabsList className="w-auto min-w-0 flex-1 md:flex-none">
                {RELATION_TABS.map((tab) => (
                  <TabsTrigger
                    key={tab}
                    value={tab}
                    className="px-1.5 text-xs sm:px-3 sm:text-sm"
                  >
                    {TAB_CONFIG[tab].label}
                  </TabsTrigger>
                ))}
              </TabsList>
              <Select value={focusedTab} onValueChange={handleFocusChange}>
                <SelectTrigger
                  aria-label="Focused work"
                  className={cn(
                    "h-9 w-[7.25rem] shrink-0 px-2 text-xs sm:w-[7.75rem] sm:text-sm",
                    focusedTab !== "focus" &&
                      "border-primary/40 bg-primary/[0.06] text-foreground",
                  )}
                >
                  <SelectValue placeholder="Focus" />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectGroup>
                    <SelectLabel>Focused work</SelectLabel>
                    <SelectItem value="focus" disabled>
                      Focus
                    </SelectItem>
                    {FOCUS_TABS.map((tab) => (
                      <SelectItem key={tab} value={tab}>
                        {TAB_CONFIG[tab].label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </>
        }
        search={
          filterBarReady ? (
            <TicketFilterBar
              className="w-full"
              showAssigneeFilter={false}
              statuses={orgStates}
              presentation="all-work"
              searchInputRef={searchInputRef}
              mobileSearchFirst
              mobileSearchFirstBreakpoint="lg"
              mobileCompactToolbar
              hideChipsBelow="lg"
              trailing={
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
              }
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

interface MyWorkToolbarActionsProps {
  activeView: ViewType;
  displayOptions: DisplayOptions;
  showGroupingSidebar: boolean;
  showViewSwitcher: boolean;
  sortDirection: BuildListSortDirection;
  sortField: BuildListSortField;
  onDisplayOptionsChange: (next: DisplayOptions) => void;
  onSortChange: (
    field: BuildListSortField,
    direction: BuildListSortDirection,
  ) => void;
  onToggleSidebar: () => void;
  onViewChange: (next: ViewType) => void;
}

function MyWorkToolbarActions({
  activeView,
  displayOptions,
  showGroupingSidebar,
  showViewSwitcher,
  sortDirection,
  sortField,
  onDisplayOptionsChange,
  onSortChange,
  onToggleSidebar,
  onViewChange,
}: MyWorkToolbarActionsProps) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <MyWorkSortControl
        sortField={sortField}
        sortDirection={sortDirection}
        onSortChange={onSortChange}
      />
      {showViewSwitcher ? (
        <>
          <ViewSwitcher
            activeView={activeView}
            onViewChange={onViewChange}
            allowedViews={MY_WORK_VIEWS}
            iconOnly
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
              "hidden size-9 shrink-0 md:inline-flex",
              showGroupingSidebar &&
                "border-foreground bg-foreground text-background",
            )}
            aria-label="Toggle grouping sidebar"
            aria-pressed={showGroupingSidebar}
            onClick={onToggleSidebar}
          >
            <PanelRight className="h-3.5 w-3.5" />
          </Button>
        </>
      ) : null}
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

type FocusTab = (typeof FOCUS_TABS)[number];

function isFocusTab(tab: WorkTab): tab is FocusTab {
  return tab !== "assigned" && tab !== "created" && tab !== "subscribed";
}
