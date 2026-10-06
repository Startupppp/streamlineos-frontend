import { useState, useEffect } from "react";
import { buildStatusConfig } from "../shared/types";
import { getStatusEntry } from "@/lib/status-config";
import { getPriorityColor } from "../shared/priority-badge";
import { parseTicketPointsInput } from "../shared/ticket-points";
import { Minus } from "lucide-react";
import { PRIORITIES } from "./ticket-create-properties-parts";
import type { ProjectStatusRecord, ProjectMemberRecord } from "@/types/projects";
import type { TicketPriority } from "@/types/projects";
import type { CreateTicketPropertiesValue } from "./ticket-create-properties";

interface UseTicketCreatePropertiesParams {
  value: CreateTicketPropertiesValue;
  onChange: (patch: Partial<CreateTicketPropertiesValue>) => void;
  projectStatuses: ProjectStatusRecord[];
  members: ProjectMemberRecord[];
}

export function useTicketCreateProperties({
  value,
  onChange,
  projectStatuses,
  members,
}: UseTicketCreatePropertiesParams) {
  const [statusOpen, setStatusOpen] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
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

  const selectedPriorityDef = value.priority
    ? PRIORITIES.find((p) => p.value === value.priority)
    : null;
  const PriorityIcon = selectedPriorityDef?.Icon ?? Minus;
  const priorityColor = value.priority
    ? getPriorityColor(value.priority)
    : "text-muted-foreground";

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

  return {
    statusOpen,
    setStatusOpen,
    priorityOpen,
    setPriorityOpen,
    assigneeOpen,
    setAssigneeOpen,
    estimateInput,
    statusConfig,
    statusList,
    currentStatus,
    selectedAssignee,
    selectedPriorityDef,
    PriorityIcon,
    priorityColor,
    makeStatusHandler,
    makePriorityHandler,
    makeAssigneeHandler,
    handleEstimateChange,
  };
}
