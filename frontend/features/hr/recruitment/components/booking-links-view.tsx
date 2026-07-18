"use client";

import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { RecruitmentEmptyState } from "@/features/hr/recruitment/components/recruitment-empty-state";
import { EmptyCalendarIllustration } from "@/components/illustrations";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  useHrBookingLinks, useRevokeBookingLink, type HrBookingLink,
} from "@/hooks/api/hr/recruitment";
import { getErrorMessage } from "@/lib/get-error-message";
import { TruncatedText } from "@/components/ui/truncated-text";

const STATUS_BADGE: Record<HrBookingLink["status"], { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20 dark:text-yellow-300 dark:border-yellow-500/30" },
  booked: { label: "Booked", className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30" },
  expired: { label: "Expired", className: "bg-muted text-muted-foreground border-border dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700" },
  cancelled: { label: "Cancelled", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

function StatusBadgeCell({ status }: { status: HrBookingLink["status"] }) {
  const cfg = STATUS_BADGE[status] ?? STATUS_BADGE.pending;
  return (
    <Badge variant="outline" className={`text-[10px] ${cfg.className}`}>
      {cfg.label}
    </Badge>
  );
}

function CopyButton({ text }: { text: string }) {
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => toast.success("Copied to clipboard"));
  }, [text]);

  return (
    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={handleCopy} title="Copy link">
      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    </Button>
  );
}

function RevokeButton({
  linkId,
  onRevoke,
  disabled,
}: {
  linkId: number;
  onRevoke: (id: number) => void;
  disabled: boolean;
}) {
  function handleClick() { onRevoke(linkId); }
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-xs text-destructive hover:text-destructive"
      onClick={handleClick}
      disabled={disabled}
    >
      Revoke
    </Button>
  );
}

export function BookingLinksView({ baseUrl }: { baseUrl: string }) {
  const { data: links, isLoading } = useHrBookingLinks();
  const revoke = useRevokeBookingLink();

  const handleRevoke = useCallback(
    (id: number) => {
      revoke.mutate(id, {
        onSuccess: () => toast.success("Booking link revoked"),
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [revoke]
  );

  const columns = useMemo<DataTableColumn<HrBookingLink>[]>(() => [
    {
      key: "candidate",
      header: "Candidate",
      cell: (link) => (
        <div className="min-w-0">
          <TruncatedText
            text={
              link.candidate
                ? `${link.candidate.firstName} ${link.candidate.lastName}`
                : `Candidate #${link.candidateId}`
            }
            className="font-medium"
          />
          {link.candidate?.email && (
            <TruncatedText
              text={link.candidate.email}
              className="text-xs text-muted-foreground break-all"
            />
          )}
        </div>
      ),
    },
    {
      key: "job",
      header: "Job",
      cell: (link) => (
        <TruncatedText
          text={link.jobPosting?.title ?? "—"}
          className="text-sm text-muted-foreground"
        />
      ),
    },
    {
      key: "link",
      header: "Link",
      cell: (link) => {
        const bookingUrl = `${baseUrl}/interview-booking/${link.token}`;
        return (
          <div className="flex items-center gap-1 max-w-[200px]">
            <span className="text-xs text-muted-foreground truncate">{bookingUrl}</span>
            <CopyButton text={bookingUrl} />
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      cell: (link) => {
        const isExpired = new Date(link.expiresAt) < new Date();
        const effectiveStatus: HrBookingLink["status"] = isExpired && link.status === "pending" ? "expired" : link.status;
        return <StatusBadgeCell status={effectiveStatus} />;
      },
    },
    {
      key: "expires",
      header: "Expires",
      cell: (link) => (
        <span className="text-xs text-muted-foreground">
          {format(new Date(link.expiresAt), "MMM d, yyyy")}
        </span>
      ),
    },
    {
      key: "createdBy",
      header: "Created By",
      cell: (link) => (
        <TruncatedText
          text={link.creator?.name ?? "—"}
          className="text-xs text-muted-foreground"
        />
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-[80px]",
      cell: (link) => {
        const isExpired = new Date(link.expiresAt) < new Date();
        if (link.status !== "pending" || isExpired) return null;
        return (
          <RevokeButton
            linkId={link.id}
            onRevoke={handleRevoke}
            disabled={revoke.isPending}
          />
        );
      },
    },
  ], [baseUrl, handleRevoke, revoke.isPending]);

  function getRowKey(link: HrBookingLink) {
    return link.id;
  }

  return (
    <PageWrapper
      title="Interview Booking Links"
      subtitle="Manage self-scheduling links sent to candidates"
    >
      <Card>
        <CardContent className="p-0">
          <DataTable
            data={links ?? []}
            columns={columns}
            getRowKey={getRowKey}
            isLoading={isLoading}
            minWidth="900px"
            emptyState={
              <RecruitmentEmptyState
                illustration={<EmptyCalendarIllustration />}
                title="No booking links yet"
                description="Send self-scheduling links to candidates from their profile or the interviews page."
              />
            }
          />
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
