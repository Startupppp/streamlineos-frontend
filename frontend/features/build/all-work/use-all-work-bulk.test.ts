import { renderHook, act } from "@testing-library/react";

jest.mock("@/lib/api-client", () => ({
  apiClient: { post: jest.fn() },
}));

const _qc = { invalidateQueries: jest.fn() };

jest.mock("@tanstack/react-query", () => ({
  useMutation: ({
    mutationFn,
    onSuccess,
    onError,
  }: {
    mutationFn: (...a: unknown[]) => unknown;
    onSuccess: (...a: unknown[]) => void;
    onError: (...a: unknown[]) => void;
  }) => ({
    mutate: async (...args: unknown[]) => {
      try {
        const result = await mutationFn(...args);
        onSuccess(result);
      } catch (err) {
        onError(err);
      }
    },
    isPending: false,
  }),
  useQueryClient: () => _qc,
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useAccess: () => ({
    data: { isOrgOwner: false, scopes: { "build:tickets:update": "all" }, modules: {} },
    refetch: jest.fn(),
  }),
}));

jest.mock("@/hooks/api/authorized-mutation", () => ({
  useAuthorizedMutation: (
    _permission: string,
    opts: {
      mutationFn: (...a: unknown[]) => unknown;
      onSuccess: (...a: unknown[]) => void;
      onError: (...a: unknown[]) => void;
    },
  ) => ({
    mutate: async (...args: unknown[]) => {
      try {
        const result = await opts.mutationFn(...args);
        opts.onSuccess(result);
      } catch (err) {
        opts.onError(err);
      }
    },
    isPending: false,
  }),
}));

jest.mock("@/lib/query-keys/build-work", () => ({
  buildWorkQueryKeys: {
    projects: {
      allWorkAll: ["build", "projects", "all-work"],
      tickets: ({ projectId }: { projectId: number }) => [
        "build", "projects", "tickets", { projectId },
      ],
    },
  },
}));

jest.mock("@/lib/api-envelope", () => {
  class FakeApiError extends Error {
    status?: number;
    code?: string;
    constructor(message: string, status?: number, code?: string) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.code = code;
    }
  }
  return {
    lazyContract: (fn: unknown) => fn,
    isApiError: (e: unknown) => e instanceof FakeApiError,
    ApiError: FakeApiError,
  };
});

jest.mock("@/lib/get-error-message", () => ({
  getErrorMessage: (e: unknown) => (e instanceof Error ? e.message : String(e)),
}));

jest.mock("@/hooks/api/build/build-tickets-subresource-schema", () => ({
  bulkUpdateResultContract: null,
}));

import { useAllWorkBulk } from "./use-all-work-bulk";
import type { AllWorkTicket } from "@/types/projects";

type MockedApi = { apiClient: { post: jest.Mock } };
type MockedToast = { toast: { success: jest.Mock; error: jest.Mock; warning: jest.Mock } };
type MockedEnvelope = { ApiError: new (msg: string, status?: number, code?: string) => Error & { status?: number } };

const getPost = () => (jest.requireMock("@/lib/api-client") as MockedApi).apiClient.post;
const getToast = () => (jest.requireMock("sonner") as MockedToast).toast;
const getFakeApiError = () => (jest.requireMock("@/lib/api-envelope") as MockedEnvelope).ApiError;

function makeTicket(id: number, projectId: number): AllWorkTicket {
  return {
    id, title: `Ticket ${id}`, type: "TASK", status: "TODO", priority: null,
    projectId, projectKey: `P${projectId}`, projectName: `Project ${projectId}`,
    ticketNumber: id, sprintId: null, epicId: null, assigneeId: null,
    points: null, estimate: null, rank: null, startDate: null, dueDate: null,
    cycleId: null, createdAt: null, updatedAt: null, assignee: null, labels: [],
  };
}

const project1Tickets = [makeTicket(1, 1), makeTicket(2, 1)];
const project2Tickets = [makeTicket(3, 2)];
const allTickets = [...project1Tickets, ...project2Tickets];

beforeEach(() => {
  jest.clearAllMocks();
  getPost().mockResolvedValue({ updated: 1, ticketIds: [1] });
});

