import { render } from "@testing-library/react";
import { useKbPageVersionsInfinite } from "./page-versions";

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
}));

const mockGet = jest.fn<Promise<unknown>, unknown[]>(() =>
  Promise.resolve({ data: [], pagination: { limit: 50, nextCursor: null, hasMore: false } }),
);
jest.mock("@/lib/api-client", () => ({
  apiClient: { get: (...args: unknown[]) => mockGet(...args) },
}));

type QueryFnCtx = { pageParam: unknown; signal: AbortSignal };
let capturedQueryFn: ((ctx: QueryFnCtx) => unknown) | null = null;

jest.mock("@tanstack/react-query", () => {
  const actual = jest.requireActual<object>("@tanstack/react-query");
  return {
    ...actual,
    useInfiniteQuery: jest.fn((opts: { queryFn: (ctx: QueryFnCtx) => unknown }) => {
      capturedQueryFn = opts.queryFn;
      return {
        data: undefined,
        isLoading: false,
        hasNextPage: false,
        fetchNextPage: jest.fn(),
        isFetchingNextPage: false,
      };
    }),
  };
});

beforeEach(() => {
  capturedQueryFn = null;
  mockGet.mockClear();
  mockGet.mockResolvedValue({
    data: [],
    pagination: { limit: 50, nextCursor: null, hasMore: false },
  });
});

function VersionsHook() {
  useKbPageVersionsInfinite(42);
  return null;
}

describe("useKbPageVersionsInfinite — abort signal forwarding (FE-26)", () => {
  it("passes signal as the third positional argument, never inside the params object", async () => {
    render(<VersionsHook />);
    expect(capturedQueryFn).not.toBeNull();
    const signal = new AbortController().signal;

    await capturedQueryFn!({ pageParam: undefined, signal });

    expect(mockGet).toHaveBeenCalledWith(
      "/kb/pages/42/versions",
      expect.any(Object),
      signal,
      expect.any(Function),
    );
    const params = mockGet.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(params).not.toHaveProperty("signal");
  });
});
