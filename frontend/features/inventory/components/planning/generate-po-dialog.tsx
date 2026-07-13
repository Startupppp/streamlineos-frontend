"use client";

import { toast } from "sonner";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  useGeneratePO,
  type ReplenishmentSuggestion,
} from "@/hooks/api/inventory/planning";

interface VendorGroup {
  vendorId: number;
  vendorName: string;
  items: ReplenishmentSuggestion[];
  totalQty: number;
}

interface GeneratePODialogProps {
  suggestions: ReplenishmentSuggestion[];
  open: boolean;
  onClose: () => void;
}

function groupByVendor(suggestions: ReplenishmentSuggestion[]): VendorGroup[] {
  const map = new Map<number, VendorGroup>();
  for (const s of suggestions) {
    if (s.vendorId === null) continue;
    const existing = map.get(s.vendorId);
    if (existing) {
      existing.items.push(s);
      existing.totalQty += s.suggestedQty;
    } else {
      map.set(s.vendorId, {
        vendorId: s.vendorId,
        vendorName: s.vendorName ?? `Vendor #${s.vendorId}`,
        items: [s],
        totalQty: s.suggestedQty,
      });
    }
  }
  return Array.from(map.values());
}

export function GeneratePODialog({ suggestions, open, onClose }: GeneratePODialogProps) {
  const generatePO = useGeneratePO();
  const groups = groupByVendor(suggestions);

  function handleGenerate(group: VendorGroup): void {
    generatePO.mutate(
      {
        vendorId: group.vendorId,
        suggestions: group.items
          .filter((s): s is typeof s & { warehouseId: number } => s.warehouseId !== null)
          .map((s) => ({
            variantId: s.variantId,
            warehouseId: s.warehouseId,
            qty: s.suggestedQty,
          })),
      },
      {
        onSuccess: (result) => {
          toast.success("Draft PO created", {
            description: (
              <span>
                PO #{result.purchaseOrderNumber} created for {group.vendorName}.{" "}
                <Link
                  href="/inventory/purchase-orders"
                  className="underline text-primary"
                >
                  View POs
                </Link>
              </span>
            ),
          });
          onClose();
        },
        onError: () => {
          toast.error("Failed to create PO", {
            description: `Could not generate PO for ${group.vendorName}.`,
          });
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Purchase Orders</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            {groups.length} vendor group{groups.length !== 1 ? "s" : ""} found. Generate a draft PO
            for each.
          </p>
          <Separator />
          {groups.map((group) => (
            <div
              key={group.vendorId}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{group.vendorName}</p>
                <p className="text-xs text-muted-foreground">
                  {group.items.length} item{group.items.length !== 1 ? "s" : ""} ·{" "}
                  {group.totalQty} units total
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleGenerate(group)}
                disabled={generatePO.isPending}
              >
                <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
                Generate PO
              </Button>
            </div>
          ))}
          {groups.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No vendor assignments found on selected suggestions.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={generatePO.isPending}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
