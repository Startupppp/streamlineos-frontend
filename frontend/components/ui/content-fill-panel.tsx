"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const CONTENT_FILL_PANEL = "flex min-h-full w-full flex-1 flex-col";

/** Horizontal page inset used by PageWrapper headers, filters, and content. */
export const PAGE_CHROME_X = "px-4 sm:px-6 lg:px-8";

/** Bottom breathing room so content never sits flush on the viewport edge. */
export const PAGE_CHROME_BOTTOM = "pb-6 sm:pb-8";

export const FILTER_SELECT_TRIGGER =
  "border-input bg-card text-foreground [&_svg:not([class*='text-'])]:text-muted-foreground";

export const FILTER_TOOLBAR_ROW =
  "flex w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0";

export const CONTENT_PANEL_SOLID =
  "rounded-xl border border-border bg-card shadow-sm";

interface ContentFillPanelProps {
  children: ReactNode;
  className?: string;
}

export function ContentFillPanel({ children, className }: ContentFillPanelProps) {
  return (
    <div
      className={cn(
        CONTENT_PANEL_SOLID,
        CONTENT_FILL_PANEL,
        "overflow-hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}
