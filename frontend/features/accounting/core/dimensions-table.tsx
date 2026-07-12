"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

export function DimensionsTable({ canManage }: Props) {
  const { data, isLoading, error } = useDimensions();
  const [createOpen, setCreateOpen] = useState(false);
  const [editDimension, setEditDimension] = useState<AccountingDimension | undefined>();
  const [valuesDimension, setValuesDimension] = useState<AccountingDimension | undefined>();

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 py-16 text-center">
        <p className="text-sm text-destructive">{getErrorMessage(error)}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2 mt-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const items = data?.items ?? [];

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {items.length === 0
            ? "No dimensions configured yet."
            : `${items.length} dimension${items.length !== 1 ? "s" : ""}`}
        </p>
        {canManage && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-3.5 mr-1.5" />
            New Dimension
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 py-16 text-center">
          <StateIllustration preset="settings" className="h-32 w-32 mb-4 opacity-70" />
          <h3 className="text-sm font-semibold text-foreground">No dimensions yet</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-xs">
            Add cost centres, projects, or departments to tag GL entries for richer reporting.
          </p>
          {canManage && (
            <Button size="sm" className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus className="size-3.5 mr-1.5" />
              New Dimension
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Required For</TableHead>
                <TableHead className="text-right">Values</TableHead>
                <TableHead className="text-right">Active</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((dim) => (
                <TableRow key={dim.id} className="group">
                  <TableCell className="font-medium">{dim.name}</TableCell>
                  <TableCell>
                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                      {dim.key}
                    </span>
                  </TableCell>
                  <TableCell>
                    {dim.requiredForAccountTypes.length === 0 ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {dim.requiredForAccountTypes.map((t) => (
                          <Badge
                            key={t}
                            variant="outline"
                            className="text-[9px] px-1.5 py-0 h-4 text-blue-700 border-blue-200 bg-blue-50"
                          >
                            {t}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm">{dim.valueCount}</TableCell>
                  <TableCell className="text-right">
                    <DimensionActiveToggle dimension={dim} canManage={canManage} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => setEditDimension(dim)}
                          aria-label={`Edit ${dim.name}`}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => setValuesDimension(dim)}
                        aria-label={`View values for ${dim.name}`}
                      >
                        <ChevronRight className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {createOpen && (
        <DimensionFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      )}

      {editDimension && (
        <DimensionFormDialog
          open={!!editDimension}
          onOpenChange={(o) => { if (!o) setEditDimension(undefined); }}
          dimension={editDimension}
        />
      )}

      {valuesDimension && (
        <DimensionValuesSheet
          open={!!valuesDimension}
          onOpenChange={(o) => { if (!o) setValuesDimension(undefined); }}
          dimension={valuesDimension}
          canManage={canManage}
        />
      )}
    </>
  );
}
