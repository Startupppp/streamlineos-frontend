"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";

export interface MarketplaceApp {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  iconUrl: string | null;
  screenshotUrls: string[];
  features: string[];
  pricingType: string;
  monthlyPrice: number;
  annualPrice: number;
  trialDays: number;
  isActive: boolean;
  requiredPlan: string | null;
  installation: {
    id: number;
    status: "TRIALING" | "ACTIVE" | "CANCELLED";
    trialEndsAt: string | null;
  } | null;
}

export function useMarketplace() {
  return useQuery<MarketplaceApp[]>({
    queryKey: ["billing", "marketplace"],
    queryFn: () => apiClient.get<MarketplaceApp[]>("/billing/marketplace"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useInstallApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (appId: number) =>
      apiClient.post(`/billing/marketplace/${appId}/install`, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["billing", "marketplace"] });
      toast.success("App installed successfully");
    },
    onError: (e: Error) => toast.error(e.message ?? "Failed to install app"),
  });
}

export function useUninstallApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (appId: number) =>
      apiClient.delete(`/billing/marketplace/${appId}/install`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["billing", "marketplace"] });
      toast.success("App uninstalled");
    },
    onError: (e: Error) => toast.error(e.message ?? "Failed to uninstall app"),
  });
}

export function useStartAppTrial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (appId: number) =>
      apiClient.post(`/billing/marketplace/${appId}/trial`, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["billing", "marketplace"] });
      toast.success("Trial started");
    },
    onError: (e: Error) => toast.error(e.message ?? "Failed to start trial"),
  });
}
