import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { vaivammTrpcClient } from "../trpc";
import { vaivammKeys } from "./trpc-keys";
import type { TargetsRouterOutputs } from "./trpc-keys";

export function useTargets(
  input?: { userId?: string; period?: string },
  options?: Partial<UseQueryOptions<TargetsRouterOutputs["getAll"]>>
) {
  return useQuery<TargetsRouterOutputs["getAll"]>({
    queryKey: vaivammKeys.targets.list(input?.userId),
    queryFn: () => vaivammTrpcClient.targets.getAll.query(input as any),
    ...options,
  });
}

export function useMyTargets(
  options?: Partial<UseQueryOptions<TargetsRouterOutputs["getMyTargets"]>>
) {
  return useQuery<TargetsRouterOutputs["getMyTargets"]>({
    queryKey: vaivammKeys.targets.myTargets(),
    queryFn: () => vaivammTrpcClient.targets.getMyTargets.query(),
    ...options,
  });
}

export function useTargetLeaderboard(
  metricType?: string,
  options?: Partial<UseQueryOptions<TargetsRouterOutputs["getLeaderboard"]>>
) {
  return useQuery<TargetsRouterOutputs["getLeaderboard"]>({
    queryKey: vaivammKeys.targets.leaderboard(metricType),
    queryFn: () => vaivammTrpcClient.targets.getLeaderboard.query(metricType ? { metricType } : undefined),
    ...options,
  });
}

export function useCreateTarget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof vaivammTrpcClient.targets.create.mutate>[0]) =>
      vaivammTrpcClient.targets.create.mutate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vaivammKeys.targets.all });
    },
  });
}

export function useUpdateTarget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof vaivammTrpcClient.targets.update.mutate>[0]) =>
      vaivammTrpcClient.targets.update.mutate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vaivammKeys.targets.all });
    },
  });
}

export function useDeleteTarget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof vaivammTrpcClient.targets.delete.mutate>[0]) =>
      vaivammTrpcClient.targets.delete.mutate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vaivammKeys.targets.all });
    },
  });
}
