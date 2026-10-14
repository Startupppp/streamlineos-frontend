import type { ReactNode } from "react";

const mockMutate = jest.fn();
const mockInvalidateQueries = jest.fn();
let mockSearchResults: Array<{
  id: number;
  projectId: number;
  projectKey: string;
  ticketNumber: number;
  title: string;
  version: number;
}> = [];

jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}));
jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));
jest.mock("@/hooks/api/build/projects", () => ({
  useProject: () => ({ data: { key: "QAB", statuses: [] }, isLoading: false }),
}));
jest.mock("@/hooks/api/build/tickets", () => ({
  useUpdateTicket: () => ({ mutate: mockMutate, isPending: false }),
}));
jest.mock("@/hooks/api/build/ticket-search", () => ({
  useTicketSearch: () => ({ data: mockSearchResults, isFetching: false }),
}));
jest.mock("@/hooks/common/use-debounce", () => ({
  useDebouncedValue: (value: string) => value,
}));
jest.mock("@/features/build/ai/ticket-detail-ai", () => ({
  TicketAiSuggestSubtasksAction: () => null,
}));
jest.mock("./subtask-row", () => ({ SubtaskRow: () => null }));
jest.mock("./subtask-composer", () => ({ SubtaskComposer: () => null }));
jest.mock("@/components/ui/responsive-popover", () => ({
  ResponsivePopover: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ResponsivePopoverTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ResponsivePopoverContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
jest.mock("@/components/ui/command", () => ({
  Command: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CommandEmpty: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CommandInput: ({
    value,
    onValueChange,
  }: {
    value: string;
    onValueChange: (next: string) => void;
  }) => (
    <input
      aria-label="Search tickets to link"
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    />
  ),
  CommandItem: ({ children, onSelect }: { children: ReactNode; onSelect: () => void }) => (
    <button type="button" onClick={onSelect}>
      {children}
    </button>
  ),
  CommandList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

import { act, fireEvent, render, screen } from "@testing-library/react";
import type { Ticket } from "@/types/projects";
import { TicketSubtasks } from "./ticket-subtasks";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

const child = { id: 20, title: "Existing child", status: "TODO", version: 1 } as unknown as Ticket;

function result(id: number, title: string) {
  return { id, projectId: 7, projectKey: "QAB", ticketNumber: id, title, version: 4 };
}

function renderSubtasks(parentTicketId: number | null) {
  render(
    <TicketSubtasks
      ticketId={10}
      projectId={7}
      subtasks={[child]}
      parentTicketId={parentTicketId}
    />,
  );
  fireEvent.change(screen.getByLabelText("Search tickets to link"), {
    target: { value: "probe" },
  });
}

beforeEach(() => {
  mockMutate.mockClear();
  mockInvalidateQueries.mockClear();
  mockSearchResults = [];
});

describe("B-073 — linking an existing ticket as a subtask", () => {
  it("offers a candidate and attaches it to the current ticket, then refreshes the subtask list", () => {
    mockSearchResults = [result(31, "Probe candidate")];

    renderSubtasks(5);

    fireEvent.click(screen.getByRole("button", { name: /Probe candidate/ }));

    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate.mock.calls[0][0]).toEqual({
      ticketId: 31,
      version: 4,
      parentTicketId: 10,
    });

    const onSuccess = (mockMutate.mock.calls[0][1] as { onSuccess: () => void }).onSuccess;
    act(() => { onSuccess(); });

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: buildWorkQueryKeys.projects.subtasks(10, 7),
    });
  });

  it("offers neither the ticket itself, nor a ticket that is already a subtask, nor its parent", () => {
    mockSearchResults = [
      result(10, "The ticket itself"),
      result(20, "Existing child"),
      result(5, "The parent"),
      result(31, "Probe candidate"),
    ];

    renderSubtasks(5);

    expect(screen.queryByRole("button", { name: /The ticket itself/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Existing child/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /The parent/ })).toBeNull();
    expect(screen.getByRole("button", { name: /Probe candidate/ })).toBeInTheDocument();
  });

  it("offers a ticket from another project to nobody, because a subtask belongs to the same project", () => {
    mockSearchResults = [{ ...result(31, "Probe candidate"), projectId: 99 }];

    renderSubtasks(null);

    expect(screen.queryByRole("button", { name: /Probe candidate/ })).toBeNull();
    expect(screen.getByText("No matching tickets")).toBeInTheDocument();
  });
});
