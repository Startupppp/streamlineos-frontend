"use client";

import { useCallback } from "react";
import { format } from "date-fns";
import { Laptop, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";
import { STATUS_META, CONDITION_META } from "./asset-return-constants";
import type { DataTableColumn } from "@/components/ui/data-table";
import type { AssetReturn } from "./asset-return-constants";

function AssetReturnActionButton({
  id,
  onMark,
}: {
  id: number;
  onMark: (id: number) => void;
}) {
  const handleClick = useCallback(() => onMark(id), [id, onMark]);
  return (
    <Button
      size="sm"
      variant="outline"
      className="text-xs gap-1.5"
      onClick={handleClick}
    >
      <CheckCircle2 className="h-3 w-3" />
      Received
    </Button>
  );
}

export function buildAssetReturnColumns(
  isAdmin: boolean,
  onMark: (id: number) => void,
): DataTableColumn<AssetReturn>[] {
  const cols: DataTableColumn<AssetReturn>[] = [
    {
      key: "asset",
      header: "Asset",
      cell: (ar) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Laptop className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <TruncatedText text={ar.assetName} className="text-sm font-semibold text-foreground" />
            {ar.assetType && (
              <p className="text-micro text-muted-foreground">
                {ar.assetType}
              </p>
            )}
            {ar.serialNumber && (
              <p className="text-micro font-mono text-muted-foreground">
                S/N: {ar.serialNumber}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "employee",
      header: "Employee",
      cell: (ar) => (
        <span className="text-sm text-foreground">
          {ar.employeeName ?? <span className="text-muted-foreground">—</span>}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (ar) => {
        const statusMeta =
          STATUS_META[ar.status ?? "PENDING"] ?? STATUS_META.PENDING;
        return (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-micro font-semibold px-2 py-0.5 rounded-full border",
              statusMeta.badge,
            )}
          >
            {statusMeta.label}
          </span>
        );
      },
      sortable: true,
      sortValue: (ar) => ar.status ?? "",
    },
    {
      key: "condition",
      header: "Condition",
      cell: (ar) => {
        const conditionMeta = ar.condition
          ? CONDITION_META[ar.condition]
          : null;
        return conditionMeta ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-micro font-semibold px-2 py-0.5 rounded-full border",
              conditionMeta.badge,
            )}
          >
            {ar.condition}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        );
      },
    },
    {
      key: "date",
      header: "Date",
      cell: (ar) => (
        <span className="text-xs text-muted-foreground">
          {ar.createdAt ? format(new Date(ar.createdAt), "MMM d, yyyy") : "—"}
        </span>
      ),
      sortable: true,
      sortValue: (ar) => ar.createdAt ?? "",
    },
  ];

  if (isAdmin) {
    cols.push({
      key: "actions",
      header: "",
      headerClassName: "text-right",
      className: "text-right",
      cell: (ar) =>
        ar.status !== "RETURNED" ? (
          <AssetReturnActionButton id={ar.id} onMark={onMark} />
        ) : null,
    });
  }

  return cols;
}
