import React from "react";
import { render } from "@testing-library/react";
import { renderHook, act } from "@testing-library/react";

jest.mock("@/features/build/views/list-view", () => ({
  ListView: jest.fn(() => null),
}));

jest.mock("@/features/build/views/kanban-board", () => ({
  KanbanBoard: jest.fn(() => null),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPanel: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock("@/components/ui/truncated-text", () => ({
  TruncatedText: ({ text }: { text?: string | null }) => <span>{text}</span>,
}));

jest.mock("./project-chip", () => ({
  ProjectChip: () => null,
}));

jest.mock("@/components/shared/format-ticket-key", () => ({
  getTicketDetailHref: () => "/build/1/tickets/1",
}));

jest.mock("./all-work-ticket-utils", () => ({
  toKanbanTicket: (t: unknown) => t,
}));

import { AllWorkListSection } from "./all-work-list-section";
import { AllWorkBoardSection } from "./all-work-board-section";
import type { TicketGroup } from "./all-work-ticket-utils";
import type { AllWorkTicket } from "@/types/projects";
import type { ListSelection } from "@/features/build/views/list-view-shared";
import { useItemSelectHandler } from "@/features/build/views/list-view-shared";

interface MockListViewProps {
  selection?: ListSelection;
}

function getListViewMock(): jest.Mock {
  return jest.requireMock("@/features/build/views/list-view").ListView as jest.Mock;
}

function getKanbanBoardMock(): jest.Mock {
  return jest.requireMock("@/features/build/views/kanban-board").KanbanBoard as jest.Mock;
}

const TICKET: AllWorkTicket = {
  id: 10,
  title: "T1",
  type: "TASK",
  status: "TODO",
  priority: null,
  projectId: 1,
  projectKey: "PA",
  projectName: "Project A",
  ticketNumber: 10,
  sprintId: null,
  epicId: null,
  assigneeId: null,
  points: null,
  estimate: null,
  rank: null,
  startDate: null,
  dueDate: null,
  cycleId: null,
  createdAt: null,
  updatedAt: null,
  assignee: null,
  labels: [],
};

const GROUP: TicketGroup = {
  id: 1,
  label: "Project A",
  projectId: 1,
  projectKey: "PA",
  tickets: [TICKET],
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("AllWorkListSection — selection threading", () => {
  it("ListView receives selection when tableSelection and onSelectionChange are provided", () => {
    const selected = new Set<string | number>([10]);
    const onChange = jest.fn();
    render(
      <AllWorkListSection
        groups={[GROUP]}
        tableSelection={selected}
        onSelectionChange={onChange}
      />,
    );
    const calls = getListViewMock().mock.calls as MockListViewProps[][];
    expect(calls.length).toBeGreaterThan(0);
    const props = calls[0]?.[0];
    expect(props?.selection).toBeDefined();
    expect(props?.selection?.selected).toBe(selected);
    expect(props?.selection?.onChange).toBe(onChange);
  });

  it("ListView receives no selection when props are omitted — backward compat negative", () => {
    render(<AllWorkListSection groups={[GROUP]} />);
    const calls = getListViewMock().mock.calls as MockListViewProps[][];
    expect(calls.length).toBeGreaterThan(0);
    const props = calls[0]?.[0];
    expect(props?.selection).toBeUndefined();
  });
});

describe("AllWorkBoardSection — selection threading", () => {
  it("KanbanBoard receives selection when tableSelection and onSelectionChange are provided", () => {
    const selected = new Set<string | number>([10]);
    const onChange = jest.fn();
    render(
      <AllWorkBoardSection
        groups={[GROUP]}
        tableSelection={selected}
        onSelectionChange={onChange}
      />,
    );
    const calls = getKanbanBoardMock().mock.calls as MockListViewProps[][];
    expect(calls.length).toBeGreaterThan(0);
    const props = calls[0]?.[0];
    expect(props?.selection).toBeDefined();
    expect(props?.selection?.selected).toBe(selected);
    expect(props?.selection?.onChange).toBe(onChange);
  });

  it("KanbanBoard receives no selection when props are omitted — backward compat negative", () => {
    render(<AllWorkBoardSection groups={[GROUP]} />);
    const calls = getKanbanBoardMock().mock.calls as MockListViewProps[][];
    expect(calls.length).toBeGreaterThan(0);
    const props = calls[0]?.[0];
    expect(props?.selection).toBeUndefined();
  });
});

describe("view-switch selection preservation", () => {
  it("both sections receive the same Set reference — view switch cannot reset selection", () => {
    const selected = new Set<string | number>([10, 20]);
    const onChange = jest.fn();

    const { unmount } = render(
      <AllWorkListSection
        groups={[GROUP]}
        tableSelection={selected}
        onSelectionChange={onChange}
      />,
    );
    unmount();

    render(
      <AllWorkBoardSection
        groups={[GROUP]}
        tableSelection={selected}
        onSelectionChange={onChange}
      />,
    );

    const listCalls = getListViewMock().mock.calls as MockListViewProps[][];
    const boardCalls = getKanbanBoardMock().mock.calls as MockListViewProps[][];

    const listSelection = listCalls[0]?.[0]?.selection?.selected;
    const boardSelection = boardCalls[0]?.[0]?.selection?.selected;

    expect(listSelection).toBe(selected);
    expect(boardSelection).toBe(selected);
    expect(listSelection).toBe(boardSelection);
  });
});

describe("useItemSelectHandler — selection toggle logic (mutation-proof target)", () => {
  it("adds the id to the selection set when the user checks a row", () => {
    const selected = new Set<string | number>();
    const onChange = jest.fn();
    const { result } = renderHook(() => useItemSelectHandler({ selected, onChange }));
    act(() => {
      result.current(5, true);
    });
    const updated = onChange.mock.calls[0]?.[0] as Set<string | number>;
    expect(updated).toEqual(new Set([5]));
  });

  it("removes the id from the selection set when the user unchecks a row", () => {
    const selected = new Set<string | number>([5, 6]);
    const onChange = jest.fn();
    const { result } = renderHook(() => useItemSelectHandler({ selected, onChange }));
    act(() => {
      result.current(5, false);
    });
    const updated = onChange.mock.calls[0]?.[0] as Set<string | number>;
    expect(updated.has(5)).toBe(false);
    expect(updated.has(6)).toBe(true);
  });

  it("does not mutate the original set — creates a new Set on each change", () => {
    const selected = new Set<string | number>([1]);
    const onChange = jest.fn();
    const { result } = renderHook(() => useItemSelectHandler({ selected, onChange }));
    act(() => {
      result.current(2, true);
    });
    const updated = onChange.mock.calls[0]?.[0] as Set<string | number>;
    expect(updated).not.toBe(selected);
    expect(selected.has(2)).toBe(false);
  });

  it("is a no-op when selection is undefined — backward compat positive proof", () => {
    const { result } = renderHook(() => useItemSelectHandler(undefined));
    expect(() => {
      act(() => {
        result.current(5, true);
      });
    }).not.toThrow();
  });
});
