"use client";

import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import { useDisablePaymentProvider, type PaymentEnvironment, type PaymentProvider } from "@/hooks/api/payments";
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
  const canManage = useCan("payments:providers:manage");
  const disable = useDisablePaymentProvider(provider.providerKey);

  function handleDisable() {
    disable.mutate(undefined, {
      onSuccess: () => toast.success(`${provider.displayName} disabled`),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <Tabs defaultValue="credentials">
        <div className="flex flex-wrap items-center justify-between gap-2">
        <TabsList>
          <TabsTrigger value="credentials">Credentials</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="test-payment">Test Payment</TabsTrigger>
          {environment === "live" && (
            <TabsTrigger value="activate">Live Activation</TabsTrigger>
          )}
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>
        {canManage && provider.status !== "disabled" ? (
          <ConfirmDialog
            destructive
            title={`Disable ${provider.displayName}?`}
            description="Checkout, webhooks and test payments stop using this provider immediately. Saved credentials are kept, but it cannot be re-enabled from this page."
            confirmLabel="Disable provider"
            isPending={disable.isPending}
            onConfirm={handleDisable}
            trigger={
              <Button type="button" size="sm" variant="outline" className="text-xs">
                Disable provider
              </Button>
            }
          />
        ) : null}
        </div>

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
