"use client";

import { RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import type { AiCreditPack } from "@/hooks/api/ai-credits";
import { LoadingButton } from "@/components/ui/loading-button";
import type { ScriptState } from "@/features/billing/lib/checkout-script";
import { AiCreditsWalletPanel } from "@/features/billing/ai-credits-wallet-panel";
import { AiCreditPackCard } from "@/features/billing/components/ai-credit-pack-card";

interface AiCreditsBuyTabProps {
  packs: AiCreditPack[];
  isLoading: boolean;
  canPurchase: boolean;
  isBusy: boolean;
  selectedPackId: number | null;
  scriptState: ScriptState;
  balanceLabel: string;
  walletLoading: boolean;
  autoTopUpEnabled: boolean;
  autoTopUpDescription: string;
  autoTopUpDisabled: boolean;
  onAutoTopUpToggle: (enabled: boolean) => void;
  onBuy: (pack: AiCreditPack) => void;
  onRetryScript: () => void;
  onRefresh: () => void;
}

export function AiCreditsBuyTab({
  packs,
  isLoading,
  canPurchase,
  isBusy,
  selectedPackId,
  scriptState,
  balanceLabel,
  walletLoading,
  autoTopUpEnabled,
  autoTopUpDescription,
  autoTopUpDisabled,
  onAutoTopUpToggle,
  onBuy,
  onRetryScript,
  onRefresh,
}: AiCreditsBuyTabProps) {
  return (
    <div className="flex min-h-full flex-col gap-4 overscroll-contain">
      <AiCreditsWalletPanel
        balanceLabel={balanceLabel}
        walletLoading={walletLoading}
        onRefresh={onRefresh}
        autoTopUpEnabled={autoTopUpEnabled}
        autoTopUpDescription={autoTopUpDescription}
        autoTopUpDisabled={autoTopUpDisabled}
        onAutoTopUpToggle={onAutoTopUpToggle}
      />

      <div className="flex flex-col gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Credit packs</p>
          <p className="text-xs text-muted-foreground">
            Purchase credits to top up your wallet
          </p>
        </div>
        {scriptState === "failed" && (
          <div className="flex items-center gap-3 rounded-lg border border-status-warning-rule bg-status-warning-surface px-4 py-3 text-sm text-status-warning-ink">
            <span className="flex-1">
              Payment checkout failed to load. Check your connection and try
              again.
            </span>
            <LoadingButton
              type="button"
              size="sm"
              variant="outline"
              onClick={onRetryScript}
              className="shrink-0"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
              Retry
            </LoadingButton>
          </div>
        )}
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={`pack-skel-${i}`} className="h-36 rounded-xl" />
            ))}
          </div>
        ) : packs.length === 0 ? (
          <EmptyState
            illustrationPreset="report"
            title="No credit packs available"
            description="Top-up packs could not be loaded. Refresh the page or try again shortly."
            className="border border-border bg-card py-8"
            compact
            action={{ label: "Refresh", onClick: onRefresh }}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {packs.map((pack) => (
              <AiCreditPackCard
                key={pack.id}
                pack={pack}
                canPurchase={canPurchase}
                isPending={isBusy && selectedPackId === pack.id}
                isBusy={isBusy || scriptState !== "ready"}
                onBuy={onBuy}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
