"use client";

import { useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { useManagedProductRelease } from "@/hooks/api/build/managed-product-releases";
import { buildProductReturnParam } from "@/features/build/shared/product-return-href";
import {
  EvidenceApprovalState,
  EvidenceIncidentList,
  EvidenceTestRunList,
  EvidenceTicketList,
} from "./product-release-evidence-sections";

interface ProductReleaseEvidenceSheetProps {
  managedProductId: number;
  releaseId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ReleaseEvidenceSkeleton() {
  const sections = [
    { id: "tickets", rows: 3 },
    { id: "tests", rows: 2 },
    { id: "incidents", rows: 2 },
  ] as const;
  return (
    <div role="status" aria-label="Loading release evidence" className="flex flex-col gap-5">
      {sections.map((section) => (
        <section
          key={section.id}
          className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs"
        >
          <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-8 rounded-full" />
          </div>
          <div className="flex flex-col divide-y divide-border/60 px-3">
            {Array.from({ length: section.rows }, (_, rowIndex) => (
              <div key={`${section.id}-${rowIndex}`} className="flex min-h-12 items-center gap-3 py-2">
                <Skeleton className="size-8 shrink-0 rounded-md" />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-3/5" />
                  <Skeleton className="h-3 w-2/5" />
                </div>
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
            ))}
          </div>
        </section>
      ))}
      <section className="rounded-xl border border-border/80 bg-card p-3 shadow-xs">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-3 h-9 w-full rounded-md" />
      </section>
      <span className="sr-only">Loading release evidence</span>
    </div>
  );
}

export function ProductReleaseEvidenceSheet({
  managedProductId,
  releaseId,
  open,
  onOpenChange,
}: ProductReleaseEvidenceSheetProps) {
  const detail = useManagedProductRelease(managedProductId, releaseId, { enabled: open });
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const resolution = usePageState({
    permission: "build:managed-products:view",
    isLoading: detail.isLoading,
    isError: detail.isError,
    error: detail.error,
  });

  const owner = useMemo(
    () => ({
      projectId: detail.data?.projectRelease?.projectId ?? null,
      projectKey: detail.data?.projectRelease?.projectKey ?? null,
      returnParam: buildProductReturnParam(pathname, searchParams.toString()),
    }),
    [detail.data?.projectRelease, pathname, searchParams],
  );

  function handleRetry() {
    void detail.refetch();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="gap-1 border-b border-border px-6 py-4 text-left">
          <SheetTitle>Release evidence</SheetTitle>
          <SheetDescription>
            Tickets, test runs, incidents and approval state for this release.
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <PageState
            resolution={resolution}
            loading={<ReleaseEvidenceSkeleton />}
            onRetry={handleRetry}
          >
            {detail.data?.evidence === null ? (
              <div className="flex flex-col gap-2 py-8 text-center text-sm text-muted-foreground">
                <p className="font-medium text-foreground">No canonical release linked</p>
                <p>Link this product release to a project release to see ticket membership, test runs and incident data here.</p>
              </div>
            ) : detail.data?.evidence ? (
              <div className="flex flex-col gap-6">
                {detail.data.evidence.restricted ? (
                  <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    This release ships from a project you cannot access. The counts below
                    are real; the records behind them are withheld.
                  </p>
                ) : null}
                <EvidenceTicketList evidence={detail.data.evidence} owner={owner} />
                <EvidenceTestRunList evidence={detail.data.evidence} owner={owner} />
                <EvidenceIncidentList evidence={detail.data.evidence} owner={owner} />
                <EvidenceApprovalState evidence={detail.data.evidence} owner={owner} />
              </div>
            ) : null}
          </PageState>
        </div>
      </SheetContent>
    </Sheet>
  );
}
