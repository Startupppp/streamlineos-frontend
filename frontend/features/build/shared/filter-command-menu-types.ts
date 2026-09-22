import type {
  StatusFilterOption,
  Member,
  Label,
  Cycle,
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
  projectOptions?: ProjectOption[];
  showTypeFilter: boolean;
  showAssigneeFilter: boolean;
  filterState: Omit<FilterState, "sprintParam">;
  onToggleStatus: (value: string) => void;
  onTogglePriority: (value: string) => void;
  onToggleType: (value: string) => void;
  onToggleAssignee: (value: string) => void;
  onToggleLabel: (value: string) => void;
  onToggleCycle: (value: string) => void;
  onToggleProject: (value: string) => void;
  onDueDateFromChange: (value: string) => void;
  onDueDateToChange: (value: string) => void;
}
