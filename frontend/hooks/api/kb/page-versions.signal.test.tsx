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
let capturedOptions: { throwOnError?: unknown } | null = null;

jest.mock("@tanstack/react-query", () => {
  const actual = jest.requireActual<object>("@tanstack/react-query");
  return {
    ...actual,
    useInfiniteQuery: jest.fn((opts: { queryFn: (ctx: QueryFnCtx) => unknown; throwOnError?: unknown }) => {
      capturedQueryFn = opts.queryFn;
      capturedOptions = opts;
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
  capturedOptions = null;
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

  it("keeps missing page history inline instead of throwing through the route boundary", () => {
    render(<VersionsHook />);

    expect(capturedOptions?.throwOnError).toBe(false);
  });
});
