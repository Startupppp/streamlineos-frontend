"use client";

import { toast } from "sonner";
import Link from "next/link";
import { ShoppingCartIcon } from "@animateicons/react/lucide";
import { TruncatedText } from "@/components/ui/truncated-text";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { getErrorMessage } from "@/lib/get-error-message";
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

interface VendorGroupRowProps {
  group: VendorGroup;
  isPending: boolean;
  onGenerate: (group: VendorGroup) => void;
}

function VendorGroupRow({ group, isPending, onGenerate }: VendorGroupRowProps) {
  function handleClick(): void {
    onGenerate(group);
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
      <div className="min-w-0">
        <TruncatedText text={group.vendorName} className="text-sm font-medium" />
        <p className="text-xs text-muted-foreground">
          {group.items.length} item{group.items.length !== 1 ? "s" : ""} ·{" "}
          {group.totalQty} units total
        </p>
      </div>
      <AnimatedIconButton
        icon={ShoppingCartIcon}
        iconSize={14}
        iconClassName="mr-1.5"
        size="sm"
        variant="outline"
        onClick={handleClick}
        disabled={isPending}
      >
        Generate PO
      </AnimatedIconButton>
    </div>
  );
}

export function GeneratePODialog({ suggestions, open, onClose }: GeneratePODialogProps) {
  const generatePO = useGeneratePO();
  const groups = groupByVendor(suggestions);

  function handleOpenChange(v: boolean): void {
    if (!v) onClose();
  }

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
        onError: (err) => {
          toast.error(getErrorMessage(err));
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
            <VendorGroupRow
              key={group.vendorId}
              group={group}
              isPending={generatePO.isPending}
              onGenerate={handleGenerate}
            />
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
