"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Package,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
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
  useAiCreditsWallet,
  useConfigureAutoTopUp,
} from "@/hooks/api/ai-credits";
import type { AiCreditTransaction } from "@/hooks/api/ai-credits";

const TXN_LABELS: Record<
  AiCreditTransaction["type"],
  { label: string; sign: string; color: string }
> = {
  PURCHASE: { label: "Purchase", sign: "+", color: "text-green-600" },
  PLAN_GRANT: { label: "Plan Grant", sign: "+", color: "text-green-600" },
  USAGE: { label: "Usage", sign: "-", color: "text-foreground" },
  REFUND: { label: "Refund", sign: "+", color: "text-blue-600" },
  EXPIRY: { label: "Expiry", sign: "-", color: "text-destructive" },
};

export default function AiCreditsPage() {
  const { data, isLoading, refetch } = useAiCreditsWallet();
  const configureTopUp = useConfigureAutoTopUp();
  const [localAutoTopUp, setLocalAutoTopUp] = useState<boolean | null>(null);
  const autoTopUp = localAutoTopUp ?? (data?.wallet.autoTopUpEnabled ?? false);

  function handleAutoTopUpToggle(enabled: boolean) {
    setLocalAutoTopUp(enabled);
    configureTopUp.mutate({ enabled });
  }

  function handleRefresh() {
    void refetch();
  }

  const wallet = data?.wallet;
  const packs = data?.packs ?? [];
  const txns = data?.recentTransactions ?? [];

  return (
    <PageWrapper title="AI Credits" subtitle="Manage your AI usage credits">
      <div className="space-y-4">
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg border border-border bg-card p-4 space-y-2"
              >
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1">
                Current Balance
              </p>
              <p className="text-2xl font-bold tabular-nums">
                {wallet?.balance.toLocaleString() ?? 0}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">credits</p>
            </div>
            <div className="rounded-lg border border-border bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Total Granted
              </p>
              <p className="text-xl font-semibold tabular-nums">
                {wallet?.lifetimeGranted.toLocaleString() ?? 0}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <TrendingDown className="h-3 w-3" /> Total Used
              </p>
              <p className="text-xl font-semibold tabular-nums">
                {wallet?.lifetimeConsumed.toLocaleString() ?? 0}
              </p>
            </div>
          </div>
        )}

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">Auto Top-Up</p>
            <div className="flex items-center gap-2">
              <Label
                htmlFor="auto-topup"
                className="text-xs text-muted-foreground"
              >
                {autoTopUp ? "Enabled" : "Disabled"}
              </Label>
              <Switch
                id="auto-topup"
                checked={autoTopUp}
                onCheckedChange={handleAutoTopUpToggle}
                disabled={configureTopUp.isPending}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Automatically purchase credits when your balance drops below the
            threshold.
          </p>
        </div>

        {packs.length > 0 && (
          <div>
            <p className="text-sm font-semibold mb-2">Credit Packs</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {packs.map((pack) => (
                <div
                  key={pack.id}
                  className="rounded-lg border border-border bg-card p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Package className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{pack.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {pack.credits.toLocaleString()} credits
                        {pack.bonusCredits > 0 && (
                          <Badge
                            variant="secondary"
                            className="ml-1.5 text-[10px]"
                          >
                            +{pack.bonusCredits} bonus
                          </Badge>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    <span className="text-sm font-medium">
                      ₹{(pack.priceInPaise / 100).toLocaleString("en-IN")}
                    </span>
                    <Button size="sm" variant="outline">
                      Buy
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between border-b border-border">
            <p className="text-sm font-semibold">Usage History</p>
            <Button variant="ghost" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
          {txns.length === 0 ? (
            <EmptyState
              illustration={<Zap />}
              title="No transactions yet"
              description="Credits will appear here once used."
              className="border-0 bg-transparent py-8"
              compact
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Feature</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {txns.map((txn) => {
                    const meta = TXN_LABELS[txn.type] ?? {
                      label: txn.type,
                      sign: "",
                      color: "text-foreground",
                    };
                    return (
                      <TableRow key={txn.id}>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px]">
                            {meta.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {txn.feature ?? "—"}
                        </TableCell>
                        <TableCell
                          className={`text-right text-sm font-medium tabular-nums ${meta.color}`}
                        >
                          {meta.sign}
                          {Math.abs(txn.amount).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                          {txn.balanceAfter.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {format(new Date(txn.createdAt), "dd MMM yyyy")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
