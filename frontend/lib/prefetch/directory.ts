import "server-only";

import { dehydrate } from "@tanstack/react-query";
import { createServerQueryClient } from "./server-query-client";
import {
  WORKERS_PAGE_SIZE,
  workersListKey,
} from "@/lib/query-keys/directory-workers-list";
import { serverGet } from "@/lib/server-fetch";
import type { WorkersPage } from "@/types/directory/workers";


export async function prefetchWorkers() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    queryKey: workersListKey(),
    queryFn: () =>
      serverGet<WorkersPage>(`/directory/workers?limit=${WORKERS_PAGE_SIZE}`),
    staleTime: 60_000,
  });
  return dehydrate(queryClient);
}
