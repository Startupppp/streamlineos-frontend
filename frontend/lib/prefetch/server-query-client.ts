import "server-only";

import { QueryClient } from "@tanstack/react-query";
import { getServerAuth } from "@/lib/get-server-auth";
import {
  UNAUTHENTICATED_SCOPE,
  authenticatedScope,
  scopedQueryKeyHashFn,
} from "@/lib/query-scope";

export async function createServerQueryClient(): Promise<QueryClient> {
  const session = await getServerAuth();
  const scope = session
    ? authenticatedScope(session.orgId, session.user?.id)
    : UNAUTHENTICATED_SCOPE;

  return new QueryClient({
    defaultOptions: { queries: { queryKeyHashFn: scopedQueryKeyHashFn(scope) } },
  });
}
