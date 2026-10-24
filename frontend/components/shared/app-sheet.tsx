"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  scrollArea?: boolean;
  fill?: boolean;
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
  scrollArea = false,
  fill = false,
}: AppSheetProps) {
  const isMobile = useIsMobile();
  const resolvedSide = isMobile ? "bottom" : side;

  const sideClasses =
    resolvedSide === "bottom"
      ? cn(
          "max-h-[92dvh] rounded-t-2xl border-t pb-[env(safe-area-inset-bottom)]",
          fill ? "h-[92dvh]" : "h-auto",
        )
      : "sm:max-w-lg";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={resolvedSide}
        className={cn("flex flex-col p-0 gap-0", sideClasses, className)}
        {...(description ? {} : { "aria-describedby": undefined })}
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

        <SheetBody
          className={
            scrollArea
              ? "flex flex-col overflow-y-hidden p-0"
              : cn(
                  resolvedSide === "bottom" ? "px-5 py-4" : "px-6 py-4",
                  fill && "flex flex-col overflow-y-hidden",
                )
          }
        >
          {scrollArea ? (
            <ScrollArea
              className="min-h-0 flex-1"
              viewportClassName={resolvedSide === "bottom" ? "px-5 py-4" : "px-6 py-4"}
            >
              {children}
            </ScrollArea>
          ) : (
            children
          )}
        </SheetBody>

        {footer && (
          <div
            className={cn(
              "flex w-full shrink-0 gap-2 border-t border-border/60 bg-muted/30 [&>*]:min-w-0 [&>*]:flex-1",
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
