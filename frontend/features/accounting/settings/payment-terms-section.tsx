"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { getErrorMessage } from "@/lib/get-error-message";
import { LoadingButton } from "@/components/ui/loading-button";
import { useUpdatePaymentTerms } from "@/hooks/api/accounting/fin-settings";
import type { PaymentTerm } from "@/types/accounting/fin-settings";
import { PaymentTermDialog } from "./fin-settings-dialogs";

export interface PaymentTermsSectionProps {
  terms: PaymentTerm[];
  canManage: boolean;
}

export function PaymentTermsSection({ terms, canManage }: PaymentTermsSectionProps) {
  const [editTerm, setEditTerm] = useState<PaymentTerm | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteKey, setDeleteKey] = useState<string | null>(null);
  const updateTerms = useUpdatePaymentTerms();

  function handleOpenAdd(): void {
    setAddOpen(true);
  }

  function handleCloseDialog(v: boolean): void {
    if (!v) { setAddOpen(false); setEditTerm(null); }
  }

  function handleRequestDelete(key: string): void {
    setDeleteKey(key);
  }

  function handleCancelDelete(): void {
    setDeleteKey(null);
  }

  function handleCancelAlertChange(v: boolean): void {
    if (!v) handleCancelDelete();
  }

  function handleConfirmDelete(): void {
    if (!deleteKey) return;
    const filtered = terms.filter((t) => t.key !== deleteKey);
    updateTerms.mutate(
      { terms: filtered },
      {
        onSuccess: () => { toast.success("Payment term deleted"); setDeleteKey(null); },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  function getTermRowKey(t: PaymentTerm): string {
    return t.key;
  }

  const baseColumns: DataTableColumn<PaymentTerm>[] = [
    {
      key: "label",
      header: "Label",
      cell: (row) => <span className="text-xs">{row.label}</span>,
    },
    {
      key: "days",
      header: "Days",
      cell: (row) => <span className="text-xs tabular-nums">{row.days} days</span>,
    },
    {
      key: "isDefault",
      header: "Default",
      headerClassName: "w-12",
      cell: (row) =>
        row.isDefault ? <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> : null,
    },
  ];

  const actionsColumn: DataTableColumn<PaymentTerm> = {
    key: "actions",
    header: "",
    cell: (row) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setEditTerm(row)}>
          Edit
        </Button>
        <LoadingButton
          variant="ghost"
          size="sm"
          className="h-6 text-xs text-destructive hover:text-destructive"
          onClick={() => handleRequestDelete(row.key)}
          isPending={updateTerms.isPending && deleteKey === row.key}
        >
          Delete
        </LoadingButton>
      </div>
    ),
  };

  const columns = useMemo(
    () => (canManage ? [...baseColumns, actionsColumn] : baseColumns),
    [canManage, updateTerms.isPending, deleteKey],
  );

  return (
    <>
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Payment Terms</CardTitle>
          {canManage && (
            <Button size="sm" className="h-7 text-xs" onClick={handleOpenAdd}>Add term</Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={terms}
            columns={columns}
            getRowKey={getTermRowKey}
            className="rounded-none border-0"
            emptyState={
              <p className="text-center text-xs text-muted-foreground py-6">
                No payment terms configured.
              </p>
            }
          />
        </CardContent>
      </Card>

      <PaymentTermDialog
        term={editTerm ?? null}
        existingTerms={terms}
        open={addOpen || editTerm !== null}
        onOpenChange={handleCloseDialog}
      />

      <AlertDialog open={deleteKey !== null} onOpenChange={handleCancelAlertChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete payment term?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the payment term. Existing invoices or bills using this term will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
