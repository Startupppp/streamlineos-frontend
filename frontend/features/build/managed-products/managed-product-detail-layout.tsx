"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import {
  PmPageShell,
  PmSection,
  CONTENT_FILL_PANEL,
} from "@/components/pm-chrome";
import { PageState } from "@/components/shared/page-state";
import { NotFoundView } from "@/components/shared/page-state-views";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import type { PageStateResolution } from "@/lib/page-state/resolve-page-state";
import { cn } from "@/lib/utils";

export const MANAGED_PRODUCT_DETAIL_CONTENT_CLASS = "h-full";

const NOT_FOUND_RESOLUTION: PageStateResolution = { kind: "not-found" };

interface ManagedProductDetailShellProps {
  children: ReactNode;
  className?: string;
}

export function ManagedProductDetailShell({
  children,
  className,
}: ManagedProductDetailShellProps) {
  return (
    <PmPageShell className={cn("h-full", className)}>{children}</PmPageShell>
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
    <PageWrapper contentClassName={MANAGED_PRODUCT_DETAIL_CONTENT_CLASS}>
      <PageState
        loading={null}
        resolution={NOT_FOUND_RESOLUTION}
        className={CONTENT_FILL_PANEL}
        notFound={
          <NotFoundView
            title="Product not found"
            description="This product may have been archived or deleted, or the link is incorrect."
            action={
              <Button asChild variant="outline" className="gap-2">
                <Link href="/build/managed-products">
                  <ArrowLeft className="h-4 w-4" />
                  Back to products
                </Link>
              </Button>
            }
          />
        }
      >
        {null}
      </PageState>
    </PageWrapper>
  );
}
