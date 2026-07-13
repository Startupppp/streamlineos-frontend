"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StateIllustration } from "@/components/illustrations";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useDimensions,
  useUpdateDimension,
  type AccountingDimension,
} from "@/hooks/api/accounting/core";
import { DimensionFormDialog } from "./dimension-form-dialog";
import { DimensionValuesSheet } from "./dimension-values-sheet";

interface ActiveToggleProps {
  dimension: AccountingDimension;
  canManage: boolean;
}

function DimensionActiveToggle({ dimension, canManage }: ActiveToggleProps) {
  const update = useUpdateDimension(dimension.id);

  function handleChange(checked: boolean) {
    update.mutate(
      { isActive: checked },
      { onError: (err) => toast.error(getErrorMessage(err)) },
    );
  }

  return (
    <Switch
      checked={dimension.isActive}
      onCheckedChange={handleChange}
      disabled={update.isPending || !canManage}
      aria-label={`Toggle ${dimension.name} active state`}
    />
  );
}

interface Props {
  canManage: boolean;
}

function buildColumns(
  canManage: boolean,
  onEdit: (dim: AccountingDimension) => void,
  onViewValues: (dim: AccountingDimension) => void,
): DataTableColumn<AccountingDimension>[] {
  return [
    {
      key: "name",
      header: "Name",
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: "key",
      header: "Key",
      cell: (row) => (
        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{row.key}</span>
      ),
    },
    {
      key: "requiredForAccountTypes",
      header: "Required For",
      cell: (row) =>
        row.requiredForAccountTypes.length === 0 ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {row.requiredForAccountTypes.map((t) => (
              <Badge
                key={t}
                variant="outline"
                className="text-[9px] px-1.5 py-0 h-4 text-foreground border-border bg-muted"
              >
                {t}
              </Badge>
            ))}
          </div>
        ),
    },
    {
      key: "valueCount",
      header: "Values",
      headerClassName: "text-right",
      className: "text-right text-sm",
      cell: (row) => row.valueCount,
    },
    {
      key: "isActive",
      header: "Active",
      headerClassName: "text-right",
      className: "text-right",
      cell: (row) => <DimensionActiveToggle dimension={row} canManage={canManage} />,
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-20",
      className: "w-20",
      cell: (row) => {
        function handleEdit(): void {
          onEdit(row);
        }
        function handleViewValues(): void {
          onViewValues(row);
        }
        return (
          <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
            {canManage && (
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={handleEdit}
                aria-label={`Edit ${row.name}`}
              >
                <Pencil className="size-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={handleViewValues}
              aria-label={`View values for ${row.name}`}
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        );
      },
    },
  ];
}

export function DimensionsTable({ canManage }: Props) {
  const { data, isLoading, error } = useDimensions();
  const [createOpen, setCreateOpen] = useState(false);
  const [editDimension, setEditDimension] = useState<AccountingDimension | undefined>();
  const [valuesDimension, setValuesDimension] = useState<AccountingDimension | undefined>();

  const items = data?.items ?? [];

  const columns = buildColumns(canManage, setEditDimension, setValuesDimension);

  function handleOpenCreate(): void {
    setCreateOpen(true);
  }

  function getDimensionRowClass(): string {
    return "group";
  }

  function handleEditOpenChange(o: boolean): void {
    if (!o) setEditDimension(undefined);
  }

  function handleValuesOpenChange(o: boolean): void {
    if (!o) setValuesDimension(undefined);
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 py-16 text-center">
        <p className="text-sm text-destructive">{getErrorMessage(error)}</p>
      </div>
    );
  }

  const emptyState = (
    <div className="flex flex-col items-center justify-center flex-1 py-16 text-center">
      <StateIllustration preset="settings" className="h-32 w-32 mb-4 opacity-70" />
      <h3 className="text-sm font-semibold text-foreground">No dimensions yet</h3>
      <p className="mt-1 text-sm text-muted-foreground max-w-xs">
        Add cost centres, projects, or departments to tag GL entries for richer reporting.
      </p>
      {canManage && (
        <Button size="sm" className="mt-4" onClick={handleOpenCreate}>
          <Plus className="size-3.5 mr-1.5" />
          New Dimension
        </Button>
      )}
    </div>
  );

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {items.length === 0
            ? "No dimensions configured yet."
            : `${items.length} dimension${items.length !== 1 ? "s" : ""}`}
        </p>
        {canManage && (
          <Button size="sm" onClick={handleOpenCreate}>
            <Plus className="size-3.5 mr-1.5" />
            New Dimension
          </Button>
        )}
      </div>

      <DataTable
        className="flex-1 min-h-0"
        data={items}
        columns={columns}
        getRowKey={(row) => row.id}
        isLoading={isLoading}
        emptyState={emptyState}
        rowClassName={getDimensionRowClass}
      />

      {createOpen && (
        <DimensionFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      )}

      {editDimension && (
        <DimensionFormDialog
          open={!!editDimension}
          onOpenChange={handleEditOpenChange}
          dimension={editDimension}
        />
      )}

      {valuesDimension && (
        <DimensionValuesSheet
          open={!!valuesDimension}
          onOpenChange={handleValuesOpenChange}
          dimension={valuesDimension}
          canManage={canManage}
        />
      )}
    </>
  );
}
