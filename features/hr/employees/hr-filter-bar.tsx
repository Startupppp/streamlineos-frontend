"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROLE_LABELS, type StatusFilter, type RoleFilter } from "./hr-types";

const selectTriggerClass =
  "h-9 w-auto min-w-[9.5rem] max-w-[16rem] shrink-0 text-xs [&_[data-slot=select-value]]:!line-clamp-none";

const roleSelectTriggerClass =
  "h-9 w-auto min-w-[12.5rem] max-w-[16rem] shrink-0 text-xs [&_[data-slot=select-value]]:!line-clamp-none";

interface HrFilterBarProps {
  deptFilter: string;
  onDeptChange: (value: string) => void;
  departments: string[];
  statusFilter: StatusFilter;
  onStatusChange: (value: StatusFilter) => void;
  roleFilter: RoleFilter;
  onRoleChange: (value: RoleFilter) => void;
  onClearFilters: () => void;
  hasSearchFilter?: boolean;
  className?: string;
}

export function HrFilterBar({
  deptFilter,
  onDeptChange,
  departments,
  statusFilter,
  onStatusChange,
  roleFilter,
  onRoleChange,
  onClearFilters,
  hasSearchFilter = false,
  className,
}: HrFilterBarProps) {
  const hasActiveFilters =
    hasSearchFilter ||
    deptFilter !== "All" ||
    statusFilter !== "Active" ||
    roleFilter !== "All";

  const roleLabel =
    roleFilter === "All" ? "All Roles" : (ROLE_LABELS[roleFilter] ?? roleFilter);

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Select value={deptFilter} onValueChange={onDeptChange}>
        <SelectTrigger className={selectTriggerClass} title={deptFilter}>
          <SelectValue placeholder="Department" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="All">All Depts</SelectItem>
          {departments.map((d) => (
            <SelectItem key={d} value={d}>
              {d}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={statusFilter}
        onValueChange={(v) => onStatusChange(v as StatusFilter)}
      >
        <SelectTrigger className={selectTriggerClass}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="All">All Status</SelectItem>
          <SelectItem value="Active">Active</SelectItem>
          <SelectItem value="Inactive">Inactive</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={roleFilter}
        onValueChange={(v) => onRoleChange(v as RoleFilter)}
      >
        <SelectTrigger className={roleSelectTriggerClass} title={roleLabel}>
          <SelectValue>{roleLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="All">All Roles</SelectItem>
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

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-muted-foreground"
          onClick={onClearFilters}
          aria-label="Clear filters"
        >
          <X className="h-3.5 w-3.5 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
