"use client";

import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";
import { EMPLOYEE_STATUS_FILTERS, type EmployeeStatusFilter } from "./employee-list-filters";

export interface Department {
  id: string;
  name: string;
}

interface EmployeesFiltersProps {
  search: string;
  departmentId: string | undefined;
  status: EmployeeStatusFilter;
  departments: Department[] | undefined;
  hasFilters: boolean;
  onSearchChange: (v: string) => void;
  onDepartmentIdChange: (id: string | undefined) => void;
  onStatusChange: (s: EmployeeStatusFilter) => void;
  onClear: () => void;
  /** Optional role (server-backed). Omit to hide. */
  role?: string;
  onRoleChange?: (role: string) => void;
  showRole?: boolean;
}

export function EmployeesFilters({
  search,
  departmentId,
  status,
  departments,
  hasFilters,
  onSearchChange,
  onDepartmentIdChange,
  onStatusChange,
  onClear,
  role = "all",
  onRoleChange,
  showRole = false,
}: EmployeesFiltersProps) {
  function handleStatusSelect(v: string) {
    const next = EMPLOYEE_STATUS_FILTERS.find((candidate) => candidate === v);
    if (next) onStatusChange(next);
  }

  return (
    <>
      <SearchInput
        value={search}
        onValueChange={onSearchChange}
        placeholder="Search name, email, or ID…"
        aria-label="Search employees"
        className="w-full min-w-0 md:w-auto md:max-w-sm md:shrink-0"
      />

      <div className="flex w-full min-w-0 items-center gap-2 md:w-auto md:contents">
        <Select
          value={departmentId ?? "all"}
          onValueChange={(v) =>
            onDepartmentIdChange(v === "all" ? undefined : v)
          }
        >
          <SelectTrigger
            size="sm"
            className={cn("min-w-0 flex-1 md:w-[10.5rem] md:flex-none", FILTER_SELECT_TRIGGER)}
            aria-label="Department"
          >
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectItem value="all">All departments</SelectItem>
            {departments?.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={status}
          onValueChange={handleStatusSelect}
        >
          <SelectTrigger
            size="sm"
            className={cn("min-w-0 flex-1 md:w-[8.5rem] md:flex-none", FILTER_SELECT_TRIGGER)}
            aria-label="Status"
          >
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        {showRole && onRoleChange ? (
          <Select value={role} onValueChange={onRoleChange}>
            <SelectTrigger
              size="sm"
              className={cn("min-w-0 flex-1 md:w-[9.5rem] md:flex-none", FILTER_SELECT_TRIGGER)}
              aria-label="Role"
            >
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="FINAL">FINAL</SelectItem>
              <SelectItem value="HR">HR</SelectItem>
              <SelectItem value="SALES">Sales</SelectItem>
              <SelectItem value="CUSTOMER_SUPPORT">Customer Support</SelectItem>
              <SelectItem value="ENGINEERING">Engineering</SelectItem>
              <SelectItem value="DESIGN">Design</SelectItem>
              <SelectItem value="VIDEO_EDITOR">Video Editor</SelectItem>
              <SelectItem value="DIGITAL_MARKETING">Digital Marketing</SelectItem>
            </SelectContent>
          </Select>
        ) : null}

        {hasFilters ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 shrink-0 gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={onClear}
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        ) : null}
      </div>
    </>
  );
}
