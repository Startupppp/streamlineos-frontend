"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  usePaymentCatalog,
  usePaymentProviders,
  useCreatePaymentProvider,
  type PaymentEnvironment,
} from "@/hooks/api/payments";
import { ProviderCard } from "@/features/payments/components/provider-card";
import { ProviderDetail } from "@/features/payments/components/provider-detail";
import { ReadinessRail } from "@/features/payments/components/readiness-rail";
import { ManualMethodsPanel } from "@/features/payments/components/manual-methods-panel";

export default function PaymentsSettingsPage() {
  const { data: catalog, isLoading: catalogLoading } = usePaymentCatalog();
  const { data: providers, isLoading: providersLoading } = usePaymentProviders();
  const createProvider = useCreatePaymentProvider();

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [environment, setEnvironment] = useState<PaymentEnvironment>("test");

  const selectedProvider = useMemo(
    () => providers?.find((p) => p.providerKey === selectedKey),
    [providers, selectedKey],
  );

  function handleConnect(providerKey: string) {
    createProvider.mutate(providerKey, {
      onSuccess: () => {
        setSelectedKey(providerKey);
        toast.success("Provider connected — add test credentials to get started");
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  const isLoading = catalogLoading || providersLoading;

  return (
    <PageWrapper
      title="Payments"
      subtitle="Accept online payments, record offline payments, and keep invoices/subscriptions in sync."
      actions={
        <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5">
          <button
            type="button"
            onClick={() => setEnvironment("test")}
            className={`h-7 px-3 rounded-md text-xs font-medium transition-colors ${
              environment === "test" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
            }`}
          >
            Test
          </button>
          <button
            type="button"
            onClick={() => setEnvironment("live")}
            className={`h-7 px-3 rounded-md text-xs font-medium transition-colors ${
              environment === "live" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
            }`}
          >
            Live
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {isLoading
              ? Array.from({ length: 9 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 rounded-xl border border-border bg-card" />
                ))
              : catalog?.map((entry) => (
                  <ProviderCard
                    key={entry.key}
                    catalogEntry={entry}
                    provider={providers?.find((p) => p.providerKey === entry.key)}
                    selected={selectedKey === entry.key}
                    onSelect={() => setSelectedKey(entry.key)}
                    onConnect={() => handleConnect(entry.key)}
                    isConnecting={createProvider.isPending}
                  />
                ))}
          </div>

          {selectedKey === "manual" ? (
            <div className="rounded-xl border border-border bg-card p-4">
              <ManualMethodsPanel />
            </div>
          ) : selectedProvider ? (
            <ProviderDetail provider={selectedProvider} environment={environment} />
          ) : (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Connect a provider above to configure credentials, webhooks, and test payments.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <ReadinessRail providerKey={selectedKey} />
        </div>
      </div>
    </PageWrapper>
  );
}
