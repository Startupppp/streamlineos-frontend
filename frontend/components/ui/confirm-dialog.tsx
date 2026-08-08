"use client";

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ConfirmDialogBaseProps {
  title: ReactNode;
  description: ReactNode;
  icon?: ReactNode;
  content?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  isPending?: boolean;
  confirmIcon?: ReactNode;
  hideConfirm?: boolean;
  keepOpenOnConfirm?: boolean;
  onConfirm: () => void;
}

/**
 * Controlled when the caller owns the open state; uncontrolled when it supplies
 * a `trigger`. The union stops a caller from passing both and ending up with a
 * dialog whose open state has two owners.
 */
type ConfirmDialogProps = ConfirmDialogBaseProps &
  (
    | { trigger: ReactNode; open?: never; onOpenChange?: never }
    | { trigger?: never; open: boolean; onOpenChange: (open: boolean) => void }
  );

export function ConfirmDialog({
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  isPending = false,
  icon,
  content,
  confirmIcon,
  hideConfirm = false,
  keepOpenOnConfirm = false,
  onConfirm,
  trigger,
  open,
  onOpenChange,
}: ConfirmDialogProps) {
  const isControlled = trigger === undefined;

  function handleControlledOpenChange(nextOpen: boolean) {
    if (!nextOpen && isPending) return;
    onOpenChange?.(nextOpen);
  }

  return (
    <AlertDialog
      {...(isControlled
        ? { open, onOpenChange: handleControlledOpenChange }
        : {})}
    >
      {!isControlled ? (
        <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      ) : null}
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-start gap-3">
            {icon ? <div className="shrink-0">{icon}</div> : null}
            <div className="min-w-0">
              <AlertDialogTitle>{title}</AlertDialogTitle>
              <AlertDialogDescription className="mt-1">
                {description}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        {content}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{cancelLabel}</AlertDialogCancel>
          {!hideConfirm ? (
            keepOpenOnConfirm ? (
              <Button
                type="button"
                onClick={onConfirm}
                disabled={isPending}
                aria-busy={isPending || undefined}
                variant={destructive ? "destructive" : "default"}
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  confirmIcon
                )}
                {confirmLabel}
              </Button>
            ) : (
              <AlertDialogAction
                onClick={onConfirm}
                disabled={isPending}
                aria-busy={isPending || undefined}
                variant={destructive ? "destructive" : "default"}
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  confirmIcon
                )}
                {confirmLabel}
              </AlertDialogAction>
            )
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
