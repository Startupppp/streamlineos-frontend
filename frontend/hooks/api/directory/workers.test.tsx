import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { WorkerEngagement } from "@/types/directory/workers";
import { useCancelEngagement, useUpdateEngagement } from "./workers";

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    patch: jest.fn(),
    post: jest.fn(),
  },
}));

const mockedPatch = apiClient.patch as jest.Mock;
const mockedPost = apiClient.post as jest.Mock;

function engagement(
  overrides: Partial<WorkerEngagement> = {},
): WorkerEngagement {
  return {
    workerEngagementId: "engagement-1",
    organizationId: "org-1",
    workerId: "worker-1",
    startsOn: "2026-08-17",
    endsOn: null,
    workerType: "FULL_TIME",
    status: "PLANNED",
    isPrimary: false,
    departmentId: null,
    businessUnitId: null,
    branchId: null,
    locationId: null,
    teamId: null,
    managerEngagementId: null,
    designation: null,
    jobRoleId: null,
    jobLevelId: null,
    employmentTypeId: null,
    probationEndsOn: null,
    noticePeriodDays: null,
    terminationReason: null,
    terminationNotes: null,
    createdBy: null,
    createdAt: "2026-08-08T00:00:00.000Z",
    updatedAt: "2026-08-08T00:00:00.000Z",
    ...overrides,
  };
}

describe("directory engagement mutations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("cancels a plan without deleting it and updates the engagement cache", async () => {
    const client = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });
    const planned = engagement();
    const cancelled = engagement({ status: "CANCELLED" });
    client.setQueryData(queryKeys.directory.engagements("worker-1"), [planned]);
    mockedPost.mockResolvedValue(cancelled);

    function Wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      );
    }

    const { result } = renderHook(() => useCancelEngagement(), {
      wrapper: Wrapper,
    });
    await act(async () => {
      await result.current.mutateAsync({
        workerId: "worker-1",
        workerEngagementId: "engagement-1",
      });
    });

    expect(mockedPost).toHaveBeenCalledWith(
      "/directory/engagements/engagement-1/cancel",
    );
    expect(
      client.getQueryData<WorkerEngagement[]>(
        queryKeys.directory.engagements("worker-1"),
      ),
    ).toEqual([expect.objectContaining({ status: "CANCELLED" })]);
  });

  it("updates a planned engagement and refreshes the worker caches", async () => {
    const client = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });
    const planned = engagement();
    const updated = engagement({
      startsOn: "2026-08-19",
      endsOn: "2026-09-30",
      designation: "Senior Engineer",
    });
    client.setQueryData(queryKeys.directory.engagements("worker-1"), [planned]);
    mockedPatch.mockResolvedValue(updated);

    function Wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      );
    }

    const invalidateSpy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useUpdateEngagement(), {
      wrapper: Wrapper,
    });
    await act(async () => {
      await result.current.mutateAsync({
        workerId: "worker-1",
        workerEngagementId: "engagement-1",
        startsOn: "2026-08-19",
        endsOn: "2026-09-30",
        designation: "Senior Engineer",
      });
    });

    expect(mockedPatch).toHaveBeenCalledWith(
      "/directory/engagements/engagement-1",
      {
        startsOn: "2026-08-19",
        endsOn: "2026-09-30",
        designation: "Senior Engineer",
      },
    );
    expect(
      client.getQueryData<WorkerEngagement[]>(
        queryKeys.directory.engagements("worker-1"),
      ),
    ).toEqual([
      expect.objectContaining({
        startsOn: "2026-08-19",
        endsOn: "2026-09-30",
        designation: "Senior Engineer",
      }),
    ]);
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.directory.worker("worker-1"),
    });
  });
});
