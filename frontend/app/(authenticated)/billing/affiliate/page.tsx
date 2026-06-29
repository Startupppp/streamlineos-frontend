"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Copy, DollarSign, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import {
  useAffiliate,
  useCreateReferral,
  useRegisterAffiliate,
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

export default function AffiliatePage() {
  const { data, isLoading } = useAffiliate();
  const register = useRegisterAffiliate();
  const createReferral = useCreateReferral();
  const [email, setEmail] = useState("");

  const affiliate = data?.affiliate;
  const commissions = data?.commissions ?? [];

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

  return (
    <PageWrapper
      title="Affiliate Program"
      subtitle="Earn commissions by referring customers"
    >
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
        ) : !affiliate ? (
          <EmptyState
            illustration={<DollarSign />}
            title="Join the Affiliate Program"
            description="Earn 10% commission on every subscription from customers you refer."
            action={{ label: "Become an Affiliate", onClick: handleRegister }}
          />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
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
                <Button
                  size="sm"
                  onClick={handleSendReferral}
                  disabled={!email || createReferral.isPending}
                >
                  Send
                </Button>
              </div>
            </div>

            {commissions.length > 0 && (
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-semibold">Commission History</p>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {commissions.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell>
                            <Badge
                              variant={
                                COMMISSION_BADGE[c.status] ?? "secondary"
                              }
                              className="text-[10px]"
                            >
                              {c.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium text-sm">
                            {fmt(c.amountInPaise)}
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            {format(new Date(c.createdAt), "dd MMM yyyy")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PageWrapper>
  );
}
