"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSimpleClientsList } from "@/lib/api/hooks/crm";
import { STAGES } from "./upsell-list";
import type { OppStage } from "./upsell-list";

type OppType = "upsell" | "cross_sell";

export interface CreateFormState {
  clientId: string;
  title: string;
  type: OppType;
  stage: OppStage;
  value: string;
  expectedCloseDate: string;
  notes: string;
}

export const INITIAL_FORM: CreateFormState = {
  clientId: "",
  title: "",
  type: "upsell",
  stage: "identified",
  value: "",
  expectedCloseDate: "",
  notes: "",
};

interface UpsellFormSheetProps {
  open: boolean;
  form: CreateFormState;
  isCreating: boolean;
  onFormChange: (updates: Partial<CreateFormState>) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function UpsellFormSheet({
  open,
  form,
  isCreating,
  onFormChange,
  onSubmit,
  onCancel,
}: UpsellFormSheetProps) {
  const { data: clientsList = [] } = useSimpleClientsList();

  const handleClientChange = useCallback(
    (v: string) => onFormChange({ clientId: v }),
    [onFormChange]
  );
  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      onFormChange({ title: e.target.value }),
    [onFormChange]
  );
  const handleTypeChange = useCallback(
    (v: string) => onFormChange({ type: v as OppType }),
    [onFormChange]
  );
  const handleStageChange = useCallback(
    (v: string) => onFormChange({ stage: v as OppStage }),
    [onFormChange]
  );
  const handleValueChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      onFormChange({ value: e.target.value }),
    [onFormChange]
  );
  const handleDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      onFormChange({ expectedCloseDate: e.target.value }),
    [onFormChange]
  );
  const handleNotesChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) =>
      onFormChange({ notes: e.target.value }),
    [onFormChange]
  );

  const handleOpenChange = useCallback((v: boolean) => { if (!v) onCancel(); }, [onCancel]);
  const handleCancel = useCallback(() => onCancel(), [onCancel]);
  const handleSubmit = useCallback(() => onSubmit(), [onSubmit]);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add Opportunity</SheetTitle>
        </SheetHeader>

        <div className="py-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="opp-client">Client *</Label>
            <Select value={form.clientId} onValueChange={handleClientChange}>
              <SelectTrigger id="opp-client">
                <SelectValue placeholder="Select client…" />
              </SelectTrigger>
              <SelectContent>
                {clientsList.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="opp-title">Title *</Label>
            <Input
              id="opp-title"
              placeholder="e.g. Upgrade to Premium Plan"
              value={form.title}
              onChange={handleTitleChange}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="opp-type">Type</Label>
            <Select value={form.type} onValueChange={handleTypeChange}>
              <SelectTrigger id="opp-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upsell">Upsell</SelectItem>
                <SelectItem value="cross_sell">Cross-sell</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="opp-stage">Stage</Label>
            <Select value={form.stage} onValueChange={handleStageChange}>
              <SelectTrigger id="opp-stage">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="opp-value">Value (₹)</Label>
            <Input
              id="opp-value"
              type="number"
              placeholder="0"
              value={form.value}
              onChange={handleValueChange}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="opp-date">Expected Close Date</Label>
            <Input
              id="opp-date"
              type="date"
              value={form.expectedCloseDate}
              onChange={handleDateChange}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="opp-notes">Notes</Label>
            <Textarea
              id="opp-notes"
              placeholder="Any context or notes…"
              rows={3}
              value={form.notes}
              onChange={handleNotesChange}
            />
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" className="flex-1" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleSubmit}
            disabled={!form.clientId || !form.title.trim() || isCreating}
          >
            {isCreating ? "Creating…" : "Create"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

interface DeleteOpportunityDialogProps {
  open: boolean;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteOpportunityDialog({
  open,
  isDeleting,
  onConfirm,
  onCancel,
}: DeleteOpportunityDialogProps) {
  const handleOpenChange = useCallback(
    (v: boolean) => {
      if (!v) onCancel();
    },
    [onCancel]
  );

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Opportunity?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove the opportunity. This action cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 hover:bg-red-700"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
