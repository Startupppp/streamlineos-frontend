import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { vaivammTrpcClient } from "../trpc";
import { vaivammKeys } from "./trpc-keys";
import type { NotificationsRouterOutputs } from "./trpc-keys";

export function useNotifications(
  options?: Partial<UseQueryOptions<NotificationsRouterOutputs["getAll"]>>
) {
  return useQuery<NotificationsRouterOutputs["getAll"]>({
    queryKey: vaivammKeys.notifications.list(),
    queryFn: () => vaivammTrpcClient.notifications.getAll.query(),
    ...options,
  });
}

export function useUnreadNotificationCount(
  options?: Partial<UseQueryOptions<number>>
) {
  return useQuery<number>({
    queryKey: vaivammKeys.notifications.unreadCount(),
    queryFn: () => vaivammTrpcClient.notifications.getUnreadCount.query(),
    ...options,
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      vaivammTrpcClient.notifications.markAsRead.mutate({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vaivammKeys.notifications.all });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      vaivammTrpcClient.notifications.markAllAsRead.mutate(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vaivammKeys.notifications.all });
    },
  });
}
