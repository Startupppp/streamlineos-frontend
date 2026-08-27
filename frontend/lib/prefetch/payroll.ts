import "server-only";

import { dehydrate } from "@tanstack/react-query";
import { createServerQueryClient } from "./server-query-client";
import { queryKeys } from "@/lib/query-keys";
import { serverGet } from "@/lib/server-fetch";
import type { PayrollRunListItem } from "@/types/payroll/runs";

interface PaginatedRuns {
  data: PayrollRunListItem[];
  total: number;
  page: number;
  limit: number;
}

export async function prefetchPayrollRuns() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.payroll.runs({ page: 1, limit: 20 }),
    queryFn: () => serverGet<PaginatedRuns>("/payroll/runs?page=1&limit=20"),
    staleTime: 60_000,
  });
  return dehydrate(queryClient);
}
