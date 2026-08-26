"use client";

import { useCallback, useMemo, type ReactNode } from "react";
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
import { FILTER_SELECT_TRIGGER, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";
import { useCrmOptions } from "@/hooks/api/crm/metadata";
import { activityTypeOptions } from "@/lib/renderer/crm/activity-layout";
import type {
  CrmActivityType,
  CrmActivityEntityType,
  CrmActivityStatus,
} from "@/hooks/api/crm/crm-activities";

function isCrmActivityType(v: string): v is CrmActivityType {
  return v === "CALL" || v === "EMAIL" || v === "MEETING" || v === "CUSTOM";
}

function isCrmEntityType(v: string): v is CrmActivityEntityType {
  return v === "LEAD" || v === "DEAL" || v === "CONTACT";
}

function isCrmActivityStatus(v: string): v is CrmActivityStatus {
  return v === "pending" || v === "completed" || v === "cancelled";
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
  /** Controls that belong in the filter row but are not filters — the density toggle. */
  trailing?: ReactNode;
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
  trailing,
}: ActivityFiltersProps) {
  const { data: declaredTypes } = useCrmOptions("activity_type");

  /*
    The same options the list and the log dialog read. Filtering by a type the
    dropdown does not offer is not possible, so an empty dropdown while the
    tenant's options load meant the filter silently did not exist.
  */
  const activityTypes = useMemo(() => activityTypeOptions(declaredTypes), [declaredTypes]);

  const handleSearchChange = useCallback(
    (value: string) => onSearchChange(value),
    [onSearchChange],
  );

  const handleTypeChange = useCallback(
    (v: string) => onTypeChange(isCrmActivityType(v) ? v : ""),
    [onTypeChange],
  );

  const handleEntityTypeChange = useCallback(
    (v: string) => onEntityTypeChange(isCrmEntityType(v) ? v : ""),
    [onEntityTypeChange],
  );

  const handleStatusChange = useCallback(
    (v: string) => onStatusChange(isCrmActivityStatus(v) ? v : ""),
    [onStatusChange],
  );

  return (
    <div className={FILTER_TOOLBAR_ROW}>
      <SearchInput placeholder="Search activities..." value={search} onValueChange={handleSearchChange} />

      <Select value={typeFilter || "all"} onValueChange={handleTypeChange}>
        <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-[120px]")} aria-label="Activity type">
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
        <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-[120px]")} aria-label="Related record">
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
        <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-[120px]")} aria-label="Status">
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

      {trailing ? <div className="ml-auto flex shrink-0 items-center gap-2">{trailing}</div> : null}
    </div>
  );
}
