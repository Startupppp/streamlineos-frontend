"use client";

import { useInfiniteQuery, useQuery, useQueryClient, type MutateOptions } from "@tanstack/react-query";
import { useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useSession } from "next-auth/react";
import type { UnreadCount } from "@/types/notifications";
import { apiClient, isImpersonating, type RequestConfig } from "@/lib/api-client";
import { ApiError, lazyContract, parseApiResponse } from "@/lib/api-envelope";
import { expectedRequestIdentitySchema, type ExpectedRequestIdentity } from "@/lib/api-request-identity";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { useCan } from "@/hooks/api/access";
import type { Approval, ApprovalDetail, CreateApprovalInput, DecideApprovalInput, UpdateApprovalInput, DeleteApprovalInput } from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { PermissionKey } from "@/lib/rbac/permissions";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { NOTIFICATION_FALLBACK_INTERVAL_MS } from "@/lib/query-request-policies";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";

const approvalInboxPageContract = lazyContract(() => import("./approvals-schema").then((m) => m.approvalInboxPageContract));
const approvalPageContract = lazyContract(() => import("./approvals-schema").then((m) => m.approvalPageContract));
const approvalDetailContract = lazyContract(() => import("./approvals-schema").then((m) => m.approvalDetailContract));
const approvalCreateContract = lazyContract(() => import("./approvals-schema").then((m) => m.approvalCreateContract));
const approvalUpdateContract = lazyContract(() => import("./approvals-schema").then((m) => m.approvalUpdateContract));
const approvalDecideContract = lazyContract(() => import("./approvals-schema").then((m) => m.approvalDecideContract));
const noContentContract = lazyContract(() => import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract));
const notificationCountContract = lazyContract(() => import("@/hooks/api/notifications-schema").then((m) => m.notificationCountContract));
type ApprovalOwner = { identity: ExpectedRequestIdentity; signal: AbortSignal; isCurrent: () => boolean };
type ApprovalReceipt = { approval: ApprovalDetail; ownerStamp: string };
type ApprovalReadFailure = { error: unknown; ownerStamp: string };
type ApprovalTarget = { approvalId: number; projectId?: number };
interface ApprovalFilters { status?: string; entityType?: string; actorId?: string }
interface InboxFilters { status?: string; type?: string; q?: string; from?: string; to?: string }

function subscribeImpersonation(change: () => void) {
  window.addEventListener("impersonation-change", change);
  return () => window.removeEventListener("impersonation-change", change);
}
function requireOwner(owner: ApprovalOwner | null): ApprovalOwner {
  if (!owner?.isCurrent()) throw new ApiError("Your signed-in account changed. Retry from the current account.", undefined, "REQUEST_IDENTITY_CHANGED");
  return owner;
}
function useApprovalOwner() {
  const queryClient = useQueryClient();
  const { data: session, status } = useSession();
  const impersonating = useSyncExternalStore(subscribeImpersonation, isImpersonating, () => false);
  const current = useRef<ApprovalOwner | null>(null);
  const identity = useMemo(() => expectedRequestIdentitySchema.safeParse({
    orgId: session?.orgId, userId: session?.user?.id, sessionId: session?.sessionId,
  }), [session?.orgId, session?.user?.id, session?.sessionId]);
  const key = status === "authenticated" && identity.success && !impersonating
    ? JSON.stringify(identity.data) : null;
  useLayoutEffect(() => {
    if (!key || !identity.success) return;
    const controller = new AbortController();
    const owner: ApprovalOwner = { identity: identity.data, signal: controller.signal,
      isCurrent: () => current.current === owner && !controller.signal.aborted && !isImpersonating() };
    current.current = owner;
    return () => { current.current = null; controller.abort(); };
  }, [key, identity, queryClient]);
  function captureOwner() {
    const owner = current.current;
    return owner?.isCurrent() && key === JSON.stringify(owner.identity) ? owner : null;
  }
  return { captureOwner, queryClient };
}

