"use client";

import { useState, type ReactNode } from "react";
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
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
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
  PURCHASE: { label: "Purchase", sign: "+", color: "text-green-600 dark:text-green-400" },
  PLAN_GRANT: { label: "Plan Grant", sign: "+", color: "text-green-600 dark:text-green-400" },
  USAGE: { label: "Usage", sign: "-", color: "text-foreground" },
  REFUND: { label: "Refund", sign: "+", color: "text-blue-600 dark:text-blue-400" },
  EXPIRY: { label: "Expiry", sign: "-", color: "text-destructive" },
};

const TXN_COLUMNS: DataTableColumn<AiCreditTransaction>[] = [
  {
    key: "type",
    header: "Type",
    cell: (txn): ReactNode => {
      const meta = TXN_LABELS[txn.type] ?? {
        label: txn.type,
        sign: "",
        color: "text-foreground",
      };
      return (
        <Badge variant="secondary" className="text-[10px]">
          {meta.label}
        </Badge>
      );
    },
  },
  {
    key: "feature",
    header: "Feature",
    cell: (txn): ReactNode => (
      <span className="text-xs text-muted-foreground">{txn.feature ?? "—"}</span>
    ),
  },
  {
    key: "amount",
    header: "Amount",
    headerClassName: "text-right",
    cell: (txn): ReactNode => {
      const meta = TXN_LABELS[txn.type] ?? {
        label: txn.type,
        sign: "",
        color: "text-foreground",
      };
      return (
        <span
          className={`font-mono text-sm font-medium tabular-nums ${meta.color}`}
        >
          {meta.sign}
          {Math.abs(txn.amount).toLocaleString()}
        </span>
      );
    },
    className: "text-right",
  },
  {
    key: "balanceAfter",
    header: "Balance",
    headerClassName: "text-right",
    className: "text-right font-mono text-sm tabular-nums text-muted-foreground",
    cell: (txn): ReactNode => txn.balanceAfter.toLocaleString(),
  },
  {
    key: "expires",
    header: "Expires",
    headerClassName: "text-right",
    className: "text-right text-xs text-muted-foreground",
    cell: (txn): ReactNode =>
      txn.type === "PURCHASE"
        ? format(addMonths(new Date(txn.createdAt), 12), "dd MMM yyyy")
        : "—",
  },
  {
    key: "createdAt",
    header: "Date",
    headerClassName: "text-right",
    className: "text-right text-xs text-muted-foreground",
    cell: (txn): ReactNode =>
      format(new Date(txn.createdAt), "dd MMM yyyy"),
  },
];

function getTxnRowKey(txn: AiCreditTransaction): string | number {
  return txn.id;
}

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
          <ErrorState title="Failed to load AI credits" description="Something went wrong fetching your credit balance." onRetry={handleRefresh} className="flex-1 min-h-[40vh]" />
        ) : (
          <>
        {isLoading ? (
          <StatCardGrid cols={3}>
            <StatCard isLoading label="Balance" icon={Zap} tone="violet" value="" />
            <StatCard isLoading label="Total Granted" icon={TrendingUp} tone="emerald" value="" />
            <StatCard isLoading label="Total Used" icon={TrendingDown} tone="amber" value="" />
          </StatCardGrid>
        ) : (
          <StatCardGrid cols={3}>
            <StatCard label="Balance" value={wallet?.balance ?? 0} icon={Zap} tone="violet" hint="credits" />
            <StatCard label="Total Granted" value={wallet?.lifetimeGranted ?? 0} icon={TrendingUp} tone="emerald" />
            <StatCard label="Total Used" value={wallet?.lifetimeConsumed ?? 0} icon={TrendingDown} tone="amber" />
          </StatCardGrid>
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
            <DataTable
              data={txns}
              columns={TXN_COLUMNS}
              getRowKey={getTxnRowKey}
              className="border-0 rounded-none"
            />
          )}
        </div>
          </>
        )}
      </div>
    </PageWrapper>
  );
}
