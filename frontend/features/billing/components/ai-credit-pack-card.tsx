"use client";

import { ZapIcon } from "@animateicons/react/lucide";
import { LoadingButton } from "@/components/ui/loading-button";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import type { AiCreditPack } from "@/hooks/api/ai-credits";
import { cn } from "@/lib/utils";

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
        <span className="absolute -top-px right-3 inline-flex items-center rounded-b-md bg-primary px-2 py-0.5 text-micro font-semibold uppercase tracking-wide text-primary-foreground">
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
