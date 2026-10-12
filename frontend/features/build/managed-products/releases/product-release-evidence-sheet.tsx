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
import { LoadingState } from "@/components/shared/loading-state";
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
            loading={<LoadingState variant="list" rows={4} />}
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
