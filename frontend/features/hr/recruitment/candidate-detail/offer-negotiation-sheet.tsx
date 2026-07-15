"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetBody,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useOfferVersions,
  useOfferNegotiations,
  useRespondToNegotiation,
  type CandidateOffer,
} from "@/hooks/api/hr/recruitment/offers";

function formatINR(val: string | null) {
  if (!val) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(val));
}

interface Props {
  candidateId: number;
  offer: CandidateOffer;
  onClose: () => void;
}

export function OfferNegotiationSheet({ candidateId, offer, onClose }: Props) {
  const { data: versions, isLoading: versionsLoading } = useOfferVersions(candidateId, offer.id);
  const { data: negotiations, isLoading: negotiationsLoading } = useOfferNegotiations(candidateId, offer.id);
  const respond = useRespondToNegotiation(candidateId);

  const [proposedSalary, setProposedSalary] = useState("");
  const [message, setMessage] = useState("");

  const handleOpenChange = useCallback((v: boolean) => { if (!v) onClose(); }, [onClose]);
  const handleSalaryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setProposedSalary(e.target.value), []);
  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value), []);

  const handleRespond = useCallback((applyToOffer: boolean) => {
    respond.mutate(
      {
        offerId: offer.id,
        proposedSalary: proposedSalary ? Number(proposedSalary) : undefined,
        message: message || undefined,
        applyToOffer,
      },
      {
        onSuccess: () => {
          toast.success(applyToOffer ? "New terms sent to candidate" : "Response recorded");
          setProposedSalary("");
          setMessage("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [offer.id, proposedSalary, message, respond]);

  const handleAcknowledge = useCallback(() => handleRespond(false), [handleRespond]);
  const handleSendNewTerms = useCallback(() => handleRespond(true), [handleRespond]);

  return (
    <Sheet open onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col p-0 gap-0">
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
          <SheetTitle>Negotiation &amp; Version History</SheetTitle>
          <SheetDescription>
            {offer.offeredDesignation ?? "Offer"} · Currently {formatINR(offer.offeredSalary)}
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-6 px-6 py-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase text-foreground/80">Negotiation Timeline</p>
            {negotiationsLoading ? (
              <Skeleton className="h-16 rounded-lg" />
            ) : !negotiations?.length ? (
              <p className="text-xs text-muted-foreground">No counter-offers yet.</p>
            ) : (
              <div className="space-y-2">
                {negotiations.map((n) => (
                  <div key={n.id} className="rounded-lg border px-3 py-2.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <Badge variant={n.direction === "CANDIDATE_COUNTER" ? "secondary" : "outline"} className="text-[10px]">
                        {n.direction === "CANDIDATE_COUNTER" ? "Candidate Counter" : "Internal Response"}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">{format(new Date(n.createdAt), "MMM d, yyyy")}</span>
                    </div>
                    {n.proposedSalary && <p className="text-sm font-medium">{formatINR(n.proposedSalary)}</p>}
                    {n.message && <p className="text-xs text-muted-foreground">{n.message}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {offer.offerStatus === "COUNTERED" && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-3">
              <p className="text-xs font-semibold text-foreground/80">Respond to Candidate&apos;s Counter</p>
              <div className="space-y-1.5">
                <Label className="text-xs">Proposed Salary (₹/year)</Label>
                <Input type="number" value={proposedSalary} onChange={handleSalaryChange} placeholder="e.g. 1400000" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Message</Label>
                <Textarea rows={2} value={message} onChange={handleMessageChange} placeholder="Note to internal record or candidate..." />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={handleAcknowledge} disabled={respond.isPending}>
                  Log Response Only
                </Button>
                <Button size="sm" className="flex-1" onClick={handleSendNewTerms} disabled={respond.isPending || !proposedSalary}>
                  {respond.isPending ? "Sending…" : "Send New Terms"}
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground/80 uppercase">Version History</p>
            {versionsLoading ? (
              <Skeleton className="h-16 rounded-lg" />
            ) : !versions?.length ? (
              <p className="text-xs text-muted-foreground">No prior versions.</p>
            ) : (
              <div className="space-y-2">
                {versions.map((v) => (
                  <div key={v.id} className="rounded-lg border px-3 py-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">v{v.versionNumber}</span>
                      <span className="text-[11px] text-muted-foreground">{format(new Date(v.createdAt), "MMM d, yyyy")}</span>
                    </div>
                    <p className="text-sm">{formatINR(v.offeredSalary)} · {v.offeredDesignation ?? "—"}</p>
                    {v.changeReason && <p className="text-[11px] text-muted-foreground">{v.changeReason}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
