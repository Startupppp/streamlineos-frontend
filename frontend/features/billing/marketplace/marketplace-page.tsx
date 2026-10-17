"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { useCan } from "@/hooks/api/access";
import { useMarketplaceAppAction, useMarketplaceApps, type MarketplaceAppAction } from "@/hooks/api/billing/marketplace";
import type { MarketplaceApp } from "@/hooks/api/billing/billing-growth-schema";
import { getErrorMessage } from "@/lib/get-error-message";
import { MarketplaceAppCard } from "./marketplace-app-card";
import { BillingAddonsSection } from "./billing-addons-section";

const GRID = "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3";

const DONE_COPY: Record<MarketplaceAppAction, string> = {
  install: "installed",
  trial: "trial started",
  uninstall: "uninstalled",
};

export function MarketplacePage() {
  const query = useMarketplaceApps();
  const apps = useMemo(() => query.data ?? [], [query.data]);
  const canInstall = useCan("billing:marketplace:install");
  const [pending, setPending] = useState<{ action: MarketplaceAppAction; appId: number } | null>(null);
  const [uninstalling, setUninstalling] = useState<MarketplaceApp | null>(null);
  const install = useMarketplaceAppAction("install");
  const trial = useMarketplaceAppAction("trial");
  const uninstall = useMarketplaceAppAction("uninstall");

  const pageState = usePageState({
    permission: "billing:marketplace:view",
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isEmpty: query.isSuccess && apps.length === 0,
  });

  const run = useCallback(
    (action: MarketplaceAppAction, app: MarketplaceApp) => {
      setPending({ action, appId: app.id });
      const mutation = action === "install" ? install : action === "trial" ? trial : uninstall;
      mutation.mutate(app.id, {
        onSuccess: () => {
          toast.success(`${app.name} ${DONE_COPY[action]}`);
          setUninstalling(null);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
        onSettled: () => setPending(null),
      });
    },
    [install, trial, uninstall],
  );

  const handleAction = useCallback(
    (action: MarketplaceAppAction, app: MarketplaceApp) => {
      if (action === "uninstall") setUninstalling(app);
      else run(action, app);
    },
    [run],
  );

  function handleConfirmUninstall() {
    if (uninstalling) run("uninstall", uninstalling);
  }

  function handleUninstallOpenChange(open: boolean) {
    if (!open) setUninstalling(null);
  }

  function handleRetry() {
    void query.refetch();
  }

  return (
    <PageWrapper title="Marketplace" subtitle="Apps and add-ons for your workspace." contentClassName="flex min-h-0 flex-1 flex-col gap-6">
      <section className="flex flex-col gap-3" aria-labelledby="marketplace-apps-heading">
        <h2 id="marketplace-apps-heading" className="text-sm font-semibold text-foreground">Apps</h2>
        <PageState
          resolution={pageState}
          loading={
            <div className={GRID}>
              <Skeleton className="h-36 rounded-xl" />
              <Skeleton className="h-36 rounded-xl" />
              <Skeleton className="h-36 rounded-xl" />
            </div>
          }
          empty={<EmptyState illustrationPreset="automations" title="No apps available" description="Apps published to the marketplace appear here." />}
          onRetry={handleRetry}
        >
          <div className={GRID}>
            {apps.map((app) => (
              <MarketplaceAppCard
                key={app.id}
                app={app}
                canInstall={canInstall}
                pendingAction={pending?.appId === app.id ? pending.action : null}
                onAction={handleAction}
              />
            ))}
          </div>
        </PageState>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="marketplace-addons-heading">
        <h2 id="marketplace-addons-heading" className="text-sm font-semibold text-foreground">Add-ons</h2>
        <BillingAddonsSection />
      </section>

      <ConfirmDialog
        open={uninstalling !== null}
        onOpenChange={handleUninstallOpenChange}
        destructive
        title={`Uninstall ${uninstalling?.name ?? "app"}?`}
        description="The app is removed from your workspace. A free app can be installed again at any time."
        confirmLabel="Uninstall"
        isPending={uninstall.isPending}
        onConfirm={handleConfirmUninstall}
      />
    </PageWrapper>
  );
}
