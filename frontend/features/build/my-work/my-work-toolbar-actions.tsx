"use client";

import { EllipsisIcon, LayoutListIcon } from "@animateicons/react/lucide";
import { useState } from "react";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsBelowLg } from "@/hooks/common/use-mobile";
import { cn } from "@/lib/utils";
import type {
  BuildListSortDirection,
  BuildListSortField,
} from "@/features/build/shared/use-build-list-url-state";
import type { DisplayOptions } from "@/features/build/shared/types";
import { DisplayOptionsContent } from "@/features/build/views/display-options-content";
import { DisplayOptionsPanel } from "@/features/build/views/display-options-panel";
import { ViewSwitcher, type ViewType } from "@/features/build/views/view-switcher";
import { MY_WORK_VIEWS } from "./my-work-view";
import { MyWorkSortControl } from "./my-work-sort-control";

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

function GroupingSidebarButton({
  showGroupingSidebar,
  labeled,
  onToggleSidebar,
}: {
  showGroupingSidebar: boolean;
  labeled: boolean;
  onToggleSidebar: () => void;
}) {
  return (
    <AnimatedIconButton
      type="button"
      icon={LayoutListIcon}
      iconSize={14}
      variant="outline"
      size={labeled ? "sm" : "icon"}
      className={cn(
        labeled ? "w-full justify-start gap-2" : "size-9 shrink-0",
        showGroupingSidebar && "border-primary bg-primary/10 text-primary",
      )}
      aria-label="Toggle grouping sidebar"
      aria-pressed={showGroupingSidebar}
      onClick={onToggleSidebar}
    >
      {labeled ? "Grouping sidebar" : null}
    </AnimatedIconButton>
  );
}

function DesktopActions(props: MyWorkToolbarActionsProps) {
  return (
    <div className="flex shrink-0 items-center gap-1" data-testid="desktop-work-actions">
      <MyWorkSortControl
        sortField={props.sortField}
        sortDirection={props.sortDirection}
        onSortChange={props.onSortChange}
      />
      {props.showViewSwitcher ? <>
        <ViewSwitcher
          activeView={props.activeView}
          onViewChange={props.onViewChange}
          allowedViews={MY_WORK_VIEWS}
          iconOnly
          className="shrink-0"
        />
        <DisplayOptionsPanel
          viewType={props.activeView}
          options={props.displayOptions}
          onChange={props.onDisplayOptionsChange}
          iconOnly
        />
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <GroupingSidebarButton
                showGroupingSidebar={props.showGroupingSidebar}
                labeled={false}
                onToggleSidebar={props.onToggleSidebar}
              />
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Grouping sidebar</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </> : null}
    </div>
  );
}

function CompactActions(props: MyWorkToolbarActionsProps) {
  const [open, setOpen] = useState(false);

  function handleToggleSidebar() {
    setOpen(false);
    props.onToggleSidebar();
  }

  return (
    <ResponsivePopover collapseBelow="lg" open={open} onOpenChange={setOpen}>
      <ResponsivePopoverTrigger asChild>
        <AnimatedIconButton
          type="button"
          icon={EllipsisIcon}
          variant="outline"
          size="icon"
          className="size-9 shrink-0"
          aria-label="More options"
        />
      </ResponsivePopoverTrigger>
      <ResponsivePopoverContent
        align="end"
        title="Display and sorting options"
        className="w-[min(20rem,calc(100vw-2rem))] space-y-4 p-3"
      >
        <section className="space-y-2" aria-labelledby="my-work-sort-heading">
          <p id="my-work-sort-heading" className="text-micro font-medium uppercase tracking-wider text-muted-foreground">Sort</p>
          <MyWorkSortControl
            sortField={props.sortField}
            sortDirection={props.sortDirection}
            onSortChange={props.onSortChange}
            className="w-full"
          />
        </section>
        {props.showViewSwitcher ? <>
          <section className="space-y-2" aria-labelledby="my-work-view-heading">
            <p id="my-work-view-heading" className="text-micro font-medium uppercase tracking-wider text-muted-foreground">View</p>
            <ViewSwitcher
              activeView={props.activeView}
              onViewChange={props.onViewChange}
              allowedViews={MY_WORK_VIEWS}
              className="w-full [&>button]:flex-1"
            />
          </section>
          <section className="space-y-2" aria-labelledby="my-work-display-heading">
            <p id="my-work-display-heading" className="text-micro font-medium uppercase tracking-wider text-muted-foreground">Display</p>
            <DisplayOptionsContent
              viewType={props.activeView}
              options={props.displayOptions}
              onChange={props.onDisplayOptionsChange}
            />
          </section>
          <GroupingSidebarButton
            showGroupingSidebar={props.showGroupingSidebar}
            labeled
            onToggleSidebar={handleToggleSidebar}
          />
        </> : null}
      </ResponsivePopoverContent>
    </ResponsivePopover>
  );
}

export function MyWorkToolbarActions(props: MyWorkToolbarActionsProps) {
  const isBelowLg = useIsBelowLg();
  return isBelowLg ? <CompactActions {...props} /> : <DesktopActions {...props} />;
}
