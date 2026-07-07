"use client";

import { useCallback } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { SlaPolicy, SlaPolicyPriority } from "@/hooks/api/support/sla-policies";

const PRIORITY_BADGE: Record<SlaPolicyPriority, string> = {
  LOW: "bg-blue-50 text-blue-700 border-blue-200",
  MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
  HIGH: "bg-orange-50 text-orange-700 border-orange-200",
  URGENT: "bg-red-50 text-red-700 border-red-200",
};

interface SlaTableRowProps {
  policy: SlaPolicy;
  businessHoursName: string | null;
  onEdit: (policy: SlaPolicy) => void;
  onDeleteRequest: (id: number) => void;
}

export function SlaTableRow({ policy, businessHoursName, onEdit, onDeleteRequest }: SlaTableRowProps) {
  const handleEdit = useCallback(() => onEdit(policy), [policy, onEdit]);
  const handleDeleteRequest = useCallback(() => onDeleteRequest(policy.id), [policy.id, onDeleteRequest]);

  return (
    <TableRow className="h-8 hover:bg-muted/30 transition-colors">
      <TableCell className="text-[11px] px-2 py-1 font-medium">{policy.name}</TableCell>
      <TableCell className="text-[11px] px-2 py-1">
        {policy.priority ? (
          <Badge
            variant="outline"
            className={cn("text-[9px] h-4 px-1.5 py-0 capitalize", PRIORITY_BADGE[policy.priority])}
          >
            {policy.priority}
          </Badge>
        ) : (
          <span className="text-muted-foreground">Any</span>
        )}
      </TableCell>
      <TableCell className="text-[11px] px-2 py-1">{policy.category ?? "—"}</TableCell>
      <TableCell className="text-[11px] px-2 py-1">{businessHoursName ?? "24/7"}</TableCell>
      <TableCell className="text-[11px] px-2 py-1 text-right font-mono tabular-nums">{policy.firstResponseTargetMins}m</TableCell>
      <TableCell className="text-[11px] px-2 py-1 text-right font-mono tabular-nums">{policy.resolutionTargetMins}m</TableCell>
      <TableCell className="text-[11px] px-2 py-1">
        <Badge
          variant="outline"
          className={cn(
            "text-[9px] h-4 px-1.5 py-0",
            policy.isEnabled
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-slate-100 text-slate-600 border-slate-200",
          )}
        >
          {policy.isEnabled ? "Enabled" : "Disabled"}
        </Badge>
      </TableCell>
      <TableCell className="text-[11px] px-2 py-1 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleEdit} aria-label="Edit">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={handleDeleteRequest} aria-label="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
