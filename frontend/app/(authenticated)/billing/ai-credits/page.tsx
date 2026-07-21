"use client";

import { useState, useCallback, useEffect, type ReactNode } from "react";
import { addMonths, format } from "date-fns";
import { Activity, RefreshCw, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { ZapIcon } from "@animateicons/react/lucide";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { Switch } from "@/components/ui/switch";
import { DataTable, DataTableSkeleton, type DataTableColumn } from "@/components/ui/data-table";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TruncatedText } from "@/components/ui/truncated-text";
import { FILTER_SELECT_TRIGGER, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { useCan } from "@/hooks/api/access";
import {
  useAiCreditsWallet,
  useAiCreditTransactions,
  useAiCreditsUsage,
  useConfigureAutoTopUp,
  usePurchaseAiCredits,
  useVerifyAiCreditPurchase,
  type AiCreditTransaction,
  type AiCreditPack,
  type PurchaseAiPackOrder,
  type PurchaseAiPackResult,
  type AiCreditsUsageDays,
} from "@/hooks/api/ai-credits";
import { AiCreditsDailyChart } from "@/features/billing/ai-credits-daily-chart";
import { AiCreditsBreakdownTables } from "@/features/billing/ai-credits-breakdown-tables";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatCredits, formatTokens } from "@/lib/format-ai";
import { cn } from "@/lib/utils";

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
      const meta = TXN_LABELS[txn.type] ?? { label: txn.type, sign: "", color: "text-foreground" };
      return <Badge variant="secondary" className="text-[10px]">{meta.label}</Badge>;
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
    key: "model",
    header: "Model",
    cell: (txn): ReactNode =>
      txn.model ? (
        <TruncatedText text={txn.model} className="text-xs text-muted-foreground max-w-[120px]" />
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
  },
  {
    key: "totalTokens",
    header: "Tokens",
    headerClassName: "text-right",
    className: "text-right tabular-nums text-xs",
    cell: (txn): ReactNode => {
      if (txn.totalTokens == null) return <span className="text-muted-foreground">—</span>;
      const title =
        txn.promptTokens != null && txn.completionTokens != null
          ? `In: ${txn.promptTokens.toLocaleString()}  Out: ${txn.completionTokens.toLocaleString()}`
          : undefined;
      return (
        <span className="text-muted-foreground" title={title}>
          {formatTokens(txn.totalTokens)}
        </span>
      );
    },
  },
  {
    key: "amount",
    header: "Amount",
    headerClassName: "text-right",
    cell: (txn): ReactNode => {
      const meta = TXN_LABELS[txn.type] ?? { label: txn.type, sign: "", color: "text-foreground" };
      return (
        <span className={`font-mono text-sm font-medium tabular-nums ${meta.color}`}>
          {meta.sign}{formatCredits(Math.abs(txn.amount))}
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
    cell: (txn): ReactNode => formatCredits(txn.balanceAfter),
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
    cell: (txn): ReactNode => format(new Date(txn.createdAt), "dd MMM yyyy"),
  },
];

function getTxnRowKey(txn: AiCreditTransaction): string | number {
  return txn.id;
}

function CreditPackCard({
  pack,
  canPurchase,
  isPending,
  isBusy,
  onBuy,
}: {
  pack: AiCreditPack;
  canPurchase: boolean;
  isPending: boolean;
  isBusy: boolean;
  onBuy: (pack: AiCreditPack) => void;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const totalCredits = pack.credits + pack.bonusCredits;

  function handleBuy() {
    onBuy(pack);
  }

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-sm",
        pack.bonusCredits > 0 && "border-primary/25",
      )}
      {...hoverHandlers}
    >
      {pack.bonusCredits > 0 ? (
        <span className="absolute -top-px right-3 inline-flex items-center rounded-b-md bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
          +{pack.bonusCredits.toLocaleString()} bonus
        </span>
      ) : null}
      <div className="mb-3 flex items-start gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <ZapIcon ref={iconRef} size={16} className="text-primary" />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm font-semibold text-foreground">{pack.name}</p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {pack.credits.toLocaleString()} credits
          </p>
        </div>
      </div>
      <p className="mb-1 text-2xl font-bold tabular-nums tracking-tight text-foreground">
        ₹{(pack.priceInPaise / 100).toLocaleString("en-IN")}
      </p>
      <p className="mb-4 text-xs text-muted-foreground tabular-nums">
        {totalCredits.toLocaleString()} total credits
      </p>
      {canPurchase ? (
        <LoadingButton
          size="sm"
          className="mt-auto w-full"
          isPending={isPending}
          loadingText="Opening…"
          disabled={isBusy && !isPending}
          onClick={handleBuy}
        >
          Buy
        </LoadingButton>
      ) : null}
    </div>
  );
}

type TxnPageSize = 10 | 20 | 50;

