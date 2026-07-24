"use client";

import type { ReactNode } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export const AI_FIELD_POPOVER_CONTENT_CLASS =
  "flex w-[min(24rem,var(--radix-popover-content-available-width))] max-h-[min(28rem,var(--radix-popover-content-available-height))] flex-col overflow-hidden p-0";

interface AiFieldPopoverLayoutProps {
  children: ReactNode;
  className?: string;
}

export function AiFieldPopoverLayout({ children, className }: AiFieldPopoverLayoutProps) {
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      {children}
    </div>
  );
}

interface AiFieldPopoverScrollBodyProps {
  children: ReactNode;
  className?: string;
  unstyled?: boolean;
}

export function AiFieldPopoverScrollBody({
  children,
  className,
  unstyled = false,
}: AiFieldPopoverScrollBodyProps) {
  return (
    <ScrollArea
      fill
      hideScrollbar
      className={cn("min-h-0 flex-1", className)}
    >
      {unstyled ? children : <div className="p-4">{children}</div>}
    </ScrollArea>
  );
}

interface AiFieldPopoverFooterProps {
  children: ReactNode;
  className?: string;
}

export function AiFieldPopoverFooter({ children, className }: AiFieldPopoverFooterProps) {
  return (
    <div
      className={cn(
        "shrink-0 border-t border-border bg-popover p-3",
        className,
      )}
    >
      <div className="flex w-full gap-2 [&>*]:min-w-0 [&>*]:flex-1">
        {children}
      </div>
    </div>
  );
}
