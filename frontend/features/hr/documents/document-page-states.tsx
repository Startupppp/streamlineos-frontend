"use client";

import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";

const PAGE_TITLE = "Document Library";
const PAGE_SUBTITLE = "Centralized repository for all HR documents, contracts, and policy files.";

export function DocumentLibrarySkeleton() {
  return (
    <PageWrapper title={PAGE_TITLE} subtitle={PAGE_SUBTITLE} variant="display">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[400px] rounded-2xl" />
      </div>
    </PageWrapper>
  );
}

export function DocumentLibraryError({ onRetry }: { onRetry: () => void }) {
  return (
    <PageWrapper title={PAGE_TITLE} subtitle={PAGE_SUBTITLE} variant="display">
      <div className="flex flex-col items-center justify-center py-14 text-center gap-3">
        <AlertCircle className="w-8 text-destructive" />
        <div>
          <p className="text-sm font-medium text-foreground">Failed to load documents</p>
          <p className="text-xs text-muted-foreground mt-0.5">Something went wrong. Please try again.</p>
        </div>
        <Button size="sm" variant="outline" onClick={onRetry}>Try again</Button>
      </div>
    </PageWrapper>
  );
}
