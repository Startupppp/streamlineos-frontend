"use client";

import { useState, useCallback, useEffect } from "react";
import { Activity, RefreshCw, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { Switch } from "@/components/ui/switch";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
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
import { FILTER_SELECT_TRIGGER, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { useCan } from "@/hooks/api/access";
import {
  useAiCreditsWallet,
  useAiCreditTransactions,
  useAiCreditsUsage,
  useConfigureAutoTopUp,
  usePurchaseAiCredits,
  useVerifyAiCreditPurchase,
  type AiCreditPack,
  type PurchaseAiPackOrder,
  type PurchaseAiPackResult,
  type AiCreditsUsageDays,
} from "@/hooks/api/ai-credits";
import { AiCreditsDailyChart } from "@/features/billing/ai-credits-daily-chart";
import { AiCreditsBreakdownTables } from "@/features/billing/ai-credits-breakdown-tables";
import { AiCreditPackCard } from "@/features/billing/components/ai-credit-pack-card";
import { TXN_COLUMNS, getTxnRowKey } from "@/features/billing/components/ai-credit-txn-columns";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatCredits, formatTokens } from "@/lib/format-ai";
import { cn } from "@/lib/utils";

type TxnPageSize = 10 | 20 | 50;

export function AiCreditsSettingsPage() {
  const { data, isLoading, isError, error: walletError, refetch } = useAiCreditsWallet();
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
    error: txnErrorObj,
    refetch: refetchTxns,
  } = useAiCreditTransactions(txnPage, txnLimit);

  const {
    data: usageData,
    isLoading: usageLoading,
    isError: usageError,
    error: usageErrorObj,
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
            description={getErrorMessage(walletError)}
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
                    <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-fit min-w-[110px]")}>
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
                  description={getErrorMessage(usageErrorObj)}
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
                    <AiCreditPackCard
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
                  description={getErrorMessage(txnErrorObj)}
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
