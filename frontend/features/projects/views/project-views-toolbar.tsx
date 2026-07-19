"use client";

import { useCallback } from "react";
import { X } from "lucide-react";
import {
  UploadIcon,
  DownloadIcon,
  BookmarkIcon,
  EllipsisIcon,
} from "@animateicons/react/lucide";
import type { IconHandle } from "@animateicons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { cn } from "@/lib/utils";
import { TicketFilterBar } from "@/features/projects/shared/ticket-filter-bar";
import { DisplayOptionsPanel } from "@/features/projects/views/display-options-panel";
import { ViewSwitcher, type ViewType } from "@/features/projects/views/view-switcher";
import { WorkloadFilterBar } from "@/features/projects/views/workload-filter-bar";
import type { FilterState as WorkloadFilterState } from "@/features/projects/views/workload-types";
import type { DisplayOptions } from "@/features/projects/shared/types";

type AnimatedToolbarIcon = React.ForwardRefExoticComponent<
  { size?: number } & React.RefAttributes<IconHandle>
>;

interface ToolbarIconButtonProps {
  onClick: () => void;
  ariaLabel: string;
  Icon: AnimatedToolbarIcon;
}

const TOOLBAR_ICON_BTN = "size-9 shrink-0 border-border/70 bg-card";

function ToolbarIconButton({ onClick, ariaLabel, Icon }: ToolbarIconButtonProps) {
  return (
    <AnimatedIconButton
      icon={Icon}
      iconSize={14}
      variant="outline"
      size="icon"
      onClick={onClick}
      className={TOOLBAR_ICON_BTN}
      aria-label={ariaLabel}
    />
  );
}

function ExportDropdownTrigger() {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button
      variant="outline"
      size="icon"
      className={TOOLBAR_ICON_BTN}
      aria-label="Export tickets"
      {...hoverHandlers}
    >
      <DownloadIcon ref={iconRef} size={14} />
    </Button>
  );
}

function MoreActionsTrigger() {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button
      variant="outline"
      size="icon"
      className={cn(TOOLBAR_ICON_BTN, "md:hidden")}
      aria-label="More board actions"
      {...hoverHandlers}
    >
      <EllipsisIcon ref={iconRef} size={14} />
    </Button>
  );
}

interface Member {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  image?: string | null;
}

interface StatusOption {
  name: string;
  color: string | null;
  type?: string | null;
}

interface ProjectViewsToolbarProps {
  view: ViewType;
  onViewChange: (view: ViewType) => void;
  displayOptions: DisplayOptions;
  onDisplayOptionsChange: (options: DisplayOptions) => void;
  activeViewName?: string | null;
  onClearView?: () => void;
  onExportCurrentView: () => void;
  onExportAllTickets: () => void;
  onOpenImport: () => void;
  onOpenSaveView: () => void;
  projectId: number;
  members: Member[];
  statuses?: StatusOption[];
  hideCompleted: boolean;
  onHideCompletedChange: (checked: boolean) => void;
  doneCount: number;
  workloadFilters: WorkloadFilterState;
  onWorkloadFilterChange: <K extends keyof WorkloadFilterState>(
    key: K,
    value: WorkloadFilterState[K],
  ) => void;
  onClearWorkloadFilters: () => void;
}

export function ProjectViewsToolbar({
  view,
  onViewChange,
  displayOptions,
  onDisplayOptionsChange,
  activeViewName,
  onClearView,
  onExportCurrentView,
  onExportAllTickets,
  onOpenImport,
  onOpenSaveView,
  projectId,
  members,
  statuses,
  hideCompleted,
  onHideCompletedChange,
  doneCount,
  workloadFilters,
  onWorkloadFilterChange,
  onClearWorkloadFilters,
}: ProjectViewsToolbarProps) {
  const handleSaveViewClick = useCallback(() => {
    onOpenSaveView();
  }, [onOpenSaveView]);

  const boardActions = (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <ExportDropdownTrigger />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem onClick={onExportCurrentView}>
            Export current view
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onExportAllTickets}>
            Export all tickets
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ToolbarIconButton
        onClick={onOpenImport}
        ariaLabel="Import tickets"
        Icon={UploadIcon}
      />
      <ToolbarIconButton
        onClick={handleSaveViewClick}
        ariaLabel="Save view"
        Icon={BookmarkIcon}
      />
    </>
  );

  return (
    <div className="flex w-full min-w-0 flex-nowrap items-center justify-between gap-1 sm:gap-1.5">
      <div className="flex min-w-0 shrink-0 items-center gap-1">
        <ViewSwitcher activeView={view} onViewChange={onViewChange} />

        <div className="flex items-center gap-0.5 sm:gap-1">
          <DisplayOptionsPanel
            viewType={view}
            options={displayOptions}
            onChange={onDisplayOptionsChange}
          />

          <div className="hidden items-center gap-0.5 sm:gap-1 md:flex">
            {boardActions}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <MoreActionsTrigger />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onExportCurrentView}>
                Export current view
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExportAllTickets}>
                Export all tickets
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onOpenImport}>
                Import tickets
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSaveViewClick}>
                Save view
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {activeViewName && onClearView ? (
          <Badge
            variant="secondary"
            className="h-6 max-w-[7rem] shrink-0 cursor-default gap-0.5 bg-card pl-1.5 pr-0.5 text-xs font-normal sm:max-w-[10rem]"
          >
            <span className="min-w-0 truncate">{activeViewName}</span>
            <button
              type="button"
              onClick={onClearView}
              aria-label="Clear view"
              className="ml-0.5 rounded-sm transition-colors hover:bg-muted"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ) : null}
      </div>

      <div className="min-w-0 flex-1 md:max-w-md lg:max-w-lg md:flex md:justify-end">
        {view === "workload" ? (
          <WorkloadFilterBar
            className="w-full"
            projectId={projectId}
            filters={workloadFilters}
            members={members}
            projectStatuses={statuses}
            onFilterChange={onWorkloadFilterChange}
            onClearFilters={onClearWorkloadFilters}
          />
        ) : (
          <TicketFilterBar
            className="w-full"
            align="end"
            members={members}
            statuses={statuses}
            projectId={projectId}
            showSprintFilter={false}
            showDoneToggle
            hideCompleted={hideCompleted}
            onHideCompletedChange={onHideCompletedChange}
            doneCount={doneCount}
          />
        )}
      </div>
    </div>
  );
}
