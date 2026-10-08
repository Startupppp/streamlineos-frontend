"use client";

import { type ReactNode, type RefObject } from "react";
import { SearchInput } from "@/components/ui/search-input";
import { cn } from "@/lib/utils";
import type { StatusOptionSource } from "@/features/build/shared/types";
import { useTicketFilterParams } from "./use-ticket-filter-params";
import { TicketFilterActions } from "./ticket-filter-actions";
import { TicketFilterChips, type Member, type ProjectOption } from "./ticket-filter-chips";

interface TicketFilterBarProps {
  members?: Member[];
  statuses?: readonly StatusOptionSource[];
  projectId?: number;
  projectOptions?: ProjectOption[];
  showTypeFilter?: boolean;
  showAssigneeFilter?: boolean;
  showDoneToggle?: boolean;
  hideCompleted?: boolean;
  onHideCompletedChange?: (checked: boolean) => void;
  doneCount?: number;
  className?: string;
  align?: "start" | "end";
  leading?: ReactNode;
  trailing?: ReactNode;
  mobileSearchFirst?: boolean;
  mobileSearchFirstBreakpoint?: "sm" | "md" | "lg";
  mobileCompactToolbar?: boolean;
  searchInputRef?: RefObject<HTMLInputElement | null>;
  presentation?: "default" | "all-work";
  hideChipsBelow?: "md" | "lg";
}

