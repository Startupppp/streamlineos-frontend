"use client";

import { useCallback, type RefObject } from "react";
import { Save, X } from "lucide-react";
import { BookmarkIcon } from "@animateicons/react/lucide";
import type { IconHandle } from "@animateicons/react";
import { Badge } from "@/components/ui/badge";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { TicketFilterBar } from "@/features/build/shared/ticket-filter-bar";
import { DisplayOptionsPanel } from "@/features/build/views/display-options-panel";
import { ViewSwitcher, type ViewType } from "@/features/build/views/view-switcher";
import { WorkloadFilterBar } from "@/features/build/views/workload-filter-bar";
import { BugQaFilters } from "@/features/build/views/bug-qa-filters";
import { SavedViewsMenu } from "@/features/build/views/saved-views-menu";
import type { FilterState as WorkloadFilterState } from "@/features/build/views/workload-types";
import type { TeamOption } from "@/features/build/views/workload-filter-types";
import type { DisplayOptions } from "@/features/build/shared/types";
import { useCan } from "@/hooks/api/access";
import { useModules } from "@/hooks/api/build/modules";
import { useModuleFilterParam } from "@/features/build/views/use-module-filter-param";

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

interface ModuleFilterOption {
  id: number;
  name: string;
}

const MODULE_ALL = "__all__";
const MODULE_SELECT_TRIGGER = `${FILTER_SELECT_TRIGGER} h-9 w-fit min-w-0 shrink-0 gap-1 px-2 text-xs`;

interface ProjectViewsToolbarProps {
  view: ViewType;
  onViewChange: (view: ViewType) => void;
  displayOptions: DisplayOptions;
  onDisplayOptionsChange: (options: DisplayOptions) => void;
  activeViewName?: string | null;
  onClearView?: () => void;
  onOpenSaveView: () => void;
  onUpdateView?: () => void;
  isUpdatingView?: boolean;
  projectId: number;
  members: Member[];
  teams?: TeamOption[];
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
  filterType: string;
  filterSeverity: string;
  filterQaState: string;
  onQaFilterChange: (key: "severity" | "qaState", value: string) => void;
  searchInputRef?: RefObject<HTMLInputElement | null>;
  filterModule?: string;
  onModuleFilterChange?: (moduleId: string) => void;
  modules?: ModuleFilterOption[];
}

export function ProjectViewsToolbar({
  view,
  onViewChange,
  displayOptions,
  onDisplayOptionsChange,
  activeViewName,
  onClearView,
  onOpenSaveView,
  onUpdateView,
  isUpdatingView = false,
  projectId,
  members,
  teams = [],
  statuses,
  hideCompleted,
  onHideCompletedChange,
  doneCount,
  workloadFilters,
  onWorkloadFilterChange,
  onClearWorkloadFilters,
  filterType,
  filterSeverity,
  filterQaState,
  onQaFilterChange,
  searchInputRef,
  filterModule = "",
  onModuleFilterChange,
  modules = [],
}: ProjectViewsToolbarProps) {
  const canManageViews = useCan("build:workspace:manage");
  const { data: fetchedModules } = useModules(projectId);
  const { filterModule: urlModule, setModuleFilter } = useModuleFilterParam();
  const moduleOptions: ModuleFilterOption[] =
    modules.length > 0
      ? modules
      : (fetchedModules ?? []).map((m) => ({ id: m.id, name: m.name }));
  const moduleValue = onModuleFilterChange ? filterModule : urlModule;
  const handleSaveViewClick = useCallback(() => {
    onOpenSaveView();
  }, [onOpenSaveView]);

  const handleModuleChange = useCallback(
    (value: string) => {
      const next = value === MODULE_ALL ? "" : value;
      if (onModuleFilterChange) {
        onModuleFilterChange(next);
        return;
      }
      setModuleFilter(next);
    },
    [onModuleFilterChange, setModuleFilter],
  );

  const leading = (
    <div className="flex min-w-0 flex-wrap items-center gap-1">
      <ViewSwitcher activeView={view} onViewChange={onViewChange} />

      <div className="flex items-center gap-0.5 sm:gap-1">
        <SavedViewsMenu projectId={projectId} />

        <DisplayOptionsPanel
          viewType={view}
          options={displayOptions}
          onChange={onDisplayOptionsChange}
        />

        {canManageViews ? (
          <ToolbarIconButton
            onClick={handleSaveViewClick}
            ariaLabel="Save view"
            Icon={BookmarkIcon}
          />
        ) : null}
      </div>

      {moduleOptions.length > 0 ? (
        <Select value={moduleValue || MODULE_ALL} onValueChange={handleModuleChange}>
          <SelectTrigger className={MODULE_SELECT_TRIGGER} aria-label="Filter by module">
            <SelectValue placeholder="Module" className="font-normal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={MODULE_ALL} className="text-xs font-normal">All modules</SelectItem>
            {moduleOptions.map((m) => (
              <SelectItem key={m.id} value={String(m.id)} className="text-xs font-normal">
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      {filterType === "BUG" ? (
        <BugQaFilters
          severity={filterSeverity}
          qaState={filterQaState}
          onChange={onQaFilterChange}
        />
      ) : null}

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

      {activeViewName && onUpdateView && canManageViews ? (
        <LoadingButton
          type="button"
          variant="outline"
          size="sm"
          className="h-6 shrink-0 gap-1 px-2 text-xs"
          isPending={isUpdatingView}
          loadingText="Updating…"
          onClick={onUpdateView}
          aria-label="Update view from current filters"
        >
          <Save className="h-3 w-3" />
          Update
        </LoadingButton>
      ) : null}
    </div>
  );

  if (view === "workload") {
    return (
      <WorkloadFilterBar
        className="w-full"
        leading={leading}
        projectId={projectId}
        filters={workloadFilters}
        members={members}
        teams={teams}
        projectStatuses={statuses}
        onFilterChange={onWorkloadFilterChange}
        onClearFilters={onClearWorkloadFilters}
      />
    );
  }

  return (
    <TicketFilterBar
      className="w-full"
      mobileSearchFirst
      leading={leading}
      members={members}
      statuses={statuses}
      projectId={projectId}
      showDoneToggle
      hideCompleted={hideCompleted}
      onHideCompletedChange={onHideCompletedChange}
      doneCount={doneCount}
      searchInputRef={searchInputRef}
    />
  );
}
