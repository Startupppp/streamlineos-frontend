"use client";

import { memo } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Sprint {
  id: number;
  name: string;
  status: string;
}

interface Member {
  id: string;
  name?: string | null;
  firstName?: string | null;
}

interface BulkActionBarProps {
  selectedCount: number;
  members: Member[];
  sprints: Sprint[];
  onBulkStatus: (value: string) => void;
  onBulkPriority: (value: string) => void;
  onBulkAssignee: (value: string) => void;
  onBulkSprint: (value: string) => void;
  onClear: () => void;
}

export const BulkActionBar = memo(function BulkActionBar({
  selectedCount,
  members,
  sprints,
  onBulkStatus,
  onBulkPriority,
  onBulkAssignee,
  onBulkSprint,
  onClear,
}: BulkActionBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 bg-background border-b border-border px-4 py-2 mb-2">
      <span className="text-sm font-medium text-primary shrink-0">{selectedCount} selected</span>
      <div className="flex items-center gap-2 ml-auto flex-wrap">
        <Select onValueChange={onBulkStatus}>
          <SelectTrigger className="h-7 text-xs w-36">
            <SelectValue placeholder="Set Status" />
          </SelectTrigger>
          <SelectContent>
            {["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"].map((s) => (
              <SelectItem key={s} value={s} className="text-xs">
                {s.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select onValueChange={onBulkPriority}>
          <SelectTrigger className="h-7 text-xs w-36">
            <SelectValue placeholder="Set Priority" />
          </SelectTrigger>
          <SelectContent>
            {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
              <SelectItem key={p} value={p} className="text-xs">
                {p.charAt(0) + p.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select onValueChange={onBulkAssignee}>
          <SelectTrigger className="h-7 text-xs w-36">
            <SelectValue placeholder="Assign to" />
          </SelectTrigger>
          <SelectContent>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id} className="text-xs">
                {m.firstName ?? m.name ?? m.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select onValueChange={onBulkSprint}>
          <SelectTrigger className="h-7 text-xs w-40">
            <SelectValue placeholder="Move to Sprint" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="backlog" className="text-xs">Backlog (remove sprint)</SelectItem>
            {sprints.filter((s) => s.status !== "COMPLETED").map((s) => (
              <SelectItem key={s.id} value={String(s.id)} className="text-xs">{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onClear}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
});
