"use client";

import { useState, type ReactNode } from "react";
import { format } from "date-fns";
import { Copy, Download, FileText, Image, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingButton } from "@/components/ui/loading-button";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useAffiliate,
  useCreateReferral,
  useRegisterAffiliate,
  useRequestAffiliatePayout,
} from "@/hooks/api/affiliate";

function fmt(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

const COMMISSION_BADGE: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PENDING: "secondary",
  APPROVED: "default",
  PAID: "outline",
  CANCELLED: "destructive",
};

const COMMISSION_TIERS = [
  { label: "Starter", rate: 10, description: "First 10 referrals" },
  { label: "Growth", rate: 15, description: "11–50 referrals" },
  { label: "Elite", rate: 20, description: "50+ referrals" },
];

const MARKETING_ASSETS = [
  { label: "Horizontal Banner", size: "1200×628px", icon: Image },
  { label: "Square Logo", size: "800×800px", icon: Image },
  { label: "Email Signature", size: "600×200px", icon: FileText },
];

type Commission = { id: number; status: string; amountInPaise: number; createdAt: string };
type CouponRow = { code: string; signupCount: number; totalEarned: number };

const COMMISSION_COLUMNS: DataTableColumn<Commission>[] = [
  {
    key: "status",
    header: "Status",
    cell: (c): ReactNode => (
      <Badge variant={COMMISSION_BADGE[c.status] ?? "secondary"} className="text-[10px]">
        {c.status}
      </Badge>
    ),
  },
  {
    key: "amount",
    header: "Amount",
    headerClassName: "text-right",
    className: "text-right font-mono font-medium text-sm",
    cell: (c): ReactNode => fmt(c.amountInPaise),
  },
  {
    key: "date",
    header: "Date",
    headerClassName: "text-right",
    className: "text-right text-xs text-muted-foreground",
    cell: (c): ReactNode => format(new Date(c.createdAt), "dd MMM yyyy"),
  },
];

const COUPON_COLUMNS: DataTableColumn<CouponRow>[] = [
  {
    key: "code",
    header: "Coupon Code",
    cell: (row): ReactNode => (
      <span className="font-mono text-sm">{row.code}</span>
    ),
  },
  {
    key: "signupCount",
    header: "Redemptions",
    headerClassName: "text-right",
    className: "text-right text-sm",
    cell: (row): ReactNode => row.signupCount,
  },
  {
    key: "totalEarned",
    header: "Revenue Generated",
    headerClassName: "text-right",
    className: "text-right font-mono text-sm",
    cell: (row): ReactNode => fmt(row.totalEarned),
  },
];

function getCommissionRowKey(c: Commission): string | number {
  return c.id;
}

function getCouponRowKey(row: CouponRow): string | number {
  return row.code;
}

