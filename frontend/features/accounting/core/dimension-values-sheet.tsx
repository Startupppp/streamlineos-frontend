"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getErrorMessage } from "@/lib/get-error-message";
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

export function DimensionValuesSheet({ open, onOpenChange, dimension, canManage }: Props) {
  const { data, isLoading } = useDimensionValues(dimension.id, open);
  const [addOpen, setAddOpen] = useState(false);
  const [editValue, setEditValue] = useState<AccountingDimensionValue | undefined>();

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[480px] sm:max-w-[480px] flex flex-col">
          <SheetHeader>
            <SheetTitle>{dimension.name} — Values</SheetTitle>
            <SheetDescription className="font-mono text-xs">{dimension.key}</SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto mt-4 space-y-3">
            {canManage && (
              <div className="flex justify-end">
                <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
                  <Plus className="size-3.5 mr-1" />
                  Add Value
                </Button>
              </div>
            )}

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : !data?.items.length ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <p className="text-sm text-muted-foreground">No values yet.</p>
                {canManage && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-2"
                    onClick={() => setAddOpen(true)}
                  >
                    Add the first value
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Active</TableHead>
                    {canManage && <TableHead className="w-10" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-mono text-xs">{v.code}</TableCell>
                      <TableCell>{v.name}</TableCell>
                      <TableCell className="text-right">
                        <ActiveToggle value={v} canManage={canManage} />
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => setEditValue(v)}
                            aria-label={`Edit ${v.name}`}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </SheetContent>
      </Sheet>

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
          onOpenChange={(o) => { if (!o) setEditValue(undefined); }}
          dimensionId={dimension.id}
          value={editValue}
        />
      )}
    </>
  );
}
