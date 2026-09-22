"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatShortDate } from "@/lib/date-utils";
import { useCanState } from "@/hooks/api/access";
import { useShelfLifeRules, type ShelfLifeRule } from "@/hooks/api/inventory/system-health";
import { ShelfLifeRuleSheet } from "./shelf-life-rule-sheet";

const COLUMNS: DataTableColumn<ShelfLifeRule>[] = [
  {
    key: "client",
    header: "Applies to",
    cell: (row) => (
      <span className="text-sm font-medium">
        {row.clientId === null ? "Every customer" : (row.clientName ?? "A customer")}
      </span>
    ),
  },
  {
    key: "minShelfLifeDays",
    header: "Minimum remaining life",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums",
    cell: (row) => `${row.minShelfLifeDays} d`,
  },
  {
    key: "notes",
    header: "Notes",
    cell: (row) => <span className="text-dense text-muted-foreground">{row.notes ?? "—"}</span>,
  },
  {
    key: "updatedAt",
    header: "Last changed",
    cell: (row) => (
      <span className="text-dense text-muted-foreground">{formatShortDate(row.updatedAt)}</span>
    ),
  },
];

/**
 * The remaining-life floor FEFO allocation has to clear.
 *
 * A stored setting with no writer is a dead switch. Allocation reads these rows
 * on every pick and nothing in the product could create one, so the floor was
 * permanently whatever the database happened to hold — usually nothing, which
 * silently means "any lot will do" for a customer who negotiated otherwise.
 */
export function ShelfLifeRulesCard() {
  const settingsState = useCanState("inventory:settings:manage");
  const [editing, setEditing] = useState<ShelfLifeRule | "new" | null>(null);
  const { data, isPending, isError, error, refetch } = useShelfLifeRules();

  function handleRetry(): void {
    void refetch();
  }

  function handleSheetOpenChange(open: boolean): void {
    if (!open) setEditing(null);
  }

  const columns: DataTableColumn<ShelfLifeRule>[] = [
    ...COLUMNS,
    {
      key: "actions",
      header: "",
      headerClassName: "w-20",
      className: "w-20",
      cell: (row) => (
        <Button variant="ghost" size="sm" className="h-7" onClick={() => setEditing(row)}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <div className="min-w-0">
          <CardTitle className="text-sm font-semibold">Shelf-life floors</CardTitle>
          <p className="text-dense text-muted-foreground">
            The remaining life a lot must still have before it may be allocated. A customer without
            a rule of their own inherits the default.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditing("new")}>
          Set a floor
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {settingsState === "denied" ? (
          <NoPermissionState compact permission="inventory:settings:manage" />
        ) : isError ? (
          <ErrorState
            title="Couldn't load the shelf-life floors"
            description={getErrorMessage(error)}
            onRetry={handleRetry}
          />
        ) : (
          <DataTable
            data={data ?? []}
            columns={columns}
            getRowKey={(row) => row.id}
            isLoading={isPending}
            emptyState={
              <InventoryEmptyState
                illustrationPreset="default"
                title="No floor is set"
                description="Allocation will take any lot with life left on it. Set a default floor, or one for a customer who negotiated a longer minimum."
                compact
              />
            }
          />
        )}
      </CardContent>

      <ShelfLifeRuleSheet rule={editing} onOpenChange={handleSheetOpenChange} />
    </Card>
  );
}
