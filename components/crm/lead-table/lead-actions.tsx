"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, Download, X } from "lucide-react";
import { toast } from "sonner";
import { Lead, TeamMember, STATUSES, PRIORITIES, LOST_REASONS } from "./types";

/* ─── Conversion Modal ─── */
interface ConversionModalProps {
  leadName: string | undefined;
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    conversionNotes: string;
    investmentInterest: string;
    estimatedAmount: string;
  }) => void;
}

export function ConversionModal({ leadName, open, onClose, onSubmit }: ConversionModalProps) {
  const [conversionNotes, setConversionNotes] = useState("");
  const [investmentInterest, setInvestmentInterest] = useState("");
  const [estimatedAmount, setEstimatedAmount] = useState("");

  const handleSubmit = useCallback(() => {
    if (!conversionNotes.trim()) {
      toast.error("Please add conversion notes");
      return;
    }
    onSubmit({
      conversionNotes: conversionNotes.trim(),
      investmentInterest: investmentInterest.trim(),
      estimatedAmount: estimatedAmount.trim(),
    });
    setConversionNotes("");
    setInvestmentInterest("");
    setEstimatedAmount("");
  }, [conversionNotes, investmentInterest, estimatedAmount, onSubmit]);

  const handleClose = useCallback(() => {
    setConversionNotes("");
    setInvestmentInterest("");
    setEstimatedAmount("");
    onClose();
  }, [onClose]);

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convert Lead: {leadName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="conversion-notes">Conversion Notes *</Label>
            <Textarea
              id="conversion-notes"
              placeholder="Describe why this lead is being converted..."
              value={conversionNotes}
              onChange={(e) => setConversionNotes(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="investment-interest">Investment Interest</Label>
            <Input
              id="investment-interest"
              placeholder="e.g., Mutual Funds, SIP, Stocks"
              value={investmentInterest}
              onChange={(e) => setInvestmentInterest(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="estimated-amount">Estimated Investment Amount</Label>
            <Input
              id="estimated-amount"
              type="number"
              placeholder="e.g., 500000"
              value={estimatedAmount}
              onChange={(e) => setEstimatedAmount(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} className="bg-emerald-600 hover:bg-emerald-700">
            Convert Lead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Lost Reason Modal ─── */
interface LostModalProps {
  leadName: string | undefined;
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { lostReason: string; lostNotes: string }) => void;
}

export function LostModal({ leadName, open, onClose, onSubmit }: LostModalProps) {
  const [lostReason, setLostReason] = useState("");
  const [lostNotes, setLostNotes] = useState("");

  const handleSubmit = useCallback(() => {
    if (!lostReason) {
      toast.error("Please select a loss reason");
      return;
    }
    onSubmit({ lostReason, lostNotes: lostNotes.trim() });
    setLostReason("");
    setLostNotes("");
  }, [lostReason, lostNotes, onSubmit]);

  const handleClose = useCallback(() => {
    setLostReason("");
    setLostNotes("");
    onClose();
  }, [onClose]);

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark as Lost: {leadName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Loss Reason *</Label>
            <Select value={lostReason} onValueChange={setLostReason}>
              <SelectTrigger><SelectValue placeholder="Select reason..." /></SelectTrigger>
              <SelectContent>
                {LOST_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lost-notes">Additional Notes</Label>
            <Textarea
              id="lost-notes"
              placeholder="Optional additional details..."
              value={lostNotes}
              onChange={(e) => setLostNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="destructive">Mark as Lost</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Bulk Actions Bar ─── */
interface BulkActionsBarProps {
  selectedIds: Set<number>;
  selectedArray: number[];
  leads: Lead[];
  teamMembers: TeamMember[];
  isAdmin: boolean;
  onBulkUpdate: (
    leadIds: number[],
    update: { status?: string; priority?: string; assignedToId?: string },
  ) => void;
  onBulkDelete: (leadIds: number[]) => void;
  onClearSelection: () => void;
}

export function BulkActionsBar({
  selectedIds,
  selectedArray,
  leads,
  teamMembers,
  isAdmin,
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

        <Select
          onValueChange={(v) => {
            onBulkUpdate(selectedArray, { status: v });
            onClearSelection();
          }}
        >
          <SelectTrigger className="h-7 w-[120px] text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          onValueChange={(v) => {
            onBulkUpdate(selectedArray, { priority: v });
            onClearSelection();
          }}
        >
          <SelectTrigger className="h-7 w-[100px] text-xs">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            {PRIORITIES.map((p) => (
              <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          onValueChange={(v) => {
            onBulkUpdate(selectedArray, { assignedToId: v });
            onClearSelection();
          }}
        >
          <SelectTrigger className="h-7 w-[130px] text-xs">
            <SelectValue placeholder="Assign" />
          </SelectTrigger>
          <SelectContent>
            {teamMembers.map((m) => (
              <SelectItem key={m.id} value={m.id} className="text-xs">
                {m.name || "Unknown"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleExport}>
          <Download className="h-3 w-3 mr-1" /> Export
        </Button>

        {isAdmin && (
          <Button
            variant="destructive"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-3 w-3 mr-1" /> Delete
          </Button>
        )}

        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onClearSelection}>
          <X className="h-3 w-3" />
        </Button>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} lead{selectedIds.size !== 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The selected lead{selectedIds.size !== 1 ? "s" : ""} will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
