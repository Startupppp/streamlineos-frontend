import { notFound } from "next/navigation";
import { publicOfferDetailContract } from "@/lib/public-schema";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { publicGetNoStore, type PublicOffer } from "@/lib/public-fetch";
import { ApiError } from "@/lib/api-envelope";
import { CtcBreakdownPanel } from "@/components/shared/ctc-breakdown-panel";

import { OfferActionIsland } from "@/features/careers/components/offer-action-island";

type Props = { params: Promise<{ offerToken: string }> };

function ExpiredState() {
  return (
    <main className="candidate-surface min-h-dvh bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="py-10">
          <svg className="h-10 w-10 mx-auto mb-4 text-muted-foreground opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          <p className="font-medium">This offer link has expired</p>
          <p className="text-sm text-muted-foreground mt-1">Please contact your recruiter for assistance.</p>
        </CardContent>
      </Card>
    </main>
  );
}

function AlreadyRespondedState({ offer }: { offer: PublicOffer }) {
  const accepted = offer.offerStatus === "ACCEPTED";
  const declined = offer.offerStatus === "DECLINED";
  const countered = offer.offerStatus === "COUNTERED";

  return (
    <main className="candidate-surface min-h-dvh bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="py-10">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${accepted ? "bg-status-success-surface" : declined ? "bg-status-danger-surface" : countered ? "bg-status-info-surface" : "bg-muted"}`}>
            {accepted ? (
              <svg className="w-7 text-status-success-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
            ) : declined ? (
              <svg className="w-7 text-status-danger-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            ) : countered ? (
              <svg className="w-7 text-status-info-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>
            ) : (
              <svg className="w-7 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /></svg>
            )}
          </div>
          <p className="font-semibold text-lg">
            {accepted ? "Offer Accepted" : declined ? "Offer Declined" : countered ? "Counter-Offer Sent" : "Offer Already Responded"}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {accepted
              ? "Welcome! Our HR team will reach out with next steps."
              : declined
                ? "Thank you for your time. We wish you the best in your career."
                : countered
                  ? "We've received your proposed terms and will get back to you shortly."
                  : "This offer has already been responded to."}
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

export default async function OfferAcceptancePage({ params }: Props) {
  const { offerToken } = await params;

  let offer: PublicOffer | null;
  try {
    offer = await publicGetNoStore<PublicOffer>(`/public/offer/${offerToken}`, undefined, publicOfferDetailContract);
  } catch (e) {
    if (e instanceof ApiError && e.status === 410) return <ExpiredState />;
    throw e;
  }

  if (!offer) return notFound();

  if (offer.offerStatus !== "SENT" && offer.offerStatus !== "VIEWED") {
    return <AlreadyRespondedState offer={offer} />;
  }

  return (
    <main className="candidate-surface min-h-dvh bg-background">
      <div className="max-w-lg mx-auto px-4 py-12">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="default">Offer Letter</Badge>
              {offer.validUntil && (
                <span className="text-xs text-muted-foreground">
                  Valid until {format(new Date(offer.validUntil), "dd MMM yyyy")}
                </span>
              )}
            </div>
            <CardTitle className="text-xl">
              {offer.offeredDesignation ?? "Job Offer"}
            </CardTitle>
            <CardDescription>Please review the details below and respond.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/*
              Passed as children so it renders between the offer's terms and the
              Accept button, where a candidate reads it — and stays server-side
              while doing so. This page is opened from an email on a phone, and
              the breakdown is the reason it was opened: it belongs in the first
              HTML rather than behind a hydration the connection may not finish.
            */}
            <OfferActionIsland offer={offer} token={offerToken}>
              <CtcBreakdownPanel preview={offer.ctcPreview} currency={offer.currency} />
            </OfferActionIsland>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