export default function AffiliatePage() {
  const { data, isLoading, isError, error, refetch } = useAffiliate();
  const register = useRegisterAffiliate();
  const createReferral = useCreateReferral();
  const requestPayout = useRequestAffiliatePayout();
  const [email, setEmail] = useState("");

  const affiliate = data?.affiliate;
  const commissions: Commission[] = data?.commissions ?? [];

  function handleCopyLink() {
    if (!affiliate) return;
    const link = `${window.location.origin}/signup?ref=${affiliate.referralCode}`;
    void navigator.clipboard.writeText(link);
    toast.success("Referral link copied");
  }

  function handleSendReferral() {
    if (!email) return;
    createReferral.mutate(email, { onSuccess: () => setEmail("") });
  }

  function handleRegister() {
    register.mutate();
  }

  function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEmail(e.target.value);
  }

  function handleRequestPayout() {
    requestPayout.mutate();
  }

  function handleAssetDownload() {
    toast.info("Asset download coming soon");
  }

  function handleBrandGuidelines(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    toast.info("Coming soon");
  }

  function handleRetry() {
    void refetch();
  }

  return (
    <PageWrapper
      title="Affiliate Program"
      subtitle="Earn commissions by referring customers"
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {isError ? (
          <ErrorState
            title="Failed to load affiliate data"
            description={getErrorMessage(error)}
            onRetry={handleRetry}
            className="flex-1"
          />
        ) : isLoading ? (
          <div className="flex flex-1 flex-col gap-4">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
        ) : !affiliate ? (
          <EmptyState
            illustrationPreset="report"
            title="Join the Affiliate Program"
            description="Earn 10% commission on every subscription from customers you refer."
            action={{ label: "Become an Affiliate", onClick: handleRegister }}
          />
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="rounded-lg border border-border bg-card px-4 py-3">
                <p className="text-xs text-muted-foreground mb-1">
                  Total Earned
                </p>
                <p className="text-xl font-bold">
                  {fmt(affiliate.totalEarned)}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card px-4 py-3">
                <p className="text-xs text-muted-foreground mb-1">
                  Pending Payout
                </p>
                <p className="text-xl font-bold">
                  {fmt(affiliate.pendingPayout)}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card px-4 py-3">
                <p className="text-xs text-muted-foreground mb-1">Signups</p>
                <p className="text-xl font-bold">{affiliate.signupCount}</p>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <p className="text-sm font-semibold">Your Referral Link</p>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/signup?ref=${affiliate.referralCode}`}
                  className="text-xs font-mono"
                />
                <Button variant="outline" size="sm" onClick={handleCopyLink}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Commission rate:{" "}
                <strong>{affiliate.commissionRate}%</strong> per referred
                subscription
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <p className="text-sm font-semibold flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5" /> Send Referral Email
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="colleague@company.com"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  className="flex-1"
                />
                <LoadingButton
                  size="sm"
                  onClick={handleSendReferral}
                  isPending={createReferral.isPending}
                  disabled={!email}
                  loadingText="Sending…"
                >
                  Send
                </LoadingButton>
              </div>
            </div>

            {commissions.length > 0 && (
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-semibold">Commission History</p>
                </div>
                <DataTable
                  data={commissions}
                  columns={COMMISSION_COLUMNS}
                  getRowKey={getCommissionRowKey}
                  className="border-0 rounded-none"
                />
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Request Payout</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Available balance:{" "}
                  <span className="font-semibold text-foreground">
                    {fmt(affiliate.pendingPayout)}
                  </span>
                </p>
                <LoadingButton
                  size="sm"
                  onClick={handleRequestPayout}
                  isPending={requestPayout.isPending}
                  disabled={affiliate.pendingPayout === 0}
                  loadingText="Requesting…"
                >
                  Request Payout
                </LoadingButton>
                <p className="text-xs text-muted-foreground">
                  Payouts are processed within 5-7 business days via bank transfer.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Coupon Attribution</CardTitle>
                <CardDescription>
                  Track sales made with your affiliate coupon code.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {affiliate.referralCode ? (
                  <DataTable
                    data={[
                      {
                        code: affiliate.referralCode,
                        signupCount: affiliate.signupCount,
                        totalEarned: affiliate.totalEarned,
                      },
                    ]}
                    columns={COUPON_COLUMNS}
                    getRowKey={getCouponRowKey}
                    className="border-0 rounded-none"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Contact support to get your affiliate coupon code assigned.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Marketing Assets</CardTitle>
                <CardDescription>
                  Download assets to promote StreamlineOS on your channels.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  {MARKETING_ASSETS.map((asset) => {
                    const Icon = asset.icon;
                    return (
                      <div
                        key={asset.label}
                        className="rounded-lg border border-border p-3 flex flex-col gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm font-medium">{asset.label}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{asset.size}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-auto"
                          onClick={handleAssetDownload}
                        >
                          <Download className="h-3.5 w-3.5 mr-1.5" />
                          Download PNG
                        </Button>
                      </div>
                    );
                  })}
                </div>
                <a
                  href="#"
                  onClick={handleBrandGuidelines}
                  className="text-xs text-primary underline-offset-4 hover:underline"
                >
                  Brand Guidelines
                </a>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Commission Structure</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                  {COMMISSION_TIERS.map((tier) => (
                    <div
                      key={tier.label}
                      className="flex items-center justify-between px-3 py-2.5"
                    >
                      <div>
                        <p className="text-sm font-medium">{tier.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {tier.description}
                        </p>
                      </div>
                      <span className="text-sm font-bold">{tier.rate}%</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Your current rate:{" "}
                  <strong className="text-foreground">
                    {affiliate.commissionRate}%
                  </strong>
                </p>
                <p className="text-xs text-muted-foreground">
                  Tiers are calculated based on cumulative referred subscriptions.
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PageWrapper>
  );
}
