import { act, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-envelope";
import { TicketConflictDialog } from "./ticket-conflict-dialog";
import { useTicketDetail } from "./use-ticket-detail";

const mockMutateAsync = jest.fn();
const mockRefetchTicket = jest.fn();
const baseTicket = {
  id: 7,
  title: "Regression ticket",
  updatedAt: "2026-09-15T10:00:00.000Z",
  version: 4,
};
let mockUpdateOptions: {
  onSuccess?: (data: { updated: boolean; updatedAt: string; version: number }) => void;
  onError?: (error: unknown, variables: Record<string, unknown>) => void;
} = {};
let mockProject: { members: unknown[]; statuses: unknown[] } = {
  members: [],
  statuses: [],
};
let harnessAutoSave: ((field: Record<string, unknown>) => void) | null = null;

jest.mock("@/hooks/api/build/tickets", () => ({
  useTicket: () => ({
    data: baseTicket,
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

jest.mock("@/hooks/api/build/projects", () => ({
  useProject: () => ({ data: mockProject }),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), warning: jest.fn(), error: jest.fn() },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockMutateAsync.mockReset();
  mockRefetchTicket.mockReset();
  mockUpdateOptions = {};
  mockProject = { members: [], statuses: [] };
  harnessAutoSave = null;
});

function member(id: string, name: string) {
  return {
    user: { id, name, firstName: null, lastName: null, image: null, email: `${id}@example.test` },
  };
}

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
    { ...baseTicket, status: "DONE", updatedAt: "2026-09-15T10:30:00.000Z" },
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
      ...baseTicket,
      title: "Their title",
      status: "DONE",
      priority: "LOW",
      dueDate: "2026-09-20",
      updatedAt: "2026-09-15T10:30:00.000Z",
    },
  );

  const rows = comparisonRows();
  expect(rows.map((row) => row.label)).toEqual(["Title", "Status", "Priority", "Due date"]);
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
    { ...baseTicket, status: "DONE", updatedAt: "2026-09-15T10:30:00.000Z" },
  );

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(comparisonRows()).toHaveLength(0);
  expect((toast as unknown as { warning: jest.Mock }).warning).toHaveBeenCalledTimes(1);
});

it("names the assignees in the comparison instead of their ids and reports the drift once", async () => {
  mockProject = {
    members: [member("u1", "Ada Lovelace"), member("u2", "Grace Hopper")],
    statuses: [],
  };

  await renderConflict(
    { assigneeId: "u2", assigneeIds: ["u2"] },
    { ...baseTicket, assignees: [{ userId: "u1" }], updatedAt: "2026-09-15T10:30:00.000Z" },
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
    { ...baseTicket, status: "DONE", updatedAt: "2026-09-15T10:30:00.000Z", version: 5 },
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
    { ...baseTicket, status: "DONE", updatedAt: "2026-09-15T10:30:00.000Z" },
  );

  mockMutateAsync.mockReset();

  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Discard my changes" }));
    await Promise.resolve();
  });

  expect(mockMutateAsync).not.toHaveBeenCalled();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
