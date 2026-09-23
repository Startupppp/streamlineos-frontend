"use client";

import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { STATUS_OPTIONS, ENTITY_OPTIONS } from "./approvals-constants";

interface ApprovalsFilterBarProps {
  statusValue: string;
  entityTypeValue: string;
  isStatusActive: boolean;
  isEntityTypeActive: boolean;
  onStatusChange: (value: string) => void;
  onEntityTypeChange: (value: string) => void;
  onClearAll: () => void;
}

export function ApprovalsFilterBar({
  statusValue,
  entityTypeValue,
  isStatusActive,
  isEntityTypeActive,
  onStatusChange,
  onEntityTypeChange,
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
      ]}
      onClearAll={onClearAll}
    />
  );
}
