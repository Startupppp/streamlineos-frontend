"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Switch } from "@/components/ui/switch";
import { AppSheet } from "@/components/shared/app-sheet";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { getErrorMessage } from "@/lib/get-error-message";
import { TruncatedText } from "@/components/ui/truncated-text";
import {
  useDimensionValues,
  useUpdateDimensionValue,
  type AccountingDimension,
  type AccountingDimensionValue,
} from "@/hooks/api/accounting/core";
import { DimensionValueFormDialog } from "./dimension-value-form-dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dimension: AccountingDimension;
  canManage: boolean;
}

function ActiveToggle({
  value,
  canManage,
}: {
  value: AccountingDimensionValue;
  canManage: boolean;
}) {
  const update = useUpdateDimensionValue(value.dimensionId, value.id);

  function handleChange(checked: boolean) {
    update.mutate(
      { isActive: checked },
      { onError: (err) => toast.error(getErrorMessage(err)) },
    );
  }

  return (
    <Switch
      checked={value.isActive}
      onCheckedChange={handleChange}
      disabled={update.isPending || !canManage}
      aria-label={`Toggle ${value.name} active state`}
    />
  );
}

function buildColumns(
  canManage: boolean,
  onEdit: (v: AccountingDimensionValue) => void,
): DataTableColumn<AccountingDimensionValue>[] {
  const cols: DataTableColumn<AccountingDimensionValue>[] = [
    {
      key: "code",
      header: "Code",
      cell: (row) => <span className="font-mono text-xs">{row.code}</span>,
    },
    {
      key: "name",
      header: "Name",
      cell: (row) => <TruncatedText text={row.name} className="text-sm" />,
    },
    {
      key: "isActive",
      header: "Active",
      headerClassName: "text-right",
      className: "text-right",
      cell: (row) => <ActiveToggle value={row} canManage={canManage} />,
    },
  ];

  if (canManage) {
    cols.push({
      key: "actions",
      header: "",
      headerClassName: "w-10",
      className: "w-10",
      cell: (row) => {
        function handleEdit(): void {
          onEdit(row);
        }
        return (
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={handleEdit}
            aria-label={`Edit ${row.name}`}
          >
            <Pencil className="size-3.5" />
          </Button>
        );
      },
    });
  }

  return cols;
}

export function DimensionValuesSheet({ open, onOpenChange, dimension, canManage }: Props) {
  const { data, isLoading } = useDimensionValues(dimension.id, open);
  const [addOpen, setAddOpen] = useState(false);
  const [editValue, setEditValue] = useState<AccountingDimensionValue | undefined>();

  const columns = buildColumns(canManage, setEditValue);

  function handleAddOpen(): void {
    setAddOpen(true);
  }

  function handleEditValueOpenChange(o: boolean): void {
    if (!o) setEditValue(undefined);
  }

  const emptyState = (
    <EmptyState
      className="border-0 bg-transparent min-h-[40vh]"
      title="No values yet."
      action={canManage ? { label: "Add the first value", onClick: handleAddOpen } : undefined}
    />
  );

  return (
    <>
      <AppSheet
        open={open}
        onOpenChange={onOpenChange}
        title={`${dimension.name} — Values`}
        description={dimension.key}
        className="w-[480px] sm:max-w-[480px]"
      >
        <div className="space-y-3">
          {canManage && (
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={handleAddOpen}>
                <Plus className="size-3.5 mr-1" />
                Add Value
              </Button>
            </div>
          )}

          <DataTable
            data={data?.items ?? []}
            columns={columns}
            getRowKey={(row) => row.id}
            isLoading={isLoading}
            emptyState={emptyState}
          />
        </div>
      </AppSheet>

      {addOpen && (
        <DimensionValueFormDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          dimensionId={dimension.id}
        />
      )}

      {editValue && (
        <DimensionValueFormDialog
          open={!!editValue}
          onOpenChange={handleEditValueOpenChange}
          dimensionId={dimension.id}
          value={editValue}
        />
      )}
    </>
  );
}
