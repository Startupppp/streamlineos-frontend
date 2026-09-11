import "server-only";

import { dehydrate } from "@tanstack/react-query";
import { createServerQueryClient } from "./server-query-client";
import { payrollQueryKeys } from "@/lib/query-keys/payroll";
import { serverGet } from "@/lib/server-fetch";
import { payrollRunsPageContract } from "@/hooks/api/payroll/runs-schema";

/**
 * The SSR half of a contracted route has to carry the SAME contract as the
 * client half, or the contract is bypassed on first paint: this snapshot is
 * hydrated into the app's cache, so the client `queryFn` — and its contract —
 * never runs until something invalidates the key.
 *
 * This one was reading its shape from `@/types/payroll/runs`, which disagrees
 * with `payrollRunsPageContract` on six fields (`grossTotal`, `netTotal`,
 * `employeeCount` and `exceptionCount` are `notNull()` columns the hand-written
 * type declared nullable; `runType` and `statutoryRuleVersion` were optional).
 */
export async function prefetchPayrollRuns() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    queryKey: payrollQueryKeys.payroll.runs({ cursor: undefined, limit: 20 }),
    queryFn: () => serverGet("/payroll/runs?limit=20", payrollRunsPageContract),
    staleTime: 60_000,
  });
  return dehydrate(queryClient);
}
