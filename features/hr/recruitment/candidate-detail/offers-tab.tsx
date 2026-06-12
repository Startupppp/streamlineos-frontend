"use client";

import { useState } from "react";
import { getErrorMessage } from "@/lib/get-error-message";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCandidateOffers,
  useCreateCandidateOffer,
  useUpdateCandidateOffer,
  useDeleteCandidateOffer,
  type CandidateOffer,
} from "@/lib/api/hooks/hr/recruitment";
import { toast } from "sonner";
import { Plus, Trash2, Send, CheckCircle2, XCircle, Eye } from "lucide-react";
import { format } from "date-fns";

const STATUS_CONFIG: Record<CandidateOffer["offerStatus"], { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon?: React.ReactNode }> = {
  DRAFT: { label: "Draft", variant: "secondary" },
  SENT: { label: "Sent", variant: "outline", icon: <Send className="h-3 w-3" /> },
  VIEWED: { label: "Viewed", variant: "outline", icon: <Eye className="h-3 w-3" /> },
  ACCEPTED: { label: "Accepted", variant: "default", icon: <CheckCircle2 className="h-3 w-3" /> },
  DECLINED: { label: "Declined", variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
  COUNTERED: { label: "Countered", variant: "secondary" },
  EXPIRED: { label: "Expired", variant: "destructive" },
};

const OFFER_STATUSES: CandidateOffer["offerStatus"][] = [
  "DRAFT", "SENT", "VIEWED", "ACCEPTED", "DECLINED", "COUNTERED", "EXPIRED",
];

function formatINR(val: string | null) {
  if (!val) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(val));
}

interface Props {
  candidateId: number;
}

export function OffersTab({ candidateId }: Props) {
  const { data: offers, isLoading } = useCandidateOffers(candidateId);
  const createOffer = useCreateCandidateOffer(candidateId);
  const updateOffer = useUpdateCandidateOffer(candidateId);
  const deleteOffer = useDeleteCandidateOffer(candidateId);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [offeredSalary, setOfferedSalary] = useState("");
  const [offeredDesignation, setOfferedDesignation] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [offerLetterUrl, setOfferLetterUrl] = useState("");
  const [notes, setNotes] = useState("");

  const handleCreate = () => {
    createOffer.mutate(
      {
        offeredSalary: offeredSalary ? Number(offeredSalary) : undefined,
        offeredDesignation: offeredDesignation || undefined,
        joiningDate: joiningDate || undefined,
        validUntil: validUntil || undefined,
        offerLetterUrl: offerLetterUrl || undefined,
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Offer created");
          setSheetOpen(false);
          setOfferedSalary(""); setOfferedDesignation(""); setJoiningDate("");
          setValidUntil(""); setOfferLetterUrl(""); setNotes("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  };

  const handleStatusChange = (offerId: number, offerStatus: CandidateOffer["offerStatus"]) => {
    updateOffer.mutate(
      { offerId, offerStatus },
      {
        onSuccess: () => toast.success("Offer status updated"),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  };

  const handleDelete = (offerId: number) => {
    deleteOffer.mutate(offerId, {
      onSuccess: () => toast.success("Offer deleted"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Track offer letters and candidate responses</p>
        <Button size="sm" onClick={() => setSheetOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />Create Offer
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : !offers?.length ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            No offers created yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {offers.map((offer) => {
            const config = STATUS_CONFIG[offer.offerStatus];
            return (
              <Card key={offer.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Badge variant={config.variant} className="gap-1 text-xs">
                          {config.icon}
                          {config.label}
                        </Badge>
                        {offer.validUntil && (
                          <span className="text-xs text-muted-foreground">
                            Valid until {format(new Date(offer.validUntil), "dd MMM yyyy")}
                          </span>
                        )}
                      </div>
                      {offer.offeredDesignation && (
                        <p className="text-sm font-medium">{offer.offeredDesignation}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => handleDelete(offer.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
                    <div>
                      <p className="text-muted-foreground">Salary</p>
                      <p className="font-medium">{formatINR(offer.offeredSalary)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Joining Date</p>
                      <p className="font-medium">
                        {offer.joiningDate ? format(new Date(offer.joiningDate), "dd MMM yyyy") : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Sent At</p>
                      <p className="font-medium">
                        {offer.sentAt ? format(new Date(offer.sentAt), "dd MMM yyyy") : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Response</p>
                      <p className="font-medium">
                        {offer.respondedAt ? format(new Date(offer.respondedAt), "dd MMM yyyy") : "—"}
                      </p>
                    </div>
                  </div>

                  {offer.offerLetterUrl && (
                    <a
                      href={offer.offerLetterUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-700 hover:underline block mb-3"
                    >
                      View Offer Letter →
                    </a>
                  )}

                  {offer.notes && (
                    <p className="text-xs text-muted-foreground mb-3">{offer.notes}</p>
                  )}

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Update status:</span>
                    <Select
                      value={offer.offerStatus}
                      onValueChange={(v) => handleStatusChange(offer.id, v as CandidateOffer["offerStatus"])}
                    >
                      <SelectTrigger className="h-7 text-xs w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OFFER_STATUSES.map((s) => (
                          <SelectItem key={s} value={s} className="text-xs">
                            {STATUS_CONFIG[s].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="flex flex-col p-0 gap-0">
          <SheetHeader className="shrink-0 px-4 pt-4 pb-3 border-b">
            <SheetTitle className="text-base">Create Offer</SheetTitle>
            <SheetDescription className="text-xs">Create an offer for this candidate.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Offered Designation</label>
              <Input placeholder="e.g. Senior Developer" value={offeredDesignation} onChange={(e) => setOfferedDesignation(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Offered Salary (₹/year)</label>
              <Input type="number" placeholder="e.g. 1200000" value={offeredSalary} onChange={(e) => setOfferedSalary(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Joining Date</label>
                <Input type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Valid Until</label>
                <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Offer Letter URL</label>
              <Input placeholder="https://..." value={offerLetterUrl} onChange={(e) => setOfferLetterUrl(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notes</label>
              <Textarea placeholder="Any additional notes..." rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <SheetFooter className="shrink-0 px-4 py-3 border-t flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setSheetOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleCreate} disabled={createOffer.isPending}>
              {createOffer.isPending ? "Creating..." : "Create Offer"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
