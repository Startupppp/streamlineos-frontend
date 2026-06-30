"use client";

import { useCallback } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  typeFilter,
  entityTypeFilter,
  statusFilter,
  onTypeChange,
  onEntityTypeChange,
  onStatusChange,
  onClear,
  hasActiveFilters,
}: ActivityFiltersProps) {
  const handleTypeChange = useCallback(
    (v: string) => onTypeChange(v === "all" ? "" : (v as CrmActivityType)),
    [onTypeChange],
  );

  const handleEntityTypeChange = useCallback(
    (v: string) =>
      onEntityTypeChange(v === "all" ? "" : (v as CrmActivityEntityType)),
    [onEntityTypeChange],
  );

  const handleStatusChange = useCallback(
    (v: string) =>
      onStatusChange(v === "all" ? "" : (v as CrmActivityStatus)),
    [onStatusChange],
  );

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select value={typeFilter || "all"} onValueChange={handleTypeChange}>
        <SelectTrigger className="h-8 w-32 text-xs">
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

      <Select
        value={entityTypeFilter || "all"}
        onValueChange={handleEntityTypeChange}
      >
        <SelectTrigger className="h-8 w-32 text-xs">
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
        <SelectTrigger className="h-8 w-32 text-xs">
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

      {hasActiveFilters && (
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
