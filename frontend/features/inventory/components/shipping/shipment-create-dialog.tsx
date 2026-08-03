"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppDialog } from "@/components/shared";
import { LoadingButton } from "@/components/ui/loading-button";
import { useCreateShipment } from "@/hooks/api/inventory/shipping";
import { getErrorMessage } from "@/lib/get-error-message";

export interface ShipmentCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShipmentCreateDialog({ open, onOpenChange }: ShipmentCreateDialogProps) {
  const [soId, setSoId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const createMutation = useCreateShipment();

  function handleClose(): void {
    onOpenChange(false);
    setSoId("");
    setNotes("");
  }

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) {
      setSoId("");
      setNotes("");
    }
    onOpenChange(nextOpen);
  }

  function handleSoIdChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setSoId(e.target.value);
  }

  function handleNotesChange(e: React.ChangeEvent<HTMLTextAreaElement>): void {
    setNotes(e.target.value);
  }

  async function handleSubmit(): Promise<void> {
    try {
      await createMutation.mutateAsync({
        soId: soId ? Number(soId) : undefined,
        notes: notes.trim() || undefined,
      });
      toast.success("Shipment created");
      handleClose();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="New Shipment"
      description="Create a draft shipment. You can assign a carrier and packages after creation."
      footer={
        <div className="grid grid-cols-2 gap-2 w-full">
          <Button variant="outline" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <LoadingButton
            size="sm"
            onClick={handleSubmit}
            isPending={createMutation.isPending}
            loadingText="Creating…"
          >
            Create
          </LoadingButton>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="new-ship-so" className="text-xs">Sales Order ID (optional)</Label>
          <Input
            id="new-ship-so"
            type="number"
            min="1"
            placeholder="Leave blank for direct shipment"
            value={soId}
            onChange={handleSoIdChange}
            className="text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-ship-notes" className="text-xs">Notes (optional)</Label>
          <Textarea
            id="new-ship-notes"
            placeholder="Any shipping instructions"
            value={notes}
            onChange={handleNotesChange}
            rows={3}
            className="resize-none text-sm"
          />
        </div>
      </div>
    </AppDialog>
  );
}
