"use client";

import { use, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  FileText,
  Send,
  ThumbsUp,
  XCircle,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEnterpriseQuote } from "@/hooks/api/enterprise-quotes";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  STATUS_CONFIG,
  fmtInr,
  DetailRow,
  TimelineItem,
  DetailPageSkeleton,
  ActionSidebar,
} from "@/features/billing/enterprise-quotes/quote-detail-components";

export default function EnterpriseQuoteDetailPage({
  params,
}: {
  params: Promise<{ quoteId: string }>;
}) {
  const { quoteId } = use(params);
  const id = Number(quoteId);

  const { data: quote, isLoading, isError, refetch } = useEnterpriseQuote(id);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  function handlePrint() {
    window.print();
  }

  const totalPaise = quote
    ? quote.negotiatedSeats * quote.pricePerSeatInPaise * quote.contractTermMonths
    : 0;

  return (
    <PageWrapper
      title={quote?.subject ?? "Enterprise Quote"}
      eyebrow={quote?.quoteRef}
      badge={quote ? STATUS_CONFIG[quote.status].label : undefined}
      backHref="/billing/enterprise-quotes"
      actions={
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="h-3.5 w-3.5 mr-1.5" />
          Print / Export
        </Button>
      }
    >
      {isLoading ? (
        <DetailPageSkeleton />
      ) : isError || !quote ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <div>
            <p className="font-medium">Failed to load enterprise quote</p>
            <p className="text-sm text-muted-foreground mt-1">
              The quote may not exist or you don&apos;t have access.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRetry}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Retry
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/billing/enterprise-quotes">Back to Quotes</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="text-sm font-semibold mb-3">Quote Details</h2>
              <div>
                <DetailRow label="Plan Tier" value={quote.planTier} />
                <DetailRow
                  label="Requested Seats"
                  value={quote.requestedSeats.toLocaleString()}
                />
                <DetailRow
                  label="Negotiated Seats"
                  value={quote.negotiatedSeats.toLocaleString()}
                />
                <DetailRow
                  label="Price / Seat / Month"
                  value={fmtInr(quote.pricePerSeatInPaise)}
                />
                <DetailRow
                  label="Contract Term"
                  value={`${quote.contractTermMonths} months`}
                />
                <DetailRow
                  label="Total Contract Value"
                  value={
                    <span className="text-base font-bold text-foreground">
                      {fmtInr(totalPaise)}
                    </span>
                  }
                />
                <DetailRow
                  label="Valid Until"
                  value={format(new Date(quote.validUntil), "dd MMM yyyy")}
                />
                {quote.deal && <DetailRow label="Associated Deal" value={quote.deal.name} />}
                {quote.client && <DetailRow label="Client" value={quote.client.name} />}
              </div>
            </div>

            {quote.contractTerms && (
              <div className="rounded-lg border border-border bg-card p-5">
                <h2 className="text-sm font-semibold mb-2">Contract Terms</h2>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {quote.contractTerms}
                </p>
              </div>
            )}

            {quote.notes && (
              <div className="rounded-lg border border-border bg-card p-5">
                <h2 className="text-sm font-semibold mb-2">Notes</h2>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{quote.notes}</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="text-sm font-semibold mb-4">Approval Workflow</h2>
              <div className="space-y-0">
                <TimelineItem
                  icon={<FileText className="h-3.5 w-3.5" />}
                  label="Created"
                  date={quote.createdAt}
                  by={quote.createdBy?.name}
                  active
                />
                {quote.status !== "DRAFT" && (
                  <TimelineItem
                    icon={<Send className="h-3.5 w-3.5" />}
                    label="Submitted for Approval"
                    date={quote.updatedAt}
                  />
                )}
                {(quote.approvedAt ?? quote.rejectedAt) && (
                  <TimelineItem
                    icon={
                      quote.approvedAt ? (
                        <ThumbsUp className="h-3.5 w-3.5" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5" />
                      )
                    }
                    label={quote.approvedAt ? "Approved" : "Rejected"}
                    date={quote.approvedAt ?? quote.rejectedAt}
                    by={quote.approver?.name}
                    note={quote.approvalNotes ?? quote.rejectionReason}
                    active={!!quote.approvedAt}
                  />
                )}
                {quote.sentAt && (
                  <TimelineItem
                    icon={<Send className="h-3.5 w-3.5" />}
                    label="Sent to Customer"
                    date={quote.sentAt}
                    active
                  />
                )}
                {quote.acceptedAt && (
                  <TimelineItem
                    icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                    label="Accepted"
                    date={quote.acceptedAt}
                    active
                  />
                )}
              </div>
            </div>

            <ActionSidebar quoteId={id} status={quote.status} />
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