export function useApprovalInbox(filters?: InboxFilters) {
  const canView = useCan("build:approvals:view");
  const activeFilters = filters && Object.values(filters).some(Boolean) ? filters : undefined;
  return useInfiniteQuery({
    queryKey: buildWorkQueryKeys.projects.approvals.inbox(activeFilters),
    queryFn: ({ pageParam, signal }) => {
      const params: Record<string, string> = {};
      if (pageParam !== undefined) params.cursor = pageParam;
      for (const [key, value] of Object.entries(activeFilters ?? {})) if (value) params[key] = value;
      return apiClient.get("/build/approvals/inbox", Object.keys(params).length ? params : undefined, signal, approvalInboxPageContract);
    },
    initialPageParam: NO_CURSOR_YET,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    enabled: canView, staleTime: 120_000, refetchInterval: 120_000, refetchIntervalInBackground: false,
  });
}
export function useBuildNotificationUnreadCount() {
  const canView = useCan("build:tickets:view");
  const query = useQuery<UnreadCount>({
    queryKey: platformCoreQueryKeys.notifications.unreadCount("build"),
    queryFn: ({ signal }) => apiClient.get<UnreadCount>("/notifications/unread-count", { sourceModule: "build" }, signal, notificationCountContract),
    enabled: canView, staleTime: NOTIFICATION_FALLBACK_INTERVAL_MS, refetchOnWindowFocus: false, ...INLINE_READ_ERROR,
  });
  return canView ? query : { ...query, data: undefined };
}
export function useProjectApprovals(projectId: number, filters?: ApprovalFilters) {
  const canView = useCan("build:approvals:view");
  const params: Record<string, string> = {};
  if (filters?.status) params.status = filters.status;
  if (filters?.entityType) params.entityType = filters.entityType;
  if (filters?.actorId) params.approverId = filters.actorId;
  return useInfiniteQuery({
    queryKey: buildWorkQueryKeys.projects.approvals.list(projectId, Object.keys(params).length ? params : undefined),
    queryFn: ({ pageParam, signal }) => apiClient.get(`/build/${projectId}/approvals`,
      pageParam !== undefined ? { ...params, cursor: pageParam } : params, signal, approvalPageContract),
    initialPageParam: NO_CURSOR_YET,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    enabled: canView && projectId > 0, staleTime: 60_000,
  });
}

export function useApproval(projectId: number, approvalId: number, enabled = true) {
  const canView = useCan("build:approvals:view");
  const { captureOwner, queryClient } = useApprovalOwner();
  const instanceId = useId();
  const sequence = useRef(0);
  const [lease, setLease] = useState<{ owner: ApprovalOwner; ownerStamp: string; projectId: number; approvalId: number } | null>(null);
  const queryKey = buildWorkQueryKeys.projects.approvals.detail(projectId, approvalId);
  useLayoutEffect(() => {
    const next = canView && enabled ? captureOwner() : null;
    if (next === lease?.owner && projectId === lease.projectId && approvalId === lease.approvalId) return;
    let live = true;
    const keys = [queryKey];
    if (lease) keys.push(buildWorkQueryKeys.projects.approvals.detail(lease.projectId, lease.approvalId));
    void Promise.all(keys.map((key) => queryClient.cancelQueries({ queryKey: key, exact: true }))).then(() => {
      if (live) setLease(next?.isCurrent() ? { owner: next, ownerStamp: instanceId + ":" + ++sequence.current, projectId, approvalId } : null);
    });
    return () => { live = false; };
  }, [captureOwner, lease, canView, enabled, projectId, approvalId, queryClient, instanceId, queryKey]);
  const active = canView && enabled && projectId > 0 && approvalId > 0 && lease?.projectId === projectId
    && lease.approvalId === approvalId && captureOwner() === lease.owner && lease.owner.isCurrent();
  const query = useQuery<ApprovalReceipt, ApprovalReadFailure>({
    queryKey,
    queryFn: async ({ signal }) => {
      if (!active || !lease) throw { ownerStamp: "", error: new ApiError("Approval access is unavailable.", 403) };
      const controller = new AbortController();
      function abort() { controller.abort(); }
      signal.addEventListener("abort", abort);
      lease.owner.signal.addEventListener("abort", abort);
      if (signal.aborted || lease.owner.signal.aborted) abort();
      try {
        requireOwner(lease.owner);
        const response = await apiClient.request(`/build/${projectId}/approvals/${approvalId}`, { method: "GET" }, {
          signal: controller.signal, expectedIdentity: lease.owner.identity,
        });
        requireOwner(lease.owner);
        const approval = await parseApiResponse<ApprovalDetail>(response, await approvalDetailContract(), "/build/approvals/detail");
        requireOwner(lease.owner);
        if (controller.signal.aborted) throw new ApiError("Request was cancelled.", undefined, "ABORTED");
        if (approval.id !== approvalId || approval.projectId !== projectId || approval.orgId !== lease.owner.identity.orgId)
          throw new ApiError("Approval response did not match the requested record.", undefined, "CONTRACT_VIOLATION");
        return { approval, ownerStamp: lease.ownerStamp };
      } catch (error: unknown) { throw { ownerStamp: lease.ownerStamp, error }; }
      finally { signal.removeEventListener("abort", abort); lease.owner.signal.removeEventListener("abort", abort); }
    },
    enabled: active, staleTime: 0, retry: false, refetchOnMount: "always", refetchOnWindowFocus: true,
    refetchOnReconnect: true, ...INLINE_READ_ERROR,
  });
  const receipt = active && query.data?.ownerStamp === lease.ownerStamp ? query.data : null;
  const error = active && query.error?.ownerStamp === lease.ownerStamp ? query.error.error : null;
  async function refetch() {
    const result = await query.refetch();
    const data = active && lease?.owner.isCurrent() && result.data?.ownerStamp === lease.ownerStamp ? result.data.approval : undefined;
    return { ...result, data, error: result.error?.error ?? null };
  }
  return { ...query, data: error ? undefined : receipt?.approval, error, ownerStamp: active ? lease.ownerStamp : null,
    isPending: !receipt && !error, refetch };
}

