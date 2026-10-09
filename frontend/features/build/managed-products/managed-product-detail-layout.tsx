"use client";

import type { ReactNode } from "react";
import { PmPageShell, PmSection, CONTENT_FILL_PANEL } from "@/components/pm-chrome";
import { cn } from "@/lib/utils";

export const MANAGED_PRODUCT_DETAIL_CONTENT_CLASS = "h-full";

interface ManagedProductDetailShellProps {
  children: ReactNode;
  className?: string;
}

export function ManagedProductDetailShell({
  children,
  className,
}: ManagedProductDetailShellProps) {
  return (
    <PmPageShell className={cn("h-full", className)}>
      {children}
    </PmPageShell>
  );
}

interface ManagedProductDetailPrimarySectionProps {
  children: ReactNode;
  className?: string;
  index?: number;
}

export function ManagedProductDetailPrimarySection({
  children,
  className,
  index = 0,
}: ManagedProductDetailPrimarySectionProps) {
  return (
    <PmSection index={index} className={cn(CONTENT_FILL_PANEL, className)}>
      {children}
    </PmSection>
  );
}
