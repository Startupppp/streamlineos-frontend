import "server-only";

import { dehydrate } from "@tanstack/react-query";
import { createServerQueryClient } from "./server-query-client";
import { queryKeys } from "@/lib/query-keys";
import { serverGet } from "@/lib/server-fetch";
import { rolesPageContract } from "@/hooks/api/roles-schema";

export async function prefetchRoles() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.roles.list({ limit: 20 }),
    queryFn: () => serverGet("/roles?limit=20", rolesPageContract),
    staleTime: 60_000,
  });
  return dehydrate(queryClient);
}
