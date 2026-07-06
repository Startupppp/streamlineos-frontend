"use client";

import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RecruitmentEmptyState } from "@/features/hr/recruitment/components/recruitment-empty-state";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import { format } from "date-fns";
import { useAllOffers, type OfferListItem } from "@/hooks/api/hr/recruitment/offers";

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

export default function OffersPage() {
  const { data: offers, isLoading } = useAllOffers();

  if (isLoading) {
    return (
      <PageWrapper title="Offers" subtitle="Track every offer across all candidates.">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Offers"
      subtitle="Track every offer across all candidates — status, terms, and approvals."
      badge={offers ? `${offers.length}` : undefined}
    >
      {!offers?.length ? (
        <RecruitmentEmptyState
          illustration={<EmptyDocumentsIllustration />}
          title="No offers yet"
          description="Offers created from a candidate's profile will appear here."
        />
      ) : (
        <div className="space-y-3">
          {offers.map((offer) => <OfferRow key={offer.id} offer={offer} />)}
        </div>
      )}
    </PageWrapper>
  );
}
