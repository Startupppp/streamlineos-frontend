import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { vaivammTrpcClient } from "../trpc";
import { signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { RouterInputs, RouterOutputs } from "@/server/api/root";

type AuthRouterInputs = RouterInputs["auth"];
type AuthRouterOutputs = RouterOutputs["auth"];

type MutationOnSuccess<TData, TVariables, TContext> = (
  data: TData,
  variables: TVariables,
  context: TContext
) => void | Promise<void>;
export const useVerifyEmail = (
  options?: UseMutationOptions<
    AuthRouterOutputs["verifyEmail"],
    Error,
    AuthRouterInputs["verifyEmail"],
    unknown
  >
) => {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess as
    | MutationOnSuccess<
        AuthRouterOutputs["verifyEmail"],
        AuthRouterInputs["verifyEmail"],
        unknown
      >
    | undefined;

  return useMutation<
    AuthRouterOutputs["verifyEmail"],
    Error,
    AuthRouterInputs["verifyEmail"],
    unknown
  >({
    mutationFn: (variables) =>
      vaivammTrpcClient.auth.verifyEmail.mutate(variables) as Promise<
        AuthRouterOutputs["verifyEmail"]
      >,
    ...options,
    onSuccess: (data, variables, context) => {
      if (userOnSuccess) userOnSuccess(data, variables, context);
    },
  });
};
export const useForgotPassword = (
  options?: UseMutationOptions<
    AuthRouterOutputs["forgotPassword"],
    Error,
    AuthRouterInputs["forgotPassword"],
    unknown
  >
) => {
  const userOnSuccess = options?.onSuccess as
    | MutationOnSuccess<
        AuthRouterOutputs["forgotPassword"],
        AuthRouterInputs["forgotPassword"],
        unknown
      >
    | undefined;

  return useMutation<
    AuthRouterOutputs["forgotPassword"],
    Error,
    AuthRouterInputs["forgotPassword"],
    unknown
  >({
    mutationFn: (variables) =>
      vaivammTrpcClient.auth.forgotPassword.mutate(variables) as Promise<
        AuthRouterOutputs["forgotPassword"]
      >,
    ...options,
    onSuccess: (data, variables, context) => {
      if (userOnSuccess) userOnSuccess(data, variables, context);
    },
  });
};
export const useResetPassword = (
  options?: UseMutationOptions<
    AuthRouterOutputs["resetPassword"],
    Error,
    AuthRouterInputs["resetPassword"],
    unknown
  >
) => {
  const userOnSuccess = options?.onSuccess as
    | MutationOnSuccess<
        AuthRouterOutputs["resetPassword"],
        AuthRouterInputs["resetPassword"],
        unknown
      >
    | undefined;

  return useMutation<
    AuthRouterOutputs["resetPassword"],
    Error,
    AuthRouterInputs["resetPassword"],
    unknown
  >({
    mutationFn: (variables) =>
      vaivammTrpcClient.auth.resetPassword.mutate(variables) as Promise<
        AuthRouterOutputs["resetPassword"]
      >,
    ...options,
    onSuccess: (data, variables, context) => {
      if (userOnSuccess) userOnSuccess(data, variables, context);
    },
  });
};
export const useAcceptInvitation = (
  options?: UseMutationOptions<
    AuthRouterOutputs["acceptInvitation"],
    Error,
    AuthRouterInputs["acceptInvitation"],
    unknown
  >
) => {
  const router = useRouter();
  const userOnSuccess = options?.onSuccess as
    | MutationOnSuccess<
        AuthRouterOutputs["acceptInvitation"],
        AuthRouterInputs["acceptInvitation"],
        unknown
      >
    | undefined;

  return useMutation<
    AuthRouterOutputs["acceptInvitation"],
    Error,
    AuthRouterInputs["acceptInvitation"],
    unknown
  >({
    mutationFn: (variables) =>
      vaivammTrpcClient.auth.acceptInvitation.mutate(variables) as Promise<
        AuthRouterOutputs["acceptInvitation"]
      >,
    ...options,
    onSuccess: (data, variables, context) => {
      if (userOnSuccess) userOnSuccess(data, variables, context);
    },
  });
};
export const useResendVerificationEmail = (
  options?: UseMutationOptions<
    AuthRouterOutputs["resendVerificationEmail"],
    Error,
    AuthRouterInputs["resendVerificationEmail"],
    unknown
  >
) => {
  const userOnSuccess = options?.onSuccess as
    | MutationOnSuccess<
        AuthRouterOutputs["resendVerificationEmail"],
        AuthRouterInputs["resendVerificationEmail"],
        unknown
      >
    | undefined;

  return useMutation<
    AuthRouterOutputs["resendVerificationEmail"],
    Error,
    AuthRouterInputs["resendVerificationEmail"],
    unknown
  >({
    mutationFn: (variables) =>
      vaivammTrpcClient.auth.resendVerificationEmail.mutate(
        variables
      ) as Promise<AuthRouterOutputs["resendVerificationEmail"]>,
    ...options,
    onSuccess: (data, variables, context) => {
      if (userOnSuccess) userOnSuccess(data, variables, context);
    },
  });
};
export const useSignIn = () => {
  return useMutation({
    mutationFn: async (credentials: {
      email: string;
      password: string;
      callbackUrl?: string;
    }) => {
      const result = await signIn("credentials", {
        email: credentials.email,
        password: credentials.password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      return result;
    },
    onSuccess: (_, variables) => {
      const callbackUrl = variables.callbackUrl || "/dashboard";
      window.location.href = callbackUrl;
    },
  });
};
export const useSignOut = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: async () => {
      await signOut({ redirect: false });
    },
    onSuccess: () => {
      router.push("/signin");
      router.refresh();
    },
  });
};
type OrgRouterInputs = RouterInputs["organization"];
type OrgRouterOutputs = RouterOutputs["organization"];

