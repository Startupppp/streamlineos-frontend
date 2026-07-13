"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Gift, Send, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useReferrals, useCreateReferral, type Referral } from "@/hooks/api/referrals";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ReferralStatus = Referral["status"];

const STATUS_CONFIG: Record<
  ReferralStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Pending",
    className: "bg-muted text-muted-foreground border-border",
  },
  SIGNED_UP: {
    label: "Signed Up",
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  },
  ACTIVATED: {
    label: "Activated",
    className: "bg-amber-500/10 text-amber-600 border-amber-300/60 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  },
  REWARDED: {
    label: "Rewarded",
    className: "bg-green-500/10 text-green-600 border-green-500/20 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/30",
  },
  EXPIRED: {
    label: "Expired",
    className: "bg-muted/60 text-muted-foreground border-border",
  },
};

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

  function handleFocusEmailInput() {
    const el = document.getElementById("referral-email-input");
    el?.focus();
  }

  function getReferralRowKey(referral: Referral) {
    return referral.id;
  }

  const columns: DataTableColumn<Referral>[] = [
    {
      key: "referredEmail",
      header: "Email",
      cell: (referral) => (
        <span className="text-sm">{referral.referredEmail}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (referral) => {
        const statusConfig = STATUS_CONFIG[referral.status] ?? STATUS_CONFIG.PENDING;
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${statusConfig.className}`}
          >
            {statusConfig.label}
          </span>
        );
      },
    },
    {
      key: "expiresAt",
      header: "Expires",
      cell: (referral) => (
        <span className="text-xs text-muted-foreground tabular-nums">
          {format(new Date(referral.expiresAt), "dd MMM yyyy")}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Sent",
      cell: (referral) => (
        <span className="text-xs text-muted-foreground tabular-nums">
          {format(new Date(referral.createdAt), "dd MMM yyyy")}
        </span>
      ),
    },
  ];

  return (
    <PageWrapper
      title="Referral Program"
      subtitle="Invite others and earn rewards"
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-blue-200 bg-blue-50/40 dark:border-blue-500/30 dark:bg-blue-500/10 p-4 space-y-2">
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

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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

        {isError ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <p className="text-sm text-muted-foreground">Failed to load referrals</p>
            <Button variant="outline" size="sm" onClick={handleRetry}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Retry
            </Button>
          </div>
        ) : (
          <DataTable
            data={referrals}
            columns={columns}
            getRowKey={getReferralRowKey}
            isLoading={isLoading}
            emptyState={
              <EmptyState
                illustration={<EmptyDocumentsIllustration />}
                title="No referrals yet"
                description="Send your first invite to start earning rewards for bringing friends aboard."
                action={{
                  label: "Send Your First Invite",
                  onClick: handleFocusEmailInput,
                }}
              />
            }
          />
        )}
      </div>
    </PageWrapper>
  );
}
