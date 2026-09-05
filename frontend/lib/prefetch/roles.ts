import "server-only";

import { dehydrate } from "@tanstack/react-query";
import { createServerQueryClient } from "./server-query-client";
import { accessAndCrmQueryKeys } from "@/lib/query-keys/access-and-crm";
import { serverGet } from "@/lib/server-fetch";
import { rolesPageContract } from "@/hooks/api/roles-schema";

export async function prefetchRoles() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    queryKey: accessAndCrmQueryKeys.roles.list({ limit: 20 }),
    queryFn: () => serverGet("/roles?limit=20", rolesPageContract),
    staleTime: 60_000,
  });
  return dehydrate(queryClient);
}
