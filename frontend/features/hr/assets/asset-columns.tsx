"use client";

import { format } from "date-fns";
import { Pencil } from "lucide-react";
import { Trash2Icon, UserPlusIcon, UserMinusIcon } from "@animateicons/react/lucide";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn, resolveImageUrl } from "@/lib/utils";
import { getUserDisplayName, getUserInitials } from "@/lib/person-display";
import { fmtCost, STATUS_META } from "./asset-constants";
import type { DataTableColumn } from "@/components/ui/data-table";
import type { Asset, EmployeeListItem } from "@/types/hr";

export function buildAssetColumns(
  employees: EmployeeListItem[],
  onAssign: (asset: Asset) => void,
  onEdit: (asset: Asset) => void,
  onRetire: (id: number) => void,
  canManage: boolean,
): DataTableColumn<Asset>[] {
  return [
    {
      key: "name",
      header: "Asset",
      cell: (asset) => (
        <div>
          <p className="font-semibold text-sm text-foreground">{asset.name}</p>
          {(asset.brand || asset.model) && (
            <p className="text-xs text-muted-foreground">
              {[asset.brand, asset.model].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      ),
      sortable: true,
      sortValue: (a) => a.name,
    },
    {
      key: "type",
      header: "Type",
      cell: (asset) => (
        <span className="inline-flex items-center gap-1 text-micro font-semibold px-2 py-0.5 rounded-full border bg-muted border-border text-foreground">
          {asset.type}
        </span>
      ),
    },
    {
      key: "serialNumber",
      header: "Serial #",
      cell: (asset) => (
        <span className="font-mono text-xs text-muted-foreground">
          {asset.serialNumber ?? "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (asset) => {
        const meta = STATUS_META[asset.status ?? "AVAILABLE"] ?? STATUS_META.AVAILABLE;
        return (
          <span className={cn("inline-flex items-center gap-1 text-micro font-semibold px-2 py-0.5 rounded-full border", meta.badge)}>
            {meta.label}
          </span>
        );
      },
      sortable: true,
      sortValue: (a) => a.status ?? "",
    },
    {
      key: "assignedTo",
      header: "Assigned To",
      cell: (asset) => {
        const assignedEmployee = employees.find((e) => e.id === asset.assignedTo) ?? null;
        if (!assignedEmployee) {
          return <span className="text-muted-foreground text-xs">Unassigned</span>;
        }
        const displayName = getUserDisplayName(assignedEmployee);
        const initials = getUserInitials(assignedEmployee);
        const imageUrl = resolveImageUrl(assignedEmployee.image);
        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              {imageUrl && <AvatarImage src={imageUrl} alt={displayName} />}
              <AvatarFallback className="text-micro bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <TruncatedText text={displayName} className="text-sm text-foreground max-w-[120px]" />
          </div>
        );
      },
    },
    {
      key: "purchaseCost",
      header: "Cost",
      headerClassName: "text-right",
      className: "text-right",
      cell: (asset) => (
        <span className="text-sm font-medium">{fmtCost(asset.purchaseCost)}</span>
      ),
      sortable: true,
      sortValue: (a) => Number(a.purchaseCost ?? 0),
    },
    {
      key: "purchaseDate",
      header: "Purchased",
      cell: (asset) => (
        <span className="text-xs text-muted-foreground">
          {asset.purchaseDate ? format(new Date(asset.purchaseDate), "dd MMM yyyy") : "—"}
        </span>
      ),
      sortable: true,
      sortValue: (a) => a.purchaseDate ?? "",
    },
    ...(canManage ? [{
      key: "actions",
      header: "",
      headerClassName: "text-right",
      className: "text-right",
      cell: (asset: Asset) => (
        <div className="flex items-center justify-end gap-1">
          <TooltipIconButton
            icon={asset.assignedTo ? UserMinusIcon : UserPlusIcon}
            iconSize={14}
            variant="ghost"
            className="w-7"
            label={asset.assignedTo ? "Reassign / Unassign" : "Assign Employee"}
            onClick={(e) => { e.stopPropagation(); onAssign(asset); }}
          />
          <TooltipIconButton
            variant="ghost"
            className="w-7"
            label="Edit asset"
            onClick={(e) => { e.stopPropagation(); onEdit(asset); }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </TooltipIconButton>
          <TooltipIconButton
            icon={Trash2Icon}
            iconSize={14}
            variant="ghost"
            className="w-7 text-destructive hover:text-destructive"
            label="Retire asset"
            onClick={(e) => { e.stopPropagation(); onRetire(asset.id); }}
          />
        </div>
      ),
    }] as DataTableColumn<Asset>[] : []),
  ];
}
