"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { STATUS_OPTIONS, ENTITY_OPTIONS } from "./approvals-constants";

interface ApprovalsFilterBarProps {
  status: string;
  entityType: string;
  onStatusChange: (value: string) => void;
  onEntityTypeChange: (value: string) => void;
}

export function ApprovalsFilterBar({
  status,
  entityType,
  onStatusChange,
  onEntityTypeChange,
}: ApprovalsFilterBarProps) {
  return (
    <div className={FILTER_TOOLBAR_ROW}>
      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={entityType} onValueChange={onEntityTypeChange}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ENTITY_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
