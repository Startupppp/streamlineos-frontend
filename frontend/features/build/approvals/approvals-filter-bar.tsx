"use client";

import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { STATUS_OPTIONS, ENTITY_OPTIONS } from "./approvals-constants";

interface ApproverOption {
  value: string;
  label: string;
}

interface ApprovalsFilterBarProps {
  statusValue: string;
  entityTypeValue: string;
  actorIdValue: string;
  approverOptions: ApproverOption[];
  isStatusActive: boolean;
  isEntityTypeActive: boolean;
  isActorIdActive: boolean;
  onStatusChange: (value: string) => void;
  onEntityTypeChange: (value: string) => void;
  onActorIdChange: (value: string) => void;
  onClearAll: () => void;
}

export function ApprovalsFilterBar({
  statusValue,
  entityTypeValue,
  actorIdValue,
  approverOptions,
  isStatusActive,
  isEntityTypeActive,
  isActorIdActive,
  onStatusChange,
  onEntityTypeChange,
  onActorIdChange,
  onClearAll,
}: ApprovalsFilterBarProps) {
  return (
    <BuildListToolbar
      filters={[
        {
          id: "status",
          label: "Status",
          active: isStatusActive,
          control: (
            <BuildFilterSelect
              label="Status"
              value={statusValue}
              onValueChange={onStatusChange}
              options={STATUS_OPTIONS}
            />
          ),
        },
        {
          id: "entityType",
          label: "Type",
          active: isEntityTypeActive,
          control: (
            <BuildFilterSelect
              label="Type"
              value={entityTypeValue}
              onValueChange={onEntityTypeChange}
              options={ENTITY_OPTIONS}
            />
          ),
        },
        {
          id: "actorId",
          label: "Approver",
          active: isActorIdActive,
          control: (
            <BuildFilterSelect
              label="Approver"
              value={actorIdValue}
              onValueChange={onActorIdChange}
              options={approverOptions}
            />
          ),
        },
      ]}
      onClearAll={onClearAll}
    />
  );
}
