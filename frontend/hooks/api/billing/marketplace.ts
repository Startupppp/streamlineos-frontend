"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { growthAndSignQueryKeys } from "@/lib/query-keys/growth-and-sign";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import {
  addonListContract,
  appInstallationResponseContract,
  marketplaceAppListContract,
  type AppInstallation,
  type MarketplaceApp,
} from "./billing-growth-schema";

const keys = growthAndSignQueryKeys.billing;

export function useMarketplaceApps() {
  return useGatedQuery("billing:marketplace:view", {
    queryKey: keys.marketplaceApps(),
    queryFn: ({ signal }) => apiClient.get("/billing/marketplace/apps", undefined, signal, marketplaceAppListContract),
    staleTime: 2 * 60_000,
  });
}

export function useBillingAddons() {
  return useGatedQuery("billing:marketplace:view", {
    queryKey: keys.addons(),
    queryFn: ({ signal }) => apiClient.get("/billing/addons", undefined, signal, addonListContract),
    staleTime: 30 * 60_000,
  });
}

export type MarketplaceAppAction = "install" | "trial" | "uninstall";

/** Install, trial and uninstall all answer with the installation row: write it onto the app. */
export function useMarketplaceAppAction(action: MarketplaceAppAction) {
  const qc = useQueryClient();
  return useAuthorizedMutation<AppInstallation, Error, number>("billing:marketplace:install", {
    mutationKey: ["billing", "marketplace", action],
    mutationFn: (appId) =>
      action === "uninstall"
        ? apiClient.delete(`/billing/marketplace/${appId}/install`, undefined, undefined, appInstallationResponseContract)
        : apiClient.post(`/billing/marketplace/${appId}/${action}`, undefined, undefined, appInstallationResponseContract),
    onSuccess: (installation, appId) => {
      qc.setQueryData<MarketplaceApp[]>(keys.marketplaceApps(), (apps) =>
        apps?.map((app) => (app.id === appId ? { ...app, installation } : app)),
      );
    },
  });
}
