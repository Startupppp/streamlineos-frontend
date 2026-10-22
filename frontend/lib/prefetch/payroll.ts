import "server-only";

import { dehydrate } from "@tanstack/react-query";
import { createServerQueryClient } from "./server-query-client";
import { payrollQueryKeys } from "@/lib/query-keys/payroll";
import { serverGet } from "@/lib/server-fetch";
import { payrollRunsPageContract } from "@/hooks/api/payroll/runs-schema";

export async function prefetchPayrollRuns() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    queryKey: payrollQueryKeys.payroll.runs({ cursor: undefined, limit: 20 }),
    queryFn: () => serverGet("/payroll/runs?limit=20", payrollRunsPageContract),
    staleTime: 60_000,
  });
  return dehydrate(queryClient);
}
