import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useTicketDetail } from "./use-ticket-detail";

const mockMutateAsync = jest.fn();
let mockUpdateOptions: {
  onSuccess?: (data: { updated: boolean; updatedAt: string }) => void;
} = {};

jest.mock("@/hooks/api", () => ({
  useTicket: () => ({
    data: {
      id: 7,
      title: "Regression ticket",
      updatedAt: "2026-09-15T10:00:00.000Z",
    },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
  useProject: () => ({ data: { members: [], statuses: [] } }),
  useSprints: () => ({ data: [] }),
  useSubtasks: () => ({ data: [] }),
  useUpdateTicket: (_projectId: number, options: typeof mockUpdateOptions) => {
    mockUpdateOptions = options;
    return { mutateAsync: mockMutateAsync };
  },
  useDeleteTicket: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), warning: jest.fn(), error: jest.fn() },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  mockMutateAsync.mockReset();
  mockUpdateOptions = {};
});

it("serializes rapid ticket updates with the latest server version", async () => {
  const first = deferred<{ updated: boolean; updatedAt: string }>();
  const second = deferred<{ updated: boolean; updatedAt: string }>();
  mockMutateAsync
    .mockImplementationOnce(() =>
      first.promise.then((data) => {
        mockUpdateOptions.onSuccess?.(data);
        return data;
      }),
    )
    .mockImplementationOnce(() =>
      second.promise.then((data) => {
        mockUpdateOptions.onSuccess?.(data);
        return data;
      }),
    );

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const { result } = renderHook(
    () => useTicketDetail({ projectId: 5, ticketId: 7 }),
    { wrapper: wrapper(client) },
  );

  act(() => {
    result.current.autoSave({ status: "IN_PROGRESS" });
    result.current.autoSave({ sprintId: 2 });
  });
  await act(async () => {
    await Promise.resolve();
  });

  expect(mockMutateAsync).toHaveBeenCalledTimes(1);
  expect(mockMutateAsync).toHaveBeenNthCalledWith(1, {
    ticketId: 7,
    expectedUpdatedAt: "2026-09-15T10:00:00.000Z",
    status: "IN_PROGRESS",
  });

  await act(async () => {
    first.resolve({ updated: true, updatedAt: "2026-09-15T10:01:00.000Z" });
    await first.promise;
    await Promise.resolve();
  });

  expect(mockMutateAsync).toHaveBeenCalledTimes(2);
  expect(mockMutateAsync).toHaveBeenNthCalledWith(2, {
    ticketId: 7,
    expectedUpdatedAt: "2026-09-15T10:01:00.000Z",
    sprintId: 2,
  });

  await act(async () => {
    second.resolve({ updated: true, updatedAt: "2026-09-15T10:02:00.000Z" });
    await second.promise;
  });

  expect(result.current.saving).toBe(false);
});
