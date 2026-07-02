"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addMonths, format } from "date-fns";
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
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
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
import { ErrorState } from "@/components/shared/error-state";
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

function BuyPackButton({ packId, onBuy }: { packId: number; onBuy: (id: number) => void }) {
  function handleClick() {
    onBuy(packId);
  }
  return (
    <Button size="sm" variant="outline" onClick={handleClick}>
      Buy
    </Button>
  );
}

export default function AiCreditsPage() {
  const { data, isLoading, isError, refetch } = useAiCreditsWallet();
  const configureTopUp = useConfigureAutoTopUp();
  const router = useRouter();
  const [localAutoTopUp, setLocalAutoTopUp] = useState<boolean | null>(null);
  const autoTopUp = localAutoTopUp ?? (data?.wallet.autoTopUpEnabled ?? false);

  function handleAutoTopUpToggle(enabled: boolean) {
    setLocalAutoTopUp(enabled);
    configureTopUp.mutate({ enabled });
  }

  function handleRefresh() {
    void refetch();
  }

  function handleBuyPack(packId: number) {
    router.push(`/billing/checkout?pack=${packId}`);
  }

  const wallet = data?.wallet;
  const packs = data?.packs ?? [];
  const txns = data?.recentTransactions ?? [];

  return (
    <PageWrapper title="AI Credits" subtitle="Manage your AI usage credits">
      <div className="space-y-4">
        {isError ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-10 text-center">
            <p className="text-sm font-medium text-foreground">Failed to load AI credits</p>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              Retry
            </Button>
          </div>
        ) : (
          <>
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="rounded-lg border border-border bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1">
                Current Balance
              </p>
              <p className="text-2xl font-bold tabular-nums">
                {wallet?.balance.toLocaleString() ?? 0}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">credits</p>
              {wallet && wallet.lifetimeGranted > 0 && (
                <div className="mt-2">
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-violet-500 transition-all"
                      style={{ width: `${Math.min(100, Math.round((wallet.lifetimeConsumed / wallet.lifetimeGranted) * 100))}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                    {Math.round((wallet.lifetimeConsumed / wallet.lifetimeGranted) * 100)}% used
                  </p>
                </div>
              )}
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
                    <BuyPackButton packId={pack.id} onBuy={handleBuyPack} />
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
                  <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Type</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Feature</TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Amount</TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Balance</TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Expires</TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Date</TableHead>
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
                      <TableRow key={txn.id} className="border-b border-border/50 hover:bg-muted/30">
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px]">
                            {meta.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {txn.feature ?? "—"}
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono text-sm font-medium tabular-nums ${meta.color}`}
                        >
                          {meta.sign}
                          {Math.abs(txn.amount).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm tabular-nums text-muted-foreground">
                          {txn.balanceAfter.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {txn.type === "PURCHASE"
                            ? format(
                                addMonths(new Date(txn.createdAt), 12),
                                "dd MMM yyyy",
                              )
                            : "—"}
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
          </>
        )}
      </div>
    </PageWrapper>
  );
}
