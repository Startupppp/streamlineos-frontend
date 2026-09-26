import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const mockGet = jest.fn<Promise<unknown>, [string, unknown, unknown, unknown]>();
const mockUseCan = jest.fn<boolean, [string]>();

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: (path: string, params: unknown, signal: unknown, contract: unknown) =>
      mockGet(path, params, signal, contract),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => mockUseCan(key),
}));

jest.mock("@/hooks/api/authorized-mutation", () => ({
  useAuthorizedMutation: (_key: string, options: { mutationFn: (v: unknown) => Promise<unknown> }) => {
    const { useMutation } = jest.requireActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
    return useMutation(options);
  },
}));

jest.mock("@/hooks/api/cursor-page-schema", () => ({
  noContentContract: { parse: jest.fn((v: unknown) => v) },
}));

import { useKbPageTemplates } from "./page-templates";

const PAGINATION = { limit: 50, hasMore: false, nextCursor: null };

const TEMPLATE = {
  id: 1,
  orgId: "org-1",
  name: "Meeting notes",
  icon: null,
  description: "Standard meeting template",
  content: null,
  createdById: "user-1",
  createdByName: "Alice",
  useCount: 3,
  lastUsedAt: null,
  createdAt: "2026-09-25T00:00:00.000Z",
  updatedAt: "2026-09-25T00:00:00.000Z",
};

let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCan.mockReturnValue(true);
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
});

describe("useKbPageTemplates — wire-shape is visible through selectFlatPages", () => {
  it("returns the flat templates array when the wire sends { data: [], pagination }", async () => {
    mockGet.mockResolvedValue({ data: [TEMPLATE], pagination: PAGINATION });

    const { result } = renderHook(() => useKbPageTemplates(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([TEMPLATE]);
  });

  it("when the wire renames data to items the result is not the templates list — so a wire-shape change breaks the test above", async () => {
    mockGet.mockResolvedValue({ items: [TEMPLATE], pagination: PAGINATION });

    const { result } = renderHook(() => useKbPageTemplates(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).not.toEqual([TEMPLATE]);
  });

  it("data is undefined when the user lacks view permission, so a disabled query is distinguishable from an empty template gallery", () => {
    mockUseCan.mockReturnValue(false);
    mockGet.mockResolvedValue({ data: [TEMPLATE], pagination: PAGINATION });

    const { result } = renderHook(() => useKbPageTemplates(), { wrapper });

    expect(result.current.isFetching).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("fetches from /kb/page-templates", async () => {
    mockGet.mockResolvedValue({ data: [], pagination: PAGINATION });

    renderHook(() => useKbPageTemplates(), { wrapper });

    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(mockGet.mock.calls[0]?.[0]).toBe("/kb/page-templates");
  });

  it("passes the search query as q param when filtering templates", async () => {
    mockGet.mockResolvedValue({ data: [], pagination: PAGINATION });

    renderHook(() => useKbPageTemplates("meeting"), { wrapper });

    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(mockGet.mock.calls[0]?.[1]).toEqual({ q: "meeting" });
  });

  it("exposes hasNextPage so the consumer can load more when the wire says there are more templates", async () => {
    mockGet.mockResolvedValue({
      data: [TEMPLATE],
      pagination: { limit: 50, hasMore: true, nextCursor: "cursor-2" },
    });

    const { result } = renderHook(() => useKbPageTemplates(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);
    expect(result.current.data).toEqual([TEMPLATE]);
  });
});