export default function AiCreditsPage() {
  const { data, isLoading, isError, refetch } = useAiCreditsWallet();
  const configureTopUp = useConfigureAutoTopUp();
  const purchaseMutation = usePurchaseAiCredits();
  const verifyMutation = useVerifyAiCreditPurchase();
  const canPurchase = useCan("billing:ai-credits:purchase");

  const [txnPage, setTxnPage] = useState(1);
  const [txnLimit, setTxnLimit] = useState<TxnPageSize>(20);
  const [usageDays, setUsageDays] = useState<AiCreditsUsageDays>(30);

  const {
    data: txnData,
    isLoading: txnLoading,
    isError: txnError,
    refetch: refetchTxns,
  } = useAiCreditTransactions(txnPage, txnLimit);

  const {
    data: usageData,
    isLoading: usageLoading,
    isError: usageError,
    refetch: refetchUsage,
  } = useAiCreditsUsage(usageDays);

  const [localAutoTopUp, setLocalAutoTopUp] = useState<boolean | null>(null);
  const [selectedPack, setSelectedPack] = useState<AiCreditPack | null>(null);

  const autoTopUp = localAutoTopUp ?? (data?.wallet.autoTopUpEnabled ?? false);
  const wallet = data?.wallet;
  const packs = data?.packs ?? [];
  const txns = txnData?.items ?? [];
  const txnTotal = txnData?.total ?? 0;
  const isBusy = purchaseMutation.isPending || verifyMutation.isPending;

  const usageTotals = usageData?.totals;
  const usageDaily = usageData?.daily ?? [];
  const usageByModel = usageData?.byModel ?? [];
  const usageByFeature = usageData?.byFeature ?? [];

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  function handleAutoTopUpToggle(enabled: boolean) {
    setLocalAutoTopUp(enabled);
    const defaultPackId = wallet?.autoTopUpPackId ?? packs[0]?.id;
    configureTopUp.mutate({
      enabled,
      ...(enabled && defaultPackId
        ? {
            packId: defaultPackId,
            threshold: wallet?.autoTopUpThreshold ?? 100,
          }
        : {}),
    });
  }

  function handleRefresh() {
    void refetch();
    void refetchTxns();
    void refetchUsage();
  }

  const handleTxnPageChange = useCallback((p: number) => {
    setTxnPage(p);
  }, []);

  const handleTxnPageSizeChange = useCallback((size: number) => {
    setTxnLimit(size as TxnPageSize);
    setTxnPage(1);
  }, []);

  function handleTxnRetry() {
    void refetchTxns();
  }

  function handleUsageRetry() {
    void refetchUsage();
  }

  function handleRazorpayDismiss() {
    setSelectedPack(null);
  }

  function handleRazorpaySuccess(response: RazorpayPaymentResponse, pack: AiCreditPack) {
    verifyMutation.mutate(
      {
        packId: pack.id,
        orderId: response.razorpay_order_id,
        paymentId: response.razorpay_payment_id,
        signature: response.razorpay_signature,
      },
      {
        onSettled: () => {
          setSelectedPack(null);
        },
      },
    );
  }

  async function handleBuyPack(pack: AiCreditPack) {
    setSelectedPack(pack);
    let result: PurchaseAiPackOrder | PurchaseAiPackResult;
    try {
      result = await purchaseMutation.mutateAsync({ packId: pack.id });
    } catch {
      setSelectedPack(null);
      return;
    }
    if (!("orderId" in result) || !result.orderId) {
      setSelectedPack(null);
      return;
    }
    if (!result.keyId) {
      toast.error("Payment gateway not configured. Contact support.");
      setSelectedPack(null);
      return;
    }
    try {
      const rz = new window.Razorpay({
        key: result.keyId,
        order_id: result.orderId,
        amount: result.amount,
        currency: result.currency,
        name: "StreamlineOS",
        description: `${pack.name} – ${pack.credits.toLocaleString()} credits`,
        handler: (response: RazorpayPaymentResponse) => {
          handleRazorpaySuccess(response, pack);
        },
        modal: {
          ondismiss: handleRazorpayDismiss,
        },
      });
      rz.open();
    } catch (err) {
      toast.error(getErrorMessage(err));
      setSelectedPack(null);
    }
  }

  function handleUsageDaysChange(value: string) {
    const parsed = Number(value);
    if (parsed === 7 || parsed === 30 || parsed === 90) {
      setUsageDays(parsed);
    }
  }

  return (
    <PageWrapper title="AI Credits" subtitle="Token-metered AI usage and credit wallet">
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {isError ? (
          <ErrorState
            title="Failed to load AI credits"
            description="Something went wrong fetching your credit balance."
            onRetry={handleRefresh}
            className="flex-1"
          />
        ) : (
          <>
            {isLoading ? (
              <StatCardGridSkeleton cols={4} count={4} />
            ) : (
              <StatCardGrid cols={4}>
                <StatCard
                  label="Balance"
                  value={formatCredits(wallet?.balance ?? 0) + " cr"}
                  icon={Zap}
                  tone="accent"
                />
                <StatCard
                  label={`Requests (${usageDays}d)`}
                  value={usageTotals?.requests?.toLocaleString() ?? "—"}
                  icon={Activity}
                  tone="default"
                  isLoading={usageLoading}
                />
                <StatCard
                  label={`Tokens (${usageDays}d)`}
                  value={usageTotals ? formatTokens(usageTotals.totalTokens) : "—"}
                  icon={TrendingDown}
                  tone="amber"
                  isLoading={usageLoading}
                />
                <StatCard
                  label={`Credits used (${usageDays}d)`}
                  value={usageTotals ? formatCredits(usageTotals.credits) + " cr" : "—"}
                  icon={TrendingUp}
                  tone="emerald"
                  isLoading={usageLoading}
                />
              </StatCardGrid>
            )}

            <div className="space-y-4">
              <div className={FILTER_TOOLBAR_ROW}>
                <p className="text-sm font-semibold text-foreground shrink-0">Usage Analytics</p>
                <div className="flex items-center gap-2 ml-auto">
                  <Select value={String(usageDays)} onValueChange={handleUsageDaysChange}>
                    <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "h-8 w-[90px] text-xs")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="sm" onClick={handleRefresh} className="h-8 w-8 p-0">
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {usageError ? (
                <ErrorState
                  title="Failed to load usage data"
                  description="Something went wrong fetching analytics."
                  onRetry={handleUsageRetry}
                  compact
                  className="border border-border rounded-xl py-8"
                />
              ) : (
                <>
                  <AiCreditsDailyChart data={usageDaily} isLoading={usageLoading} />
                  <AiCreditsBreakdownTables
                    byModel={usageByModel}
                    byFeature={usageByFeature}
                    isLoading={usageLoading}
                  />
                </>
              )}
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold">Credit Packs</p>
              {isLoading ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {Array.from({ length: 4 }, (_, i) => (
                    <div
                      key={`pack-skel-${i}`}
                      className="h-[180px] rounded-lg border border-border bg-card animate-pulse"
                    />
                  ))}
                </div>
              ) : packs.length === 0 ? (
                <EmptyState
                  illustrationPreset="report"
                  title="No credit packs available"
                  description="Top-up packs could not be loaded. Refresh the page or try again shortly."
                  className="border border-border bg-card py-8"
                  compact
                  action={{ label: "Refresh", onClick: handleRefresh }}
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {packs.map((pack) => (
                    <CreditPackCard
                      key={pack.id}
                      pack={pack}
                      canPurchase={canPurchase}
                      isPending={isBusy && selectedPack?.id === pack.id}
                      isBusy={isBusy}
                      onBuy={handleBuyPack}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold">Auto Top-Up</p>
                <div className="flex items-center gap-2">
                  <Label htmlFor="auto-topup" className="text-xs text-muted-foreground">
                    {autoTopUp ? "Enabled" : "Disabled"}
                  </Label>
                  <Switch
                    id="auto-topup"
                    checked={autoTopUp}
                    onCheckedChange={handleAutoTopUpToggle}
                    disabled={configureTopUp.isPending || packs.length === 0}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Automatically purchase credits when your balance drops below the threshold
                {wallet?.autoTopUpThreshold != null
                  ? ` (${formatCredits(wallet.autoTopUpThreshold)} credits)`
                  : ""}.
                {autoTopUp && packs[0]
                  ? ` Uses ${packs.find((p) => p.id === wallet?.autoTopUpPackId)?.name ?? packs[0].name} when balance is low.`
                  : ""}
              </p>
            </div>

            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <p className="text-sm font-semibold">Usage History</p>
                <Button variant="ghost" size="sm" onClick={handleRefresh}>
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
              {txnLoading ? (
                <DataTableSkeleton rows={txnLimit} columns={8} />
              ) : txnError ? (
                <ErrorState
                  title="Failed to load transactions"
                  description="Something went wrong fetching your usage history."
                  onRetry={handleTxnRetry}
                  compact
                  className="border-0 bg-transparent py-8"
                />
              ) : txns.length === 0 && txnPage === 1 ? (
                <EmptyState
                  illustrationPreset="report"
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
                  className="rounded-none border-0"
                  pagination={{
                    mode: "server",
                    page: txnPage,
                    pageSize: txnLimit,
                    total: txnTotal,
                    onPageChange: handleTxnPageChange,
                    onPageSizeChange: handleTxnPageSizeChange,
                  }}
                />
              )}
            </div>
          </>
        )}
      </div>
    </PageWrapper>
  );
}