describe("useAllWorkBulk — partial-failure reporting", () => {
  it("reports updated count for the successful project and names the failed project when one project rejects", async () => {
    getPost()
      .mockResolvedValueOnce({ updated: 2, ticketIds: [1, 2] })
      .mockRejectedValueOnce(new Error("Backend error"));

    const { result } = renderHook(() => useAllWorkBulk(allTickets));
    act(() => { result.current.setTableSelection(new Set([1, 2, 3])); });

    await act(async () => { await result.current.handleBulkStatus("IN_PROGRESS"); });

    expect(getToast().success).toHaveBeenCalledWith(expect.stringContaining("2 ticket"));
    expect(getToast().error).toHaveBeenCalledWith(expect.stringContaining("1 project"));
  });

  it("does not report total failure when at least one project succeeds", async () => {
    getPost()
      .mockResolvedValueOnce({ updated: 2, ticketIds: [1, 2] })
      .mockRejectedValueOnce(new Error("Partial failure"));

    const { result } = renderHook(() => useAllWorkBulk(allTickets));
    act(() => { result.current.setTableSelection(new Set([1, 2, 3])); });

    await act(async () => { await result.current.handleBulkStatus("DONE"); });

    expect(getToast().success).toHaveBeenCalled();
    expect(_qc.invalidateQueries).toHaveBeenCalled();
  });

  it("invalidates the all-work cache even when a sibling project fails", async () => {
    getPost()
      .mockResolvedValueOnce({ updated: 2, ticketIds: [1, 2] })
      .mockRejectedValueOnce(new Error("failure"));

    const { result } = renderHook(() => useAllWorkBulk(allTickets));
    act(() => { result.current.setTableSelection(new Set([1, 2, 3])); });

    await act(async () => { await result.current.handleBulkStatus("DONE"); });

    const allKeys = _qc.invalidateQueries.mock.calls.map(
      (c: unknown[]) => JSON.stringify((c[0] as { queryKey: unknown }).queryKey),
    );
    expect(allKeys.some((k: string) => k.includes("all-work"))).toBe(true);
  });
});

describe("useAllWorkBulk — 409 conflict is retryable, not a generic error", () => {
  it("shows a warning toast when the backend returns 409 so the user knows it is a transient conflict", async () => {
    const FakeApiError = getFakeApiError();
    getPost().mockRejectedValueOnce(new FakeApiError("Conflict", 409, "CONFLICT"));

    const { result } = renderHook(() => useAllWorkBulk([makeTicket(1, 1)]));
    act(() => { result.current.setTableSelection(new Set([1])); });

    await act(async () => { await result.current.handleBulkStatus("DONE"); });

    expect(getToast().warning).toHaveBeenCalledWith(expect.stringContaining("concurrent"));
    expect(getToast().error).not.toHaveBeenCalled();
  });

  it("shows an error toast (not a warning) for non-409 failures", async () => {
    getPost().mockRejectedValueOnce(new Error("Server error"));

    const { result } = renderHook(() => useAllWorkBulk([makeTicket(1, 1)]));
    act(() => { result.current.setTableSelection(new Set([1])); });

    await act(async () => { await result.current.handleBulkStatus("DONE"); });

    expect(getToast().warning).not.toHaveBeenCalled();
    expect(getToast().error).toHaveBeenCalled();
  });
});

describe("useAllWorkBulk — chunks ≤100 ids per project call", () => {
  it("splits a 150-ticket project into two API calls so the 100-id server limit is respected", async () => {
    getPost().mockResolvedValue({ updated: 50, ticketIds: [] });
    const bigProjectTickets = Array.from({ length: 150 }, (_, i) => makeTicket(i + 1, 99));
    const bigSelection = new Set<string | number>(bigProjectTickets.map((t) => t.id));

    const { result } = renderHook(() => useAllWorkBulk(bigProjectTickets));
    act(() => { result.current.setTableSelection(bigSelection); });

    await act(async () => { await result.current.handleBulkStatus("DONE"); });

    expect(getPost()).toHaveBeenCalledTimes(2);
    const firstBody = getPost().mock.calls[0]?.[1] as { ticketIds: number[] };
    const secondBody = getPost().mock.calls[1]?.[1] as { ticketIds: number[] };
    expect(firstBody.ticketIds.length).toBeLessThanOrEqual(100);
    expect(secondBody.ticketIds.length).toBeLessThanOrEqual(100);
    expect(firstBody.ticketIds.length + secondBody.ticketIds.length).toBe(150);
  });

  it("sends exactly one call when a project has exactly 100 tickets", async () => {
    getPost().mockResolvedValue({ updated: 100, ticketIds: [] });
    const tickets100 = Array.from({ length: 100 }, (_, i) => makeTicket(i + 1, 50));
    const sel = new Set<string | number>(tickets100.map((t) => t.id));

    const { result } = renderHook(() => useAllWorkBulk(tickets100));
    act(() => { result.current.setTableSelection(sel); });

    await act(async () => { await result.current.handleBulkStatus("DONE"); });

    expect(getPost()).toHaveBeenCalledTimes(1);
  });
});

describe("useAllWorkBulk — selection state", () => {
  it("clears selection after a fully successful bulk update", async () => {
    getPost().mockResolvedValue({ updated: 2, ticketIds: [1, 2] });

    const { result } = renderHook(() => useAllWorkBulk(project1Tickets));
    act(() => { result.current.setTableSelection(new Set([1, 2])); });
    expect(result.current.tableSelection.size).toBe(2);

    await act(async () => { await result.current.handleBulkStatus("DONE"); });

    expect(result.current.tableSelection.size).toBe(0);
  });

  it("keeps selection when all projects fail so the user can retry without reselecting", async () => {
    getPost().mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useAllWorkBulk(project1Tickets));
    act(() => { result.current.setTableSelection(new Set([1, 2])); });

    await act(async () => { await result.current.handleBulkStatus("DONE"); });

    expect(result.current.tableSelection.size).toBe(2);
  });
});
