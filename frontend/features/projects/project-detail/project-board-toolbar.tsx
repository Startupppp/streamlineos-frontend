"use client";

import { useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UploadIcon } from "@animateicons/react/lucide";
import { Bookmark, X, Download, Ellipsis } from "lucide-react";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { cn } from "@/lib/utils";
import { PM_CONTROL } from "@/features/projects/shared/pm-chrome";
import { ViewSwitcher, type ViewType } from "@/features/projects/views/view-switcher";
import { DisplayOptionsPanel } from "@/features/projects/views/display-options-panel";
import { TicketFilterBar } from "@/features/projects/shared/ticket-filter-bar";
import type { DisplayOptions } from "@/features/projects/shared/types";
import type { IconHandle } from "@animateicons/react";
import type { ForwardRefExoticComponent, RefAttributes } from "react";

type AnimatedToolbarIcon = ForwardRefExoticComponent<
  { size?: number } & RefAttributes<IconHandle>
>;

interface AnimatedToolbarIconButtonProps {
  onClick: () => void;
  ariaLabel: string;
  Icon: AnimatedToolbarIcon;
}

function AnimatedToolbarIconButton({ onClick, ariaLabel, Icon }: AnimatedToolbarIconButtonProps) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={onClick}
      className={cn("h-8 w-8 shrink-0", PM_CONTROL)}
      aria-label={ariaLabel}
      {...hoverHandlers}
    >
      <Icon ref={iconRef} size={14} />
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

interface ProjectBoardToolbarProps {
  view: ViewType;
  onViewChange: (v: ViewType) => void;
  displayOptions: DisplayOptions;
  onDisplayOptionsChange: (opts: DisplayOptions) => void;
  onExportCurrentView: () => void;
  onExportAllTickets: () => void;
  onOpenImport: () => void;
  onOpenSaveView: () => void;
  activeViewName: string | undefined;
  onClearView: () => void;
  members: Member[];
  statuses: Array<{ name: string; color?: string | null; type?: string | null }> | undefined;
  projectId: number;
  hideCompleted: boolean;
  onHideCompletedChange: (v: boolean) => void;
  doneCount: number;
}

export function ProjectBoardToolbar({
  view,
  onViewChange,
  displayOptions,
  onDisplayOptionsChange,
  onExportCurrentView,
  onExportAllTickets,
  onOpenImport,
  onOpenSaveView,
  activeViewName,
  onClearView,
  members,
  statuses,
  projectId,
  hideCompleted,
  onHideCompletedChange,
  doneCount,
}: ProjectBoardToolbarProps) {
  const saveViewRef = useRef<HTMLButtonElement>(null);

  const handleSaveViewClick = useCallback(() => {
    onOpenSaveView();
  }, [onOpenSaveView]);

  return (
    <div className="flex w-full min-w-0 flex-row flex-nowrap items-start gap-1.5">
      <ViewSwitcher
        activeView={view}
        onViewChange={onViewChange}
        className="min-w-0 flex-1 basis-0"
      />

      <div className="flex shrink-0 items-center gap-1.5">
        <DisplayOptionsPanel
          viewType={view}
          options={displayOptions}
          onChange={onDisplayOptionsChange}
        />

        <div className="hidden items-center gap-1 sm:flex">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={cn("h-8 w-8 shrink-0", PM_CONTROL)}
                aria-label="Export tickets"
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
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
          <AnimatedToolbarIconButton
            onClick={onOpenImport}
            ariaLabel="Import tickets"
            Icon={UploadIcon}
          />
          <Button
            ref={saveViewRef}
            variant="outline"
            size="icon"
            onClick={handleSaveViewClick}
            className={cn("h-8 w-8 shrink-0", PM_CONTROL)}
            aria-label="Save view"
          >
            <Bookmark className="h-3.5 w-3.5" />
          </Button>
        </div>

        {activeViewName !== undefined ? (
          <Badge
            variant="secondary"
            className="hidden h-6 max-w-[10rem] shrink-0 cursor-default gap-1 bg-muted pl-2 pr-1 text-xs font-normal md:inline-flex"
          >
            <span className="min-w-0 truncate">View: {activeViewName}</span>
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

      <TicketFilterBar
        className="w-auto shrink-0"
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

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className={cn("h-8 w-8 shrink-0 sm:hidden", PM_CONTROL)}
            aria-label="More board actions"
          >
            <Ellipsis className="h-3.5 w-3.5" />
          </Button>
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
          {activeViewName !== undefined ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onClearView}>
                Clear view
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
