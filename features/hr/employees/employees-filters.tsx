"use client";

import Link from "next/link";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface Department {
  id: number;
  name: string;
}

interface EmployeesFiltersProps {
  search: string;
  filterDept: string;
  filterStatus: string;
  departments: Department[] | undefined;
  hasFilters: boolean;
  onSearchChange: (v: string) => void;
  onDeptChange: (v: string) => void;
  onStatusChange: (v: string) => void;
  onClear: () => void;
}

export function EmployeesFilters({
  search,
  filterDept,
  filterStatus,
  departments,
  hasFilters,
  onSearchChange,
  onDeptChange,
  onStatusChange,
  onClear,
}: EmployeesFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search name, email, ID…"
          className="pl-8 h-8 w-60 text-xs"
        />
      </div>
      <Select value={filterDept} onValueChange={onDeptChange}>
        <SelectTrigger className="h-8 w-44 text-xs">
          <SelectValue placeholder="Department" />
        </SelectTrigger>
        <SelectContent className="w-[var(--radix-select-trigger-width)]">
          <SelectItem value="all" className="text-xs">
            All Departments
          </SelectItem>
          {departments?.map((d) => (
            <SelectItem key={d.id} value={String(d.id)} className="text-xs">
              {d.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filterStatus} onValueChange={onStatusChange}>
        <SelectTrigger className="h-8 w-32 text-xs">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent className="w-[var(--radix-select-trigger-width)]">
          <SelectItem value="all" className="text-xs">
            All Status
          </SelectItem>
          <SelectItem value="active" className="text-xs">
            Active
          </SelectItem>
          <SelectItem value="inactive" className="text-xs">
            Inactive
          </SelectItem>
        </SelectContent>
      </Select>
      <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
        <Link href="/hr/termination">View Terminated</Link>
      </Button>
      {hasFilters && (
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onClear}>
          <X className="h-3.5 w-3.5 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
