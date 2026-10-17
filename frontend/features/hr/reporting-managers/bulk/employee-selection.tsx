"use client";

import { useId, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { SearchInput } from "@/components/ui/search-input";
import { Label } from "@/components/ui/label";
import { ManagerCandidatePicker } from "@/components/hr/reporting-lines/manager-candidate-picker";
import { useHrEmployeeOptions } from "@/hooks/api/hr/employee-list";
import { BULK_REASSIGNMENT_ROW_CAP } from "@/hooks/api/hr/reporting-line-bulk-jobs-schema";
import type { ManagerRef } from "@/hooks/api/hr/reporting-lines-schema";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import type { EmployeeListItem } from "@/types/hr";
import { getUserDisplayName } from "@/lib/person-display";

export interface EmployeeSelectionValue {
  employeeUserIds: string[];
  manager: ManagerRef | null;
}

interface EmployeeSelectionProps {
  value: EmployeeSelectionValue;
  onChange: (value: EmployeeSelectionValue) => void;
}

const COLUMNS: DataTableColumn<EmployeeListItem>[] = [
  { key: "name", header: "Employee", cell: (row) => <span className="truncate text-sm font-medium">{getUserDisplayName(row)}</span> },
  { key: "designation", header: "Designation", cell: (row) => <span className="truncate text-sm">{row.designation ?? "—"}</span> },
  { key: "department", header: "Department", cell: (row) => <span className="truncate text-sm">{row.department?.name ?? "—"}</span> },
];

function rowKey(row: EmployeeListItem): string {
  return row.id;
}

function rowLabel(row: EmployeeListItem): string {
  return getUserDisplayName(row);
}

/** Source 1 of the wizard: pick employees (active, searched on the server) and one new primary manager. */
export function EmployeeSelection({ value, onChange }: EmployeeSelectionProps) {
  const managerFieldId = useId();
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search.trim(), 300);
  const { employees, isLoading } = useHrEmployeeOptions({ search: debounced || undefined });
  const selected = new Set<string | number>(value.employeeUserIds);
  const overCap = value.employeeUserIds.length > BULK_REASSIGNMENT_ROW_CAP;

  function handleSelectionChange(next: Set<string | number>) {
    onChange({ ...value, employeeUserIds: [...next].map(String) });
  }

  function handleManagerChange(_userId: string | null, manager: ManagerRef | null) {
    onChange({ ...value, manager });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5 sm:max-w-sm">
        <Label htmlFor={managerFieldId}>New primary reporting manager</Label>
        <ManagerCandidatePicker
          id={managerFieldId}
          value={value.manager?.userId ?? null}
          selected={value.manager}
          onChange={handleManagerChange}
          excludeUserIds={value.employeeUserIds}
          placeholder="Choose the new manager"
        />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SearchInput value={search} onValueChange={setSearch} placeholder="Search employees" aria-label="Search employees" />
          <p className="text-sm text-muted-foreground" aria-live="polite">
            <span className="tabular-nums">{value.employeeUserIds.length}</span> selected
          </p>
        </div>
        {overCap ? (
          <p role="alert" className="text-sm text-destructive">
            Select at most {BULK_REASSIGNMENT_ROW_CAP} employees per job.
          </p>
        ) : null}
        <DataTable
          data={employees}
          columns={COLUMNS}
          getRowKey={rowKey}
          isLoading={isLoading}
          selection={{ selected, onChange: handleSelectionChange, getRowLabel: rowLabel }}
          pagination={{ pageSize: 25 }}
        />
      </div>
    </div>
  );
}
