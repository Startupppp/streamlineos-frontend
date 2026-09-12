"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Trash2, Download, X } from "lucide-react";
import { toast } from "sonner";
import { LEAD_PRIORITY_OPTIONS, LEAD_STATUS_OPTIONS } from "@/lib/renderer/crm/lead-layout";
import type { Lead, LeadPriority, PipelineStatus } from "@/types/leads";
import type { TeamMember } from "./leads-types";
import { AIBulkScoreButton } from "./ai-bulk-score-button";

interface BulkActionsBarProps {
  selectedIds: Set<number>;
  selectedArray: number[];
  leads: Lead[];
  teamMembers: TeamMember[];
  canUpdate: boolean;
  canAssign: boolean;
  canDelete: boolean;
  onBulkUpdate: (
    leadIds: number[],
    update: { status?: PipelineStatus; priority?: LeadPriority; assignedToId?: string },
  ) => void;
  onBulkDelete: (leadIds: number[]) => void;
  onClearSelection: () => void;
}

export function BulkActionsBar({
  selectedIds,
  selectedArray,
  leads,
  teamMembers,
  canUpdate,
  canAssign,
  canDelete,
  onBulkUpdate,
  onBulkDelete,
  onClearSelection,
}: BulkActionsBarProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleExport = useCallback(async () => {
    try {
      const { downloadXlsx } = await import("@/lib/export/xlsx-utils");
      const selected = leads.filter((l) => selectedIds.has(l.id));
      await downloadXlsx("leads-selected.xlsx", [{
        name: "Leads",
        columns: [
          { header: "Name",     key: "name",     width: 20 },
          { header: "Email",    key: "email",    width: 25 },
          { header: "Phone",    key: "phone",    width: 15 },
          { header: "Status",   key: "status",   width: 12 },
          { header: "Priority", key: "priority", width: 10 },
          { header: "Value",    key: "value",    width: 15 },
        ],
        rows: selected.map((l) => ({
          name:     l.name,
          email:    l.email    || "",
          phone:    l.phone    || "",
          status:   l.status,
          priority: l.priority || "",
          value:    l.potentialValue || "",
        })),
      }]);
      toast.success("Exported");
    } catch {
      toast.error("Export failed");
    }
  }, [leads, selectedIds]);

  const handleBulkStatus = useCallback((v: string) => {
    const next = LEAD_STATUS_OPTIONS.find((option) => option.value === v);
    if (!next) return;
    onBulkUpdate(selectedArray, { status: next.value });
    onClearSelection();
  }, [onBulkUpdate, selectedArray, onClearSelection]);

  const handleBulkPriority = useCallback((v: string) => {
    const next = LEAD_PRIORITY_OPTIONS.find((option) => option.value === v);
    if (!next) return;
    onBulkUpdate(selectedArray, { priority: next.value });
    onClearSelection();
  }, [onBulkUpdate, selectedArray, onClearSelection]);

  const handleBulkAssign = useCallback((v: string) => {
    onBulkUpdate(selectedArray, { assignedToId: v });
    onClearSelection();
  }, [onBulkUpdate, selectedArray, onClearSelection]);

  const handleOpenDeleteDialog = useCallback(() => setDeleteDialogOpen(true), []);

  const handleConfirmDelete = useCallback(() => {
    onBulkDelete(selectedArray);
    onClearSelection();
    setDeleteDialogOpen(false);
  }, [onBulkDelete, selectedArray, onClearSelection]);

  if (selectedIds.size === 0) return null;

  return (
    <>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-background border border-border shadow-lg rounded-lg px-4 py-2.5 flex items-center gap-3 animate-in slide-in-from-bottom-4">
        <span className="text-sm font-medium">{selectedIds.size} selected</span>
        <div className="h-4 w-px bg-border" />

        {canUpdate && <Select onValueChange={handleBulkStatus}>
          <SelectTrigger className="w-[120px] text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {LEAD_STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value} className="text-xs">{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>}

        {canUpdate && <Select onValueChange={handleBulkPriority}>
          <SelectTrigger className="w-[100px] text-xs">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            {LEAD_PRIORITY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value} className="text-xs">{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>}

        {canAssign && <Select onValueChange={handleBulkAssign}>
          <SelectTrigger className="w-[130px] text-xs">
            <SelectValue placeholder="Assign" />
          </SelectTrigger>
          <SelectContent>
            {teamMembers.map((m) => (
              <SelectItem key={m.id} value={m.id} className="text-xs">
                {m.name || "Unknown"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>}

        <Button variant="outline" size="sm" className="text-xs" onClick={handleExport}>
          <Download className="h-3 w-3 mr-1" /> Export
        </Button>

        <AIBulkScoreButton leadIds={selectedArray.slice(0, 50)} onComplete={onClearSelection} />

        {canDelete && (
          <Button
            variant="destructive"
            size="sm"
            className="text-xs"
            onClick={handleOpenDeleteDialog}
          >
            <Trash2 className="h-3 w-3 mr-1" /> Delete
          </Button>
        )}

        <Button variant="ghost" size="sm" className="text-xs" onClick={onClearSelection}>
          <X className="h-3 w-3" />
        </Button>
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={`Delete ${selectedIds.size} lead${selectedIds.size !== 1 ? "s" : ""}?`}
        description={`This action cannot be undone. The selected lead${selectedIds.size !== 1 ? "s" : ""} will be permanently deleted.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
