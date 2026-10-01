import { renderHook } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useGoalsPage } from "@/hooks/api/goals";

jest.mock("@/lib/api-client", () => ({ apiClient: { get: jest.fn() } }));
jest.mock("@/hooks/api/gated-query", () => ({ useGatedQuery: jest.fn() }));

const mockedGet = apiClient.get as jest.Mock;
const mockedGated = useGatedQuery as jest.Mock;

function extractParams(search: string | undefined): Record<string, unknown> | undefined {
  jest.clearAllMocks();
  renderHook(() => useGoalsPage({ search }));
  const [, options] = mockedGated.mock.calls.at(-1) as [string, { queryFn: (ctx: { signal: AbortSignal }) => unknown }];
  options.queryFn({ signal: new AbortController().signal });
  return mockedGet.mock.calls.at(-1)?.[1] as Record<string, unknown> | undefined;
}

describe("useGoalsPage — search param forwarding", () => {
  it("passes search in request params so the server filters goals beyond the first offset page", () => {
    const params = extractParams("revenue-target");
    expect(params).toMatchObject({ search: "revenue-target" });
  });

  it("omits search from request params when not provided so no spurious filter is applied", () => {
    const params = extractParams(undefined);
    expect(params?.search).toBeUndefined();
  });
});
