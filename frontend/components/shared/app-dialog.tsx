"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
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
          <SheetHeader className="shrink-0 px-5 pt-2 pb-3 border-b border-border/60 text-left gap-1">
            <SheetTitle className="text-base font-semibold">{title}</SheetTitle>
            {description && (
              <SheetDescription className="text-sm text-muted-foreground">
                {description}
              </SheetDescription>
            )}
          </SheetHeader>

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-thin px-5 py-4">
            {children}
          </div>

          {footer && (
            <div className="shrink-0 flex items-center justify-end gap-2 px-5 py-3 border-t border-border/60 bg-muted/30">
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
          "flex flex-col p-0 gap-0 max-w-md max-h-[90dvh]",
          className,
        )}
      >
        <DialogHeader className="shrink-0 px-6 py-4 border-b border-border/60">
          <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-sm text-muted-foreground mt-0.5">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-6 py-4">
          {children}
        </div>

        {footer && (
          <div className="shrink-0 flex items-center justify-end gap-2 px-6 py-4 border-t border-border/60 bg-muted/30">
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
