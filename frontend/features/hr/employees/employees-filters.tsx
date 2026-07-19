"use client";

import Link from "next/link";
import { SearchInput } from "@/components/ui/search-input";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Button } from "@/components/ui/button";
import { XIcon } from "@animateicons/react/lucide";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FILTER_TOOLBAR_ROW, FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";

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
    <div className={FILTER_TOOLBAR_ROW}>
      <div className="w-60 max-w-[min(15rem,70vw)]">
          <SearchInput value={search} onValueChange={onSearchChange} placeholder="Search name, email, ID…" />
        </div>
      <Select value={filterDept} onValueChange={onDeptChange}>
        <SelectTrigger className={cn("w-44", FILTER_SELECT_TRIGGER)}>
          <SelectValue placeholder="Department" />
        </SelectTrigger>
        <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
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
        <SelectTrigger className={cn("w-32", FILTER_SELECT_TRIGGER)}>
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
      <Button variant="outline" size="sm" className="text-xs gap-1.5" asChild>
        <Link href="/hr/termination">View Terminated</Link>
      </Button>
      {hasFilters && (
        <AnimatedIconButton icon={XIcon} iconSize={14} variant="ghost" size="sm" className="text-xs gap-1.5" onClick={onClear}>
          Clear
        </AnimatedIconButton>
      )}
    </div>
  );
}
