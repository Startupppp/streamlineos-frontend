"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
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
import { useReverseDepreciationRun } from "@/hooks/api/accounting/assets";
import { getErrorMessage } from "@/lib/get-error-message";
import type { DepreciationRun } from "@/types/accounting/assets";

interface ReverseDepreciationRunButtonProps {
  run: DepreciationRun;
  canManage: boolean;
}

export function ReverseDepreciationRunButton({
  run,
  canManage,
}: ReverseDepreciationRunButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const reverseMutation = useReverseDepreciationRun(run.id);

  function handleOpenConfirm(): void {
    setConfirmOpen(true);
  }

  function handleReverseConfirm(): void {
    reverseMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success(`Run for ${run.periodKey} reversed`);
        setConfirmOpen(false);
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleDialogChange(open: boolean): void {
    if (!reverseMutation.isPending) setConfirmOpen(open);
  }

  const canReverse = canManage && run.status === "COMPLETED";

  return (
    <>
      {canReverse && (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs gap-1"
          onClick={handleOpenConfirm}
        >
          <RotateCcw className="h-3 w-3" />
          Reverse
        </Button>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={handleDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Reverse depreciation run for {run.periodKey}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will reverse the journal entry and mark this run as reversed.
              This affects {run.assetCount} asset
              {run.assetCount !== 1 ? "s" : ""}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reverseMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReverseConfirm}
              disabled={reverseMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {reverseMutation.isPending ? "Reversing…" : "Reverse run"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
