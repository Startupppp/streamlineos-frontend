"use client";

import { useCallback } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  CrmActivityType,
  CrmActivityEntityType,
  CrmActivityStatus,
} from "@/hooks/api/crm/crm-activities";

const ACTIVITY_TYPES: Array<{ value: CrmActivityType; label: string }> = [
  { value: "CALL",    label: "Calls"    },
  { value: "EMAIL",   label: "Emails"   },
  { value: "MEETING", label: "Meetings" },
  { value: "CUSTOM",  label: "Tasks"    },
];

const ENTITY_TYPES: Array<{ value: CrmActivityEntityType; label: string }> = [
  { value: "LEAD",    label: "Leads"    },
  { value: "DEAL",    label: "Deals"    },
  { value: "CONTACT", label: "Contacts" },
];

const STATUSES: Array<{ value: CrmActivityStatus; label: string }> = [
  { value: "pending",   label: "Pending"   },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

interface ActivityFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  typeFilter: CrmActivityType | "";
  entityTypeFilter: CrmActivityEntityType | "";
  statusFilter: CrmActivityStatus | "";
  onTypeChange: (v: CrmActivityType | "") => void;
  onEntityTypeChange: (v: CrmActivityEntityType | "") => void;
  onStatusChange: (v: CrmActivityStatus | "") => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}

export function ActivityFilters({
  search,
  onSearchChange,
  typeFilter,
  entityTypeFilter,
  statusFilter,
  onTypeChange,
  onEntityTypeChange,
  onStatusChange,
  onClear,
  hasActiveFilters,
}: ActivityFiltersProps) {
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value),
    [onSearchChange],
  );

  const handleTypeChange = useCallback(
    (v: string) => onTypeChange(v === "all" ? "" : (v as CrmActivityType)),
    [onTypeChange],
  );

  const handleEntityTypeChange = useCallback(
    (v: string) => onEntityTypeChange(v === "all" ? "" : (v as CrmActivityEntityType)),
    [onEntityTypeChange],
  );

  const handleStatusChange = useCallback(
    (v: string) => onStatusChange(v === "all" ? "" : (v as CrmActivityStatus)),
    [onStatusChange],
  );

  return (
    <div className="flex items-center gap-2 flex-wrap w-full">
      <div className="relative min-w-[140px] flex-1 max-w-[240px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search activities..."
          value={search}
          onChange={handleSearchChange}
          className="pl-8 h-8 text-xs"
        />
      </div>

      <Select value={typeFilter || "all"} onValueChange={handleTypeChange}>
        <SelectTrigger className="h-8 w-[120px] text-xs">
          <SelectValue placeholder="All Types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-xs">All Types</SelectItem>
          {ACTIVITY_TYPES.map((t) => (
            <SelectItem key={t.value} value={t.value} className="text-xs">
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={entityTypeFilter || "all"} onValueChange={handleEntityTypeChange}>
        <SelectTrigger className="h-8 w-[120px] text-xs">
          <SelectValue placeholder="All Entities" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-xs">All Entities</SelectItem>
          {ENTITY_TYPES.map((e) => (
            <SelectItem key={e.value} value={e.value} className="text-xs">
              {e.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={statusFilter || "all"} onValueChange={handleStatusChange}>
        <SelectTrigger className="h-8 w-[120px] text-xs">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-xs">All Status</SelectItem>
          {STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value} className="text-xs">
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {(hasActiveFilters || !!search) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
