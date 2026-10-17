import { fireEvent, render, screen } from "@testing-library/react";
import { TicketChecklists } from "./ticket-checklists";

let mockCanUpdate = true;
let mockPageStateResolution: { kind: string; error?: unknown } = { kind: "ready" };
let mockChecklistsResult: {
  data: { id: number; title: string; items: unknown[] }[];
  isLoading: boolean;
  isError?: boolean;
  error?: Error;
  refetch?: () => void;
} = { data: [], isLoading: false, refetch: jest.fn() };

const mockCreateMutate = jest.fn();

jest.mock("@/hooks/api/build/checklists", () => ({
  useChecklists: () => mockChecklistsResult,
  useCreateChecklist: () => ({ mutate: mockCreateMutate, isPending: false }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => mockCanUpdate,
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: () => mockPageStateResolution,
}));

jest.mock("@/features/build/ai/ticket-detail-ai", () => ({
  TicketAiGenerateChecklistAction: () => null,
}));

jest.mock("./checklist-section", () => ({
  ChecklistSection: ({ checklist }: { checklist: { title: string } }) => (
    <div>{checklist.title}</div>
  ),
}));

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("sonner", () => ({ toast: { error: jest.fn() } }));

beforeEach(() => {
  jest.clearAllMocks();
  mockCanUpdate = true;
  mockPageStateResolution = { kind: "ready" };
  mockChecklistsResult = { data: [], isLoading: false, refetch: jest.fn() };
});

it("does not show the empty state text while checklists are loading", () => {
  mockPageStateResolution = { kind: "loading" };

  render(<TicketChecklists projectId={1} ticketId={5} />);

  expect(screen.queryByText(/No checklists on this ticket yet/)).not.toBeInTheDocument();
});

it("shows a retry button and no empty text when the checklists fetch fails, so a transient error never reads as no checklists", () => {
  const refetch = jest.fn();
  mockPageStateResolution = { kind: "error", error: new Error("Server error") };
  mockChecklistsResult = {
    data: [],
    isLoading: false,
    isError: true,
    error: new Error("Server error"),
    refetch,
  };

  render(<TicketChecklists projectId={1} ticketId={5} />);

  expect(screen.queryByText(/No checklists on this ticket yet/)).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(refetch).toHaveBeenCalledTimes(1);
});

it("shows the editable empty message when a user with update permission has no checklists", () => {
  render(<TicketChecklists projectId={1} ticketId={5} />);

  expect(screen.getByText("No checklists on this ticket yet. Add one to break the work into steps.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Add checklist" })).toBeInTheDocument();
});

it("shows a read-only empty message and no add button when the user cannot update", () => {
  mockCanUpdate = false;

  render(<TicketChecklists projectId={1} ticketId={5} />);

  expect(screen.getByText("No checklists on this ticket yet.")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Add checklist" })).not.toBeInTheDocument();
});

it("renders loaded checklist items in the ready state", () => {
  mockChecklistsResult = {
    data: [
      { id: 1, title: "Setup tests", items: [] },
      { id: 2, title: "Deploy to staging", items: [] },
    ],
    isLoading: false,
    refetch: jest.fn(),
  };

  render(<TicketChecklists projectId={1} ticketId={5} />);

  expect(screen.getByText("Setup tests")).toBeInTheDocument();
  expect(screen.getByText("Deploy to staging")).toBeInTheDocument();
  expect(screen.queryByText(/No checklists/)).not.toBeInTheDocument();
});
