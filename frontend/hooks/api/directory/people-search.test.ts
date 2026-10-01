import { renderHook } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { usePeople } from "./people";

jest.mock("@/lib/api-client", () => ({ apiClient: { get: jest.fn() } }));
jest.mock("@/hooks/api/gated-query", () => ({ useGatedQuery: jest.fn() }));

const mockedGet = apiClient.get as jest.Mock;
const mockedGated = useGatedQuery as jest.Mock;

function requestedUrl(search: string | undefined): string {
  renderHook(() => usePeople({ limit: 20, search }));
  const [, options] = mockedGated.mock.calls.at(-1);
  options.queryFn({ signal: new AbortController().signal });
  return String(mockedGet.mock.calls.at(-1)[0]);
}

describe("usePeople search (BUG-HRMS-011)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("trims the query, so a trailing space still finds the person", () => {
    expect(requestedUrl("Tarun ")).toBe("/directory/people?limit=20&search=Tarun");
  });

  it("treats a blank query as no query rather than searching for spaces", () => {
    expect(requestedUrl("   ")).toBe("/directory/people?limit=20");
  });
});
