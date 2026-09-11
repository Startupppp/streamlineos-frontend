import { act, renderHook } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { queryKeys } from "@/lib/query-keys";
import { apiClient } from "@/lib/api-client";
import { useLogTime } from "./time-entries";

jest.mock("@/lib/api-client", () => ({ apiClient: { post: jest.fn() } }));
jest.mock("@/hooks/api/access", () => ({ useCan: () => true, useAccess: () => ({ data: { isOrgOwner: true }, refetch: jest.fn() }) }));

it("accepts the created entry row and refreshes the ticket and project analytics", async () => {
  const row = {
    id: 1, orgId: "org-a", userMembershipId: 2, ticketId: 3, projectId: 4,
    date: "2026-09-09", hours: "2.00", description: null, imageUrl: null, workLink: null,
    status: "PENDING", approvedByMembershipId: null, approvedAt: null, rejectionReason: null,
    isBillable: false, payrollStatus: "UNPROCESSED", payrollExportId: null, timesheetPeriodId: null,
    timerSessionId: null, billingType: "BILLABLE", billRate: null, costRate: null, currency: null,
    rateSource: null, invoicingStatus: "UNINVOICED", submittedAt: null, lockedAt: null,
    lockedByMembershipId: null, voidedAt: null, voidReason: null, source: "MANUAL",
    createdAt: "2026-09-09T00:00:00Z", updatedAt: "2026-09-09T00:00:00Z",
  };
  const client = createAppQueryClient();
  client.setQueryData(queryKeys.projects.analytics(4), {});
  jest.mocked(apiClient.post).mockResolvedValue(row);
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  const { result } = renderHook(() => useLogTime(), { wrapper });
  await act(async () => { await result.current.mutateAsync({ projectId: 4, ticketId: 3, hours: 2, date: "2026-09-09" }); });
  const source = jest.mocked(apiClient.post).mock.calls[0]?.[3];
  const contract = typeof source === "function" ? await source() : source;
  expect(contract?.parse(row)).toEqual(row);
  expect(client.getQueryState(queryKeys.projects.analytics(4))?.isInvalidated).toBe(true);
  client.clear();
});
