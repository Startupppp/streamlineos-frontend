import { renderHook, act } from "@testing-library/react";
import { useMyWorkBulk } from "./use-my-work-bulk";
import type { AllWorkTicket } from "@/types/projects";
import { ApiError } from "@/lib/api-envelope";

const mockInvalidateQueries = jest.fn();
const mockPost = jest.fn();

jest.mock("@tanstack/react-query", () => ({
  ...jest.requireActual("@tanstack/react-query"),
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
  useMutation: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    post: (...args: unknown[]) => mockPost(...args),
    get: jest.fn(),
  },
}));

jest.mock("@/lib/api-envelope", () => ({
  ...jest.requireActual("@/lib/api-envelope"),
  lazyContract: (fn: () => Promise<unknown>) => fn,
}));

jest.mock("@/lib/query-keys/build-work", () => ({
  buildWorkQueryKeys: {
    projects: {
      allWorkAll: ["build", "all-work"],
      tickets: ({ projectId }: { projectId: number }) => [
        "build",
        "projects",
        projectId,
        "tickets",
      ],
    },
  },
}));

jest.mock("@/hooks/api/build/build-tickets-subresource-schema", () => ({
  bulkUpdateResultContract: { parse: (v: unknown) => v },
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

import { toast } from "sonner";

function makeTicket(id: number, projectId: number): AllWorkTicket {
  return {
    id,
    title: `Ticket ${id}`,
    type: "TASK",
    status: "TODO",
    priority: null,
    projectId,
    projectKey: "ENG",
    projectName: "Engineering",
    ticketNumber: id,
    epicId: null,
    assigneeId: null,
    points: null,
    estimate: null,
    version: 1,
    rank: null,
    startDate: null,
    dueDate: null,
    cycleId: null,
    createdAt: null,
    updatedAt: null,
    assignee: null,
    labels: [],
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useMyWorkBulk — Promise.allSettled fan-out", () => {
  it("calls one bulk POST per project for a cross-project selection", async () => {
    const tickets = [makeTicket(1, 10), makeTicket(2, 20)];
    mockPost.mockResolvedValue({ updated: 1, ticketIds: [1] });

    const { result } = renderHook(() =>
      useMyWorkBulk(tickets, "rank", "desc"),
    );

    act(() => {
      result.current.setTableSelection(new Set([1, 2]));
    });

    await act(async () => {
      result.current.handleBulkStatus("IN_PROGRESS");
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockPost).toHaveBeenCalledTimes(2);
    const projectIds = mockPost.mock.calls.map(
      ([url]: [string]) => url.split("/")[2],
    );
    expect(projectIds).toContain("10");
    expect(projectIds).toContain("20");
  });

  it("reports partial success by toasting updated count even when one project fails", async () => {
    const tickets = [makeTicket(1, 10), makeTicket(2, 20)];
    mockPost
      .mockResolvedValueOnce({ updated: 1, ticketIds: [1] })
      .mockRejectedValueOnce(new Error("Server error"));

    const { result } = renderHook(() =>
      useMyWorkBulk(tickets, "rank", "desc"),
    );

    act(() => {
      result.current.setTableSelection(new Set([1, 2]));
    });

    await act(async () => {
      result.current.handleBulkPriority("HIGH");
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(toast.success).toHaveBeenCalledWith(
      expect.stringMatching(/1 ticket/i),
    );
    expect(toast.error).toHaveBeenCalled();
  });

  it("surfaces a 409 conflict as a distinct conflict toast, not a generic error", async () => {
    const tickets = [makeTicket(1, 10), makeTicket(2, 20)];

    const conflictError = new ApiError("Conflict", 409, "CONFLICT");
    mockPost
      .mockResolvedValueOnce({ updated: 1, ticketIds: [1] })
      .mockRejectedValueOnce(conflictError);

    const { result } = renderHook(() =>
      useMyWorkBulk(tickets, "rank", "desc"),
    );

    act(() => {
      result.current.setTableSelection(new Set([1, 2]));
    });

    await act(async () => {
      result.current.handleBulkAssignee("user-1");
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const conflictToastCall = (toast.error as jest.Mock).mock.calls.find(
      ([msg]: [string]) => /conflict/i.test(msg) || /retry/i.test(msg),
    );
    expect(conflictToastCall).toBeTruthy();
  });

  it("reports a 409 PROJECT_LOCKED as the lock it is, not as a conflict to retry", async () => {
    const tickets = [makeTicket(1, 10)];
    mockPost.mockRejectedValueOnce(
      new ApiError("This project is completed. Reopen it before making changes.", 409, "PROJECT_LOCKED", {
        state: "COMPLETED",
      }),
    );

    const { result } = renderHook(() =>
      useMyWorkBulk(tickets, "rank", "desc"),
    );

    act(() => {
      result.current.setTableSelection(new Set([1]));
    });

    await act(async () => {
      result.current.handleBulkAssignee("user-1");
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(toast.error).toHaveBeenCalledWith(
      "This project is completed — reopen it to make changes.",
    );
    expect(toast.error).not.toHaveBeenCalledWith(expect.stringMatching(/had a conflict/));
  });

  it("clears selection when sortField changes", () => {
    const tickets = [makeTicket(1, 10)];
    const initialProps: { sortField: "rank" | "priority" } = {
      sortField: "rank",
    };
    const { result, rerender } = renderHook(
      ({ sortField }: { sortField: "rank" | "priority" }) =>
        useMyWorkBulk(tickets, sortField, "desc"),
      { initialProps },
    );

    act(() => {
      result.current.setTableSelection(new Set([1]));
    });
    expect(result.current.selectedCount).toBe(1);

    rerender({ sortField: "priority" });
    expect(result.current.selectedCount).toBe(0);
  });
});
