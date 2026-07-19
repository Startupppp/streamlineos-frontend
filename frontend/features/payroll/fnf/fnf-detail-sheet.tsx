"use client";

import { useState } from "react";
import { toast } from "sonner";
import { DownloadIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Sheet, SheetBody, SheetContent, SheetFooter } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import { useFnfSettlement, useFnfStatement, useApproveFnf, downloadFnfStatement } from "@/hooks/api/payroll/fnf";
import { TruncatedText } from "@/components/ui/truncated-text";
import { FnfStatusBadge } from "./fnf-status-badge";
import { FnfStatementView } from "./fnf-statement-view";
import type { FnfStatus } from "@/types/payroll";

const FINAL_STATUSES: FnfStatus[] = ["APPROVED", "PAID"];

interface FnfDetailSheetInnerProps {
  settlementId: number;
  onClose: () => void;
}

function FnfDetailSheetInner({ settlementId, onClose }: FnfDetailSheetInnerProps) {
  const [notes, setNotes] = useState("");
  const [downloading, setDownloading] = useState(false);

  const { data: settlement, isLoading: loadingSettlement } = useFnfSettlement(settlementId);
  const { data: statement, isLoading: loadingStatement } = useFnfStatement(settlementId);
  const approveMutation = useApproveFnf();
  const canManage = useCan("payroll:fnf:manage");

  const isLoading = loadingSettlement || loadingStatement;
  const isFinal = settlement ? FINAL_STATUSES.includes(settlement.status) : false;
  const showApprove = canManage && !isFinal;

  function handleNotesChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setNotes(e.target.value);
  }

  async function handleDownloadStatement() {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadFnfStatement(settlementId);
      toast.success("Statement downloaded");
    } catch {
      toast.error("Failed to download statement");
    } finally {
      setDownloading(false);
    }
  }

  function handleApprove() {
    approveMutation.mutate(
      { settlementId, notes: notes.trim() || undefined },
      {
        onSuccess: () => {
          toast.success("Settlement approved");
          onClose();
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      },
    );
  }

  return (
    <>
      <div className="border-b px-6 py-4 shrink-0">
        {isLoading ? (
          <div className="flex flex-col gap-1">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-24" />
          </div>
        ) : (
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold shrink-0">Settlement —</span>
            <TruncatedText text={settlement?.userName ?? "—"} className="text-sm font-semibold min-w-0 flex-1" />
            {settlement && <FnfStatusBadge status={settlement.status} />}
          </div>
        )}
      </div>

      <SheetBody className="px-6 py-4 flex flex-col gap-4">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
        ) : settlement && statement ? (
          <>
            <FnfStatementView settlement={settlement} statement={statement} />
            {showApprove && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">
                  Approval Notes (optional)
                </label>
                <Textarea
                  value={notes}
                  onChange={handleNotesChange}
                  placeholder="Add notes for this settlement approval…"
                  className="resize-none text-[12px]"
                  rows={3}
                />
              </div>
            )}
          </>
        ) : null}
      </SheetBody>

      <SheetFooter className="border-t px-6 py-4 flex flex-col gap-2">
        {settlement?.statementPublishedAt && (
          <AnimatedIconButton
            icon={DownloadIcon}
            iconClassName="mr-1.5"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleDownloadStatement}
            disabled={downloading || isLoading}
          >
            {downloading ? "Downloading…" : "Download statement"}
          </AnimatedIconButton>
        )}
        <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
        {showApprove && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={isLoading}
              >
                Approve Settlement
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Approve Settlement</AlertDialogTitle>
                <AlertDialogDescription>
                  This will approve the Full & Final Settlement for{" "}
                  <strong>{settlement?.userName}</strong>. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleApprove}
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={approveMutation.isPending}
                >
                  {approveMutation.isPending ? "Approving…" : "Confirm Approve"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        {!showApprove && <div />}
        </div>
      </SheetFooter>
    </>
  );
}

interface FnfDetailSheetProps {
  settlementId: number | null;
  onClose: () => void;
}

export function FnfDetailSheet({ settlementId, onClose }: FnfDetailSheetProps) {
  function handleOpenChange(open: boolean) {
    if (!open) onClose();
  }

  return (
    <Sheet open={settlementId !== null} onOpenChange={handleOpenChange}>
      <SheetContent className="p-0 flex flex-col gap-0 overflow-hidden sm:max-w-lg" side="right">
        {settlementId !== null && (
          <FnfDetailSheetInner settlementId={settlementId} onClose={onClose} />
        )}
      </SheetContent>
    </Sheet>
  );
}
