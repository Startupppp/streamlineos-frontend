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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Trash2, Download, X } from "lucide-react";
import { toast } from "sonner";
import { LEAD_PRIORITY_OPTIONS, LEAD_STATUS_OPTIONS } from "@/lib/renderer/crm/lead-layout";
import type { Lead, LeadPriority, PipelineStatus } from "@/types/leads";
import type { TeamMember } from "./leads-types";
import { AIBulkScoreButton } from "./ai-bulk-score-button";

const LOST_REASONS = [
  "Not interested",
  "Budget constraints",
  "Chose competitor",
  "No response",
  "Bad timing",
  "Invalid lead",
  "Duplicate",
  "Other",
] as const;

interface ConversionModalProps {
  leadName: string | undefined;
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    conversionNotes: string;
    investmentInterest: string;
    estimatedAmount: string;
    createDeal: boolean;
    dealName: string;
  }) => void;
  canCreateDeal: boolean;
}

export function ConversionModal({ leadName, open, onClose, onSubmit, canCreateDeal }: ConversionModalProps) {
  const [conversionNotes, setConversionNotes] = useState("");
  const [investmentInterest, setInvestmentInterest] = useState("");
  const [estimatedAmount, setEstimatedAmount] = useState("");
  const [createDeal, setCreateDeal] = useState(canCreateDeal);
  const [dealName, setDealName] = useState("");

  const handleSubmit = useCallback(() => {
    if (!conversionNotes.trim()) {
      toast.error("Please add conversion notes");
      return;
    }
    if (createDeal && !dealName.trim()) {
      toast.error("Please enter a deal name");
      return;
    }
    onSubmit({
      conversionNotes: conversionNotes.trim(),
      investmentInterest: investmentInterest.trim(),
      estimatedAmount: estimatedAmount.trim(),
      createDeal,
      dealName: dealName.trim() || `Deal - ${leadName}`,
    });
    setConversionNotes("");
    setInvestmentInterest("");
    setEstimatedAmount("");
    setCreateDeal(canCreateDeal);
    setDealName("");
  }, [conversionNotes, investmentInterest, estimatedAmount, createDeal, dealName, leadName, onSubmit, canCreateDeal]);

  const handleClose = useCallback(() => {
    setConversionNotes("");
    setInvestmentInterest("");
    setEstimatedAmount("");
    setCreateDeal(canCreateDeal);
    setDealName("");
    onClose();
  }, [onClose, canCreateDeal]);

  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (isOpen && leadName && !dealName) {
      setDealName(`Deal - ${leadName}`);
    }
    if (!isOpen) handleClose();
  }, [leadName, dealName, handleClose]);

  const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setConversionNotes(e.target.value), []);
  const handleInvestmentChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setInvestmentInterest(e.target.value), []);
  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setEstimatedAmount(e.target.value), []);
  const handleCreateDealChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setCreateDeal(e.target.checked), []);
  const handleDealNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setDealName(e.target.value), []);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
              onChange={handleNotesChange}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="investment-interest">Investment Interest</Label>
            <Input
              id="investment-interest"
              placeholder="e.g., Mutual Funds, SIP, Stocks"
              value={investmentInterest}
              onChange={handleInvestmentChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="estimated-amount">Estimated Investment Amount (₹)</Label>
            <Input
              id="estimated-amount"
              type="number"
              placeholder="e.g., 500000"
              value={estimatedAmount}
              onChange={handleAmountChange}
            />
          </div>

          {canCreateDeal && (
            <label className="flex items-center gap-2.5 rounded-lg border bg-muted/30 px-3 py-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={createDeal}
                onChange={handleCreateDealChange}
                className="h-4 w-4 rounded border-input accent-gold"
              />
              <div>
                <p className="text-sm font-medium leading-none">Auto-create Deal</p>
                <p className="text-dense text-muted-foreground mt-0.5">Create a new deal pre-filled with lead data</p>
              </div>
            </label>
          )}

          {createDeal && (
            <div className="space-y-2">
              <Label htmlFor="deal-name">Deal Name *</Label>
              <Input
                id="deal-name"
                placeholder="e.g., Investment - Rahul Sharma"
                value={dealName}
                onChange={handleDealNameChange}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} className="bg-status-success-fill hover:bg-status-success-fill-hover text-white">
            {createDeal ? "Convert & Create Deal" : "Convert Lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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

  const handleLostOpenChange = useCallback((o: boolean) => { if (!o) handleClose(); }, [handleClose]);
  const handleLostNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setLostNotes(e.target.value), []);

  return (
    <Dialog open={open} onOpenChange={handleLostOpenChange}>
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
              onChange={handleLostNotesChange}
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

        <Button
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={onClearSelection}
          aria-label="Clear selection"
        >
          <X className="h-3 w-3" aria-hidden="true" />
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
