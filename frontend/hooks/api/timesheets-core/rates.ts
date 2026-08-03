"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import type { CreateRateInput, RatesResponse, TimesheetRate } from "@/features/timesheets/types";

export function useRates(enabled = true) {
  const canView = useCan("timesheets:rates:view");
  return useQuery({
    queryKey: queryKeys.timesheets.rates(),
    queryFn: () => apiClient.get<RatesResponse>("/timesheets/rates"),
    staleTime: 2 * 60_000,
    enabled: enabled && canView,
  });
}

export function useCreateRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["timesheets", "rates", "create"],
    mutationFn: (data: CreateRateInput) => apiClient.post<TimesheetRate>("/timesheets/rates", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.timesheets.rates() });
      toast.success("Rate added");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useUpdateRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["timesheets", "rates", "update"],
    mutationFn: ({ rateId, data }: { rateId: number; data: Partial<CreateRateInput> }) =>
      apiClient.patch<TimesheetRate>(`/timesheets/rates/${rateId}`, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.timesheets.rates() });
      toast.success("Rate updated");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useDeleteRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["timesheets", "rates", "delete"],
    mutationFn: (rateId: number) =>
      apiClient.delete<{ success: boolean }>(`/timesheets/rates/${rateId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.timesheets.rates() });
      toast.success("Rate removed");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
