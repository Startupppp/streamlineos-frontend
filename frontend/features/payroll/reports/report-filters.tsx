"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MonthPicker } from "@/features/payroll/shared/month-picker";

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

const WORKER_TYPE_OPTIONS = [
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
        <SelectTrigger className="w-40 text-sm">
          <SelectValue placeholder="All Departments" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Departments</SelectItem>
        </SelectContent>
      </Select>

      <Select value={costCenter} onValueChange={onCostCenterChange}>
        <SelectTrigger className="w-36 text-sm">
          <SelectValue placeholder="All Cost Centers" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Cost Centers</SelectItem>
        </SelectContent>
      </Select>

      <Select value={workerType} onValueChange={onWorkerTypeChange}>
        <SelectTrigger className="w-36 text-sm">
          <SelectValue placeholder="All Types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          {WORKER_TYPE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
