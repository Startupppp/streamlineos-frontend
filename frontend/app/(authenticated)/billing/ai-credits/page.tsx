"use client";

import { useState, useCallback, type ReactNode } from "react";
import Script from "next/script";
import { addMonths, format } from "date-fns";
import { Package, RefreshCw, TrendingDown, TrendingUp, Zap } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCan } from "@/hooks/api/access";
import {
  useAiCreditsWallet,
  useAiCreditTransactions,
  useConfigureAutoTopUp,
  usePurchaseAiCredits,
  useVerifyAiCreditPurchase,
  type AiCreditTransaction,
  type AiCreditPack,
} from "@/hooks/api/ai-credits";

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
    key: "amount",
    header: "Amount",
    headerClassName: "text-right",
    cell: (txn): ReactNode => {
      const meta = TXN_LABELS[txn.type] ?? { label: txn.type, sign: "", color: "text-foreground" };
      return (
        <span className={`font-mono text-sm font-medium tabular-nums ${meta.color}`}>
          {meta.sign}{Math.abs(txn.amount).toLocaleString()}
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
    cell: (txn): ReactNode => format(new Date(txn.createdAt), "dd MMM yyyy"),
  },
];

function getTxnRowKey(txn: AiCreditTransaction): string | number {
  return txn.id;
}

function PackBuyButton({ pack, isPending, onBuy }: { pack: AiCreditPack; isPending: boolean; onBuy: (p: AiCreditPack) => void }) {
  function handleClick() {
    onBuy(pack);
  }
  return (
    <LoadingButton size="sm" variant="outline" isPending={isPending} onClick={handleClick}>
      Buy
    </LoadingButton>
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
  const {
    data: txnData,
    isLoading: txnLoading,
    isError: txnError,
    refetch: refetchTxns,
  } = useAiCreditTransactions(txnPage, txnLimit);

  const [localAutoTopUp, setLocalAutoTopUp] = useState<boolean | null>(null);
  const [selectedPack, setSelectedPack] = useState<AiCreditPack | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [razorpayReady, setRazorpayReady] = useState(false);

  const autoTopUp = localAutoTopUp ?? (data?.wallet.autoTopUpEnabled ?? false);
  const wallet = data?.wallet;
  const packs = data?.packs ?? [];
  const txns = txnData?.items ?? [];
  const txnTotal = txnData?.total ?? 0;

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

  function handleDialogClose(open: boolean) {
    setDialogOpen(open);
  }

  function handleCancelPurchase() {
    setDialogOpen(false);
  }

  function handleRazorpayLoad() {
    setRazorpayReady(true);
  }

  function handleBuyPack(pack: AiCreditPack) {
    setSelectedPack(pack);
    setDialogOpen(true);
  }

  function handleRazorpaySuccess(response: RazorpayPaymentResponse) {
    if (!selectedPack) return;
    verifyMutation.mutate(
      {
        packId: selectedPack.id,
        orderId: response.razorpay_order_id,
        paymentId: response.razorpay_payment_id,
        signature: response.razorpay_signature,
      },
      {
        onSuccess: () => {
          setDialogOpen(false);
          setSelectedPack(null);
        },
      },
    );
  }

  function handleConfirmPurchase() {
    if (!selectedPack) return;
    purchaseMutation.mutate(
      { packId: selectedPack.id },
      {
        onSuccess: (result) => {
          if ("orderId" in result && result.orderId && razorpayReady) {
            const rz = new window.Razorpay({
              key: result.keyId,
              order_id: result.orderId,
              amount: result.amount,
              currency: result.currency,
              name: "StreamlineOS",
              description: `${selectedPack.name} – ${selectedPack.credits.toLocaleString()} credits`,
              handler: handleRazorpaySuccess,
            });
            rz.open();
          } else {
            setDialogOpen(false);
            setSelectedPack(null);
          }
        },
      },
    );
  }

  const isPending = purchaseMutation.isPending || verifyMutation.isPending;

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={handleRazorpayLoad}
      />
      <PageWrapper title="AI Credits" subtitle="Manage your AI usage credits">
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
                <StatCardGridSkeleton cols={3} count={3} />
              ) : (
                <StatCardGrid cols={3}>
                  <StatCard label="Balance" value={wallet?.balance ?? 0} icon={Zap} tone="blue" hint="credits" />
                  <StatCard label="Total Granted" value={wallet?.lifetimeGranted ?? 0} icon={TrendingUp} tone="emerald" />
                  <StatCard label="Total Used" value={wallet?.lifetimeConsumed ?? 0} icon={TrendingDown} tone="amber" />
                </StatCardGrid>
              )}

              <div>
                <p className="text-sm font-semibold mb-2">Credit Packs</p>
                {isLoading ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 3 }, (_, i) => (
                      <div
                        key={`pack-skel-${i}`}
                        className="h-[116px] rounded-lg border border-border bg-card animate-pulse"
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
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {packs.map((pack) => (
                      <div key={pack.id} className="rounded-lg border border-border bg-card p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <Package className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold">{pack.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {pack.credits.toLocaleString()} credits
                              {pack.bonusCredits > 0 && (
                                <Badge variant="secondary" className="ml-1.5 text-[10px]">
                                  +{pack.bonusCredits.toLocaleString()} bonus
                                </Badge>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                          <span className="text-sm font-medium">
                            ₹{(pack.priceInPaise / 100).toLocaleString("en-IN")}
                          </span>
                          {canPurchase ? (
                            <PackBuyButton
                              pack={pack}
                              isPending={purchaseMutation.isPending && selectedPack?.id === pack.id}
                              onBuy={handleBuyPack}
                            />
                          ) : null}
                        </div>
                      </div>
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
                  Automatically purchase credits when your balance drops below the threshold.
                  {autoTopUp && packs[0] ? ` Uses ${packs.find((p) => p.id === wallet?.autoTopUpPackId)?.name ?? packs[0].name} when balance is low.` : ""}
                </p>
              </div>

              <div className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between border-b border-border">
                  <p className="text-sm font-semibold">Usage History</p>
                  <Button variant="ghost" size="sm" onClick={handleRefresh}>
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {txnLoading ? (
                  <DataTableSkeleton rows={txnLimit} columns={6} />
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
                    className="border-0 rounded-none"
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

      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Purchase</DialogTitle>
            <DialogDescription>
              {selectedPack && (
                <>
                  Add{" "}
                  <span className="font-semibold text-foreground">
                    {(selectedPack.credits + selectedPack.bonusCredits).toLocaleString()} credits
                  </span>{" "}
                  to your account for{" "}
                  <span className="font-semibold text-foreground">
                    ₹{(selectedPack.priceInPaise / 100).toLocaleString("en-IN")}
                  </span>
                  .
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancelPurchase}
              disabled={isPending}
            >
              Cancel
            </Button>
            <LoadingButton
              isPending={isPending}
              loadingText="Processing…"
              onClick={handleConfirmPurchase}
            >
              Confirm Purchase
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
