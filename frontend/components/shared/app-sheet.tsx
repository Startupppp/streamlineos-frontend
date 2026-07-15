"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/common/use-mobile";
import { cn } from "@/lib/utils";

interface AppSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  side?: "right" | "left" | "top" | "bottom";
  className?: string;
}

export function AppSheet({
  open,
  onOpenChange,
  title,
  description,
  footer,
  children,
  side = "right",
  className,
}: AppSheetProps) {
  const isMobile = useIsMobile();
  const resolvedSide = isMobile ? "bottom" : side;

  const sideClasses =
    resolvedSide === "bottom"
      ? "h-auto max-h-[92dvh] rounded-t-2xl border-t pb-[env(safe-area-inset-bottom)]"
      : "sm:max-w-lg";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={resolvedSide}
        className={cn("flex flex-col p-0 gap-0", sideClasses, className)}
      >
        {resolvedSide === "bottom" && (
          <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-muted-foreground/25 shrink-0" />
        )}

        <SheetHeader
          className={cn(
            "shrink-0 border-b border-border/60 text-left gap-1",
            resolvedSide === "bottom" ? "px-5 pt-2 pb-3" : "px-6 py-4",
          )}
        >
          <SheetTitle className="text-base font-semibold">{title}</SheetTitle>
          {description && (
            <SheetDescription className="text-sm text-muted-foreground">
              {description}
            </SheetDescription>
          )}
        </SheetHeader>

        <div
          className={cn(
            "flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-hide",
            resolvedSide === "bottom" ? "px-5 py-4" : "px-6 py-4",
          )}
        >
          {children}
        </div>

        {footer && (
          <div
            className={cn(
              "shrink-0 flex w-full gap-2 border-t border-border/60 bg-muted/30",
              resolvedSide === "bottom" ? "px-5 py-3" : "px-6 py-4",
            )}
          >
            {footer}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
