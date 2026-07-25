"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const CONTENT_FILL_PANEL = "flex min-h-full w-full flex-1 flex-col";

/** Horizontal page inset used by PageWrapper headers, filters, and content. */
export const PAGE_CHROME_X = "px-4 sm:px-6 lg:px-8";

/** Minimal bottom breathing room; the shell already reserves the Ask OS bar height (md:pb-6), so content sits just above the bar. */
export const PAGE_CHROME_BOTTOM = "pb-2";

export const FILTER_SELECT_TRIGGER =
  "min-w-0 border-input bg-card text-foreground [&_svg]:text-muted-foreground [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:truncate";

export const FILTER_TOOLBAR_ROW =
  "flex w-full min-w-0 max-w-full flex-nowrap items-center gap-2 overflow-x-auto overscroll-x-contain scrollbar-hide touch-pan-x [&>[data-slot=search-input]]:min-w-[12rem] [&>[data-slot=search-input]]:flex-1 [&>[data-slot=search-input]]:basis-[12rem] [&>[data-slot=select-trigger]]:shrink-0 [&>*:not([data-slot=search-input])]:shrink-0";

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
