import "server-only";

import { dehydrate } from "@tanstack/react-query";
import { createServerQueryClient } from "./server-query-client";
import { serverGet } from "@/lib/server-fetch";
import { accessAndCrmQueryKeys } from "@/lib/query-keys/access-and-crm";
import { supportAndWorkflowsQueryKeys } from "@/lib/query-keys/support-and-workflows";
import { sessionListContract } from "@/hooks/api/hr/sessions-schema";
import { meLoginHistoryContract, mfaStatusContract } from "@/hooks/api/auth-schema";
import { ACCOUNT_LOGIN_HISTORY_PARAMS } from "@/lib/settings-initial-reads";

export async function prefetchAccountSettings() {
  const queryClient = await createServerQueryClient();
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: accessAndCrmQueryKeys.sessions.list(),
      queryFn: () => serverGet("/sessions", sessionListContract),
      staleTime: 30 * 1000,
    }),
    queryClient.prefetchQuery({
      queryKey: supportAndWorkflowsQueryKeys.auth.loginHistory(
        ACCOUNT_LOGIN_HISTORY_PARAMS,
      ),
      queryFn: () =>
        serverGet(
          `/me/login-history?page=${ACCOUNT_LOGIN_HISTORY_PARAMS.page}&limit=${ACCOUNT_LOGIN_HISTORY_PARAMS.limit}`,
          meLoginHistoryContract,
        ),
      staleTime: 30_000,
    }),
    queryClient.prefetchQuery({
      queryKey: supportAndWorkflowsQueryKeys.mfa.status(),
      queryFn: () => serverGet("/auth/mfa/status", mfaStatusContract),
      staleTime: 2 * 60_000,
    }),
  ]);
  return dehydrate(queryClient);
}
