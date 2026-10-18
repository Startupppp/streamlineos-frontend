"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BarChart3, History, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ErrorState } from "@/components/shared/error-state";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TABS_CONTENT_PAGE_BODY_CLASS,
} from "@/components/ui/tabs";
import {
  ScrollArea,
  SCROLL_AREA_PAGE_BODY_CLASS,
} from "@/components/ui/scroll-area";
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
import { AiCreditsBreakdownTables } from "@/features/billing/ai-credits-breakdown-tables";
import { AiCreditsDailyTable } from "@/features/billing/ai-credits-daily-table";
import { AiCreditsUsageToolbar } from "@/features/billing/ai-credits-usage-toolbar";
import { AiCreditsBuyTab } from "@/features/billing/components/ai-credits-buy-tab";
import { AiCreditsHistoryTab } from "@/features/billing/components/ai-credits-history-tab";
import { resolveAiCreditsTab } from "@/features/billing/ai-credits-tabs";
import { AiCreditsPageSkeleton } from "@/features/billing/ai-credits-page-skeleton";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatCredits, formatTokens } from "@/lib/format-ai";
import { cn } from "@/lib/utils";
import {
  loadCheckoutScript,
  openCheckout,
  useCheckoutScript,
  type CheckoutPaymentResponse,
} from "@/features/billing/lib/checkout-script";
import { STANDARD_PAGE_SIZE_OPTIONS } from "@/lib/list-pagination";
import {
  AI_CREDITS_USAGE_DAYS,
  AI_CREDIT_TRANSACTION_LIMIT,
} from "@/lib/settings-initial-reads";

type TxnPageSize = (typeof STANDARD_PAGE_SIZE_OPTIONS)[number];

function AiCreditsPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = resolveAiCreditsTab(searchParams.get("tab"));

  const {
    data,
    isLoading,
    isError,
    error: walletError,
    refetch,
  } = useAiCreditsWallet();
  const configureTopUp = useConfigureAutoTopUp();
  const purchaseMutation = usePurchaseAiCredits();
  const verifyMutation = useVerifyAiCreditPurchase();
  const canPurchase = useCan("billing:ai-credits:purchase");
  const { state: scriptState, retry: retryScript } = useCheckoutScript();

  useEffect(() => {
    void loadCheckoutScript();
  }, []);

  const [txnLimit, setTxnLimit] = useState<TxnPageSize>(
    AI_CREDIT_TRANSACTION_LIMIT,
  );
  const [txnCursors, setTxnCursors] = useState<Array<string | undefined>>([
    undefined,
  ]);
  const [usageDays, setUsageDays] = useState<AiCreditsUsageDays>(
    AI_CREDITS_USAGE_DAYS,
  );
  const txnCursor = txnCursors.at(-1);

  const {
    data: txnData,
    isLoading: txnLoading,
    isError: txnError,
    error: txnErrorObj,
    refetch: refetchTxns,
  } = useAiCreditTransactions({ cursor: txnCursor, limit: txnLimit });

  const {
    data: usageData,
    isLoading: usageLoading,
    isError: usageError,
    error: usageErrorObj,
    refetch: refetchUsage,
  } = useAiCreditsUsage(usageDays);

  const [localAutoTopUp, setLocalAutoTopUp] = useState<boolean | null>(null);
  const [selectedPack, setSelectedPack] = useState<AiCreditPack | null>(null);

  const autoTopUp = localAutoTopUp ?? data?.wallet.autoTopUpEnabled ?? false;
  const wallet = data?.wallet;
  const packs = data?.packs ?? [];
  const txns = txnData?.data ?? [];
  const txnPagination = txnData?.pagination;
  const isBusy = purchaseMutation.isPending || verifyMutation.isPending;

  const usageTotals = usageData?.totals;
  const usageDaily = usageData?.daily ?? [];
  const usageByModel = usageData?.byModel ?? [];
  const usageByFeature = usageData?.byFeature ?? [];
  const autoTopUpPackName =
    packs.find((pack) => pack.id === wallet?.autoTopUpPackId)?.name ??
    packs[0]?.name;
  const autoTopUpDescription = [
    "Buy credits automatically when balance is low",
    wallet?.autoTopUpThreshold != null
      ? `(below ${formatCredits(wallet.autoTopUpThreshold)} cr)`
      : "",
    autoTopUp && autoTopUpPackName ? `· ${autoTopUpPackName}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const handleTabChange = useCallback(
    (tab: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tab === "usage") {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, searchParams, router],
  );

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

  const handleTxnPageSizeChange = useCallback((size: number) => {
    setTxnLimit(size as TxnPageSize);
    setTxnCursors([undefined]);
  }, []);

  const handlePreviousTxnPage = useCallback(() => {
    setTxnCursors((cursors) => cursors.slice(0, -1));
  }, []);

  const handleNextTxnPage = useCallback(() => {
    const nextCursor = txnPagination?.nextCursor;
    if (!nextCursor) return;
    setTxnCursors((cursors) =>
      cursors.at(-1) === nextCursor ? cursors : [...cursors, nextCursor],
    );
  }, [txnPagination?.nextCursor]);

  function handleTxnRetry() {
    void refetchTxns();
  }

  function handleUsageRetry() {
    void refetchUsage();
  }

  function handleCheckoutDismiss() {
    setSelectedPack(null);
  }

  function handleCheckoutSuccess(
    response: CheckoutPaymentResponse,
    pack: AiCreditPack,
  ) {
    verifyMutation.mutate(
      {
        packId: pack.id,
        orderId: response.orderId,
        paymentId: response.paymentId,
        signature: response.signature,
      },
      {
        onSettled: () => {
          setSelectedPack(null);
        },
      },
    );
  }

  async function handleBuyPack(pack: AiCreditPack) {
    if (scriptState !== "ready") {
      toast.error(
        "Payment checkout is not available. Please retry or refresh the page.",
      );
      return;
    }
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
      openCheckout({
        key: result.keyId,
        orderId: result.orderId,
        amount: result.amount,
        currency: result.currency,
        name: "StreamlineOS",
        description: `${pack.name} – ${pack.credits.toLocaleString()} credits`,
        onSuccess: (response) => {
          handleCheckoutSuccess(response, pack);
        },
        onDismiss: handleCheckoutDismiss,
      });
    } catch (err) {
      toast.error(getErrorMessage(err));
      setSelectedPack(null);
    }
  }

  function handleRetryScript() {
    retryScript();
  }

  function handleUsageDaysChange(value: string) {
    const parsed = Number(value);
    if (parsed === 7 || parsed === 30 || parsed === 90) {
      setUsageDays(parsed);
    }
  }

  return (
    <PageWrapper
      title="AI Credits"
      subtitle="Token-metered AI usage and credit wallet"
      noInternalScroll
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      contentClassName="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        {isError ? (
          <ErrorState
            title="Failed to load AI credits"
            description={getErrorMessage(walletError)}
            onRetry={handleRefresh}
            className="min-h-0 flex-1"
          />
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="flex h-full min-h-0 flex-1 flex-col gap-0 overflow-hidden"
          >
            <TabsList className="mb-4 shrink-0">
              <TabsTrigger value="usage">
                <BarChart3
                  className="h-3.5 w-3.5 max-sm:hidden"
                  aria-hidden="true"
                />
                Usage
              </TabsTrigger>
              <TabsTrigger value="buy">
                <ShoppingBag
                  className="h-3.5 w-3.5 max-sm:hidden"
                  aria-hidden="true"
                />
                Buy credits
              </TabsTrigger>
              <TabsTrigger value="history">
                <History
                  className="h-3.5 w-3.5 max-sm:hidden"
                  aria-hidden="true"
                />
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="usage"
              className={cn(
                TABS_CONTENT_PAGE_BODY_CLASS,
                "min-h-0 overflow-hidden",
              )}
            >
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-hide">
                {usageError ? (
                  <ErrorState
                    title="Failed to load usage data"
                    description={getErrorMessage(usageErrorObj)}
                    onRetry={handleUsageRetry}
                    compact
                    className="rounded-xl border border-border py-8"
                  />
                ) : (
                  <div className="flex flex-col gap-4 pb-1">
                    <AiCreditsUsageToolbar
                      usageDays={usageDays}
                      usageLoading={usageLoading}
                      requestsLabel={
                        usageTotals
                          ? usageTotals.requests.toLocaleString()
                          : "—"
                      }
                      tokensLabel={
                        usageTotals
                          ? formatTokens(usageTotals.totalTokens)
                          : "—"
                      }
                      creditsUsedLabel={
                        usageTotals ? formatCredits(usageTotals.credits) : "—"
                      }
                      onUsageDaysChange={handleUsageDaysChange}
                    />
                    <AiCreditsBreakdownTables
                      byModel={usageByModel}
                      byFeature={usageByFeature}
                      isLoading={usageLoading}
                    />
                    <AiCreditsDailyTable
                      data={usageDaily}
                      isLoading={usageLoading}
                    />
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent
              value="buy"
              className={cn(
                TABS_CONTENT_PAGE_BODY_CLASS,
                "min-h-0 overflow-hidden",
              )}
            >
              <ScrollArea
                fill
                hideScrollbar
                className={SCROLL_AREA_PAGE_BODY_CLASS}
              >
                <AiCreditsBuyTab
                  packs={packs}
                  isLoading={isLoading}
                  canPurchase={canPurchase}
                  isBusy={isBusy}
                  selectedPackId={selectedPack?.id ?? null}
                  scriptState={scriptState}
                  balanceLabel={formatCredits(wallet?.balance ?? 0)}
                  walletLoading={isLoading}
                  autoTopUpEnabled={autoTopUp}
                  autoTopUpDescription={autoTopUpDescription}
                  autoTopUpDisabled={
                    !canPurchase ||
                    configureTopUp.isPending ||
                    packs.length === 0
                  }
                  onAutoTopUpToggle={handleAutoTopUpToggle}
                  onBuy={handleBuyPack}
                  onRetryScript={handleRetryScript}
                  onRefresh={handleRefresh}
                />
              </ScrollArea>
            </TabsContent>

            <TabsContent
              value="history"
              className={cn(
                TABS_CONTENT_PAGE_BODY_CLASS,
                "min-h-0 overflow-hidden",
              )}
            >
              <ScrollArea
                fill
                hideScrollbar
                className={SCROLL_AREA_PAGE_BODY_CLASS}
              >
                <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
                  <AiCreditsHistoryTab
                    txns={txns}
                    txnLoading={txnLoading}
                    txnError={txnError}
                    txnErrorObj={txnErrorObj}
                    txnLimit={txnLimit}
                    hasMore={txnPagination?.hasMore ?? false}
                    hasPrevious={txnCursors.length > 1}
                    isFirstPage={txnCursors.length === 1}
                    onRetry={handleTxnRetry}
                    onNext={handleNextTxnPage}
                    onPrevious={handlePreviousTxnPage}
                    onPageSizeChange={handleTxnPageSizeChange}
                  />
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </PageWrapper>
  );
}

export function AiCreditsSettingsPage() {
  return (
    <Suspense
      fallback={
        <PageWrapper
          title="AI Credits"
          subtitle="Token-metered AI usage and credit wallet"
          noInternalScroll
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
          contentClassName="flex min-h-0 flex-1 flex-col"
        >
          <AiCreditsPageSkeleton />
        </PageWrapper>
      }
    >
      <AiCreditsPageContent />
    </Suspense>
  );
}
