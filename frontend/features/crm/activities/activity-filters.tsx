"use client";

import { useCallback, useMemo } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";
import { useCrmOptions } from "@/hooks/api/crm/metadata";
import type {
  CrmActivityType,
  CrmActivityEntityType,
  CrmActivityStatus,
} from "@/hooks/api/crm/crm-activities";

function isCrmActivityType(v: string): v is CrmActivityType {
  return v === "CALL" || v === "EMAIL" || v === "MEETING" || v === "CUSTOM";
}

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
  const { data: activityTypeOptions } = useCrmOptions("activity_type");

  const activityTypes = useMemo<Array<{ value: CrmActivityType; label: string }>>(() => {
    if (!activityTypeOptions) return [];
    const matched: Array<{ value: CrmActivityType; label: string }> = [];
    for (const o of activityTypeOptions) {
      if (isCrmActivityType(o.key)) {
        matched.push({ value: o.key, label: o.label });
      }
    }
    return matched;
  }, [activityTypeOptions]);

  const handleSearchChange = useCallback(
    (value: string) => onSearchChange(value),
    [onSearchChange],
  );

  const handleTypeChange = useCallback(
    (v: string) => onTypeChange(v === "all" ? "" : isCrmActivityType(v) ? v : ""),
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
      <div className="min-w-0 min-w-[140px] flex-1 max-w-[240px]">
          <SearchInput placeholder="Search activities..." value={search} onValueChange={handleSearchChange} />
        </div>

      <Select value={typeFilter || "all"} onValueChange={handleTypeChange}>
        <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-[120px] text-xs")}>
          <SelectValue placeholder="All Types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-xs">All Types</SelectItem>
          {activityTypes.map((t) => (
            <SelectItem key={t.value} value={t.value} className="text-xs">
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={entityTypeFilter || "all"} onValueChange={handleEntityTypeChange}>
        <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-[120px] text-xs")}>
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
        <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-[120px] text-xs")}>
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
          className="px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
