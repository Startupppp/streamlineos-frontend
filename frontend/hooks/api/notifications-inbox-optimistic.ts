"use client";

import { useMutation, type MutateOptions } from "@tanstack/react-query";
import type { RequestConfig } from "@/lib/api-client";
import { ApiError } from "@/lib/api-envelope";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import {
  useNotificationInboxInvalidation, type NotificationMutationOwner,
} from "./notifications-shared";
import {
  applyNotificationCacheChange, settleNotificationCacheChange,
  type NotificationCacheChange, type NotificationFieldReceipt,
} from "./notifications-inbox-cache";

export type NotificationAck = { success: boolean };
export type NotifMutationContext = {
  owner: NotificationMutationOwner;
  receipts: NotificationFieldReceipt[];
};
type OwnedCommand<TVars> = { vars: TVars; owner: NotificationMutationOwner | null; spec: NotificationRowPatchSpec<TVars> };
type NotificationRowPatchSpec<TVars> = {
  mutationKey: string[];
  request: (vars: TVars, config: RequestConfig) => Promise<NotificationAck>;
  patch?: (vars: TVars) => NotificationCacheChange;
};
function requireOwner(owner: NotificationMutationOwner | null): NotificationMutationOwner {
  if (!owner?.isCurrent()) throw new ApiError(
    "Your signed-in account changed. Retry from the current account.",
    undefined, "REQUEST_IDENTITY_CHANGED",
  );
  return owner;
}
export function useNotificationRowPatch<TVars>(spec: NotificationRowPatchSpec<TVars>) {
  const { captureOwner, invalidateInbox } = useNotificationInboxInvalidation();
  const mutation = useMutation<NotificationAck, Error, OwnedCommand<TVars>, NotifMutationContext>({
    mutationKey: spec.mutationKey,
    mutationFn: async (command) => {
      const owner = requireOwner(command.owner);
      const response = await command.spec.request(command.vars, {
        signal: owner.signal, expectedIdentity: owner.identity,
      });
      requireOwner(owner);
      return response;
    },
    onMutate: async (command) => {
      const owner = requireOwner(command.owner);
      if (command.spec.patch) await Promise.all([
        owner.queryClient.cancelQueries({ queryKey: platformCoreQueryKeys.notifications.lists() }),
        owner.queryClient.cancelQueries({ queryKey: platformCoreQueryKeys.notifications.unreadCount() }),
        owner.queryClient.cancelQueries({ queryKey: platformCoreQueryKeys.inbox.all }),
      ]);
      requireOwner(owner);
      return {
        owner, receipts: command.spec.patch ? applyNotificationCacheChange(owner.queryClient, command.spec.patch(command.vars),
          JSON.stringify([owner.identity.orgId, owner.identity.userId, owner.identity.sessionId])) : [],
      };
    },
    onSettled: (_data, error, _command, context) => {
      if (!context) return;
      settleNotificationCacheChange(context.owner.queryClient, context.receipts, error !== null, context.owner.isCurrent());
      if (context.owner.isCurrent()) invalidateInbox();
    },
  });
  function guardOptions(options?: MutateOptions<NotificationAck, Error, TVars, NotifMutationContext>) {
    if (!options) return undefined;
    const guarded: MutateOptions<NotificationAck, Error, OwnedCommand<TVars>, NotifMutationContext> = {
      onSuccess: (data, command, context, execution) => {
        if (command.owner?.isCurrent()) options.onSuccess?.(data, command.vars, context, execution);
      },
      onError: (error, command, context, execution) => {
        if (command.owner?.isCurrent()) options.onError?.(error, command.vars, context, execution);
      },
      onSettled: (data, error, command, context, execution) => {
        if (command.owner?.isCurrent()) options.onSettled?.(data, error, command.vars, context, execution);
      },
    };
    return guarded;
  }
  function mutate(vars: TVars, options?: MutateOptions<NotificationAck, Error, TVars, NotifMutationContext>) {
    mutation.mutate({ vars, owner: captureOwner(), spec }, guardOptions(options));
  }
  function mutateAsync(vars: TVars, options?: MutateOptions<NotificationAck, Error, TVars, NotifMutationContext>) {
    return mutation.mutateAsync({ vars, owner: captureOwner(), spec }, guardOptions(options));
  }
  return { ...mutation, variables: mutation.variables?.vars, mutate, mutateAsync };
}
