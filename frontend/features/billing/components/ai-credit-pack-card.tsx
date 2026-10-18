"use client";

import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import type { AiCreditPack } from "@/hooks/api/ai-credits";

export function AiCreditPackCard({
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
  const totalCredits = pack.credits + pack.bonusCredits;

  function handleBuy() {
    onBuy(pack);
  }

  return (
    <div className="flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{pack.name}</p>
        {pack.bonusCredits > 0 ? (
          <Badge variant="secondary">+{pack.bonusCredits.toLocaleString()} bonus</Badge>
        ) : null}
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-xl font-semibold tabular-nums tracking-tight text-foreground">
          ₹{(pack.priceInPaise / 100).toLocaleString("en-IN")}
        </p>
        <p className="text-xs tabular-nums text-muted-foreground">
          {totalCredits.toLocaleString()} credits
        </p>
      </div>
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