function useApprovalMutation<TInput, TData>(permission: PermissionKey, projectOf: (input: TInput) => number,
  request: (input: TInput, config: RequestConfig) => Promise<TData>) {
  const { captureOwner, queryClient } = useApprovalOwner();
  type Command = { input: TInput; owner: ApprovalOwner | null; projectId: number; request: typeof request };
  const mutation = useAuthorizedMutation<TData, Error, Command>(permission, {
    mutationKey: buildWorkQueryKeys.projects.approvals.inbox(),
    mutationFn: async (command) => {
      const owner = requireOwner(command.owner);
      const response = await command.request(command.input, { signal: owner.signal, expectedIdentity: owner.identity });
      requireOwner(owner);
      return response;
    },
    onSettled: (...settlement) => {
      const command = settlement[2];
      if (!command.owner?.isCurrent()) return;
      void queryClient.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.approvals.list(command.projectId) });
      void queryClient.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.approvals.inbox() });
      void queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.inbox.all });
      void queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.notifications.all });
    },
  });
  function guardOptions(options?: MutateOptions<TData, Error, TInput, unknown>): MutateOptions<TData, Error, Command, unknown> {
    return {
      onSuccess: (data, command, context, execution) => { if (command.owner?.isCurrent()) options?.onSuccess?.(data, command.input, context, execution); },
      onError: (error, command, context, execution) => { if (command.owner?.isCurrent()) options?.onError?.(error, command.input, context, execution); },
      onSettled: (data, error, command, context, execution) => { if (command.owner?.isCurrent()) options?.onSettled?.(data, error, command.input, context, execution); },
    };
  }
  function command(input: TInput): Command { return { input, owner: captureOwner(), projectId: projectOf(input), request }; }
  function mutate(input: TInput, options?: MutateOptions<TData, Error, TInput, unknown>) { mutation.mutate(command(input), guardOptions(options)); }
  function mutateAsync(input: TInput, options?: MutateOptions<TData, Error, TInput, unknown>) { return mutation.mutateAsync(command(input), guardOptions(options)); }
  return { ...mutation, variables: mutation.variables?.input, mutate, mutateAsync, captureOwner };
}

export function useCreateApproval(projectId: number) {
  return useApprovalMutation<CreateApprovalInput, Approval>("build:approvals:request", () => projectId,
    async (data, config) => apiClient.post<Approval>(`/build/${projectId}/approvals`,
      (await import("./approvals-schema")).createApprovalInputSchema.parse(data), config, approvalCreateContract));
}
export function useDecideApproval(projectId: number) {
  return useApprovalMutation<DecideApprovalInput & { approvalId: number }, Approval>("build:approvals:decide", () => projectId,
    async ({ approvalId, ...data }, config) =>
      apiClient.patch<Approval>(`/build/${projectId}/approvals/${approvalId}/decide`,
        (await import("./approvals-schema")).decideApprovalInputSchema.parse(data), config, approvalDecideContract));
}
export function useUpdateApproval(projectId?: number) {
  return useApprovalMutation("build:approvals:manage", (input: UpdateApprovalInput & ApprovalTarget) => projectId ?? input.projectId ?? 0,
    async ({ approvalId, projectId: targetProject, ...data }, config) =>
      apiClient.patch<Approval>(`/build/${projectId ?? targetProject ?? 0}/approvals/${approvalId}`,
        (await import("./approvals-schema")).updateApprovalInputSchema.parse(data), config, approvalUpdateContract));
}
export function useDeleteApproval(projectId: number) {
  return useApprovalMutation<DeleteApprovalInput & { approvalId: number }, void>("build:approvals:manage", () => projectId,
    async ({ approvalId, ...data }, config) =>
      apiClient.delete<void>(`/build/${projectId}/approvals/${approvalId}`,
        (await import("./approvals-schema")).deleteApprovalInputSchema.parse(data), config, noContentContract));
}
