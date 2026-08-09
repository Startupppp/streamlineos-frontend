"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardGate } from "@/components/shared/dashboard-gate";
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

export default function PaymentProvidersSettingsPage() {
  return (
    <DashboardGate permission="payments:providers:view">
      <PaymentProvidersContent />
    </DashboardGate>
  );
}

function PaymentProvidersContent() {
  const { data: catalog, isLoading: catalogLoading } = usePaymentCatalog();
  const { data: providers, isLoading: providersLoading } = usePaymentProviders();
  const createProvider = useCreatePaymentProvider();

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [environment, setEnvironment] = useState<PaymentEnvironment>("test");

  const selectedProvider = useMemo(
    () => providers?.find((provider) => provider.providerKey === selectedKey),
    [providers, selectedKey],
  );

  function handleConnect(providerKey: string) {
    createProvider.mutate(providerKey, {
      onSuccess: () => {
        setSelectedKey(providerKey);
        toast.success("Provider connected — add test credentials to get started");
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  const isLoading = catalogLoading || providersLoading;

  return (
    <PageWrapper
      title="Payment Providers"
      subtitle="Configure how your organization accepts and records payments."
      actions={
        <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5">
          <button
            type="button"
            onClick={() => setEnvironment("test")}
            className={`h-7 rounded-md px-3 text-xs font-medium transition-colors ${
              environment === "test" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            Test
          </button>
          <button
            type="button"
            onClick={() => setEnvironment("live")}
            className={`h-7 rounded-md px-3 text-xs font-medium transition-colors ${
              environment === "live" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            Live
          </button>
        </div>
      }
    >
      <div className="flex-1 min-h-0 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {isLoading
              ? Array.from({ length: 12 }).map((_, index) => (
                  <Skeleton key={index} className="h-28 rounded-xl border border-border bg-card" />
                ))
              : catalog?.map((entry) => (
                  <ProviderCard
                    key={entry.key}
                    catalogEntry={entry}
                    provider={providers?.find((provider) => provider.providerKey === entry.key)}
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
                Select a configured provider or connect a new provider to continue.
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
