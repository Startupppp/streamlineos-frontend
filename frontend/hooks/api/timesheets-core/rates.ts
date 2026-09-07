"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { usersAndCommerceQueryKeys } from "@/lib/query-keys/users-and-commerce";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import type { CreateRateInput, RatesResponse, TimesheetRate } from "@/features/timesheets/types";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const ratesListC = lazyContract(() =>
  import("@/hooks/api/timesheets-core/timesheets-schema").then((m) => m.ratesListResponseContract),
);
const rateC = lazyContract(() =>
  import("@/hooks/api/timesheets-core/timesheets-schema").then((m) => m.rateContract),
);

export function useRates(enabled = true) {
  const canView = useCan("timesheets:rates:view");
  return useQuery({
    queryKey: usersAndCommerceQueryKeys.timesheets.rates(),
    queryFn: ({ signal }) => apiClient.get<RatesResponse>("/timesheets/rates", undefined, signal, ratesListC),
    staleTime: 2 * 60_000,
    enabled: enabled && canView,
  });
}

export function useCreateRate() {
  const qc = useQueryClient();
  return useAuthorizedMutation("timesheets:rates:manage", {
    mutationKey: ["timesheets", "rates", "create"],
    mutationFn: (data: CreateRateInput) => apiClient.post<TimesheetRate>("/timesheets/rates", data, undefined, rateC),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.timesheets.rates() });
      toast.success("Rate added");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useUpdateRate() {
  const qc = useQueryClient();
  return useAuthorizedMutation("timesheets:rates:manage", {
    mutationKey: ["timesheets", "rates", "update"],
    mutationFn: ({ rateId, data }: { rateId: number; data: Partial<CreateRateInput> }) =>
      apiClient.patch<TimesheetRate>(`/timesheets/rates/${rateId}`, data, undefined, rateC),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.timesheets.rates() });
      toast.success("Rate updated");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useDeleteRate() {
  const qc = useQueryClient();
  return useAuthorizedMutation("timesheets:rates:manage", {
    mutationKey: ["timesheets", "rates", "delete"],
    mutationFn: (rateId: number) =>
      apiClient.delete<{ success: boolean }>(`/timesheets/rates/${rateId}`, undefined, undefined, undefined),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.timesheets.rates() });
      toast.success("Rate removed");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
