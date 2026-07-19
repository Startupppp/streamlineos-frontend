"use client";

import { useMemo, useState } from "react";
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
import { useAllOffers, type OfferListItem } from "@/hooks/api/hr/recruitment/offers";
import { ErrorState } from "@/components/shared/error-state";
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

function formatINR(val: string | null) {
  if (!val) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(val));
}

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
              <span>{formatINR(offer.offeredSalary)}</span>
              <span>Created {format(new Date(offer.createdAt), "MMM d, yyyy")}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

const OFFER_STATUS_FILTERS = [
  { value: "ALL", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING_APPROVAL", label: "Pending approval" },
  { value: "SENT", label: "Sent" },
  { value: "VIEWED", label: "Viewed" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "DECLINED", label: "Declined" },
  { value: "COUNTERED", label: "Countered" },
  { value: "EXPIRED", label: "Expired" },
] as const;

export default function OffersPage() {
  const { data: offers, isLoading, isError, refetch } = useAllOffers();
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filtered = useMemo(() => {
    if (!offers) return [];
    if (statusFilter === "ALL") return offers;
    return offers.filter((o) => o.offerStatus === statusFilter);
  }, [offers, statusFilter]);

  if (isLoading) {
    return (
      <PageWrapper title="Offers" subtitle="Track every offer across all candidates." variant="display">
        <div className="flex flex-1 min-h-0 flex-col gap-3">
          {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Offers" subtitle="Track every offer across all candidates." variant="display">
        <ErrorState
          title="Unable to load offers"
          description="You may not have permission to view offers, or the server returned an unexpected response. Try again."
          onRetry={() => void refetch()}
        />
      </PageWrapper>
    );
  }

  const total = offers?.length ?? 0;

  return (
    <PageWrapper
      title="Offers"
      subtitle={
        total > 0
          ? `${total} offer${total === 1 ? "" : "s"} across all candidates`
          : "Track every offer across all candidates — status, terms, and approvals."
      }
      variant="display"
      filters={
        total > 0 ? (
          <div className={FILTER_TOOLBAR_ROW}>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
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
        {!offers?.length ? (
          <RecruitmentEmptyState
            illustration={<EmptyDocumentsIllustration />}
            title="No offers yet"
            description="Offers created from a candidate's profile will appear here."
          />
        ) : filtered.length === 0 ? (
          <RecruitmentEmptyState
            illustration={<EmptyDocumentsIllustration />}
            title="No offers match this filter"
            description="Try another status or clear the filter."
          />
        ) : (
          <div className="flex flex-1 min-h-0 flex-col gap-3">
            {filtered.map((offer) => <OfferRow key={offer.id} offer={offer} />)}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
