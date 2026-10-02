"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TruncatedText } from "@/components/ui/truncated-text";
import { type DataTableColumn } from "@/components/ui/data-table";
import { HrStatusBadge } from "@/features/hr/shared/hr-ui";
import { getUserDisplayName, getUserInitials } from "@/lib/person-display";
import { resolveImageUrl } from "@/lib/utils";
import type { EmployeeListItem } from "@/types/hr";

export function employeeDepartmentName(emp: EmployeeListItem): string | null {
  return emp.department?.name ?? null;
}

export function buildEmployeeListColumns(
  getDept: (emp: EmployeeListItem) => string | null,
): DataTableColumn<EmployeeListItem>[] {
  return [
    {
      key: "employee",
      header: "Employee",
      cell: (emp) => (
        <div className="flex items-center gap-3">
          <Avatar className="w-9 h-9 shrink-0 ring-2 ring-background shadow-sm">
            <AvatarImage src={resolveImageUrl(emp.image)} alt="" />
            <AvatarFallback className="bg-status-info-surface text-status-info-ink text-xs font-bold">
              {getUserInitials(emp)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <TruncatedText
              text={getUserDisplayName(emp)}
              className="text-sm font-semibold text-foreground"
            />
            {emp.email ? (
              <TruncatedText text={emp.email} className="text-dense text-muted-foreground" />
            ) : null}
          </div>
        </div>
      ),
    },
    {
      key: "employeeId",
      header: "Employee ID",
      headerClassName: "w-[110px] hidden md:table-cell",
      className: "text-xs text-muted-foreground font-mono hidden md:table-cell",
      cell: (emp) => emp.employeeId ?? "—",
    },
    {
      key: "designation",
      header: "Designation",
      headerClassName: "w-[160px] hidden md:table-cell",
      className: "text-xs text-muted-foreground hidden md:table-cell",
      cell: (emp) => emp.designation ?? "—",
    },
    {
      key: "department",
      header: "Department",
      headerClassName: "w-[140px] hidden md:table-cell",
      className: "hidden md:table-cell",
      cell: (emp) => {
        const dept = getDept(emp);
        return dept ? (
          <span className="inline-flex items-center gap-1 text-micro font-semibold px-2 py-0.5 rounded-full border bg-status-info-surface text-status-info-ink border-status-info-rule">
            {dept}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      headerClassName: "w-[100px]",
      cell: (emp) => <HrStatusBadge status={emp.isActive ? "active" : "inactive"} />,
    },
  ];
}
