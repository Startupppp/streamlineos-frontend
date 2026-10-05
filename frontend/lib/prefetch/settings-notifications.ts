import "server-only";

import { dehydrate } from "@tanstack/react-query";
import { createServerQueryClient } from "./server-query-client";
import { resolvePrefetchGate } from "./prefetch-gate";
import { serverGet } from "@/lib/server-fetch";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import {
  broadcastListContract,
  notificationEventsListContract,
  notificationPoliciesListContract,
  notificationPreferenceContract,
  notificationProvidersListContract,
  notificationTemplatesListContract,
  suppressionsListContract,
} from "@/hooks/api/notifications-schema";

export async function prefetchNotificationBroadcasts() {
  const queryClient = await createServerQueryClient();
  const gate = await resolvePrefetchGate();
  if (gate.can("notifications:broadcasts:view"))
    await queryClient.prefetchQuery({
      queryKey: platformCoreQueryKeys.notifications.broadcasts(),
      queryFn: () => serverGet("/broadcasts", broadcastListContract),
      staleTime: 60_000,
    });
  return dehydrate(queryClient);
}

export async function prefetchNotificationEvents() {
  const queryClient = await createServerQueryClient();
  const gate = await resolvePrefetchGate();
  if (gate.can("notifications:events:view"))
    await queryClient.prefetchQuery({
      queryKey: platformCoreQueryKeys.notifications.events(),
      queryFn: () => serverGet("/notifications/admin/events", notificationEventsListContract),
      staleTime: 60_000,
    });
  return dehydrate(queryClient);
}

export async function prefetchNotificationPolicy() {
  const queryClient = await createServerQueryClient();
  const gate = await resolvePrefetchGate();
  if (gate.can("notifications:policy:view"))
    await queryClient.prefetchQuery({
      queryKey: platformCoreQueryKeys.notifications.policy(),
      queryFn: () => serverGet("/notifications/admin/policy", notificationPoliciesListContract),
      staleTime: 60_000,
    });
  return dehydrate(queryClient);
}

export async function prefetchNotificationProviders() {
  const queryClient = await createServerQueryClient();
  const gate = await resolvePrefetchGate();
  if (gate.can("notifications:providers:view"))
    await queryClient.prefetchQuery({
      queryKey: platformCoreQueryKeys.notifications.providers(),
      queryFn: () =>
        serverGet("/notifications/admin/providers", notificationProvidersListContract),
      staleTime: 60_000,
    });
  return dehydrate(queryClient);
}

export async function prefetchNotificationTemplates() {
  const queryClient = await createServerQueryClient();
  const gate = await resolvePrefetchGate();
  if (gate.can("notifications:templates:view"))
    await queryClient.prefetchQuery({
      queryKey: platformCoreQueryKeys.notifications.templates(),
      queryFn: async () =>
        (await serverGet("/notification-templates", notificationTemplatesListContract)).items,
      staleTime: 60_000,
    });
  return dehydrate(queryClient);
}

export async function prefetchMyNotificationPreferences() {
  const queryClient = await createServerQueryClient();
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: platformCoreQueryKeys.notifications.preferences(),
      queryFn: () => serverGet("/notification-preferences", notificationPreferenceContract),
      staleTime: 5 * 60_000,
    }),
    queryClient.prefetchQuery({
      queryKey: platformCoreQueryKeys.notifications.suppressions(),
      queryFn: () =>
        serverGet("/notification-preferences/suppressions", suppressionsListContract),
      staleTime: 60_000,
    }),
  ]);
  return dehydrate(queryClient);
}
