"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RecruitmentEmptyState } from "@/features/hr/recruitment/components/recruitment-empty-state";
import { EmptyCalendarIllustration } from "@/components/illustrations";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useHrBookingLinks, useRevokeBookingLink, type HrBookingLink,
} from "@/hooks/api/hr/recruitment";
import { getErrorMessage } from "@/lib/get-error-message";

const STATUS_BADGE: Record<HrBookingLink["status"], { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20" },
  booked: { label: "Booked", className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" },
  expired: { label: "Expired", className: "bg-slate-500/10 text-slate-600 border-slate-500/20" },
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
      className="h-7 text-xs text-destructive hover:text-destructive"
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

  if (isLoading) {
    return (
      <PageWrapper title="Interview Booking Links" subtitle="Manage self-scheduling links sent to candidates">
        <Card><CardContent className="pt-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</CardContent></Card>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Interview Booking Links"
      subtitle="Manage self-scheduling links sent to candidates"
      badge={`${links?.length ?? 0} links`}
    >
      {!links?.length ? (
        <RecruitmentEmptyState
          illustration={<EmptyCalendarIllustration />}
          title="No booking links yet"
          description="Send self-scheduling links to candidates from their profile or the interviews page."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="w-full" type="auto">
              <div className="min-w-[900px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Candidate</TableHead>
                      <TableHead>Job</TableHead>
                      <TableHead>Link</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Created By</TableHead>
                      <TableHead className="w-[80px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {links.map((link) => {
                      const bookingUrl = `${baseUrl}/interview-booking/${link.token}`;
                      const isExpired = new Date(link.expiresAt) < new Date();
                      const effectiveStatus = isExpired && link.status === "pending" ? "expired" : link.status;

                      return (
                        <TableRow key={link.id}>
                          <TableCell className="font-medium">
                            {link.candidate
                              ? `${link.candidate.firstName} ${link.candidate.lastName}`
                              : `Candidate #${link.candidateId}`}
                            {link.candidate?.email && (
                              <p className="text-xs text-muted-foreground">{link.candidate.email}</p>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {link.jobPosting?.title ?? "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 max-w-[200px]">
                              <span className="text-xs text-muted-foreground truncate">{bookingUrl}</span>
                              <CopyButton text={bookingUrl} />
                            </div>
                          </TableCell>
                          <TableCell>
                            <StatusBadgeCell status={effectiveStatus as HrBookingLink["status"]} />
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(link.expiresAt), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {link.creator?.name ?? "—"}
                          </TableCell>
                          <TableCell>
                            {link.status === "pending" && !isExpired && (
                              <RevokeButton
                                linkId={link.id}
                                onRevoke={handleRevoke}
                                disabled={revoke.isPending}
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </PageWrapper>
  );
}
