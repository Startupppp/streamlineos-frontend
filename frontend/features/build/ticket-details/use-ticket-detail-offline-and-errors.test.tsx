import { act, renderHook } from "@testing-library/react";
import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-envelope";
import { useTicketDetail } from "./use-ticket-detail";

const mockMutateAsync = jest.fn();
const mockRefetchTicket = jest.fn();
let mockTicket = {
  id: 7,
  title: "Regression ticket",
  updatedAt: "2026-09-15T10:00:00.000Z",
  version: 4,
};
let mockUpdateOptions: {
  onSuccess?: (data: { updated: boolean; updatedAt: string; version: number }) => void;
  onError?: (error: unknown, variables: Record<string, unknown>) => void;
} = {};

jest.mock("@/hooks/api/build/tickets", () => ({
  useTicket: () => ({
    data: mockTicket,
    isLoading: false,
    error: null,
    refetch: mockRefetchTicket,
  }),
  useSubtasks: () => ({ data: [] }),
  useUpdateTicket: (_projectId: number, options: typeof mockUpdateOptions) => {
    mockUpdateOptions = options;
    return { mutateAsync: mockMutateAsync };
  },
  useDeleteTicket: () => ({ mutate: jest.fn(), isPending: false }),
}));

let mockProject: { members: unknown[]; statuses: unknown[] } = {
  members: [],
  statuses: [],
};

jest.mock("@/hooks/api/build/projects", () => ({
  useProject: () => ({ data: mockProject }),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), warning: jest.fn(), error: jest.fn() },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

let mockIsOnline = true;

jest.mock("@/hooks/common/use-online-status", () => ({
  useOnlineStatus: () => mockIsOnline,
}));

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockMutateAsync.mockReset();
  mockRefetchTicket.mockReset();
  mockTicket = {
    id: 7,
    title: "Regression ticket",
    updatedAt: "2026-09-15T10:00:00.000Z",
    version: 4,
  };
  mockRefetchTicket.mockResolvedValue({ data: mockTicket, error: null });
  mockUpdateOptions = {};
  mockProject = { members: [], statuses: [] };
  mockIsOnline = true;
});

describe("useTicketDetail offline drafts — an edit made offline is kept, not dropped", () => {
  it("sends no command while the browser is offline and reports the field it is holding", () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    mockIsOnline = false;
    const { result } = renderHook(() => useTicketDetail({ projectId: 5, ticketId: 7 }), {
      wrapper: wrapper(client),
    });
    act(() => {
      result.current.autoSave({ priority: "HIGH" });
    });
    expect(mockMutateAsync).not.toHaveBeenCalled();
    expect(result.current.offlineDraftFields).toEqual(["priority"]);
  });

  it("sends the held draft once connectivity returns, so the offline edit is not lost", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    mockMutateAsync.mockResolvedValue({ updated: true });
    mockIsOnline = false;
    const { result, rerender } = renderHook(
      () => useTicketDetail({ projectId: 5, ticketId: 7 }),
      { wrapper: wrapper(client) },
    );
    act(() => {
      result.current.autoSave({ priority: "HIGH" });
      result.current.autoSave({ points: 3 });
    });
    expect(result.current.offlineDraftFields).toEqual(["priority", "points"]);
    mockIsOnline = true;
    await act(async () => {
      rerender();
    });
    expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ ticketId: 7, version: 4, priority: "HIGH", points: 3 }),
    );
    expect(result.current.offlineDraftFields).toEqual([]);
  });

  it("sends the command immediately when the browser is online, proving the offline branch is not always on", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    mockMutateAsync.mockResolvedValue({ updated: true });
    const { result } = renderHook(() => useTicketDetail({ projectId: 5, ticketId: 7 }), {
      wrapper: wrapper(client),
    });
    await act(async () => {
      result.current.autoSave({ priority: "HIGH" });
    });
    expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    expect(result.current.offlineDraftFields).toEqual([]);
  });
});

describe("useTicketDetail error handling — ambiguous and validation error cases", () => {
  it("shows an ambiguous-outcome warning for a network TypeError instead of a generic error toast so the user knows the save may have gone through", async () => {
    const networkError = new TypeError("Failed to fetch");
    mockMutateAsync.mockImplementation((variables: Record<string, unknown>) => {
      mockUpdateOptions.onError?.(networkError, variables);
      return Promise.reject(networkError);
    });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const { result } = renderHook(() => useTicketDetail({ projectId: 5, ticketId: 7 }), {
      wrapper: wrapper(client),
    });
    await act(async () => {
      result.current.autoSave({ status: "IN_PROGRESS" });
      await Promise.resolve();
    });

    const warn = (toast as unknown as { warning: jest.Mock }).warning;
    const err = (toast as unknown as { error: jest.Mock }).error;
    expect(warn).toHaveBeenCalledWith(
      "This save may have succeeded. Check the ticket before retrying.",
    );
    expect(err).not.toHaveBeenCalled();
  });

  it("shows a validation error toast for a 422 response and does not show the ambiguous warning", async () => {
    const validationError = new ApiError("Validation failed", 422, "VALIDATION_FAILED");
    mockMutateAsync.mockImplementation((variables: Record<string, unknown>) => {
      mockUpdateOptions.onError?.(validationError, variables);
      return Promise.reject(validationError);
    });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const { result } = renderHook(() => useTicketDetail({ projectId: 5, ticketId: 7 }), {
      wrapper: wrapper(client),
    });
    await act(async () => {
      result.current.autoSave({ status: "IN_PROGRESS" });
      await Promise.resolve();
    });

    const err = (toast as unknown as { error: jest.Mock }).error;
    const warn = (toast as unknown as { warning: jest.Mock }).warning;
    expect(err).toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it("sends expectedUpdatedAt and version on every save so the server can detect stale edits", async () => {
    mockMutateAsync.mockResolvedValue({
      updated: true,
      updatedAt: "2026-09-15T10:05:00.000Z",
      version: 5,
    });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const { result } = renderHook(() => useTicketDetail({ projectId: 5, ticketId: 7 }), {
      wrapper: wrapper(client),
    });
    await act(async () => {
      result.current.autoSave({ title: "My title" });
      await Promise.resolve();
    });

    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        ticketId: 7,
        expectedUpdatedAt: "2026-09-15T10:00:00.000Z",
        version: 4,
        title: "My title",
      }),
    );
  });
});
