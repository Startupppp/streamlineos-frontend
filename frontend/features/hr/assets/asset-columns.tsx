"use client";

import { forwardRef, type MouseEvent } from "react";
import { format } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
import { EllipsisIcon, UserPlusIcon, UserMinusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn, resolveImageUrl } from "@/lib/utils";
import { getUserDisplayName, getUserInitials } from "@/lib/person-display";
import { fmtCost, STATUS_META } from "./asset-constants";
import type { DataTableColumn } from "@/components/ui/data-table";
import type { Asset, EmployeeListItem } from "@/types/hr";

interface AssetOverflowMenuProps {
  asset: Asset;
  onRetire: (id: number) => void;
}

const AssetOverflowMenu = forwardRef<HTMLDivElement, AssetOverflowMenuProps>(
  function AssetOverflowMenu({ asset, onRetire }, ref) {
    function handleTriggerClick(event: MouseEvent) {
      event.stopPropagation();
    }
    function handleRetire() {
      onRetire(asset.id);
    }
    return (
      <div ref={ref}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={handleTriggerClick}>
            <AnimatedIconButton
              icon={EllipsisIcon}
              variant="ghost"
              size="icon"
              className="w-7 text-muted-foreground hover:text-foreground"
              aria-label={`More actions for ${asset.name}`}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem variant="destructive" onClick={handleRetire}>
              <Trash2 className="h-3.5 w-3.5" />
              Retire asset
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  },
);

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
    },
    {
      key: "purchaseDate",
      header: "Purchased",
      cell: (asset) => (
        <span className="text-xs text-muted-foreground">
          {asset.purchaseDate ? format(new Date(asset.purchaseDate), "dd MMM yyyy") : "—"}
        </span>
      ),
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
          <AssetOverflowMenu asset={asset} onRetire={onRetire} />
        </div>
      ),
    }] as DataTableColumn<Asset>[] : []),
  ];
}
