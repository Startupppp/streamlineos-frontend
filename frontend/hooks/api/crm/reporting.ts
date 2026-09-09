"use client";

import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useGatedQuery } from "@/hooks/api/gated-query";
import type {
  ReportingQueryDescription,
  ReportingRunResult,
  ReportingSource,
} from "@/types/crm/reporting";

/**
 * `GET /crm/reporting/sources` and `POST /crm/reporting/run`.
 *
 * Both gate on `crm:reporting:run`, which is what the controller declares on
 * each — `sources` sits behind `run` rather than `view` because the list it
 * returns is already filtered to what this caller could execute, and a reader
 * who can run nothing would get an empty list that reads as a bug.
 *
 * Running is a POST because a description does not fit in a query string, and
 * it is still a read: the response is the answer, and re-asking the same
 * question is the thing a cache is for. It is therefore a query, keyed on the
 * description, not a mutation.
 */

export function useReportingSources() {
  return useGatedQuery("crm:reporting:run", {
    queryKey: queryKeys.crm.reportingSources(),
    queryFn: () => apiClient.get<ReportingSource[]>("/crm/reporting/sources"),
    staleTime: 30 * 60_000,
  });
}

export function useReportRun(description: ReportingQueryDescription | null) {
  return useGatedQuery("crm:reporting:run", {
    queryKey: queryKeys.crm.reportingRun(description),
    queryFn: () =>
      apiClient.post<ReportingRunResult>("/crm/reporting/run", { query: description }),
    enabled: description !== null,
    staleTime: 2 * 60_000,
  });
}
