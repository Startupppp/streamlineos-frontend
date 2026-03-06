import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  UseQueryOptions,
  UseMutationOptions,
} from "@tanstack/react-query";
import { vaivammTrpcClient } from "../trpc";
import { vaivammKeys } from "./trpc-keys";
import type { MutationOnSuccess, RbacRouterOutputs, RbacRouterInputs } from "./trpc-keys";

export const useRbacUserPermissions = (
  options?: Omit<
    UseQueryOptions<RbacRouterOutputs["getUserPermissions"], Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<RbacRouterOutputs["getUserPermissions"], Error>({
    queryKey: vaivammKeys.rbac.userPermissions(),
    queryFn: () => vaivammTrpcClient.rbac.getUserPermissions.query(),
    ...options,
  });
};

export const useRbacAllPermissions = (
  options?: Omit<
    UseQueryOptions<RbacRouterOutputs["getAllPermissions"], Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<RbacRouterOutputs["getAllPermissions"], Error>({
    queryKey: vaivammKeys.rbac.allPermissions(),
    queryFn: () => vaivammTrpcClient.rbac.getAllPermissions.query(),
    ...options,
  });
};

export const useRbacCheckPermission = (
  permission: string,
  options?: Omit<
    UseQueryOptions<RbacRouterOutputs["checkPermission"], Error>,
    "queryKey" | "queryFn" | "enabled"
  >
) => {
  return useQuery<RbacRouterOutputs["checkPermission"], Error>({
    queryKey: [...vaivammKeys.rbac.all, "checkPermission", { permission }],
    queryFn: () => vaivammTrpcClient.rbac.checkPermission.query({ permission }),
    enabled: !!permission,
    ...options,
  });
};

export const useRbacRolePermissions = (
  role: "OWNER" | "ADMIN" | "MEMBER",
  options?: Omit<
    UseQueryOptions<RbacRouterOutputs["getRolePermissions"], Error>,
    "queryKey" | "queryFn" | "enabled"
  >
) => {
  return useQuery<RbacRouterOutputs["getRolePermissions"], Error>({
    queryKey: vaivammKeys.rbac.rolePermissions(role),
    queryFn: () => vaivammTrpcClient.rbac.getRolePermissions.query({ role }),
    enabled: !!role,
    ...options,
  });
};

export const useRbacAssignRolePermission = (
  options?: UseMutationOptions<
    RbacRouterOutputs["assignRolePermission"],
    Error,
    RbacRouterInputs["assignRolePermission"],
    unknown
  >
) => {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess as
    | MutationOnSuccess<
        RbacRouterOutputs["assignRolePermission"],
        RbacRouterInputs["assignRolePermission"],
        unknown
      >
    | undefined;

  return useMutation<
    RbacRouterOutputs["assignRolePermission"],
    Error,
    RbacRouterInputs["assignRolePermission"],
    unknown
  >({
    mutationFn: (variables) =>
      vaivammTrpcClient.rbac.assignRolePermission.mutate(variables),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: vaivammKeys.rbac.rolePermissions(variables.role),
      });
      if (userOnSuccess) userOnSuccess(data, variables, context);
    },
  });
};

export const useRbacAssignUserPermission = (
  options?: UseMutationOptions<
    RbacRouterOutputs["assignUserPermission"],
    Error,
    RbacRouterInputs["assignUserPermission"],
    unknown
  >
) => {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess as
    | MutationOnSuccess<
        RbacRouterOutputs["assignUserPermission"],
        RbacRouterInputs["assignUserPermission"],
        unknown
      >
    | undefined;

  return useMutation<
    RbacRouterOutputs["assignUserPermission"],
    Error,
    RbacRouterInputs["assignUserPermission"],
    unknown
  >({
    mutationFn: (variables) =>
      vaivammTrpcClient.rbac.assignUserPermission.mutate(variables),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: vaivammKeys.rbac.userPermissions(),
      });
      if (userOnSuccess) userOnSuccess(data, variables, context);
    },
  });
};
