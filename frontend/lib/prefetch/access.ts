import "server-only";

import { QueryClient, dehydrate } from "@tanstack/react-query";
import { getServerAuth } from "@/lib/get-server-auth";
import { serverGet } from "@/lib/server-fetch";
import { queryKeys } from "@/lib/query-keys";
import type { AccessResponse } from "@/types/access";

const ACCESS_STALE_TIME = 30_000;

export async function prefetchAccess() {
  const session = await getServerAuth();
  const orgId = session?.orgId;
  const userId = session?.user?.id;
  if (!orgId || !userId) return dehydrate(new QueryClient());

  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.access.me(orgId, userId),
    queryFn: () => serverGet<AccessResponse>("/me/access"),
    staleTime: ACCESS_STALE_TIME,
  });
  return dehydrate(queryClient);
}
