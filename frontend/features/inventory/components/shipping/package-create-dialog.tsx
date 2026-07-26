"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppDialog } from "@/components/shared";
import { LoadingButton } from "@/components/ui/loading-button";
import { useCreatePackage } from "@/hooks/api/inventory/shipping";
import { getErrorMessage } from "@/lib/get-error-message";

export interface PackageCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PackageCreateDialog({ open, onOpenChange }: PackageCreateDialogProps) {
  const [shipmentId, setShipmentId] = useState<string>("");
  const createMutation = useCreatePackage();

  function handleClose(): void {
    onOpenChange(false);
    setShipmentId("");
  }

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) setShipmentId("");
    onOpenChange(nextOpen);
  }

  function handleShipmentIdChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setShipmentId(e.target.value);
  }

  async function handleSubmit(): Promise<void> {
    try {
      await createMutation.mutateAsync({
        shipmentId: shipmentId ? Number(shipmentId) : undefined,
      });
      toast.success("Package created");
      handleClose();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="New Package"
      description="Create an empty package. You can add lines after creation."
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
          <Label htmlFor="new-pkg-shipment" className="text-xs">Shipment ID (optional)</Label>
          <Input
            id="new-pkg-shipment"
            type="number"
            min="1"
            placeholder="Leave blank if unassigned"
            value={shipmentId}
            onChange={handleShipmentIdChange}
            className="text-sm"
          />
        </div>
      </div>
    </AppDialog>
  );
}
