"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { MyWorkItem } from "@/types/projects/my-work";

export function useMyWork() {
  return useQuery<MyWorkItem[]>({
    queryKey: ["streamlineos", "projects", "my-work"] as const,
    queryFn: () => apiClient.get<MyWorkItem[]>("/build/my-work"),
    staleTime: 60_000,
  });
}
