"use client";

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

interface PackageLifecycleDialogsProps {
  closeConfirmOpen: boolean;
  onCloseConfirmOpenChange: (open: boolean) => void;
  onCloseConfirmDismiss: () => void;
  onConfirmClose: () => void;
  isClosing: boolean;
  reopenConfirmOpen: boolean;
  onReopenConfirmOpenChange: (open: boolean) => void;
  onReopenConfirmDismiss: () => void;
  onConfirmReopen: () => void;
  isReopening: boolean;
}

export function PackageLifecycleDialogs({
  closeConfirmOpen,
  onCloseConfirmOpenChange,
  onCloseConfirmDismiss,
  onConfirmClose,
  isClosing,
  reopenConfirmOpen,
  onReopenConfirmOpenChange,
  onReopenConfirmDismiss,
  onConfirmReopen,
  isReopening,
}: PackageLifecycleDialogsProps) {
  return (
    <>
      <AlertDialog open={closeConfirmOpen} onOpenChange={onCloseConfirmOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close Package</AlertDialogTitle>
            <AlertDialogDescription>
              Closing this package will lock its contents. This fails if content exceeds picked quantity.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onCloseConfirmDismiss}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmClose} disabled={isClosing}>
              {isClosing ? "Closing…" : "Close Package"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={reopenConfirmOpen} onOpenChange={onReopenConfirmOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reopen Package</AlertDialogTitle>
            <AlertDialogDescription>
              Reopening will allow editing the package lines again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onReopenConfirmDismiss}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmReopen} disabled={isReopening}>
              {isReopening ? "Reopening…" : "Reopen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
