"use client";

import { useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/shared/loading-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { useManagedProductRelease } from "@/hooks/api/build/managed-product-releases";
import type { ManagedProductRelationsGetReleaseResponse } from "@/contracts/build-contracts.generated";

type Evidence = NonNullable<ManagedProductRelationsGetReleaseResponse["evidence"]>;

interface EvidencePanelProps {
  evidence: Evidence;
}

function EvidenceTicketList({ evidence }: EvidencePanelProps) {
  const tickets = useMemo(() => evidence.tickets, [evidence.tickets]);
  return (
    <section aria-labelledby="evidence-tickets-heading" className="flex flex-col gap-2">
      <h3 id="evidence-tickets-heading" className="text-sm font-semibold text-foreground">
        Tickets ({evidence.ticketCount})
      </h3>
      {tickets.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tickets linked.</p>
      ) : (
        <ul className="flex flex-col gap-1" aria-label="Linked tickets">
          {tickets.map((t) => (
            <li key={t.ticketId} className="flex items-center gap-2 text-sm">
              <span className="font-mono tabular-nums text-muted-foreground shrink-0">#{t.ticketNumber}</span>
              <span className="truncate text-foreground">{t.title}</span>
              <Badge variant="outline" className="ml-auto shrink-0 text-micro">
                {t.status}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function EvidenceTestRunList({ evidence }: EvidencePanelProps) {
  const testRuns = useMemo(() => evidence.testRuns, [evidence.testRuns]);
  return (
    <section aria-labelledby="evidence-test-runs-heading" className="flex flex-col gap-2">
      <h3 id="evidence-test-runs-heading" className="text-sm font-semibold text-foreground">
        Test runs ({evidence.testRunCount})
      </h3>
      {testRuns.length === 0 ? (
        <p className="text-sm text-muted-foreground">No test runs recorded.</p>
      ) : (
        <ul className="flex flex-col gap-1" aria-label="Test runs">
          {testRuns.map((tr) => (
            <li key={tr.id} className="flex items-center gap-2 text-sm">
              <span className="truncate text-foreground">{tr.name}</span>
              <Badge variant="outline" className="ml-auto shrink-0 text-micro">
                {tr.status}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

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

  const resolution = usePageState({
    permission: "build:managed-products:view",
    isLoading: detail.isLoading,
    isError: detail.isError,
    error: detail.error,
  });

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
                <EvidenceTicketList evidence={detail.data.evidence} />
                <EvidenceTestRunList evidence={detail.data.evidence} />
                <section aria-labelledby="evidence-incidents-heading" className="flex flex-col gap-2">
                  <h3 id="evidence-incidents-heading" className="text-sm font-semibold text-foreground">
                    Incidents
                  </h3>
                  <p className="text-sm text-foreground font-mono tabular-nums">
                    {detail.data.evidence.incidentCount}
                  </p>
                </section>
                <section aria-labelledby="evidence-approval-heading" className="flex flex-col gap-2">
                  <h3 id="evidence-approval-heading" className="text-sm font-semibold text-foreground">
                    Approval state
                  </h3>
                  <p className="text-sm text-foreground">
                    {detail.data.evidence.approvalState ?? "Not set"}
                  </p>
                </section>
              </div>
            ) : null}
          </PageState>
        </div>
      </SheetContent>
    </Sheet>
  );
}
