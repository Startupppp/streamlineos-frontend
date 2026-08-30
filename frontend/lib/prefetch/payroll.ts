import "server-only";

import { dehydrate } from "@tanstack/react-query";
import { createServerQueryClient } from "./server-query-client";
import { queryKeys } from "@/lib/query-keys";
import { serverGet } from "@/lib/server-fetch";
import type { PayrollRunListItem } from "@/types/payroll/runs";

interface RunsPage {
  data: PayrollRunListItem[];
  pagination: { limit: number; nextCursor: string | null; hasMore: boolean };
}

export async function prefetchPayrollRuns() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.payroll.runs({ cursor: undefined, limit: 20 }),
    queryFn: () => serverGet<RunsPage>("/payroll/runs?limit=20"),
    staleTime: 60_000,
  });
  return dehydrate(queryClient);
}
