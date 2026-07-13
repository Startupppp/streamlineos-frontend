"use client";

import React, { useState, useCallback } from "react";
import { format } from "date-fns";
import { Send, ThumbsUp, XCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  useSubmitEnterpriseQuote,
  useApproveEnterpriseQuote,
  useRejectEnterpriseQuote,
  useSendEnterpriseQuote,
  useAcceptEnterpriseQuote,
  type EnterpriseQuoteStatus,
} from "@/hooks/api/enterprise-quotes";
import { useCan } from "@/hooks/api/access";
import { getApiError } from "@/lib/api-client";

export type { EnterpriseQuoteStatus };

export const STATUS_CONFIG: Record<EnterpriseQuoteStatus, { label: string; className: string }> = {
  DRAFT: {
    label: "Draft",
    className: "bg-muted text-muted-foreground border-border",
  },
  PENDING_APPROVAL: {
    label: "Pending Approval",
    className: "bg-amber-500/10 text-amber-600 border-amber-200/70",
  },
  APPROVED: {
    label: "Approved",
    className: "bg-green-500/10 text-green-600 border-green-500/20",
  },
  SENT: {
    label: "Sent",
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  ACCEPTED: {
    label: "Accepted",
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  },
  REJECTED: {
    label: "Rejected",
    className: "bg-red-500/10 text-red-600 border-red-500/20",
  },
  EXPIRED: {
    label: "Expired",
    className: "bg-muted/60 text-muted-foreground border-border",
  },
};

export function fmtInr(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export function fmtDate(iso: string | null) {
  if (!iso) return null;
  return format(new Date(iso), "dd MMM yyyy, HH:mm");
}

export function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

export function TimelineItem({
  icon,
  label,
  date,
  by,
  note,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  date: string | null;
  by?: string | null;
  note?: string | null;
  active?: boolean;
}) {
  if (!date) return null;
  return (
    <div className="flex gap-3">
      <div
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${active ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-muted/50 text-muted-foreground"}`}
      >
        {icon}
      </div>
      <div className="min-w-0 pb-4 border-l border-dashed border-border pl-3 ml-0">
        <p className="text-sm font-medium leading-none">{label}</p>
        {by && <p className="text-xs text-muted-foreground mt-0.5">by {by}</p>}
        <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(date)}</p>
        {note && <p className="mt-1 text-xs rounded bg-muted/60 px-2 py-1">{note}</p>}
      </div>
    </div>
  );
}

export function DetailPageSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="rounded-lg border border-border bg-card p-5 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex justify-between py-2.5 border-b border-border last:border-0"
            >
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ApprovePanel({ quoteId }: { quoteId: number }) {
  const [notes, setNotes] = useState("");
  const approve = useApproveEnterpriseQuote();

  function handleNotesChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setNotes(e.target.value);
  }

  function handleApprove() {
    approve.mutate(
      { id: quoteId, notes: notes.trim() || undefined },
      {
        onSuccess: () => toast.success("Quote approved"),
        onError: (err) => toast.error(getApiError(err)),
      },
    );
  }

  return (
    <div className="rounded-md border border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-900 p-3 space-y-2">
      <Label className="text-xs font-medium">Approval Notes (optional)</Label>
      <Textarea
        rows={2}
        value={notes}
        onChange={handleNotesChange}
        placeholder="Add approval notes…"
        className="text-sm"
      />
      <Button size="sm" className="w-full" onClick={handleApprove} disabled={approve.isPending}>
        <ThumbsUp className="h-3.5 w-3.5 mr-1.5" />
        {approve.isPending ? "Approving…" : "Approve"}
      </Button>
    </div>
  );
}

export function RejectPanel({ quoteId }: { quoteId: number }) {
  const [reason, setReason] = useState("");
  const reject = useRejectEnterpriseQuote();

  function handleReasonChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setReason(e.target.value);
  }

  function handleReject() {
    if (!reason.trim()) {
      toast.error("Rejection reason is required");
      return;
    }
    reject.mutate(
      { id: quoteId, reason: reason.trim() },
      {
        onSuccess: () => toast.success("Quote rejected"),
        onError: (err) => toast.error(getApiError(err)),
      },
    );
  }

  return (
    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-2">
      <Label className="text-xs font-medium">Rejection Reason (required)</Label>
      <Textarea
        rows={2}
        value={reason}
        onChange={handleReasonChange}
        placeholder="Why is this quote being rejected?"
        className="text-sm"
      />
      <Button
        size="sm"
        variant="destructive"
        className="w-full"
        onClick={handleReject}
        disabled={reject.isPending || !reason.trim()}
      >
        <XCircle className="h-3.5 w-3.5 mr-1.5" />
        {reject.isPending ? "Rejecting…" : "Reject"}
      </Button>
    </div>
  );
}

export function ActionSidebar({
  quoteId,
  status,
}: {
  quoteId: number;
  status: EnterpriseQuoteStatus;
}) {
  const canApprove = useCan("billing:enterprise-quotes:approve");
  const submit = useSubmitEnterpriseQuote();
  const send = useSendEnterpriseQuote();
  const accept = useAcceptEnterpriseQuote();

  const handleSubmit = useCallback(() => {
    submit.mutate(quoteId, {
      onSuccess: () => toast.success("Quote submitted for approval"),
      onError: (err) => toast.error(getApiError(err)),
    });
  }, [quoteId, submit]);

  const handleSend = useCallback(() => {
    send.mutate(quoteId, {
      onSuccess: () => toast.success("Quote sent to customer"),
      onError: (err) => toast.error(getApiError(err)),
    });
  }, [quoteId, send]);

  const handleAccept = useCallback(() => {
    accept.mutate(quoteId, {
      onSuccess: () => toast.success("Quote marked as accepted"),
      onError: (err) => toast.error(getApiError(err)),
    });
  }, [quoteId, accept]);

  if (status === "DRAFT") {
    return (
      <Button className="w-full" size="sm" onClick={handleSubmit} disabled={submit.isPending}>
        <Send className="h-3.5 w-3.5 mr-1.5" />
        {submit.isPending ? "Submitting…" : "Submit for Approval"}
      </Button>
    );
  }

  if (status === "PENDING_APPROVAL" && canApprove) {
    return (
      <div className="space-y-3">
        <ApprovePanel quoteId={quoteId} />
        <RejectPanel quoteId={quoteId} />
      </div>
    );
  }

  if (status === "APPROVED") {
    return (
      <Button className="w-full" size="sm" onClick={handleSend} disabled={send.isPending}>
        <Send className="h-3.5 w-3.5 mr-1.5" />
        {send.isPending ? "Sending…" : "Send to Customer"}
      </Button>
    );
  }

  if (status === "SENT") {
    return (
      <Button className="w-full" size="sm" onClick={handleAccept} disabled={accept.isPending}>
        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
        {accept.isPending ? "Marking…" : "Mark as Accepted"}
      </Button>
    );
  }

  return null;
}
