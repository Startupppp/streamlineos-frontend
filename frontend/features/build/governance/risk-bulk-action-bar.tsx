"use client";

import { X } from "lucide-react";
import { useCan } from "@/hooks/api/access";
import type { RiskStatus } from "@/types/projects";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const RISK_STATUS_OPTIONS: Array<{ value: RiskStatus; label: string }> = [
  { value: "open", label: "Open" },
  { value: "mitigating", label: "Mitigating" },
  { value: "monitoring", label: "Monitoring" },
  { value: "accepted", label: "Accepted" },
  { value: "closed", label: "Closed" },
];

const RISK_STATUS_SET = new Set<string>(["open", "mitigating", "monitoring", "accepted", "closed"]);

function isRiskStatus(v: string): v is RiskStatus {
  return RISK_STATUS_SET.has(v);
}

export interface RiskBulkActionBarProps {
  selectedCount: number;
  onBulkStatus: (status: RiskStatus) => void;
  onBulkOwner: (ownerId: string) => void;
  members: Array<{ id: string; name?: string | null; email: string }>;
  onClear: () => void;
}

export function RiskBulkActionBar({
  selectedCount,
  onBulkStatus,
  onBulkOwner,
  members,
  onClear,
}: RiskBulkActionBarProps) {
  const canManage = useCan("build:risks:manage");
  if (!canManage) return null;

  return (
    <div
      className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm"
      data-testid="risk-bulk-action-bar"
    >
      <Badge variant="secondary">{selectedCount} selected</Badge>
      <Select onValueChange={(v) => { if (isRiskStatus(v)) onBulkStatus(v); }}>
        <SelectTrigger className="h-8 w-36">
          <SelectValue placeholder="Set Status" />
        </SelectTrigger>
        <SelectContent>
          {RISK_STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select onValueChange={onBulkOwner}>
        <SelectTrigger className="h-8 w-36">
          <SelectValue placeholder="Assign Owner" />
        </SelectTrigger>
        <SelectContent>
          {members.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.name ?? m.email}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Clear selection"
        onClick={onClear}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
