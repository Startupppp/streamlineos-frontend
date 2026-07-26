"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MonthPicker } from "@/features/payroll/shared/month-picker";
import { MobileFilterDrawer } from "@/features/payroll/shared/mobile-filter-drawer";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";

interface ReportFiltersProps {
  month: string;
  department: string;
  costCenter: string;
  workerType: string;
  onMonthChange: (v: string) => void;
  onDepartmentChange: (v: string) => void;
  onCostCenterChange: (v: string) => void;
  onWorkerTypeChange: (v: string) => void;
}

const DEPARTMENT_OPTIONS = [{ value: "all", label: "All Departments" }];
const COST_CENTER_OPTIONS = [{ value: "all", label: "All Cost Centers" }];
const WORKER_TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "FULL_TIME", label: "Full Time" },
  { value: "PART_TIME", label: "Part Time" },
  { value: "CONTRACT", label: "Contract" },
  { value: "CONSULTANT", label: "Consultant" },
];

export function ReportFilters({
  month,
  department,
  costCenter,
  workerType,
  onMonthChange,
  onDepartmentChange,
  onCostCenterChange,
  onWorkerTypeChange,
}: ReportFiltersProps) {
  return (
    <>
      <MonthPicker
        value={month}
        onChange={onMonthChange}
        className="w-36"
        yearRange={[-3, 0]}
      />

      <Select value={department} onValueChange={onDepartmentChange}>
        <SelectTrigger className={`${FILTER_SELECT_TRIGGER} hidden sm:flex w-40`}>
          <SelectValue placeholder="All Departments" />
        </SelectTrigger>
        <SelectContent>
          {DEPARTMENT_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={costCenter} onValueChange={onCostCenterChange}>
        <SelectTrigger className={`${FILTER_SELECT_TRIGGER} hidden sm:flex w-36`}>
          <SelectValue placeholder="All Cost Centers" />
        </SelectTrigger>
        <SelectContent>
          {COST_CENTER_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={workerType} onValueChange={onWorkerTypeChange}>
        <SelectTrigger className={`${FILTER_SELECT_TRIGGER} hidden sm:flex w-36`}>
          <SelectValue placeholder="All Types" />
        </SelectTrigger>
        <SelectContent>
          {WORKER_TYPE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <MobileFilterDrawer
        ariaLabel="Filter reports"
        groups={[
          { label: "Department", value: department, options: DEPARTMENT_OPTIONS, onChange: onDepartmentChange },
          { label: "Cost Center", value: costCenter, options: COST_CENTER_OPTIONS, onChange: onCostCenterChange },
          { label: "Worker Type", value: workerType, options: WORKER_TYPE_OPTIONS, onChange: onWorkerTypeChange },
        ]}
      />
    </>
  );
}
