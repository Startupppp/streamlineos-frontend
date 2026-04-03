"use client";

import { useState } from "react";
import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Trash2, Loader2 } from "lucide-react";
import { priorityConfig, statusConfig } from "./types";

interface TicketHeaderProps {
  ticketId: number | null;
  ticketNumber?: number | null;
  priority: string;
  status: string;
  title: string;
  isLoading: boolean;
  saving: boolean;
  isDeleting: boolean;
  onDelete: () => void;
}

export function TicketHeader({
  ticketId,
  ticketNumber,
  priority,
  status,
  title,
  isLoading,
  saving,
  isDeleting,
  onDelete,
}: TicketHeaderProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  const currentPriority = (priority as keyof typeof priorityConfig) || "MEDIUM";
  const statusDisplay = statusConfig[status] || {
    label: status,
    color: "bg-slate-100 text-slate-700",
  };

  return (
    <div className="border-b bg-gradient-to-r from-primary/5 via-transparent to-transparent px-6 py-4">
      <SheetHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <Badge variant="outline" className="font-mono text-xs shrink-0">
                #{ticketNumber ?? ticketId}
              </Badge>
              {!isLoading && (
                <>
                  <Badge
                    className={
                      priorityConfig[currentPriority]?.color ||
                      priorityConfig.MEDIUM.color
                    }
                  >
                    {priorityConfig[currentPriority]?.label || "Medium"}
                  </Badge>
                  <Badge className={statusDisplay.color}>
                    {statusDisplay.label}
                  </Badge>
                  {saving && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Saving...
                    </span>
                  )}
                </>
              )}
            </div>
            <SheetTitle className="text-xl font-semibold leading-tight">
              {isLoading ? "Loading..." : title}
            </SheetTitle>
          </div>

          {!isLoading && ticketId && (
            <Popover open={deleteOpen} onOpenChange={setDeleteOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none text-destructive">
                      Delete Ticket
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      This action cannot be undone.
                    </p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={onDelete}
                      disabled={isDeleting}
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </SheetHeader>
    </div>
  );
}
