"use client";

import { memo } from "react";
import { toast } from "sonner";
import { StatusMapBadge, type StatusEntry } from "@/components/ui/status-map-badge";
import { Switch } from "@/components/ui/switch";
import { useUpdateOfferFulfillmentMapping } from "@/hooks/api/crm/offer-fulfillment";
import type { OfferFulfillmentComponent } from "@/hooks/api/crm/offer-fulfillment-schema";
import { getErrorMessage } from "@/lib/get-error-message";
import { RecordRowActions } from "../shared/record-row-actions";

const STATUS_MAP: Record<string, StatusEntry> = {
  active: { label: "Active", tone: "success" },
  inactive: { label: "Inactive", tone: "neutral" },
};

interface FulfillmentMappingRowProps {
  mapping: OfferFulfillmentComponent;
  variantLabel: string;
  variantSku: string | null;
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: (mapping: OfferFulfillmentComponent) => void;
  onDelete: (mapping: OfferFulfillmentComponent) => void;
}

export const FulfillmentMappingRow = memo(function FulfillmentMappingRow({
  mapping,
  variantLabel,
  variantSku,
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
}: FulfillmentMappingRowProps) {
  const update = useUpdateOfferFulfillmentMapping();
  const isActive = mapping.status === "active";

  function handleToggle(next: boolean) {
    update.mutate(
      { offerFulfillmentComponentId: mapping.offerFulfillmentComponentId, status: next ? "active" : "inactive" },
      {
        onSuccess: () => toast.success(next ? `${variantLabel} activated` : `${variantLabel} deactivated`),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function handleEdit() {
    onEdit(mapping);
  }

  function handleDelete() {
    onDelete(mapping);
  }

  return (
    <li className="flex items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{variantLabel}</p>
        <p className="truncate text-xs text-muted-foreground">
          {variantSku ? `SKU ${variantSku} · ` : ""}
          <span className="tabular-nums">{Number(mapping.quantityPerUnit)}</span>
          {` ${mapping.uom ?? "per unit"}`}
        </p>
        {mapping.notes ? <p className="truncate text-xs text-muted-foreground">{mapping.notes}</p> : null}
      </div>
      <StatusMapBadge status={mapping.status} map={STATUS_MAP} />
      <RecordRowActions
        leading={
          canUpdate ? (
            <Switch
              checked={isActive}
              onCheckedChange={handleToggle}
              disabled={update.isPending}
              aria-label={isActive ? `Deactivate ${variantLabel}` : `Activate ${variantLabel}`}
            />
          ) : null
        }
        onEdit={canUpdate ? handleEdit : undefined}
        onDelete={canDelete ? handleDelete : undefined}
        editLabel={`Edit ${variantLabel}`}
        deleteLabel={`Delete ${variantLabel}`}
      />
    </li>
  );
});
