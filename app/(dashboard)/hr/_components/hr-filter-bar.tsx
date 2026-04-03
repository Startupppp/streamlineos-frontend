"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, SlidersHorizontal } from "lucide-react";
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
  return (
    <Card className="border-border sticky top-0 z-30 bg-background/95 backdrop-blur-sm">
      <CardContent className="py-3">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] sm:min-w-[200px]">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              placeholder="Search by name, email, or role..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 h-9"
              aria-label="Search employees"
            />
          </div>

          {/* Department filter */}
          <Select value={deptFilter} onValueChange={onDeptChange}>
            <SelectTrigger className="h-9 w-[110px] sm:w-[130px] text-xs">
              <SelectValue placeholder="Dept: All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">Dept: All</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status filter */}
          <Select
            value={statusFilter}
            onValueChange={(v) => onStatusChange(v as StatusFilter)}
          >
            <SelectTrigger className="h-9 w-[120px] sm:w-[140px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">Status: All</SelectItem>
              <SelectItem value="Active">Status: Active</SelectItem>
              <SelectItem value="Inactive">Status: Inactive</SelectItem>
            </SelectContent>
          </Select>

          {/* Role filter */}
          <Select
            value={roleFilter}
            onValueChange={(v) => onRoleChange(v as RoleFilter)}
          >
            <SelectTrigger className="h-9 w-[100px] sm:w-[120px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">Role: All</SelectItem>
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

          {/* Clear filters */}
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            aria-label="Clear filters"
            onClick={onClearFilters}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
