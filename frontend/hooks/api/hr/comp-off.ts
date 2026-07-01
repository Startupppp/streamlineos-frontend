import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface CompOffBalance {
  orgId: string;
  userId: string;
  earnedDays: string;
}

export function useCompOff() {
  return useQuery<CompOffBalance[]>({
    queryKey: ["hr", "comp-off"],
    queryFn: () => apiClient.get("/hr/overtime/comp-off").then((r) => r.data),
    staleTime: 60_000,
  });
}
