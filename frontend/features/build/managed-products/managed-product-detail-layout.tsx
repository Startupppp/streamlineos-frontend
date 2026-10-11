"use client";

import type { ReactNode } from "react";
import { PmPageShell, PmSection, CONTENT_FILL_PANEL } from "@/components/pm-chrome";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
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

export function ManagedProductNotFound() {
  return (
    <PageWrapper title="Product not found" contentClassName={MANAGED_PRODUCT_DETAIL_CONTENT_CLASS}>
      <NoPermissionState
        title="Not found"
        description="This product doesn't exist, or you don't have access to it."
        className={CONTENT_FILL_PANEL}
      />
    </PageWrapper>
  );
}

