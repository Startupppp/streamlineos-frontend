"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

const PAGE_TITLE = "Document Library";
const PAGE_SUBTITLE = "Centralized repository for all company-wide HR documents, contracts, and policy files.";

export function DocumentLibrarySkeleton() {
  return (
    <PageWrapper title={PAGE_TITLE} subtitle={PAGE_SUBTITLE}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-18 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-100 rounded-2xl" />
      </div>
    </PageWrapper>
  );
}

export function DocumentLibraryState({ children }: { children: React.ReactNode }) {
  return (
    <PageWrapper title={PAGE_TITLE} subtitle={PAGE_SUBTITLE}>
      {children}
    </PageWrapper>
  );
}
