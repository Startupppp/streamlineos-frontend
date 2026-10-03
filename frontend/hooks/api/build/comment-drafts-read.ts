"use client";

import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, isImpersonating } from "@/lib/api-client";
import { ApiError, lazyContract, parseApiResponse } from "@/lib/api-envelope";
import { expectedRequestIdentitySchema } from "@/lib/api-request-identity";
import { useOrgStorageScope } from "@/lib/org-scoped-storage";
import { authenticatedScope } from "@/lib/query-scope";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCan } from "@/hooks/api/access";
import type { TicketCommentDraft } from "./comment-drafts-schema";

const commentDraftByTicketContract = lazyContract(() =>
  import("@/hooks/api/build/comment-drafts-schema").then((m) => m.commentDraftByTicketContract),
);

function subscribeImpersonation(change: () => void) {
  window.addEventListener("impersonation-change", change);
  return () => window.removeEventListener("impersonation-change", change);
}

export function useCommentDraftOwner() {
  const { data: session, status } = useSession();
  const scope = useOrgStorageScope();
  const impersonating = useSyncExternalStore(subscribeImpersonation, isImpersonating, () => false);
  const identity = expectedRequestIdentitySchema.safeParse({ userId: session?.user?.id, orgId: session?.orgId, sessionId: session?.sessionId });
  return status === "authenticated" && identity.success && !impersonating && scope === authenticatedScope(identity.data.orgId, identity.data.userId)
    ? { scope, identity: identity.data, key: `${scope}:${identity.data.sessionId}` } : null;
}

export function useTicketCommentDraft(ticketId: number, editable: boolean) {
  const owner = useCommentDraftOwner();
  const canView = useCan("build:tickets:view");
  const active = editable && canView && Number.isSafeInteger(ticketId) && ticketId > 0 && ticketId <= 2147483647 ? owner : null;
  const current = useRef({ owner: active, ticketId });
  useLayoutEffect(() => { current.current = { owner: active, ticketId }; }, [active, ticketId]);
  const qc = useQueryClient();
  const previousOwner = useRef(active?.key);
  const query = useQuery({
    queryKey: buildWorkQueryKeys.projects.commentDrafts.byTicket(ticketId),
    queryFn: async ({ signal }) => {
      const valid = () => !signal.aborted && !isImpersonating() && active !== null && current.current.owner?.key === active.key && current.current.ticketId === ticketId;
      if (!active || !valid()) throw new ApiError("Your signed-in account changed.", undefined, "REQUEST_IDENTITY_CHANGED");
      const path = `/build/comment-drafts/tickets/${ticketId}`;
      const response = await apiClient.request(path, { method: "GET" }, { signal, expectedIdentity: active.identity });
      const draft = await parseApiResponse<TicketCommentDraft>(response, await commentDraftByTicketContract(), path);
      if (!valid()) throw new ApiError("Your signed-in account changed.", undefined, "REQUEST_IDENTITY_CHANGED");
      if (draft && (draft.ticketId !== ticketId || draft.orgId !== active.identity.orgId)) throw new ApiError("The loaded draft did not match this ticket.", undefined, "INVALID_RESPONSE");
      return { draft, ownerKey: active.key };
    },
    enabled: active !== null, staleTime: 0, retry: false, refetchOnMount: "always", ...INLINE_READ_ERROR,
  });
  useEffect(() => {
    const prior = previousOwner.current;
    previousOwner.current = active?.key;
    if (!prior || prior === active?.key) return;
    const queryKey = buildWorkQueryKeys.projects.commentDrafts.byTicket(ticketId);
    void qc.cancelQueries({ queryKey, exact: true }).then(() => {
      if (current.current.owner) return qc.invalidateQueries({ queryKey, exact: true });
    });
  }, [active?.key, qc, ticketId]);
  return { ...query, owner: active, fresh: query.isSuccess && query.isFetchedAfterMount && !query.isFetching && query.data?.ownerKey === active?.key };
}
