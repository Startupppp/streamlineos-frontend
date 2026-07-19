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
import type { EmployeeStatusFilter } from "./employee-list-filters";

export interface Department {
  id: number;
  name: string;
}

interface EmployeesFiltersProps {
  search: string;
  departmentId: number | undefined;
  status: EmployeeStatusFilter;
  departments: Department[] | undefined;
  hasFilters: boolean;
  onSearchChange: (v: string) => void;
  onDepartmentIdChange: (id: number | undefined) => void;
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
  return (
    <>
      <SearchInput
        value={search}
        onValueChange={onSearchChange}
        placeholder="Search name, email, or ID…"
        aria-label="Search employees"
        className="w-full min-w-0 md:w-56 md:max-w-56 md:shrink-0"
      />

      <Select
        value={departmentId != null ? String(departmentId) : "all"}
        onValueChange={(v) =>
          onDepartmentIdChange(v === "all" ? undefined : Number(v))
        }
      >
        <SelectTrigger
          size="sm"
          className={cn("w-full shrink-0 md:w-[10.5rem]", FILTER_SELECT_TRIGGER)}
          aria-label="Department"
        >
          <SelectValue placeholder="Department" />
        </SelectTrigger>
        <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
          <SelectItem value="all" className="text-xs">
            All Departments
          </SelectItem>
          {departments?.map((d) => (
            <SelectItem key={d.id} value={String(d.id)}>
              {d.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={status}
        onValueChange={(v) => onStatusChange(v as EmployeeStatusFilter)}
      >
        <SelectTrigger
          size="sm"
          className={cn("w-full shrink-0 md:w-[8.5rem]", FILTER_SELECT_TRIGGER)}
          aria-label="Status"
        >
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
          <SelectItem value="all" className="text-xs">
            All Status
          </SelectItem>
          <SelectItem value="active" className="text-xs">
            Active
          </SelectItem>
          <SelectItem value="inactive" className="text-xs">
            Inactive
          </SelectItem>
          <SelectItem value="terminated" className="text-xs">
            Terminated
          </SelectItem>
        </SelectContent>
      </Select>

      {showRole && onRoleChange ? (
        <Select value={role} onValueChange={onRoleChange}>
          <SelectTrigger
            size="sm"
            className={cn("w-full shrink-0 md:w-[9.5rem]", FILTER_SELECT_TRIGGER)}
            aria-label="Role"
          >
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="CEO">CEO</SelectItem>
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
          className="h-9 w-full shrink-0 gap-1.5 text-muted-foreground hover:text-foreground md:w-auto"
          onClick={onClear}
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </Button>
      ) : null}
    </>
  );
}
