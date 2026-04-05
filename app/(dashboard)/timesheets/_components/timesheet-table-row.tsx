"use client";

import { useCallback } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatHoursMinutes } from "@/lib/format-utils";
import { MoreVertical, Edit, Trash2 } from "lucide-react";

const STATUS_BADGE_STYLES: Record<string, string> = {
  APPROVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  REJECTED: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
};

const STATUS_LABELS: Record<string, string> = {
  APPROVED: "Approved",
  PENDING: "Pending",
  REJECTED: "Rejected",
};

const PROJECT_DOT_COLORS = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-emerald-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-cyan-500",
  "bg-indigo-500",
  "bg-pink-500",
] as const;

function getProjectDotColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PROJECT_DOT_COLORS[Math.abs(hash) % PROJECT_DOT_COLORS.length];
}

export interface EditEntry {
  id: number;
  description: string | null;
  hours: string;
  status: string;
}

export interface TimeEntry {
  id: number;
  date: string;
  hours: string | number | null;
  description: string | null;
  status: string | null;
  ticket?: { project?: { name?: string | null } | null } | null;
}

interface TimesheetTableRowProps {
  entry: TimeEntry;
  onEdit: (entry: EditEntry) => void;
  onDelete: (id: number) => void;
}

export function TimesheetTableRow({ entry, onEdit, onDelete }: TimesheetTableRowProps) {
  const canEdit = entry.status === "PENDING";
  const projectName = entry.ticket?.project?.name || "Unknown";
  const dotColor = getProjectDotColor(projectName);
  const statusKey = entry.status || "PENDING";

  const handleEdit = useCallback(() => {
    onEdit({
      id: entry.id,
      description: entry.description,
      hours: entry.hours?.toString() || "0",
      status: entry.status || "PENDING",
    });
  }, [entry, onEdit]);

  const handleDelete = useCallback(() => {
    onDelete(entry.id);
  }, [entry.id, onDelete]);

  return (
    <TableRow className="hover:bg-muted/30 transition-colors">
      <TableCell className="px-6 py-5 whitespace-nowrap">
        <span className="text-sm font-semibold">
          {format(new Date(entry.date), "MMM dd, yyyy")}
        </span>
      </TableCell>
      <TableCell className="px-6 py-5">
        <div className="flex items-center gap-2">
          <div className={`size-2 rounded-full shrink-0 ${dotColor}`} />
          <span className="text-sm font-medium">{projectName}</span>
        </div>
      </TableCell>
      <TableCell className="px-6 py-5 max-w-xs">
        <p className="text-sm text-muted-foreground truncate">
          {entry.description || "No description"}
        </p>
      </TableCell>
      <TableCell className="px-6 py-5 whitespace-nowrap">
        <span className="text-sm font-medium">
          {formatHoursMinutes(entry.hours)}
        </span>
      </TableCell>
      <TableCell className="px-6 py-5 whitespace-nowrap">
        <Badge className={`text-xs font-bold border-0 rounded-full px-2.5 py-0.5 ${STATUS_BADGE_STYLES[statusKey]}`}>
          {STATUS_LABELS[statusKey] || statusKey}
        </Badge>
      </TableCell>
      <TableCell className="px-6 py-5 text-right">
        {canEdit ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                aria-label="More options"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <span className="text-muted-foreground/30 inline-flex h-8 w-8 items-center justify-center">
            <MoreVertical className="h-4 w-4" />
          </span>
        )}
      </TableCell>
    </TableRow>
  );
}
