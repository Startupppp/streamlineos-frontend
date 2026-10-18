import { render, screen } from "@testing-library/react";
import { GanttView } from "./gantt-view";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/hooks/api/build/reports", () => ({
  useCriticalPath: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/build/milestones", () => ({
  useProjectMilestones: () => ({ data: [] }),
}));

jest.mock("@/hooks/api/build/ticket-update-mutation", () => ({
  useUpdateTicket: () => ({ mutate: jest.fn() }),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: () => ({ kind: "ready" }),
}));

describe("GanttView — B-080: toolbar month label reflects the visible window midpoint", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("shows November when today is late October so the label matches the month most of the visible range falls in", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-10-27T10:00:00.000Z"));

    render(<GanttView tickets={[]} projectId={1} onTicketClick={jest.fn()} />);

    const selects = screen.getAllByRole("combobox");
    const monthSelect = selects[0];
    expect(monthSelect).toHaveTextContent(/november/i);
  });

  it("shows October when today is early October so the midpoint still falls in October", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-10-05T10:00:00.000Z"));

    render(<GanttView tickets={[]} projectId={1} onTicketClick={jest.fn()} />);

    const selects = screen.getAllByRole("combobox");
    const monthSelect = selects[0];
    expect(monthSelect).toHaveTextContent(/october/i);
  });
});
