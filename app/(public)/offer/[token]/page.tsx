"use client";

import { use, useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Props = { params: Promise<{ token: string }> };

interface Offer {
  id: number;
  offerStatus: string;
  offeredSalary: string | null;
  offeredDesignation: string | null;
  joiningDate: string | null;
  validUntil: string | null;
  notes: string | null;
  acceptanceTokenExpiresAt: string | null;
}

function formatINR(val: string | null) {
  if (!val) return null;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(val));
}

export default function OfferAcceptancePage({ params }: Props) {
  const { token } = use(params);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [responded, setResponded] = useState(false);
  const [finalStatus, setFinalStatus] = useState("");

  const fetchOffer = useCallback(async () => {
    try {
      const res = await fetch(`/api/public/offer/${token}`);
      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Offer not found");
        return;
      }
      setOffer(await res.json());
    } catch {
      setError("Failed to load offer details. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void fetchOffer(); }, [fetchOffer]);

  const handleRespond = useCallback(async (action: "accept" | "decline", reason?: string) => {
    setResponding(true);
    try {
      const res = await fetch(`/api/public/offer/${token}/respond`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, declineReason: reason }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error ?? "Failed to respond to offer");
        return;
      }
      setFinalStatus(body.status);
      setResponded(true);
      setDeclineOpen(false);
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setResponding(false);
    }
  }, [token]);

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <svg className="h-8 w-8 mx-auto mb-3 animate-spin opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          Loading offer…
        </div>
      </main>
    );
  }

  if (error || !offer) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-10">
            <svg className="h-10 w-10 mx-auto mb-4 text-destructive opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="font-medium">{error || "Offer not found"}</p>
            <p className="text-sm text-muted-foreground mt-1">This link may have expired or is invalid.</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (responded || (offer.offerStatus !== "SENT" && offer.offerStatus !== "VIEWED")) {
    const accepted = (responded && finalStatus === "ACCEPTED") || offer.offerStatus === "ACCEPTED";
    const declined = (responded && finalStatus === "DECLINED") || offer.offerStatus === "DECLINED";

    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-10">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${accepted ? "bg-green-100 dark:bg-green-900/30" : declined ? "bg-red-100 dark:bg-red-900/30" : "bg-muted"}`}>
              {accepted ? (
                <svg className="h-7 w-7 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
              ) : declined ? (
                <svg className="h-7 w-7 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              ) : (
                <svg className="h-7 w-7 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /></svg>
              )}
            </div>
            <p className="font-semibold text-lg">
              {accepted ? "Offer Accepted" : declined ? "Offer Declined" : "Offer Already Responded"}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {accepted
                ? "Welcome! Our HR team will reach out with next steps."
                : declined
                  ? "Thank you for your time. We wish you the best in your career."
                  : "This offer has already been responded to."}
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
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
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border bg-muted/40 px-3 py-2.5">
                <p className="text-xs text-muted-foreground mb-0.5">Designation</p>
                <p className="font-medium">{offer.offeredDesignation ?? "—"}</p>
              </div>
              <div className="rounded-lg border bg-muted/40 px-3 py-2.5">
                <p className="text-xs text-muted-foreground mb-0.5">Offered Salary</p>
                <p className="font-medium">{formatINR(offer.offeredSalary) ?? "—"}</p>
              </div>
              {offer.joiningDate && (
                <div className="rounded-lg border bg-muted/40 px-3 py-2.5">
                  <p className="text-xs text-muted-foreground mb-0.5">Joining Date</p>
                  <p className="font-medium">{format(new Date(offer.joiningDate), "dd MMM yyyy")}</p>
                </div>
              )}
              {offer.validUntil && (
                <div className="rounded-lg border bg-muted/40 px-3 py-2.5">
                  <p className="text-xs text-muted-foreground mb-0.5">Offer Valid Until</p>
                  <p className="font-medium">{format(new Date(offer.validUntil), "dd MMM yyyy")}</p>
                </div>
              )}
            </div>

            {offer.notes && (
              <div className="rounded-lg border px-4 py-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1 text-xs uppercase tracking-wide">Additional Notes</p>
                <p>{offer.notes}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                className="flex-1"
                onClick={() => handleRespond("accept")}
                disabled={responding}
              >
                <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {responding ? "Processing…" : "Accept Offer"}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDeclineOpen(true)}
                disabled={responding}
              >
                Decline
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              By accepting, you agree to the terms outlined in this offer.
            </p>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline this offer?</AlertDialogTitle>
            <AlertDialogDescription>
              Please let us know why you're declining (optional).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Reason for declining (optional)"
            rows={3}
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            className="mx-6 mb-2"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => handleRespond("decline", declineReason || undefined)}
            >
              Decline Offer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
