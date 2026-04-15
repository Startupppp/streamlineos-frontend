"use client";

import { memo, useCallback } from "react";
import { Trophy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface DeclareWinnerDialogProps {
  open: boolean;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (variant: "A" | "B") => void;
}

export const DeclareWinnerDialog = memo(function DeclareWinnerDialog({
  open,
  isPending,
  onOpenChange,
  onConfirm,
}: DeclareWinnerDialogProps) {
  const handleConfirmA = useCallback(() => onConfirm("A"), [onConfirm]);
  const handleConfirmB = useCallback(() => onConfirm("B"), [onConfirm]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Declare Winner</DialogTitle>
          <DialogDescription>
            Which variant performed better? This will mark the test as completed.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-row gap-2 pt-2">
          <Button
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
            onClick={handleConfirmA}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Trophy className="h-4 w-4 mr-1.5" />
                A Wins
              </>
            )}
          </Button>
          <Button
            className="flex-1"
            variant="outline"
            onClick={handleConfirmB}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Trophy className="h-4 w-4 mr-1.5" />
                B Wins
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
