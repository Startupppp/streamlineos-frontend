"use client";

import type { ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface FormSheetChromeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  footer?: ReactNode;
  children: ReactNode;
  side?: "right" | "left" | "top" | "bottom";
  className?: string;
  bodyClassName?: string;
  headerClassName?: string;
  footerClassName?: string;
}

export function FormSheetChrome({
  open,
  onOpenChange,
  title,
  description,
  footer,
  children,
  side = "right",
  className,
  bodyClassName,
  headerClassName,
  footerClassName,
}: FormSheetChromeProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        className={cn(
          "flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md",
          className,
        )}
      >
        <SheetHeader
          className={cn(
            "shrink-0 gap-1 border-b border-border px-6 py-4 text-left",
            headerClassName,
          )}
        >
          <SheetTitle>{title}</SheetTitle>
          {description ? (
            <SheetDescription>{description}</SheetDescription>
          ) : null}
        </SheetHeader>
        <SheetBody className={cn("px-6 py-5", bodyClassName)}>{children}</SheetBody>
        {footer ? (
          <SheetFooter
            className={cn(
              "shrink-0 border-t border-border bg-muted/30 px-6 py-4",
              footerClassName,
            )}
          >
            {footer}
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
