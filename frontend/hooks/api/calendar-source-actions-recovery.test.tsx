import { renderHook } from "@testing-library/react";
import type { CalendarSourceActionProposal } from "./calendar-source-actions-schema";
import { useCalendarSourceActionProposal } from "./calendar-source-actions";

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockGatedQuery = jest.fn();

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { orgId: "org-1", user: { id: "user-1" } } }),
}));
jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));
jest.mock("@/hooks/api/gated-query", () => ({
  useGatedQuery: (...args: unknown[]) => mockGatedQuery(...args),
}));

function queryFn() {
  const options = mockGatedQuery.mock.calls.at(-1)?.[1] as {
    queryFn: (context: { signal: AbortSignal }) => Promise<CalendarSourceActionProposal>;
  };
  return options.queryFn;
}

describe("Calendar source action proposal recovery", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    mockGatedQuery.mockReset();
    mockGatedQuery.mockReturnValue({ data: null });
  });

  it("keeps a settled proposal read-only", async () => {
    const proposal = { id: "proposal-1", status: "PARTIAL" };
    mockGet.mockResolvedValue(proposal);
    renderHook(() => useCalendarSourceActionProposal("proposal-1"));
    const signal = new AbortController().signal;

    await expect(queryFn()({ signal })).resolves.toBe(proposal);

    expect(mockGet).toHaveBeenCalledWith("/calendar/source-actions/proposals/proposal-1", undefined, signal, expect.anything());
    expect(mockPost).not.toHaveBeenCalled();
  });

  it("recovers an applying proposal through an explicit POST with the read signal", async () => {
    mockGet.mockResolvedValue({ id: "proposal-1", status: "APPLYING" });
    const recovered = { id: "proposal-1", status: "PARTIAL" };
    mockPost.mockResolvedValue(recovered);
    renderHook(() => useCalendarSourceActionProposal("proposal-1"));
    const signal = new AbortController().signal;

    await expect(queryFn()({ signal })).resolves.toBe(recovered);

    expect(mockPost).toHaveBeenCalledWith(
      "/calendar/source-actions/proposals/proposal-1/recover",
      undefined,
      { signal },
      expect.anything(),
    );
  });
});
