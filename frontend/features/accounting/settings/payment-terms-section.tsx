"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { getErrorMessage } from "@/lib/get-error-message";
import { LoadingButton } from "@/components/ui/loading-button";
import { useUpdatePaymentTerms } from "@/hooks/api/accounting/fin-settings";
import type { PaymentTerm } from "@/types/accounting/fin-settings";
import { PaymentTermDialog } from "./fin-settings-dialogs";

interface PaymentTermRowProps {
  term: PaymentTerm;
  existingTerms: PaymentTerm[];
  canManage: boolean;
  onEdit: (t: PaymentTerm) => void;
  onDelete: (key: string) => void;
  isDeleting: boolean;
}

function PaymentTermRow({ term, canManage, onEdit, onDelete, isDeleting }: PaymentTermRowProps) {
  function handleEdit(): void {
    onEdit(term);
  }

  function handleDelete(): void {
    onDelete(term.key);
  }

  return (
    <TableRow className="border-b border-border/50 hover:bg-muted/30">
      <TableCell className="text-xs px-3 py-2">{term.label}</TableCell>
      <TableCell className="text-xs px-3 py-2 tabular-nums">{term.days} days</TableCell>
      <TableCell className="px-3 py-2">
        {term.isDefault && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
      </TableCell>
      {canManage && (
        <TableCell className="px-2 py-2">
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleEdit}>Edit</Button>
            <LoadingButton
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-destructive hover:text-destructive"
              onClick={handleDelete}
              isPending={isDeleting}
            >
              Delete
            </LoadingButton>
          </div>
        </TableCell>
      )}
    </TableRow>
  );
}

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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Label</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Days</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 w-12">Default</TableHead>
                  {canManage && <TableHead className="w-28 px-2 py-2" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {terms.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={canManage ? 4 : 3} className="text-center text-xs text-muted-foreground py-6">
                      No payment terms configured.
                    </TableCell>
                  </TableRow>
                )}
                {terms.map((t) => (
                  <PaymentTermRow
                    key={t.key}
                    term={t}
                    existingTerms={terms}
                    canManage={canManage}
                    onEdit={setEditTerm}
                    onDelete={handleRequestDelete}
                    isDeleting={updateTerms.isPending && deleteKey === t.key}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
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
