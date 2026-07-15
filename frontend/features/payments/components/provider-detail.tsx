"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PaymentEnvironment, PaymentProvider } from "@/hooks/api/payments";
import { CredentialsTab } from "./credentials-tab";
import { WebhooksTab } from "./webhooks-tab";
import { TestPaymentTab } from "./test-payment-tab";
import { LiveActivationPanel } from "./live-activation-panel";
import { AuditTab } from "./audit-tab";

type ProviderDetailProps = {
  provider: PaymentProvider;
  environment: PaymentEnvironment;
};

export function ProviderDetail({ provider, environment }: ProviderDetailProps) {
  const credential = provider.credentials.find((c) => c.environment === environment);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <Tabs defaultValue="credentials">
        <TabsList className="h-8 rounded-lg border p-1 bg-muted/40">
          <TabsTrigger value="credentials" className="text-xs px-3 rounded-md">Credentials</TabsTrigger>
          <TabsTrigger value="webhooks" className="text-xs px-3 rounded-md">Webhooks</TabsTrigger>
          <TabsTrigger value="test-payment" className="text-xs px-3 rounded-md">Test Payment</TabsTrigger>
          {environment === "live" && (
            <TabsTrigger value="activate" className="text-xs px-3 rounded-md">Live Activation</TabsTrigger>
          )}
          <TabsTrigger value="audit" className="text-xs px-3 rounded-md">Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="credentials" className="mt-4">
          <CredentialsTab providerKey={provider.providerKey} environment={environment} credential={credential} />
        </TabsContent>

        <TabsContent value="webhooks" className="mt-4">
          <WebhooksTab providerKey={provider.providerKey} environment={environment} />
        </TabsContent>

        <TabsContent value="test-payment" className="mt-4">
          <TestPaymentTab providerKey={provider.providerKey} />
        </TabsContent>

        {environment === "live" && (
          <TabsContent value="activate" className="mt-4">
            <LiveActivationPanel providerKey={provider.providerKey} />
          </TabsContent>
        )}

        <TabsContent value="audit" className="mt-4">
          <AuditTab providerKey={provider.providerKey} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
