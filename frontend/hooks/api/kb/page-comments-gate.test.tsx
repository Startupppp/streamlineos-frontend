"use client";

import { render } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import { useKbPageComments } from "./page-comments";

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
}));

let lastQueryEnabled: boolean | undefined;
type QueryOptions = {
  queryFn: (context: { signal: AbortSignal; pageParam?: string }) => Promise<unknown>;
  getNextPageParam: (page: { pagination: { nextCursor: string | null } }) => string | undefined;
  select: (pages: { pages: Array<{ data: unknown[] }> }) => unknown[];
};
let lastQueryOptions: QueryOptions | undefined;

jest.mock("@tanstack/react-query", () => {
  const actual = jest.requireActual<object>("@tanstack/react-query");
  return {
    ...actual,
    useInfiniteQuery: jest.fn((opts: QueryOptions & { enabled?: boolean }) => {
      lastQueryEnabled = opts.enabled;
      lastQueryOptions = opts;
      return { data: undefined, isError: false, error: null };
    }),
  };
});

const { useCan } = jest.requireMock<{ useCan: jest.Mock }>("@/hooks/api/access");

beforeEach(() => {
  lastQueryEnabled = undefined;
  lastQueryOptions = undefined;
  useCan.mockReturnValue(false);
});

function Hook({ pageId }: { pageId: number }) {
  useKbPageComments(pageId);
  return null;
}

describe("useKbPageComments — kb:pages:view gate", () => {
  it("is disabled when useCan returns false", () => {
    useCan.mockReturnValue(false);
    render(<Hook pageId={1} />);
    expect(lastQueryEnabled).toBe(false);
  });

  it("is enabled when kb:pages:view is granted and pageId > 0", () => {
    useCan.mockReturnValue(true);
    render(<Hook pageId={42} />);
    expect(lastQueryEnabled).toBe(true);
  });

  it("is disabled when pageId is 0 even with permission", () => {
    useCan.mockReturnValue(true);
    render(<Hook pageId={0} />);
    expect(lastQueryEnabled).toBe(false);
  });

  it("uses the view key (kb:pages:view), not the update key", () => {
    render(<Hook pageId={1} />);
    expect(useCan).toHaveBeenCalledWith("kb:pages:view");
    expect(useCan).not.toHaveBeenCalledWith("kb:pages:update");
  });

  it("forwards the opaque next cursor and abort signal to the comments endpoint", async () => {
    useCan.mockReturnValue(true);
    const get = jest.spyOn(apiClient, "get").mockResolvedValue({
      data: [],
      pagination: { limit: 50, hasMore: false, nextCursor: null },
    });
    try {
      render(<Hook pageId={42} />);
      const signal = new AbortController().signal;
      await lastQueryOptions?.queryFn({ signal, pageParam: "opaque-cursor" });
      expect(get).toHaveBeenCalledWith(
        "/kb/pages/42/comments",
        { cursor: "opaque-cursor" },
        signal,
        expect.anything(),
      );
      expect(lastQueryOptions?.getNextPageParam({ pagination: { nextCursor: "more" } })).toBe("more");
      expect(lastQueryOptions?.getNextPageParam({ pagination: { nextCursor: null } })).toBeUndefined();
      expect(lastQueryOptions?.select({ pages: [{ data: [1] }, { data: [2] }] })).toEqual([1, 2]);
    } finally {
      get.mockRestore();
    }
  });
});
