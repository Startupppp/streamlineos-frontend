"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface Addon {
  id: string;
  name: string;
  description: string;
  icon: string;
  priceInPaise: number;
  available: boolean;
  comingSoon?: boolean;
  href?: string;
}

interface AddonsResponse {
  addons: Addon[];
}

export function useAddons() {
  return useQuery<AddonsResponse, Error>({
    queryKey: ["billing", "addons"],
    queryFn: () => apiClient.get<AddonsResponse>("/billing/addons"),
    staleTime: 5 * 60_000,
  });
}
