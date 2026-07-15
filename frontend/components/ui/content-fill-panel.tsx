"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const CONTENT_FILL_PANEL = "flex min-h-0 w-full flex-1 flex-col";

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
