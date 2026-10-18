"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { CONTENT_PANEL_SOLID } from "@/components/ui/content-fill-panel";

interface AiCreditsWalletPanelProps {
  balanceLabel: string;
  walletLoading: boolean;
  onRefresh: () => void;
  autoTopUpEnabled: boolean;
  autoTopUpDescription: string;
  autoTopUpDisabled: boolean;
  onAutoTopUpToggle: (enabled: boolean) => void;
}

export function AiCreditsWalletPanel({
  balanceLabel,
  walletLoading,
  onRefresh,
  autoTopUpEnabled,
  autoTopUpDescription,
  autoTopUpDisabled,
  onAutoTopUpToggle,
}: AiCreditsWalletPanelProps) {
  return (
    <section className={CONTENT_PANEL_SOLID}>
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 flex-1 items-center justify-center gap-3">
          <div className="flex min-w-0 flex-col items-center gap-1 text-center">
            <p className="text-xs text-muted-foreground">Available balance</p>
            {walletLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                {balanceLabel}
                <span className="ml-1.5 text-base font-medium text-muted-foreground">cr</span>
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            aria-label="Refresh wallet"
            className="shrink-0"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="flex min-w-0 items-center justify-between gap-3 border-t border-border pt-3 sm:border-t-0 sm:border-l sm:pl-5 sm:pt-0">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Auto top-up</p>
            <p className="text-xs text-muted-foreground">{autoTopUpDescription}</p>
          </div>
          <Switch
            id="auto-topup"
            aria-label="Auto Top-Up"
            checked={autoTopUpEnabled}
            onCheckedChange={onAutoTopUpToggle}
            disabled={autoTopUpDisabled}
          />
        </div>
      </div>
    </section>
  );
}
