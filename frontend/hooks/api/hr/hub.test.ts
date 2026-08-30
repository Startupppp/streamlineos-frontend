import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { scopedQueryKeyHashFn, authenticatedScope } from "@/lib/query-scope";
import { useHrHubSnapshot, type HrHubSnapshot } from "./hub";

jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn(),
}));

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn() },
}));

describe("useHrHubSnapshot", () => {
  const useQueryMock = useQuery as jest.Mock;
  const useSessionMock = useSession as jest.Mock;
  const apiGetMock = apiClient.get as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date(2026, 7, 18, 10, 30));
    useSessionMock.mockReturnValue({
      data: { orgId: "org-1", user: { id: "user-1" } },
    });
    useQueryMock.mockReturnValue({ data: undefined });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("issues one tenant-scoped request for the complete initial hub snapshot", async () => {
    const response = { generatedAt: "2026-08-18T05:00:00.000Z" } as HrHubSnapshot;
    apiGetMock.mockResolvedValue(response);

    useHrHubSnapshot();

    expect(useQueryMock).toHaveBeenCalledTimes(1);
    const queryOptions = useQueryMock.mock.calls[0]?.[0] as {
      queryKey: readonly unknown[];
      queryFn: () => Promise<HrHubSnapshot>;
      enabled: boolean;
    };
    expect(queryOptions.queryKey).toEqual([
      "streamlineos",
      "hr",
      "hub",
      "2026-08-18",
    ]);
    expect(
      scopedQueryKeyHashFn(authenticatedScope("org-1", "user-1"))(queryOptions.queryKey),
    ).not.toBe(
      scopedQueryKeyHashFn(authenticatedScope("org-2", "user-1"))(queryOptions.queryKey),
    );
    expect(queryOptions.enabled).toBe(true);

    await expect(queryOptions.queryFn()).resolves.toBe(response);
    expect(apiGetMock).toHaveBeenCalledTimes(1);
    expect(apiGetMock).toHaveBeenCalledWith("/hr/hub", {
      today: "2026-08-18",
    });
  });
});
