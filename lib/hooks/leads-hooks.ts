import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { vaivammTrpcClient } from "../trpc";
import { vaivammKeys } from "./trpc-keys";
import type { LeadsRouterOutputs } from "./trpc-keys";

export function useLeads(
  input?: { status?: string; assignedToId?: string; search?: string },
  options?: Partial<UseQueryOptions<LeadsRouterOutputs["getAll"]>>
) {
  return useQuery<LeadsRouterOutputs["getAll"]>({
    queryKey: vaivammKeys.leads.list(input?.status, input?.assignedToId),
    queryFn: () => vaivammTrpcClient.leads.getAll.query(input as any),
    ...options,
  });
}

export function useLeadDetail(
  id: number,
  options?: Partial<UseQueryOptions<LeadsRouterOutputs["getById"]>>
) {
  return useQuery<LeadsRouterOutputs["getById"]>({
    queryKey: vaivammKeys.leads.detail(id),
    queryFn: () => vaivammTrpcClient.leads.getById.query({ id }),
    enabled: id > 0,
    ...options,
  });
}

export function useLeadBoard(
  options?: Partial<UseQueryOptions<LeadsRouterOutputs["getBoard"]>>
) {
  return useQuery<LeadsRouterOutputs["getBoard"]>({
    queryKey: vaivammKeys.leads.board(),
    queryFn: () => vaivammTrpcClient.leads.getBoard.query(),
    ...options,
  });
}

export function useLeadStats(
  options?: Partial<UseQueryOptions<LeadsRouterOutputs["getStats"]>>
) {
  return useQuery<LeadsRouterOutputs["getStats"]>({
    queryKey: vaivammKeys.leads.stats(),
    queryFn: () => vaivammTrpcClient.leads.getStats.query(),
    ...options,
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof vaivammTrpcClient.leads.create.mutate>[0]) =>
      vaivammTrpcClient.leads.create.mutate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vaivammKeys.leads.all });
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof vaivammTrpcClient.leads.update.mutate>[0]) =>
      vaivammTrpcClient.leads.update.mutate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vaivammKeys.leads.all });
    },
  });
}

export function useAssignLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof vaivammTrpcClient.leads.assign.mutate>[0]) =>
      vaivammTrpcClient.leads.assign.mutate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vaivammKeys.leads.all });
    },
  });
}

export function useSelfAssignLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof vaivammTrpcClient.leads.selfAssign.mutate>[0]) =>
      vaivammTrpcClient.leads.selfAssign.mutate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vaivammKeys.leads.all });
    },
  });
}

export function useUpdateLeadStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof vaivammTrpcClient.leads.updateStatus.mutate>[0]) =>
      vaivammTrpcClient.leads.updateStatus.mutate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vaivammKeys.leads.all });
    },
  });
}

export function useLogLeadActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof vaivammTrpcClient.leads.logActivity.mutate>[0]) =>
      vaivammTrpcClient.leads.logActivity.mutate(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: vaivammKeys.leads.activities(variables.leadId) });
      queryClient.invalidateQueries({ queryKey: vaivammKeys.leads.detail(variables.leadId) });
    },
  });
}

export function useSalesLeaderboard(
  options?: Partial<UseQueryOptions<LeadsRouterOutputs["getSalesLeaderboard"]>>
) {
  return useQuery<LeadsRouterOutputs["getSalesLeaderboard"]>({
    queryKey: [...vaivammKeys.leads.all, "salesLeaderboard"],
    queryFn: () => vaivammTrpcClient.leads.getSalesLeaderboard.query(),
    ...options,
  });
}

export function useLeadDashboardMetrics(
  options?: Partial<UseQueryOptions<LeadsRouterOutputs["getDashboardMetrics"]>>
) {
  return useQuery<LeadsRouterOutputs["getDashboardMetrics"]>({
    queryKey: [...vaivammKeys.leads.all, "dashboardMetrics"],
    queryFn: () => vaivammTrpcClient.leads.getDashboardMetrics.query(),
    ...options,
  });
}
