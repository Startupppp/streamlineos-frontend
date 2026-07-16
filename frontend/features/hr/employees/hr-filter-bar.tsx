"use client";

import { SearchInput } from "@/components/ui/search-input";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { XIcon } from "@animateicons/react/lucide";
import { cn } from "@/lib/utils";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import type { StatusFilter, RoleFilter } from "./hr-types";

interface HrFilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  deptFilter: string;
  onDeptChange: (value: string) => void;
  departments: string[];
  statusFilter: StatusFilter;
  onStatusChange: (value: StatusFilter) => void;
  roleFilter: RoleFilter;
  onRoleChange: (value: RoleFilter) => void;
  onClearFilters: () => void;
}

export function HrFilterBar({
  searchTerm,
  onSearchChange,
  deptFilter,
  onDeptChange,
  departments,
  statusFilter,
  onStatusChange,
  roleFilter,
  onRoleChange,
  onClearFilters,
}: HrFilterBarProps) {
  const hasActiveFilters =
    !!searchTerm || deptFilter !== "All" || statusFilter !== "Active" || roleFilter !== "All";

  const handleSearchChange = (value: string) => {
    onSearchChange(value);
  };

  const handleStatusChange = (v: string) => {
    onStatusChange(v as StatusFilter);
  };

  const handleRoleChange = (v: string) => {
    onRoleChange(v as RoleFilter);
  };

  return (
    <>
      <div className="min-w-0 w-[200px]">
          <SearchInput placeholder="Search employees..." value={searchTerm} onValueChange={handleSearchChange} aria-label="Search employees" />
        </div>

      <Select value={deptFilter} onValueChange={onDeptChange}>
        <SelectTrigger className={cn("w-[130px]", FILTER_SELECT_TRIGGER)}>
          <SelectValue placeholder="Department" />
        </SelectTrigger>
        <SelectContent className="w-[var(--radix-select-trigger-width)]">
          <SelectItem value="All">All Depts</SelectItem>
          {departments.map((d) => (
            <SelectItem key={d} value={d}>
              {d}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={statusFilter} onValueChange={handleStatusChange}>
        <SelectTrigger className={cn("w-[120px]", FILTER_SELECT_TRIGGER)}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="w-[var(--radix-select-trigger-width)]">
          <SelectItem value="All">All Status</SelectItem>
          <SelectItem value="Active">Active</SelectItem>
          <SelectItem value="Inactive">Inactive</SelectItem>
        </SelectContent>
      </Select>

      <Select value={roleFilter} onValueChange={handleRoleChange}>
        <SelectTrigger className={cn("w-[120px]", FILTER_SELECT_TRIGGER)}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="w-[var(--radix-select-trigger-width)]">
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
        <AnimatedIconButton
          icon={XIcon}
          iconSize={14}
          variant="ghost"
          size="sm"
          className="px-2 gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors duration-200"
          onClick={onClearFilters}
          aria-label="Clear filters"
        >
          Clear
        </AnimatedIconButton>
      )}
    </>
  );
}
