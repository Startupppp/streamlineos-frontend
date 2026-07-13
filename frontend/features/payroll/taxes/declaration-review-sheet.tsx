"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { useApproveDeclaration, useRejectDeclaration } from "@/hooks/api/payroll/tax-admin";
import type { TaxDeclarationAdmin } from "@/types/payroll/reports";
import { formatMoney } from "@/features/payroll/shared/payroll-format";

interface SectionRow {
  label: string;
  value: number;
}

function getSections(d: TaxDeclarationAdmin): SectionRow[] {
  return [
    { label: "HRA", value: d.hra },
    { label: "LTA", value: d.lta },
    { label: "Section 80C", value: d.section80c },
    { label: "Section 80D", value: d.section80d },
    { label: "Section 80G", value: d.section80g },
    { label: "Home Loan Interest", value: d.homeLoanInterest },
  ];
}

const REGIME_BADGE: Record<string, string> = {
  NEW: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  OLD: "bg-muted text-muted-foreground border-border",
};

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground border-border",
  SUBMITTED: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  VERIFIED: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
};

interface DeclarationReviewSheetProps {
  declaration: TaxDeclarationAdmin;
  onClose: () => void;
}

export function DeclarationReviewSheet({ declaration, onClose }: DeclarationReviewSheetProps) {
  const approveMutation = useApproveDeclaration();
  const rejectMutation = useRejectDeclaration();
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState("");

  const sections = getSections(declaration);
  const totalAmount = sections.reduce((sum, s) => sum + s.value, 0);
  const canAct = declaration.status === "SUBMITTED";

  function handleApproveConfirm() {
    approveMutation.mutate(
      { declarationId: declaration.id },
      {
        onSuccess: () => {
          toast.success("Declaration approved");
          setApproveDialogOpen(false);
          onClose();
        },
        onError: () => toast.error("Failed to approve declaration"),
      },
    );
  }

  function handleRejectConfirm() {
    rejectMutation.mutate(
      { declarationId: declaration.id, note: rejectNote.trim() || undefined },
      {
        onSuccess: () => {
          toast.success("Declaration rejected");
          setRejectDialogOpen(false);
          setRejectNote("");
          onClose();
        },
        onError: () => toast.error("Failed to reject declaration"),
      },
    );
  }

  function handleApproveClick() {
    setApproveDialogOpen(true);
  }

  function handleRejectClick() {
    setRejectDialogOpen(true);
  }

  function handleRejectNoteChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setRejectNote(e.target.value);
  }

  return (
    <>
      <Sheet open onOpenChange={onClose}>
        <SheetContent className="flex flex-col p-0 sm:max-w-md">
          <SheetHeader className="border-b px-6 py-4 shrink-0">
            <div className="flex items-center gap-2">
              <SheetTitle className="flex-1">Tax Declaration</SheetTitle>
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${STATUS_BADGE[declaration.status] ?? ""}`}
              >
                {declaration.status}
              </span>
            </div>
          </SheetHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-5">
            <div className="space-y-1">
              <p className="text-sm font-medium">{declaration.userName}</p>
              <p className="text-xs text-muted-foreground">{declaration.userEmail}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-muted-foreground">FY {declaration.financialYear}</span>
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${REGIME_BADGE[declaration.regime] ?? ""}`}
                >
                  {declaration.regime} Regime
                </span>
              </div>
            </div>

            <div className="rounded-md border border-border overflow-hidden">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-muted/60 border-b border-border">
                    <th className="text-left px-3 py-2 font-semibold text-[10px] uppercase tracking-wide">Section</th>
                    <th className="text-right px-3 py-2 font-semibold text-[10px] uppercase tracking-wide">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {sections.map((s) => (
                    <tr key={s.label} className="border-b border-border last:border-0">
                      <td className="px-3 py-2">{s.label}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">{formatMoney(s.value)}</td>
                    </tr>
                  ))}
                  <tr className="bg-muted/40">
                    <td className="px-3 py-2 font-semibold">Total</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums font-semibold">{formatMoney(totalAmount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="border-t px-6 py-4 shrink-0 grid grid-cols-2 gap-2">
            {canAct ? (
              <>
                <Button
                  variant="outline"
                  className="border-red-200 text-red-700 hover:bg-red-50"
                  onClick={handleRejectClick}
                >
                  Reject
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleApproveClick}
                >
                  Approve
                </Button>
              </>
            ) : (
              <Button variant="outline" className="col-span-2" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Declaration?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the declaration as verified for {declaration.userName} (FY {declaration.financialYear}).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleApproveConfirm}
            >
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Declaration?</AlertDialogTitle>
            <AlertDialogDescription>
              Provide a reason for rejecting this declaration. The employee will need to resubmit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-6 pb-2">
            <Textarea
              placeholder="Reason for rejection…"
              value={rejectNote}
              onChange={handleRejectNoteChange}
              rows={3}
              className="text-sm"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleRejectConfirm}
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
