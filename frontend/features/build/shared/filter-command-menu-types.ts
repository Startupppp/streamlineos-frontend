import type {
  StatusFilterOption,
  Member,
  Label,
  Cycle,
  Sprint,
  ProjectOption,
  FilterState,
} from "@/components/list-view";
import type { StatusConfigEntry } from "@/lib/status-config";

export interface FilterCommandMenuProps {
  activeFilterCount: number;
  defaultOpen?: boolean;
  statusItems: StatusFilterOption[];
  statusConfig: Record<string, StatusConfigEntry>;
  members: Member[];
  labels: Label[];
  cycles: Cycle[];
  sprints: Sprint[];
  projectOptions?: ProjectOption[];
  showTypeFilter: boolean;
  showSprintFilter: boolean;
  showAssigneeFilter: boolean;
  filterState: FilterState;
  onToggleStatus: (value: string) => void;
  onTogglePriority: (value: string) => void;
  onToggleType: (value: string) => void;
  onToggleAssignee: (value: string) => void;
  onToggleLabel: (value: string) => void;
  onToggleCycle: (value: string) => void;
  onToggleSprint: (value: string) => void;
  onToggleProject: (value: string) => void;
  onDueDateFromChange: (value: string) => void;
  onDueDateToChange: (value: string) => void;
}
