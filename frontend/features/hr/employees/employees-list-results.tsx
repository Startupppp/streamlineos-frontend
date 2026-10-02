"use client";

import { AlertTriangle } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable } from "@/components/ui/data-table";
import { EmployeeCard } from "@/features/hr/employees/employee-card";
import { HrPanel } from "@/features/hr/shared/hr-ui";
import {
  buildEmployeeListColumns,
  employeeDepartmentName,
} from "@/features/hr/employees/employee-list-columns";
import { SEARCH_INTEGRITY_MESSAGE } from "@/features/hr/employees/search-integrity";
import { PAGE_BODY_EMPTY_CLASS } from "@/components/ui/content-fill-panel";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { EmployeeListItem } from "@/types/hr";

export type EmployeesListView = "grid" | "list";

interface EmployeesListResultsProps {
  employees: EmployeeListItem[];
  gridEmployees: EmployeeListItem[];
  view: EmployeesListView;
  isFetching: boolean;
  hasFilters: boolean;
  canOnboard: boolean;
  integrityFailed: boolean;
  onClearFilters: () => void;
  onOpenPerson: (employee: EmployeeListItem) => void;
}

function SearchIntegrityBanner() {
  const tone = statusToneClasses("danger");
  return (
    <div
      role="alert"
      className={cn(
        "mb-3 flex items-start gap-2 rounded-lg border px-3 py-2",
        tone.surface,
        tone.rule,
        tone.inkStrong,
      )}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p className="text-label font-medium">{SEARCH_INTEGRITY_MESSAGE}</p>
    </div>
  );
}

export function EmployeesListResults({
  employees,
  gridEmployees,
  view,
  isFetching,
  hasFilters,
  canOnboard,
  integrityFailed,
  onClearFilters,
  onOpenPerson,
}: EmployeesListResultsProps) {
  if (employees.length === 0) {
    return hasFilters ? (
      <EmptyState
        illustrationPreset="team"
        title="No matches"
        description="No people match this search or these filters."
        filtersActive
        onClearFilters={onClearFilters}
        className={PAGE_BODY_EMPTY_CLASS}
      />
    ) : (
      <EmptyState
        illustrationPreset="team"
        title="No people yet"
        description="Import or add employee to start the directory."
        action={canOnboard ? { label: "Add employee", href: "/hr/onboarding" } : undefined}
        className={PAGE_BODY_EMPTY_CLASS}
      />
    );
  }

  return (
    <>
      {integrityFailed ? <SearchIntegrityBanner /> : null}
      {view === "grid" ? (
        <div
          className={cn(
            "grid auto-rows-max content-start gap-2.5 sm:gap-3",
            "grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4",
            isFetching && "opacity-70 transition-opacity",
          )}
        >
          {gridEmployees.map((emp) => (
            <EmployeeCard
              key={emp.id}
              employee={emp}
              department={employeeDepartmentName(emp)}
              onOpen={onOpenPerson}
            />
          ))}
        </div>
      ) : (
        <HrPanel
          padded={false}
          className="flex min-h-0 flex-col overflow-hidden md:h-full md:flex-1"
        >
          <DataTable<EmployeeListItem>
            data={employees}
            columns={buildEmployeeListColumns(employeeDepartmentName)}
            getRowKey={(emp) => emp.id}
            onRowClick={onOpenPerson}
            className="min-h-0 flex-1"
          />
        </HrPanel>
      )}
    </>
  );
}
