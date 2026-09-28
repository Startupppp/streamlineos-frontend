import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-envelope";
import { ticketUpdateRequestContract } from "@/hooks/api/build/build-tickets-subresource-schema";
import { TicketConflictDialog } from "./ticket-conflict-dialog";
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

function member(id: string, name: string) {
  return {
    user: { id, name, firstName: null, lastName: null, image: null, email: `${id}@example.test` },
  };
}

let harnessAutoSave: ((field: Record<string, unknown>) => void) | null = null;

function ConflictHarness() {
  const detail = useTicketDetail({ projectId: 5, ticketId: 7 });
  harnessAutoSave = detail.autoSave;
  return (
    <TicketConflictDialog
      open={Boolean(detail.conflict)}
      fields={detail.conflict?.fields ?? []}
      isReapplying={detail.saving}
      onKeepMine={detail.keepConflictingEdit}
      onDiscard={detail.discardConflictingEdit}
    />
  );
}

async function renderConflict(
  patch: Record<string, unknown>,
  serverRow: Record<string, unknown>,
) {
  const conflict = new ApiError("conflict", 409, "PROJECTS_TICKET_CONFLICT");
  mockMutateAsync.mockImplementation((variables: Record<string, unknown>) => {
    mockUpdateOptions.onError?.(conflict, variables);
    return Promise.reject(conflict);
  });
  mockRefetchTicket.mockResolvedValue({ data: serverRow, error: null });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <ConflictHarness />
    </QueryClientProvider>,
  );
  await act(async () => {
    harnessAutoSave?.(patch);
    await Promise.resolve();
  });
  await act(async () => {
    await Promise.resolve();
  });
}

function comparisonRows() {
  return screen.queryAllByRole("listitem").map((row) => ({
    label: row.querySelector("p")?.textContent ?? "",
    text: row.textContent ?? "",
  }));
}

it("shows a field-level comparison naming the one field that drifted under the user", async () => {
  await renderConflict(
    { status: "IN_PROGRESS" },
    { ...mockTicket, status: "DONE", updatedAt: "2026-09-15T10:30:00.000Z" },
  );

  expect(screen.getByRole("dialog")).toHaveTextContent(
    "This issue changed while you were editing",
  );
  const rows = comparisonRows();
  expect(rows).toHaveLength(1);
  expect(rows[0].label).toBe("Status");
  expect(rows[0].text).toContain("DONE");
  expect(rows[0].text).toContain("IN_PROGRESS");
  expect(screen.getByText("On the server now")).toBeInTheDocument();
  expect(screen.getByText("Your edit")).toBeInTheDocument();
});

it("shows one comparison row per drifted field when several changed under the user", async () => {
  await renderConflict(
    { title: "My title", status: "IN_PROGRESS", priority: "URGENT", dueDate: "2026-10-01" },
    {
      ...mockTicket,
      title: "Their title",
      status: "DONE",
      priority: "LOW",
      dueDate: "2026-09-20",
      updatedAt: "2026-09-15T10:30:00.000Z",
    },
  );

  const rows = comparisonRows();
  expect(rows.map((row) => row.label)).toEqual([
    "Title",
    "Status",
    "Priority",
    "Due date",
  ]);
  expect(rows[0].text).toContain("Their title");
  expect(rows[0].text).toContain("My title");
  expect(rows[1].text).toContain("DONE");
  expect(rows[1].text).toContain("IN_PROGRESS");
  expect(rows[2].text).toContain("LOW");
  expect(rows[2].text).toContain("URGENT");
  expect(rows[3].text).toMatch(/Sep/);
  expect(rows[3].text).toMatch(/Oct/);
  expect(rows[3].text).not.toContain("2026-10-01");
});

it("does not present a field as conflicting when the server already holds the value the user typed", async () => {
  await renderConflict(
    { status: "DONE" },
    { ...mockTicket, status: "DONE", updatedAt: "2026-09-15T10:30:00.000Z" },
  );

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(comparisonRows()).toHaveLength(0);
  expect((toast as unknown as { warning: jest.Mock }).warning).toHaveBeenCalled();
});

it("names the assignees in the comparison instead of their ids and reports the drift once", async () => {
  mockProject = {
    members: [member("u1", "Ada Lovelace"), member("u2", "Grace Hopper")],
    statuses: [],
  };

  await renderConflict(
    { assigneeId: "u2", assigneeIds: ["u2"] },
    {
      ...mockTicket,
      assignees: [{ userId: "u1" }],
      updatedAt: "2026-09-15T10:30:00.000Z",
    },
  );

  const rows = comparisonRows();
  expect(rows).toHaveLength(1);
  expect(rows[0].label).toBe("Assignees");
  expect(rows[0].text).toContain("Ada Lovelace");
  expect(rows[0].text).toContain("Grace Hopper");
  expect(rows[0].text).not.toContain("u1");
  expect(rows[0].text).not.toContain("u2");
});

