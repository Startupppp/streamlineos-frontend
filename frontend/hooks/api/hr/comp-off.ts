import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface CompOffRecord {
  orgId: string;
  userId: string;
  earnedDays: string;
}

export function useCompOff() {
  return useQuery<CompOffRecord[]>({
    queryKey: ["hr", "comp-off"],
    queryFn: () => apiClient.get<CompOffRecord[]>("/hr/overtime/comp-off"),
    staleTime: 60_000,
  });
}
