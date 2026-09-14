import "server-only";

import { QueryClient, dehydrate } from "@tanstack/react-query";
import { getServerAuth } from "@/lib/get-server-auth";
import { createServerQueryClient } from "./server-query-client";
import { getServerAccessResult } from "@/lib/rbac/get-server-access";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";

const ACCESS_STALE_TIME = 5 * 60_000;

export async function prefetchAccess() {
  const session = await getServerAuth();
  const orgId = session?.orgId;
  const userId = session?.user?.id;
  if (!orgId || !userId) return dehydrate(new QueryClient());

  const result = await getServerAccessResult();
  if (!result.ok) return dehydrate(new QueryClient());

  const queryClient = await createServerQueryClient();
  await queryClient.fetchQuery({
    queryKey: platformCoreQueryKeys.access.me(),
    queryFn: () => result.access,
    staleTime: ACCESS_STALE_TIME,
  });
  return dehydrate(queryClient);
}
