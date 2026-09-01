import "server-only";

import { dehydrate } from "@tanstack/react-query";
import { createServerQueryClient } from "./server-query-client";
import { queryKeys } from "@/lib/query-keys";
import { serverGet } from "@/lib/server-fetch";
import type { Role } from "@/types/organization";

interface RoleListRow extends Role {
  permissionCount: number;
  memberCount: number;
}

interface PaginatedRolesResponse {
  data: RoleListRow[];
  pagination: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
}

export async function prefetchRoles() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.roles.list({ limit: 20 }),
    queryFn: () => serverGet<PaginatedRolesResponse>("/roles?limit=20"),
    staleTime: 60_000,
  });
  return dehydrate(queryClient);
}
