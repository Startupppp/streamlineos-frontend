"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { RecruitmentEmptyState } from "@/features/hr/recruitment/components/recruitment-empty-state";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import { format } from "date-fns";
import { formatINR } from "@/lib/format-utils";
import { useAllOffers, type OfferListItem } from "@/hooks/api/hr/recruitment/offers";
import { ErrorState } from "@/components/shared/error-state";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import { FILTER_SELECT_TRIGGER, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<OfferListItem["offerStatus"], { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  DRAFT: { label: "Draft", variant: "secondary" },
  PENDING_APPROVAL: { label: "Pending Approval", variant: "secondary" },
  APPROVAL_REJECTED: { label: "Approval Rejected", variant: "destructive" },
  SENT: { label: "Sent", variant: "outline" },
  VIEWED: { label: "Viewed", variant: "outline" },
  ACCEPTED: { label: "Accepted", variant: "default" },
  DECLINED: { label: "Declined", variant: "destructive" },
  COUNTERED: { label: "Countered", variant: "secondary" },
  EXPIRED: { label: "Expired", variant: "destructive" },
};

function OfferRow({ offer }: { offer: OfferListItem }) {
  const cfg = STATUS_CONFIG[offer.offerStatus] ?? STATUS_CONFIG.DRAFT;
  return (
    <Link href={`/hr/recruitment/candidates/${offer.candidateId}`}>
      <Card className="shadow-sm hover:bg-muted/40 transition-colors">
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{offer.candidateFirstName} {offer.candidateLastName}</span>
              <Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge>
              {offer.jobTitle && <Badge variant="outline" className="text-xs">{offer.jobTitle}</Badge>}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
              <span>{offer.candidateEmail}</span>
              {offer.offeredDesignation && <span>{offer.offeredDesignation}</span>}
              <span>{offer.offeredSalary ? formatINR(offer.offeredSalary) : "—"}</span>
              <span>Created {format(new Date(offer.createdAt), "MMM d, yyyy")}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

const OFFER_STATUS_FILTERS: ReadonlyArray<{
  value: OfferListItem["offerStatus"] | "ALL";
  label: string;
}> = [
  { value: "ALL", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING_APPROVAL", label: "Pending approval" },
  { value: "SENT", label: "Sent" },
  { value: "VIEWED", label: "Viewed" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "DECLINED", label: "Declined" },
  { value: "COUNTERED", label: "Countered" },
  { value: "EXPIRED", label: "Expired" },
];

const PAGE_SIZE = 20;

export function OffersPage() {
  const [statusFilter, setStatusFilter] = useState<OfferListItem["offerStatus"] | "ALL">("ALL");
  const [cursorHistory, setCursorHistory] = useState<Array<string | undefined>>([undefined]);
  const page = cursorHistory.length;
  const cursor = cursorHistory.at(-1);
  const { data, isLoading, isFetching, isError, refetch } = useAllOffers({
    cursor,
    pageSize: PAGE_SIZE,
    status: statusFilter === "ALL" ? undefined : statusFilter,
  });
  const offers = data?.items ?? [];

  function handleStatusChange(value: string) {
    const match = OFFER_STATUS_FILTERS.find((s) => s.value === value);
    setStatusFilter(match?.value ?? "ALL");
    setCursorHistory([undefined]);
  }

  const handlePreviousPage = useCallback(() => {
    setCursorHistory((history) => history.length > 1 ? history.slice(0, -1) : history);
  }, []);

  const handleNextPage = useCallback(() => {
    const nextCursor = data?.pagination.nextCursor;
    if (nextCursor) setCursorHistory((history) => [...history, nextCursor]);
  }, [data?.pagination.nextCursor]);

  if (isLoading) {
    return (
      <PageWrapper title="Offers" subtitle="Track every offer across all candidates.">
        <div className="flex flex-1 min-h-0 flex-col gap-3">
          {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Offers" subtitle="Track every offer across all candidates.">
        <ErrorState
          title="Unable to load offers"
          description="You may not have permission to view offers, or the server returned an unexpected response. Try again."
          onRetry={() => void refetch()}
        />
      </PageWrapper>
    );
  }

  const total = data?.total ?? 0;

  return (
    <PageWrapper
      title="Offers"
      subtitle={
        total > 0
          ? `${total} offer${total === 1 ? "" : "s"} across all candidates`
          : "Track every offer across all candidates — status, terms, and approvals."
      }
      filters={
        total > 0 || statusFilter !== "ALL" ? (
          <div className={FILTER_TOOLBAR_ROW}>
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger className={cn("w-44", FILTER_SELECT_TRIGGER)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OFFER_STATUS_FILTERS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : undefined
      }
    >
      <div className="flex flex-1 min-h-0 flex-col">
        {offers.length === 0 && statusFilter === "ALL" ? (
          <RecruitmentEmptyState
            illustration={<EmptyDocumentsIllustration />}
            title="No offers yet"
            description="Offers created from a candidate's profile will appear here."
          />
        ) : offers.length === 0 ? (
          <RecruitmentEmptyState
            illustration={<EmptyDocumentsIllustration />}
            title="No offers match this filter"
            description="Try another status or clear the filter."
          />
        ) : (
          <div className="flex flex-1 min-h-0 flex-col gap-3">
            {offers.map((offer) => <OfferRow key={offer.id} offer={offer} />)}
            {(page > 1 || data?.pagination.hasMore) && (
              <CursorPageControls
                page={page}
                hasNext={data?.pagination.hasMore ?? false}
                disabled={isFetching}
                onPrevious={handlePreviousPage}
                onNext={handleNextPage}
              />
            )}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
