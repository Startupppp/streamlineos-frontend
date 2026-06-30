"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Gift, Send, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useReferrals, useCreateReferral, type Referral } from "@/hooks/api/referrals";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ReferralStatus = Referral["status"];

const STATUS_CONFIG: Record<
  ReferralStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Pending",
    className: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  },
  SIGNED_UP: {
    label: "Signed Up",
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  ACTIVATED: {
    label: "Activated",
    className: "bg-amber-500/10 text-amber-600 border-amber-300/60",
  },
  REWARDED: {
    label: "Rewarded",
    className: "bg-green-500/10 text-green-600 border-green-500/20",
  },
  EXPIRED: {
    label: "Expired",
    className: "bg-muted/60 text-muted-foreground border-border",
  },
};

function TableSkeleton() {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="border-b border-border px-4 py-3 bg-muted/30">
        <div className="grid grid-cols-4 gap-3">
          {["Email", "Status", "Expires", "Sent"].map((h) => (
            <Skeleton key={h} className="h-3 w-full" />
          ))}
        </div>
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="px-4 py-3 border-b border-border last:border-0">
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((__, j) => (
              <Skeleton key={j} className="h-4 w-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ReferralsPage() {
  const [emailInput, setEmailInput] = useState("");
  const { data, isLoading, isError, refetch } = useReferrals();
  const createReferral = useCreateReferral();

  const referrals = data?.referrals ?? [];

  const totalInvites = referrals.length;
  const activeReferrals = referrals.filter(
    (r) => r.status === "SIGNED_UP" || r.status === "ACTIVATED",
  ).length;
  const rewardsEarned = referrals.filter((r) => r.status === "REWARDED").length;

  function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEmailInput(e.target.value);
  }

  function handleSendInvite() {
    const trimmed = emailInput.trim();
    if (!EMAIL_REGEX.test(trimmed)) {
      toast.error("Please enter a valid email address");
      return;
    }
    createReferral.mutate(
      { email: trimmed },
      { onSuccess: () => setEmailInput("") },
    );
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleSendInvite();
  }

  function handleRetry() {
    void refetch();
  }

  function handleOpenSheetFromEmpty() {
    const el = document.getElementById("referral-email-input");
    el?.focus();
  }

  return (
    <PageWrapper
      title="Referral Program"
      subtitle="Invite others and earn rewards"
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-blue-600" />
            <p className="text-sm font-semibold text-foreground">
              Refer a friend, earn rewards
            </p>
          </div>
          <p className="text-xs text-muted-foreground leading-snug">
            For every friend who signs up and activates StreamlineOS, you earn
            free AI credits and subscription discounts.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
            {["Invite", "They Sign Up", "Activation", "You Earn Rewards"].map(
              (step, i, arr) => (
                <span key={step} className="flex items-center gap-1">
                  <span className="font-medium text-foreground">{step}</span>
                  {i < arr.length - 1 && (
                    <span className="text-muted-foreground/50">→</span>
                  )}
                </span>
              ),
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <p className="text-sm font-semibold">Send an Invitation</p>
          <div className="flex gap-2">
            <Input
              id="referral-email-input"
              type="email"
              placeholder="colleague@company.com"
              value={emailInput}
              onChange={handleEmailChange}
              onKeyDown={handleKeyDown}
              className="flex-1"
            />
            <Button
              size="sm"
              onClick={handleSendInvite}
              disabled={!emailInput.trim() || createReferral.isPending}
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              {createReferral.isPending ? "Sending..." : "Send Invite"}
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Total Invites Sent", value: totalInvites },
            { label: "Active Referrals", value: activeReferrals },
            { label: "Rewards Earned", value: rewardsEarned },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-lg border border-border bg-card px-4 py-3"
            >
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              <p className="text-xl font-bold tabular-nums">{value}</p>
            </div>
          ))}
        </div>

        {isLoading ? (
          <TableSkeleton />
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <p className="text-sm text-muted-foreground">
              Failed to load referrals
            </p>
            <Button variant="outline" size="sm" onClick={handleRetry}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Retry
            </Button>
          </div>
        ) : referrals.length === 0 ? (
          <EmptyState
            illustration={<EmptyDocumentsIllustration />}
            title="No referrals yet"
            description="Send your first invite to start earning rewards for bringing friends aboard."
            action={{
              label: "Send Your First Invite",
              onClick: handleOpenSheetFromEmpty,
            }}
          />
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold">Referrals</p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Sent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrals.map((referral) => {
                    const statusConfig =
                      STATUS_CONFIG[referral.status] ?? STATUS_CONFIG.PENDING;
                    return (
                      <TableRow key={referral.id}>
                        <TableCell className="text-sm">
                          {referral.referredEmail}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${statusConfig.className}`}
                          >
                            {statusConfig.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground tabular-nums">
                          {format(new Date(referral.expiresAt), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground tabular-nums">
                          {format(new Date(referral.createdAt), "dd MMM yyyy")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
