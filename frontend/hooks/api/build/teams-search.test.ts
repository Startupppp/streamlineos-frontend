import { renderHook } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useProjectTeams } from "@/hooks/api/build/teams";

jest.mock("@/lib/api-client", () => ({ apiClient: { get: jest.fn() } }));
jest.mock("@/hooks/api/gated-query", () => ({ useGatedQuery: jest.fn() }));
jest.mock("@/lib/api-envelope", () => ({
  lazyContract: jest.fn((factory: () => unknown) => factory),
}));

const mockedGet = apiClient.get as jest.Mock;
const mockedGated = useGatedQuery as jest.Mock;

function extractParams(search: string | undefined): Record<string, string> | undefined {
  jest.clearAllMocks();
  renderHook(() => useProjectTeams({ search }));
  const [, options] = mockedGated.mock.calls.at(-1) as [string, { queryFn: (ctx: { signal: AbortSignal }) => unknown }];
  options.queryFn({ signal: new AbortController().signal });
  return mockedGet.mock.calls.at(-1)?.[1] as Record<string, string> | undefined;
}

describe("useProjectTeams — search param forwarding", () => {
  it("passes search in request params so the server filters teams beyond the first cursor page", () => {
    const params = extractParams("platform");
    expect(params).toMatchObject({ search: "platform" });
  });

  it("omits search from request params when not provided so no spurious filter is applied", () => {
    const params = extractParams(undefined);
    expect(params?.search).toBeUndefined();
  });
});
