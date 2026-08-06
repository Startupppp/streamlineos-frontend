"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/common/use-mobile";
import { cn } from "@/lib/utils";

interface AppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function AppDialog({
  open,
  onOpenChange,
  title,
  description,
  footer,
  children,
  className,
}: AppDialogProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className={cn(
            "flex flex-col p-0 gap-0 h-auto max-h-[92dvh] rounded-t-2xl border-t pb-[env(safe-area-inset-bottom)]",
            className,
          )}
        >
          <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-muted-foreground/25 shrink-0" />
          <SheetHeader className="shrink-0 px-4 pt-2 pb-3 border-b border-border/60 text-left gap-1">
            <SheetTitle className="text-base font-semibold">{title}</SheetTitle>
            {description && (
              <SheetDescription className="text-sm text-muted-foreground">
                {description}
              </SheetDescription>
            )}
          </SheetHeader>

          <SheetBody className="px-4 py-3">{children}</SheetBody>

          {footer && (
            <div className="shrink-0 flex items-center justify-end gap-2 px-4 py-3 border-t border-border/60 bg-muted/30">
              {footer}
            </div>
          )}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex flex-col gap-0 p-0 max-w-md max-h-[90dvh]",
          className,
        )}
      >
        <DialogHeader className="shrink-0 gap-1 border-b border-border/60 px-4 py-3">
          <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-xs text-muted-foreground">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        <DialogBody className="px-4 py-3">{children}</DialogBody>

        {footer && (
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border/60 bg-muted/30 px-4 py-3">
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
