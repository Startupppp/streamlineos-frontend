import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { useBugs } from "../bugs";
import { useTestCases } from "../qa";
import { useProjectBoardTickets, useTickets } from "../ticket-queries";

jest.mock("@tanstack/react-query", () => ({
  useInfiniteQuery: jest.fn((options: unknown) => options),
  useQuery: jest.fn((options: unknown) => options),
}));
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useMemo: (fn: () => unknown) => fn(),
}));
jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
}));
jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn() },
}));

const mockInfiniteQuery = useInfiniteQuery as jest.Mock;
const mockQuery = useQuery as jest.Mock;
const mockCan = useCan as jest.Mock;
const forwardedSignal = new AbortController().signal;
const listQueryCases: Array<[string, (projectId: number) => unknown, string]> = [
  ["tickets", (projectId) => useTickets(projectId), "/build/202/tickets"],
  ["board tickets", (projectId) => useProjectBoardTickets(projectId), "/build/202/tickets"],
  ["bugs", (projectId) => useBugs(projectId), "/build/202/bugs"],
  ["test cases", (projectId) => useTestCases(projectId), "/build/202/test-cases"],
];

type QueryOptions = {
  queryKey: readonly unknown[];
  placeholderData?: unknown;
  queryFn: (context: { signal: AbortSignal; pageParam?: unknown }) => unknown;
};

function captureQueryOptions(run: () => unknown): QueryOptions {
  mockQuery.mockImplementation((options: unknown) => options);
  mockInfiniteQuery.mockImplementation((options: unknown) => options);
  run();
  return (mockQuery.mock.calls.at(-1)?.[0] ?? mockInfiniteQuery.mock.calls.at(-1)?.[0]) as QueryOptions;
}

describe("project list queries during project switches", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCan.mockReturnValue(true);
  });

  it.each(listQueryCases)("does not keep project A rows while loading project B %s", (_, run) => {
    const projectA = captureQueryOptions(() => run(101));
    const projectB = captureQueryOptions(() => run(202));

    expect(projectB.queryKey).not.toEqual(projectA.queryKey);
    expect(JSON.stringify(projectB.queryKey)).toContain("202");
    expect(projectB.placeholderData).toBeUndefined();
  });

  it.each(listQueryCases)("keeps the project and abort signal in the %s request", (_, run, path) => {
    const options = captureQueryOptions(() => run(202));
    void options.queryFn({ pageParam: undefined, signal: forwardedSignal });

    const call = (apiClient.get as jest.Mock).mock.calls.at(-1);
    expect(call?.[0]).toBe(path);
    expect(call?.[2]).toBe(forwardedSignal);
    expect(call?.[3]).toEqual(expect.any(Function));
  });
});
