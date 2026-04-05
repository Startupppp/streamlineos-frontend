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
    !!searchTerm ||
    deptFilter !== "All" ||
    statusFilter !== "Active" ||
    roleFilter !== "All";

  return (
    <>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search employees..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 h-8 w-[200px] text-sm"
          aria-label="Search employees"
        />
      </div>

      <Select value={deptFilter} onValueChange={onDeptChange}>
        <SelectTrigger className="h-8 w-[130px] text-xs">
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
        <SelectTrigger className="h-8 w-[120px] text-xs">
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
        <SelectTrigger className="h-8 w-[120px] text-xs">
          <SelectValue />
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
    </>
  );
}
