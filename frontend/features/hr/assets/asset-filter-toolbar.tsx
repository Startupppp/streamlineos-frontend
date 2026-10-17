"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { FILTER_TOOLBAR_ROW, FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { ASSET_TYPES } from "./asset-constants";

export function AssetFilterToolbar({
  statusFilter,
  categoryFilter,
  assignmentFilter,
  onStatusChange,
  onCategoryChange,
  onAssignmentChange,
}: {
  statusFilter?: string;
  categoryFilter?: string;
  assignmentFilter?: string;
  onStatusChange: (v: string) => void;
  onCategoryChange: (v: string) => void;
  onAssignmentChange: (v: string) => void;
}) {
  return (
    <div className={FILTER_TOOLBAR_ROW}>
      <Select value={statusFilter ?? "all"} onValueChange={onStatusChange}>
        <SelectTrigger className={cn("w-[148px]", FILTER_SELECT_TRIGGER)} aria-label="Filter by status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="AVAILABLE">Available</SelectItem>
          <SelectItem value="ASSIGNED">Assigned</SelectItem>
          <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
          <SelectItem value="RETIRED">Retired</SelectItem>
        </SelectContent>
      </Select>
      <Select value={categoryFilter ?? "all"} onValueChange={onCategoryChange}>
        <SelectTrigger className={cn("w-[140px]", FILTER_SELECT_TRIGGER)} aria-label="Filter by type">
          <SelectValue placeholder="All types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          {ASSET_TYPES.map((t) => (
            <SelectItem key={t} value={t}>
              {t}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={assignmentFilter ?? "all"} onValueChange={onAssignmentChange}>
        <SelectTrigger className={cn("w-[148px]", FILTER_SELECT_TRIGGER)} aria-label="Filter by assignment">
          <SelectValue placeholder="All assignments" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All assignments</SelectItem>
          <SelectItem value="assigned">Assigned</SelectItem>
          <SelectItem value="unassigned">Unassigned</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