it("re-sends the pending edit against the server version the comparison displayed when the user keeps their changes", async () => {
  await renderConflict(
    { status: "IN_PROGRESS" },
    { ...mockTicket, status: "DONE", updatedAt: "2026-09-15T10:30:00.000Z", version: 5 },
  );

  mockMutateAsync.mockReset();
  mockMutateAsync.mockResolvedValue({
    updated: true,
    updatedAt: "2026-09-15T11:00:00.000Z",
    version: 6,
  });

  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Keep my changes" }));
    await Promise.resolve();
  });

  expect(mockMutateAsync).toHaveBeenCalledWith({
    ticketId: 7,
    expectedUpdatedAt: "2026-09-15T10:30:00.000Z",
    version: 5,
    status: "IN_PROGRESS",
  });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("keeps the server value and sends nothing when the user discards their changes", async () => {
  await renderConflict(
    { status: "IN_PROGRESS" },
    { ...mockTicket, status: "DONE", updatedAt: "2026-09-15T10:30:00.000Z" },
  );

  mockMutateAsync.mockReset();

  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Discard my changes" }));
    await Promise.resolve();
  });

  expect(mockMutateAsync).not.toHaveBeenCalled();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("serializes rapid ticket updates with the latest server version", async () => {
  const first = deferred<{ updated: boolean; updatedAt: string; version: number }>();
  const second = deferred<{ updated: boolean; updatedAt: string; version: number }>();
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
    result.current.autoSave({ cycleId: 2 });
  });
  await act(async () => {
    await Promise.resolve();
  });

  expect(mockMutateAsync).toHaveBeenCalledTimes(1);
  expect(mockMutateAsync).toHaveBeenNthCalledWith(1, {
    ticketId: 7,
    expectedUpdatedAt: "2026-09-15T10:00:00.000Z",
    version: 4,
    status: "IN_PROGRESS",
  });

  await act(async () => {
    first.resolve({ updated: true, updatedAt: "2026-09-15T10:01:00.000Z", version: 5 });
    await first.promise;
    await Promise.resolve();
  });

  expect(mockMutateAsync).toHaveBeenCalledTimes(2);
  expect(mockMutateAsync).toHaveBeenNthCalledWith(2, {
    ticketId: 7,
    expectedUpdatedAt: "2026-09-15T10:01:00.000Z",
    version: 5,
    cycleId: 2,
  });

  await act(async () => {
    second.resolve({ updated: true, updatedAt: "2026-09-15T10:02:00.000Z", version: 6 });
    await second.promise;
  });

  expect(result.current.saving).toBe(false);
});

it("offers a reapply action on a version conflict instead of silently dropping the edit", async () => {
  const conflict = new ApiError("conflict", 409, "PROJECTS_TICKET_CONFLICT");
  mockMutateAsync.mockImplementation((variables: Record<string, unknown>) => {
    mockUpdateOptions.onError?.(conflict, variables);
    return Promise.reject(conflict);
  });

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const { result } = renderHook(
    () => useTicketDetail({ projectId: 5, ticketId: 7 }),
    { wrapper: wrapper(client) },
  );

  await act(async () => {
    result.current.autoSave({ status: "IN_PROGRESS" });
    await Promise.resolve();
  });

  const warn = (toast as unknown as { warning: jest.Mock }).warning;
  expect(warn).toHaveBeenCalled();
  const [, options] = warn.mock.calls[0] as [
    string,
    { action: { label: string; onClick: () => Promise<void> } },
  ];
  expect(options.action.label).toBe("Reapply");

  mockRefetchTicket.mockResolvedValue({
    data: {
      ...mockTicket,
      title: "Changed elsewhere",
      updatedAt: "2026-09-15T10:30:00.000Z",
      version: 5,
    },
    error: null,
  });
  mockMutateAsync.mockClear();
  mockMutateAsync.mockImplementation(() =>
    Promise.resolve({ updated: true, updatedAt: "2026-09-15T11:00:00.000Z", version: 6 }),
  );
  await act(async () => {
    await options.action.onClick();
    await Promise.resolve();
  });

  expect(mockMutateAsync).toHaveBeenCalledWith(
    expect.objectContaining({
      ticketId: 7,
      status: "IN_PROGRESS",
      expectedUpdatedAt: "2026-09-15T10:30:00.000Z",
      version: 5,
    }),
  );
});

it("sends a body the backend update schema accepts, version token included", async () => {
  mockMutateAsync.mockResolvedValue({
    updated: true,
    updatedAt: "2026-09-15T10:05:00.000Z",
    version: 5,
  });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const { result } = renderHook(
    () => useTicketDetail({ projectId: 5, ticketId: 7 }),
    { wrapper: wrapper(client) },
  );

  await act(async () => {
    result.current.autoSave({ status: "IN_PROGRESS", priority: "URGENT" });
    await Promise.resolve();
  });

  const sent = mockMutateAsync.mock.calls[0][0] as Record<string, unknown>;
  const body: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(sent)) {
    if (key !== "ticketId") body[key] = value;
  }
  expect(body.version).toBe(4);
  expect(ticketUpdateRequestContract.safeParse(body).success).toBe(true);
});

it("would be rejected by the backend update schema if the version token were dropped", async () => {
  mockMutateAsync.mockResolvedValue({
    updated: true,
    updatedAt: "2026-09-15T10:05:00.000Z",
    version: 5,
  });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const { result } = renderHook(
    () => useTicketDetail({ projectId: 5, ticketId: 7 }),
    { wrapper: wrapper(client) },
  );

  await act(async () => {
    result.current.autoSave({ status: "IN_PROGRESS" });
    await Promise.resolve();
  });

  const sent = mockMutateAsync.mock.calls[0][0] as Record<string, unknown>;
  const withoutToken: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(sent)) {
    if (key !== "ticketId" && key !== "version") withoutToken[key] = value;
  }
  expect(ticketUpdateRequestContract.safeParse(withoutToken).success).toBe(false);
});

it("resyncs the title when the same ticket receives a newer server version", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const { result, rerender } = renderHook(
    () => useTicketDetail({ projectId: 5, ticketId: 7 }),
    { wrapper: wrapper(client) },
  );

  expect(result.current.localTitle).toBe("Regression ticket");

  mockTicket = {
    ...mockTicket,
    title: "Updated regression ticket",
    updatedAt: "2026-09-15T10:45:00.000Z",
  };
  await act(async () => {
    rerender();
    await Promise.resolve();
  });

  expect(result.current.localTitle).toBe("Updated regression ticket");
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
