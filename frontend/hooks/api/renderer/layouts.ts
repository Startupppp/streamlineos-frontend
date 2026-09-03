"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { LayoutAdjustment } from "@/lib/renderer/layout-adjustment";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

/**
 * Where a tenant's arrangement of a record type lives.
 *
 * On the server, and only there. An arrangement made by an administrator has to
 * reach every colleague on every device, which rules out browser storage: a
 * layout kept in `localStorage` is not per tenant at all, it is per browser, and
 * calling that "a tenant can adjust their layout" would be dressing one thing as
 * another. It would also pass an isolation test for the wrong reason — two
 * tenants never collide if nothing is ever shared.
 *
 * The endpoints below do not exist yet. They are written out rather than
 * substituted for, because the substitute is what would ship.
 *
 *   GET    /renderer/layouts/:layoutKey        -> LayoutAdjustment | null
 *   PUT    /renderer/layouts/:layoutKey        <- LayoutAdjustmentInput
 *   DELETE /renderer/layouts/:layoutKey
 *   GET    /renderer/layouts/:layoutKey/usage  -> LayoutUsage
 *
 * All four are scoped to the caller's organisation by the same tenant guard
 * every other CRM route uses; `layoutKey` is never a global address.
 */

/** What a tenant may send. The server owns `updatedAt`, so it is not accepted. */
export interface LayoutAdjustmentInput {
  readonly order?: readonly string[];
  readonly hidden?: readonly string[];
  readonly groups?: readonly { readonly title: string; readonly fields: readonly string[] }[];
}

/**
 * How often each field of a record type carries a value, across the tenant's own
 * records.
 *
 * Counted on the server because that is where the records are. A proposal built
 * from the fifty rows a list happens to have loaded would be a proposal about
 * page one.
 */
export interface LayoutUsage {
  readonly sample: number;
  readonly filled: Record<string, number>;
}

/** The tenant this browser is acting for; "" until the session resolves. */
export function useLayoutTenant(): string {
  const { data: session } = useSession();
  return session?.orgId ?? "";
}

export function useLayoutAdjustment(layoutKey: string) {
  const orgId = useLayoutTenant();

  return useQuery({
    queryKey: queryKeys.recordLayouts.adjustment(orgId, layoutKey),
    queryFn: ({ signal }) =>
      apiClient.get<LayoutAdjustment | null>(
        `/renderer/layouts/${encodeURIComponent(layoutKey)}`, undefined, signal,
      ),
    // An arrangement changes when an administrator edits it, which is rare, and
    // every record surface in the product reads it.
    staleTime: 30 * 60_000,
    /*
      One attempt. Every list, detail view and form in the CRM reads this, and a
      tenant that has never arranged anything is the common case — retrying a
      failure three times per surface would spend a page load on a question
      whose answer changes nothing. `useTenantLayout` renders the declared
      description when the read fails, which is the right screen either way.
    */
    retry: false,
    enabled: !!orgId && !!layoutKey,
  });
}

/**
 * Reading an arrangement is not privileged; writing one is.
 *
 * An arrangement carries no record data — only field names the description
 * already publishes — so every user needs to read their tenant's in order to
 * render anything at all. Rearranging it is administration, and is gated.
 *
 * `settings:manage` is the key in force because it is the one that exists in
 * both catalogues today. A dedicated `settings:record-layouts:manage` is the
 * right key and needs adding on the backend first; the catalogue-sync test
 * fails a frontend-only key, and rightly.
 */
export function useCanAdjustLayouts(): boolean {
  return useCan("settings:manage");
}

export function useSaveLayoutAdjustment(layoutKey: string) {
  const queryClient = useQueryClient();
  const orgId = useLayoutTenant();

  return useAuthorizedMutation("settings:record-layouts:manage", {
    mutationKey: ["recordLayouts", "save", layoutKey] as const,
    mutationFn: (input: LayoutAdjustmentInput) =>
      apiClient.put<LayoutAdjustment>(
        `/renderer/layouts/${encodeURIComponent(layoutKey)}`,
        input,
      ),
    onSuccess: (saved) => {
      queryClient.setQueryData(
        queryKeys.recordLayouts.adjustment(orgId, layoutKey),
        saved,
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.recordLayouts.all });
    },
  });
}

export function useResetLayoutAdjustment(layoutKey: string) {
  const queryClient = useQueryClient();
  const orgId = useLayoutTenant();

  return useAuthorizedMutation("settings:record-layouts:manage", {
    mutationKey: ["recordLayouts", "reset", layoutKey] as const,
    mutationFn: () =>
      apiClient.delete<null>(`/renderer/layouts/${encodeURIComponent(layoutKey)}`),
    onSuccess: () => {
      queryClient.setQueryData(
        queryKeys.recordLayouts.adjustment(orgId, layoutKey),
        null,
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.recordLayouts.all });
    },
  });
}

export function useLayoutUsage(layoutKey: string, options?: { enabled?: boolean }) {
  const orgId = useLayoutTenant();
  const canReadUsage = useCan("settings:record-layouts:manage");

  return useQuery({
    queryKey: queryKeys.recordLayouts.usage(orgId, layoutKey),
    queryFn: ({ signal }) =>
      apiClient.get<LayoutUsage>(
        `/renderer/layouts/${encodeURIComponent(layoutKey)}/usage`, undefined, signal,
      ),
    staleTime: 10 * 60_000,
    enabled: !!orgId && !!layoutKey && canReadUsage && (options?.enabled ?? true),
  });
}