export const useGetOrganizations = () => {
  return useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      return await vaivammTrpcClient.organization.getOrganizations.query();
    },
  });
};
export const useCreateOrganization = (
  options?: UseMutationOptions<
    OrgRouterOutputs["createOrganization"],
    Error,
    OrgRouterInputs["createOrganization"],
    unknown
  >
) => {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess as
    | MutationOnSuccess<
        OrgRouterOutputs["createOrganization"],
        OrgRouterInputs["createOrganization"],
        unknown
      >
    | undefined;

  return useMutation<
    OrgRouterOutputs["createOrganization"],
    Error,
    OrgRouterInputs["createOrganization"],
    unknown
  >({
    mutationFn: (variables) =>
      vaivammTrpcClient.organization.createOrganization.mutate(
        variables
      ) as Promise<OrgRouterOutputs["createOrganization"]>,
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      if (userOnSuccess) userOnSuccess(data, variables, context);
    },
  });
};
export const useInviteUser = (
  options?: UseMutationOptions<
    OrgRouterOutputs["inviteUser"],
    Error,
    OrgRouterInputs["inviteUser"],
    unknown
  >
) => {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess as
    | MutationOnSuccess<
        OrgRouterOutputs["inviteUser"],
        OrgRouterInputs["inviteUser"],
        unknown
      >
    | undefined;

  return useMutation<
    OrgRouterOutputs["inviteUser"],
    Error,
    OrgRouterInputs["inviteUser"],
    unknown
  >({
    mutationFn: (variables) =>
      vaivammTrpcClient.organization.inviteUser.mutate(variables) as Promise<
        OrgRouterOutputs["inviteUser"]
      >,
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: ["invitations", variables.orgId],
      });
      if (userOnSuccess) userOnSuccess(data, variables, context);
    },
  });
};
export const useGetInvitations = (orgId: string) => {
  return useQuery({
    queryKey: ["invitations", orgId],
    queryFn: async () => {
      return await vaivammTrpcClient.organization.getInvitations.query({
        orgId,
      });
    },
    enabled: !!orgId,
  });
};
export const useCancelInvitation = (
  options?: UseMutationOptions<
    OrgRouterOutputs["cancelInvitation"],
    Error,
    OrgRouterInputs["cancelInvitation"],
    unknown
  >
) => {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess as
    | MutationOnSuccess<
        OrgRouterOutputs["cancelInvitation"],
        OrgRouterInputs["cancelInvitation"],
        unknown
      >
    | undefined;

  return useMutation<
    OrgRouterOutputs["cancelInvitation"],
    Error,
    OrgRouterInputs["cancelInvitation"],
    unknown
  >({
    mutationFn: (variables) =>
      vaivammTrpcClient.organization.cancelInvitation.mutate(
        variables
      ) as Promise<OrgRouterOutputs["cancelInvitation"]>,
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: ["invitations", variables.orgId],
      });
      if (userOnSuccess) userOnSuccess(data, variables, context);
    },
  });
};
export const useUpdateMemberRole = (
  options?: UseMutationOptions<
    OrgRouterOutputs["updateMemberRole"],
    Error,
    OrgRouterInputs["updateMemberRole"],
    unknown
  >
) => {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess as
    | MutationOnSuccess<
        OrgRouterOutputs["updateMemberRole"],
        OrgRouterInputs["updateMemberRole"],
        unknown
      >
    | undefined;

  return useMutation<
    OrgRouterOutputs["updateMemberRole"],
    Error,
    OrgRouterInputs["updateMemberRole"],
    unknown
  >({
    mutationFn: (variables) =>
      vaivammTrpcClient.organization.updateMemberRole.mutate(
        variables
      ) as Promise<OrgRouterOutputs["updateMemberRole"]>,
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      if (userOnSuccess) userOnSuccess(data, variables, context);
    },
  });
};
export const useRemoveMember = (
  options?: UseMutationOptions<
    OrgRouterOutputs["removeMember"],
    Error,
    OrgRouterInputs["removeMember"],
    unknown
  >
) => {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess as
    | MutationOnSuccess<
        OrgRouterOutputs["removeMember"],
        OrgRouterInputs["removeMember"],
        unknown
      >
    | undefined;

  return useMutation<
    OrgRouterOutputs["removeMember"],
    Error,
    OrgRouterInputs["removeMember"],
    unknown
  >({
    mutationFn: (variables) =>
      vaivammTrpcClient.organization.removeMember.mutate(variables) as Promise<
        OrgRouterOutputs["removeMember"]
      >,
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      if (userOnSuccess) userOnSuccess(data, variables, context);
    },
  });
};