export function TicketFilterBar({
  members,
  statuses,
  projectId,
  projectOptions,
  showTypeFilter = true,
  showAssigneeFilter = true,
  showDoneToggle = false,
  hideCompleted,
  onHideCompletedChange,
  doneCount = 0,
  className,
  align = "start",
  leading,
  trailing,
  mobileSearchFirst = false,
  mobileSearchFirstBreakpoint = "sm",
  mobileCompactToolbar = false,
  searchInputRef,
  presentation = "default",
  hideChipsBelow,
}: TicketFilterBarProps) {
  const { localSearch, handleSearchChange } = useTicketFilterParams();

  const searchField = (
    <div
      className={cn(
        "relative min-w-0",
        mobileSearchFirst
          ? MOBILE_SEARCH_FIRST_LAYOUT[mobileSearchFirstBreakpoint].searchField
          : leading
            ? "w-[min(100%,240px)] min-w-[10rem] flex-1 sm:w-[220px] sm:flex-none md:w-[240px]"
            : align === "end"
              ? "w-full max-w-[240px] min-w-[10rem] flex-1 sm:w-[220px] sm:flex-none md:w-[240px]"
              : "w-full max-w-[240px] min-w-[10rem] flex-1 sm:max-w-[220px] md:max-w-[240px]",
      )}
    >
      <SearchInput
        ref={searchInputRef}
        placeholder="Search..."
        value={localSearch}
        onValueChange={handleSearchChange}
        className="[&_svg]:left-2 [&_svg]:h-3.5 [&_svg]:w-3.5"
        inputClassName="h-9 pl-7 pr-7"
      />
    </div>
  );

  const actions = (
    <TicketFilterActions
      presentation={presentation}
      statuses={statuses}
      members={members}
      projectId={projectId}
      projectOptions={projectOptions}
      showTypeFilter={showTypeFilter}
      showAssigneeFilter={showAssigneeFilter}
      showDoneToggle={showDoneToggle}
      hideCompleted={hideCompleted}
      onHideCompletedChange={onHideCompletedChange}
      doneCount={doneCount}
    />
  );

  const toolbar = mobileCompactToolbar ? (
    <div className="flex w-full min-w-0 flex-col gap-2 lg:flex-row lg:flex-nowrap lg:items-center lg:gap-1.5">
      <div className="flex w-full min-w-0 items-center gap-2 lg:contents">
        <div className="min-w-0 flex-1 lg:w-auto lg:flex-none">
          {searchField}
        </div>
        <div className="shrink-0 lg:order-2">{actions}</div>
      </div>
      <div className="flex min-w-0 items-center gap-1 overflow-x-auto overscroll-x-contain scrollbar-hide lg:contents">
        {leading ? <div className="shrink-0">{leading}</div> : null}
        {trailing ? <div className="flex shrink-0 items-center gap-1">{trailing}</div> : null}
      </div>
    </div>
  ) : mobileSearchFirst ? (
    <div
      className={cn(
        "flex w-full min-w-0 flex-col gap-2",
        MOBILE_SEARCH_FIRST_LAYOUT[mobileSearchFirstBreakpoint].toolbar,
        align === "end" && !leading ? "sm:justify-end" : "sm:justify-start",
      )}
    >
      <div
        className={cn(
          "order-1 w-full min-w-0",
          MOBILE_SEARCH_FIRST_LAYOUT[mobileSearchFirstBreakpoint].searchSlot,
        )}
      >
        {searchField}
      </div>
      <div
        className={cn(
          "order-2 flex w-full min-w-0 flex-nowrap items-center gap-1 overflow-x-auto overscroll-x-contain scrollbar-hide",
          MOBILE_SEARCH_FIRST_LAYOUT[mobileSearchFirstBreakpoint].actionsRow,
          !leading && "justify-start",
        )}
      >
        {leading ? (
          <div
            className={cn(
              "order-1 min-w-0",
              MOBILE_SEARCH_FIRST_LAYOUT[mobileSearchFirstBreakpoint].leading,
            )}
          >
            {leading}
          </div>
        ) : null}
        <div
          className={cn(
            "order-3 flex shrink-0 items-center gap-0.5",
            MOBILE_SEARCH_FIRST_LAYOUT[mobileSearchFirstBreakpoint].actions,
          )}
        >
          {actions}
          {trailing}
        </div>
      </div>
    </div>
  ) : (
    <div
      className={cn(
        "flex w-full min-w-0 flex-wrap items-center gap-1 sm:gap-1.5",
        leading
          ? "justify-between"
          : align === "end"
            ? "sm:justify-end"
            : "justify-start",
      )}
    >
      {leading}
      <div
        className={cn(
          "flex min-w-0 items-center gap-0.5 sm:gap-1",
          !leading && align === "end" && "sm:justify-end",
          leading ? "shrink-0" : "flex-1",
        )}
      >
        {searchField}
        {actions}
        {trailing}
      </div>
    </div>
  );

  return (
    <div className={cn("flex w-full min-w-0 flex-col gap-1.5", className)}>
      {toolbar}
      <TicketFilterChips
        members={members}
        projectId={projectId}
        projectOptions={projectOptions}
        className={
          hideChipsBelow === "lg"
            ? "max-lg:hidden"
            : hideChipsBelow === "md"
              ? "max-md:hidden"
              : undefined
        }
      />
    </div>
  );
}

const MOBILE_SEARCH_FIRST_LAYOUT = {
  sm: {
    toolbar: "sm:flex-row sm:flex-nowrap sm:items-center sm:gap-1.5",
    searchField: "sm:w-[220px] sm:flex-none md:w-[240px]",
    searchSlot: "sm:order-2 sm:w-auto sm:shrink-0",
    actionsRow: "sm:contents",
    leading: "sm:flex-none sm:shrink-0",
    actions: "sm:gap-1",
  },
  md: {
    toolbar: "md:flex-row md:flex-nowrap md:items-center md:gap-1.5",
    searchField: "md:w-[220px] md:flex-none lg:w-[240px]",
    searchSlot: "md:order-2 md:w-auto md:shrink-0",
    actionsRow: "md:contents",
    leading: "md:flex-none md:shrink-0",
    actions: "md:gap-1",
  },
  lg: {
    toolbar: "lg:flex-row lg:flex-nowrap lg:items-center lg:gap-1.5",
    searchField: "lg:w-[220px] lg:flex-none xl:w-[240px]",
    searchSlot: "lg:order-2 lg:w-auto lg:shrink-0",
    actionsRow: "lg:contents",
    leading: "lg:flex-none lg:shrink-0",
    actions: "lg:gap-1",
  },
} as const;
