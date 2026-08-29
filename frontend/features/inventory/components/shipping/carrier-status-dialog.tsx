"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { EntityFormDialog } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import { useRecordCarrierStatus } from "@/hooks/api/inventory/shipping";
import { CarrierStatusFormFields } from "./carrier-status-form-fields";
import {
  type CarrierStatusFormInput,
  carrierStatusFormSchema,
  nowAsLocalInputValue,
  toIsoInstant,
} from "./carrier-status-schema";

interface CarrierStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipmentId: number;
  trackingNumber: string;
}

/**
 * B7, item 2 — the in-app POST, which is the carrier adapter until a real one
 * is enabled.
 *
 * The shipment is addressed by our own tracking number rather than by its id,
 * because that is the contract a real carrier will be held to: a courier gets to
 * say what happened to a parcel it can name, never which record of ours to
 * write. Entering an update by hand goes through the identical path, so the
 * manual case and the first real integration cannot drift.
 */
export function CarrierStatusDialog({
  open,
  onOpenChange,
  shipmentId,
  trackingNumber,
}: CarrierStatusDialogProps) {
  const recordStatus = useRecordCarrierStatus();

  const handleSubmit = (data: CarrierStatusFormInput) => {
    recordStatus.mutate(
      {
        shipmentId,
        trackingNumber,
        status: data.status,
        occurredAt: toIsoInstant(data.occurredAt),
        description: data.description?.trim() || undefined,
      },
      {
        onSuccess: (result) => {
          // The API distinguishes "recorded" from "moved the shipment", and so
          // does this: telling someone their update was applied when it was
          // filed behind a later scan is the lie the monotonic rule exists to
          // avoid.
          toast.success(
            result.advanced
              ? `Tracking updated to ${result.status.toLowerCase().replace("_", " ")}`
              : "Update recorded — the shipment is already further along",
          );
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  };

  return (
    <EntityFormDialog<CarrierStatusFormInput>
      open={open}
      onOpenChange={onOpenChange}
      title="Record tracking update"
      description={`Against tracking number ${trackingNumber}.`}
      resolver={zodResolver(carrierStatusFormSchema)}
      defaultValues={{
        status: "SHIPPED",
        occurredAt: nowAsLocalInputValue(),
        description: "",
      }}
      onSubmit={handleSubmit}
      isSubmitting={recordStatus.isPending}
      submitLabel="Record update"
      resetOnOpen
    >
      {(form) => <CarrierStatusFormFields form={form} />}
    </EntityFormDialog>
  );
}
