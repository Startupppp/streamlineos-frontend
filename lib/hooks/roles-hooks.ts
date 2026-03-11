import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { vaivammTrpcClient } from "../trpc";
import { vaivammKeys } from "./trpc-keys";
import type { RolesRouterOutputs, RolesRouterInputs } from "./trpc-keys";

export const useRolesList = (
  options?: Partial<UseQueryOptions<RolesRouterOutputs["list"], Error>>
) => {
  return useQuery<RolesRouterOutputs["list"], Error>({
    queryKey: vaivammKeys.roles.list(),
    queryFn: () => vaivammTrpcClient.roles.list.query(),
    ...options,
  });
};

export const useRoleById = (
  id: number,
  options?: Partial<UseQueryOptions<RolesRouterOutputs["getById"], Error>>
) => {
  return useQuery<RolesRouterOutputs["getById"], Error>({
    queryKey: vaivammKeys.roles.detail(id),
    queryFn: () => vaivammTrpcClient.roles.getById.query({ id }),
    enabled: id > 0,
    ...options,
  });
};

export const useCreateRole = () => {
  const queryClient = useQueryClient();
  return useMutation<
    RolesRouterOutputs["create"],
    Error,
    RolesRouterInputs["create"]
  >({
    mutationFn: (input) => vaivammTrpcClient.roles.create.mutate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vaivammKeys.roles.all });
    },
  });
};

export const useUpdateRole = () => {
  const queryClient = useQueryClient();
  return useMutation<
    RolesRouterOutputs["update"],
    Error,
    RolesRouterInputs["update"]
  >({
    mutationFn: (input) => vaivammTrpcClient.roles.update.mutate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vaivammKeys.roles.all });
    },
  });
};

export const useDeleteRole = () => {
  const queryClient = useQueryClient();
  return useMutation<
    RolesRouterOutputs["delete"],
    Error,
    RolesRouterInputs["delete"]
  >({
    mutationFn: (input) => vaivammTrpcClient.roles.delete.mutate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vaivammKeys.roles.all });
    },
  });
};
