import { useState, useEffect } from "react";
import { buildStatusConfig } from "../shared/types";
import { getStatusEntry } from "@/lib/status-config";
import { getPriorityColor } from "../shared/priority-badge";
import { parseTicketPointsInput } from "../shared/ticket-points";
import { Minus } from "lucide-react";
import { PRIORITIES } from "./ticket-create-properties-parts";
import type {
  ProjectStatusRecord,
  ProjectMemberRecord,
  Cycle,
  TicketLabel,
} from "@/types/projects";
import type { TicketPriority } from "@/types/projects";
import type { CreateTicketPropertiesValue } from "./ticket-create-properties";

interface UseTicketCreatePropertiesParams {
  value: CreateTicketPropertiesValue;
  onChange: (patch: Partial<CreateTicketPropertiesValue>) => void;
  projectStatuses: ProjectStatusRecord[];
  members: ProjectMemberRecord[];
  labels: TicketLabel[];
  cycles: Cycle[];
}

export function useTicketCreateProperties({
  value,
  onChange,
  projectStatuses,
  members,
  labels,
  cycles,
}: UseTicketCreatePropertiesParams) {
  const [statusOpen, setStatusOpen] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [cycleOpen, setCycleOpen] = useState(false);
  const [estimateInput, setEstimateInput] = useState(
    value.points !== null ? String(value.points) : "",
  );

  useEffect(() => {
    if (value.points === null) setEstimateInput("");
  }, [value.points]);

  const statusConfig = buildStatusConfig(projectStatuses);
  const statusList =
    projectStatuses.length > 0
      ? projectStatuses.map((s) => s.name)
      : ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];
  const currentStatus = getStatusEntry(statusConfig, value.status);

  const selectedAssignee = value.assigneeId
    ? (members.find((m) => m.id === value.assigneeId) ?? null)
    : null;

  const selectedLabels = labels.filter((l) => value.labelIds.includes(l.id));
  const selectedCycle =
    value.cycleId != null ? cycles.find((c) => c.id === value.cycleId) : null;

  const selectedPriorityDef = value.priority
    ? PRIORITIES.find((p) => p.value === value.priority)
    : null;
  const PriorityIcon = selectedPriorityDef?.Icon ?? Minus;
  const priorityColor = value.priority
    ? getPriorityColor(value.priority)
    : "text-muted-foreground";

  const labelsPillText =
    selectedLabels.length === 0
      ? null
      : selectedLabels.length === 1
        ? selectedLabels[0]?.name
        : `${selectedLabels[0]?.name} +${selectedLabels.length - 1}`;

  function makeStatusHandler(s: string) {
    return function selectStatus() {
      onChange({ status: s });
      setStatusOpen(false);
    };
  }

  function makePriorityHandler(p: TicketPriority) {
    return function selectPriority() {
      onChange({ priority: p });
      setPriorityOpen(false);
    };
  }

  function makeAssigneeHandler(id: string | null) {
    return function selectAssignee() {
      onChange({ assigneeId: id });
      setAssigneeOpen(false);
    };
  }

  function handleEstimateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setEstimateInput(next);
    const parsed = parseTicketPointsInput(next);
    if (parsed !== undefined) {
      onChange({ points: parsed });
    }
  }

  function handleLabelToggle(id: number) {
    const next = value.labelIds.includes(id)
      ? value.labelIds.filter((l) => l !== id)
      : [...value.labelIds, id];
    onChange({ labelIds: next });
  }

  function makeLabelRemoveHandler(id: number) {
    return function removeLabelChip() {
      handleLabelToggle(id);
    };
  }

  function handleLabelCreated(label: TicketLabel) {
    if (value.labelIds.includes(label.id)) return;
    onChange({ labelIds: [...value.labelIds, label.id] });
  }

  function makeCycleHandler(id: number | null) {
    return function selectCycle() {
      onChange({ cycleId: id });
      setCycleOpen(false);
    };
  }

  return {
    statusOpen,
    setStatusOpen,
    priorityOpen,
    setPriorityOpen,
    assigneeOpen,
    setAssigneeOpen,
    labelsOpen,
    setLabelsOpen,
    cycleOpen,
    setCycleOpen,
    estimateInput,
    statusConfig,
    statusList,
    currentStatus,
    selectedAssignee,
    selectedLabels,
    selectedCycle,
    selectedPriorityDef,
    PriorityIcon,
    priorityColor,
    labelsPillText,
    makeStatusHandler,
    makePriorityHandler,
    makeAssigneeHandler,
    handleEstimateChange,
    handleLabelToggle,
    makeLabelRemoveHandler,
    handleLabelCreated,
    makeCycleHandler,
  };
}
