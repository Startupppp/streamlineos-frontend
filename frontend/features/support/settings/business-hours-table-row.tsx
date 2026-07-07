"use client";

import { useCallback } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { BusinessHours } from "@/hooks/api/support/business-hours";

interface BusinessHoursTableRowProps {
  bh: BusinessHours;
  onEdit: (bh: BusinessHours) => void;
  onDeleteRequest: (id: number) => void;
}

export function BusinessHoursTableRow({ bh, onEdit, onDeleteRequest }: BusinessHoursTableRowProps) {
  const handleEdit = useCallback(() => onEdit(bh), [bh, onEdit]);
  const handleDeleteRequest = useCallback(() => onDeleteRequest(bh.id), [bh.id, onDeleteRequest]);

  return (
    <TableRow className="h-8 hover:bg-muted/30 transition-colors">
      <TableCell className="text-[11px] px-2 py-1 font-medium">{bh.name}</TableCell>
      <TableCell className="text-[11px] px-2 py-1">{bh.timezone}</TableCell>
      <TableCell className="text-[11px] px-2 py-1">
        <Badge
          variant="outline"
          className={cn(
            "text-[9px] h-4 px-1.5 py-0",
            bh.is24x7 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-200",
          )}
        >
          {bh.is24x7 ? "24/7" : "Scheduled"}
        </Badge>
      </TableCell>
      <TableCell className="text-[11px] px-2 py-1">
        {bh.isDefault && (
          <Badge variant="outline" className="text-[9px] h-4 px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-200">
            Default
          </Badge>
        )}
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
