"use client";

import { useQuery } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { useProjectMembers } from "./project-members";

jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn((options: unknown) => options),
  useQueryClient: jest.fn(),
}));
jest.mock("@/hooks/api/access", () => ({ useCan: jest.fn() }));
jest.mock("@/hooks/api/authorized-mutation", () => ({
  useAuthorizedMutation: jest.fn(),
}));
jest.mock("@/lib/api-envelope", () => ({
  lazyContract: (factory: unknown) => factory,
  isApiError: (error: unknown) =>
    typeof error === "object" && error !== null && "status" in error,
}));
jest.mock("@/lib/api-client", () => ({ apiClient: { get: jest.fn() } }));

const mockQuery = useQuery as jest.Mock;
const mockCan = useCan as jest.Mock;
const mockGet = apiClient.get as jest.Mock;

type CapturedOptions = {
  queryKey: readonly unknown[];
  queryFn: (context: { signal?: AbortSignal }) => unknown;
};

function useCapturedOptions(
  params?: Parameters<typeof useProjectMembers>[1],
): CapturedOptions {
  useProjectMembers(42, params);
  return mockQuery.mock.calls.at(-1)?.[0] as CapturedOptions;
}

describe("useProjectMembers server-side search", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCan.mockReturnValue(true);
    mockQuery.mockImplementation((options: unknown) => options);
  });

  it("normalizes the q compatibility alias into the canonical search API parameter", async () => {
    mockGet.mockResolvedValue({ data: [], pagination: {} });
    const options = useCapturedOptions({ cursor: "next-page", q: "  Alice  " });
    const signal = new AbortController().signal;

    await options.queryFn({ signal });

    expect(mockGet).toHaveBeenCalledWith(
      "/build/42/members",
      { cursor: "next-page", search: "Alice" },
      signal,
      expect.anything(),
    );
  });

  it("isolates different search terms and cursors in the cache", () => {
    const alice = useCapturedOptions({ search: "Alice" }).queryKey;
    const bob = useCapturedOptions({ search: "Bob" }).queryKey;
    const aliceNext = useCapturedOptions({ search: "Alice", cursor: "next" }).queryKey;

    expect(alice).not.toEqual(bob);
    expect(alice).not.toEqual(aliceNext);
  });

  it("keeps the project key as an invalidation prefix for every search", () => {
    const base = useCapturedOptions().queryKey;
    const searched = useCapturedOptions({ search: "Alice" }).queryKey;

    expect(searched.slice(0, base.length)).toEqual(base);
  });

  it("omits blank search and empty cursor from the request and key", async () => {
    mockGet.mockResolvedValue({ data: [], pagination: {} });
    const options = useCapturedOptions({ search: "   ", cursor: "" });

    await options.queryFn({});

    expect(mockGet.mock.calls.at(-1)?.[1]).toBeUndefined();
    expect(options.queryKey).toEqual(useCapturedOptions().queryKey);
  });

  it("retries without search when the deployed API has not accepted the new query contract yet", async () => {
    mockGet
      .mockRejectedValueOnce({ status: 400, code: "VALIDATION_FAILED" })
      .mockResolvedValueOnce({ data: [], pagination: {} });
    const options = useCapturedOptions({ search: "Alice", cursor: "next" });
    const signal = new AbortController().signal;

    await options.queryFn({ signal });

    expect(mockGet).toHaveBeenNthCalledWith(
      1,
      "/build/42/members",
      { cursor: "next", search: "Alice" },
      signal,
      expect.anything(),
    );
    expect(mockGet).toHaveBeenNthCalledWith(
      2,
      "/build/42/members",
      { cursor: "next" },
      signal,
      expect.anything(),
    );
  });

  it("does not mask non-validation failures", async () => {
    const requestError = { status: 500, code: "INTERNAL" };
    mockGet.mockRejectedValueOnce(requestError);
    const options = useCapturedOptions({ search: "Alice" });

    await expect(options.queryFn({})).rejects.toBe(requestError);
    expect(mockGet).toHaveBeenCalledTimes(1);
  });
});
