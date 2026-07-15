"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";
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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
  };

  const handleStatusChange = (v: string) => {
    onStatusChange(v as StatusFilter);
  };

  const handleRoleChange = (v: string) => {
    onRoleChange(v as RoleFilter);
  };

  return (
    <>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search employees..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="pl-8 h-8 w-[200px] text-xs"
          aria-label="Search employees"
        />
      </div>

      <Select value={deptFilter} onValueChange={onDeptChange}>
        <SelectTrigger className="w-[130px] text-xs">
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
        <SelectTrigger className="w-[120px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="w-[var(--radix-select-trigger-width)]">
          <SelectItem value="All">All Status</SelectItem>
          <SelectItem value="Active">Active</SelectItem>
          <SelectItem value="Inactive">Inactive</SelectItem>
        </SelectContent>
      </Select>

      <Select value={roleFilter} onValueChange={handleRoleChange}>
        <SelectTrigger className="w-[120px] text-xs">
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
        <Button
          variant="ghost"
          size="sm"
          className="px-2 gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors duration-200"
          onClick={onClearFilters}
          aria-label="Clear filters"
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </Button>
      )}
    </>
  );
}
