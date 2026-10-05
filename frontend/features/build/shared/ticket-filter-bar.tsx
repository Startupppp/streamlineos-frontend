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
  searchInputRef?: RefObject<HTMLInputElement | null>;
  presentation?: "default" | "all-work";
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
  searchInputRef,
  presentation = "default",
}: TicketFilterBarProps) {
  const { localSearch, handleSearchChange } = useTicketFilterParams();

  const searchField = (
    <div
      className={cn(
        "relative min-w-0",
        mobileSearchFirst
          ? "w-full sm:w-[220px] sm:flex-none md:w-[240px]"
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

  const toolbar = mobileSearchFirst ? (
    <div
      className={cn(
        "flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-nowrap sm:items-center sm:gap-1.5",
        align === "end" && !leading ? "sm:justify-end" : "sm:justify-start",
      )}
    >
      <div className="order-1 w-full min-w-0 sm:order-2 sm:w-auto sm:shrink-0">
        {searchField}
      </div>
      <div
        className={cn(
          "order-2 flex w-full min-w-0 flex-wrap items-center gap-1 sm:contents",
          !leading && "justify-end",
        )}
      >
        {leading ? (
          <div className="order-1 min-w-0 sm:flex-none sm:shrink-0">
            {leading}
          </div>
        ) : null}
        <div className="order-3 flex shrink-0 items-center gap-0.5 sm:gap-1">
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
      />
    </div>
  );
}
