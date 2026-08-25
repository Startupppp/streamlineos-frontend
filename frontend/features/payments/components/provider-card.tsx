"use client";

import { Building2, CreditCard, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PaymentProvider, PaymentProviderCatalogEntry } from "@/hooks/api/payments";
import { ProviderStatusBadge } from "./provider-status-badge";

const PROVIDER_ICONS: Record<string, LucideIcon> = {
  razorpay: Wallet,
  stripe: CreditCard,
  manual: Building2,
};

type ProviderCardProps = {
  catalogEntry: PaymentProviderCatalogEntry;
  provider: PaymentProvider | undefined;
  selected: boolean;
  onSelect: () => void;
  onConnect: () => void;
  isConnecting?: boolean;
};

export function ProviderCard({ catalogEntry, provider, selected, onSelect, onConnect, isConnecting }: ProviderCardProps) {
  const Icon = PROVIDER_ICONS[catalogEntry.key] ?? Wallet;
  const isManual = catalogEntry.key === "manual";
  const canSelect = isManual || !!provider;

  function handleConnectClick(e: React.MouseEvent) {
    e.stopPropagation();
    onConnect();
  }

  return (
    <button
      type="button"
      onClick={canSelect ? onSelect : undefined}
      className={cn(
        "flex flex-col gap-2 rounded-xl border bg-card p-4 text-left transition-colors",
        selected ? "border-primary shadow-sm" : "border-border hover:border-primary/40",
        !canSelect && "cursor-default",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4 text-foreground" />
          </div>
          <p className="text-sm font-semibold text-foreground truncate">{catalogEntry.displayName}</p>
        </div>
        {provider && <ProviderStatusBadge status={provider.status} />}
      </div>

      <p className="text-dense text-muted-foreground">
        {catalogEntry.supportedPaymentMethods.slice(0, 4).join(" · ") || "Manual recording"}
      </p>

      {!catalogEntry.isImplemented ? (
        <p className="text-dense text-muted-foreground italic">Coming soon</p>
      ) : isManual ? (
        <p className="text-dense text-muted-foreground">Configure instructions for invoices</p>
      ) : provider ? (
        <p className="text-dense text-muted-foreground">
          {provider.environment === "live" ? "Live environment" : "Test environment"}
        </p>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="text-xs self-start"
          disabled={isConnecting}
          onClick={handleConnectClick}
        >
          Connect
        </Button>
      )}
    </button>
  );
}
