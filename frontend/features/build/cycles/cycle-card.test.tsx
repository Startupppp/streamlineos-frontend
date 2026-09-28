import { fireEvent, render, screen } from "@testing-library/react";
import { toast } from "sonner";
import { CycleCard } from "./cycle-card";
import type { Cycle } from "@/types/projects";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, ...rest }: React.ComponentPropsWithoutRef<"a">) => (
    <a {...rest}>{children}</a>
  ),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const writeText = jest.fn();

Object.defineProperty(navigator, "clipboard", {
  value: { writeText },
  configurable: true,
});

const CYCLE = {
  id: 12,
  name: "Cycle 12",
  status: "active",
  version: 1,
  startDate: "2026-01-01",
  endDate: "2026-01-14",
  capacity: null,
  goal: null,
  progress: 40,
} as unknown as Cycle;

function renderCard(canManage: boolean) {
  const handlers = {
    onEdit: jest.fn(),
    onChangeStatus: jest.fn(),
    onPlan: jest.fn(),
    onComplete: jest.fn(),
    onDelete: jest.fn(),
  };
  const view = render(
    <CycleCard cycle={CYCLE} projectId={3} canManage={canManage} {...handlers} />,
  );
  return { ...view, handlers };
}

beforeEach(() => {
  jest.clearAllMocks();
  writeText.mockResolvedValue(undefined);
});

describe("CycleCard — right click reaches the same authorized commands as the row menu", () => {
  it("opens the actions menu on a right click, so the context gesture is not a dead end", () => {
    renderCard(true);
    expect(screen.queryByText("Plan work")).not.toBeInTheDocument();
    fireEvent.contextMenu(screen.getByText("Cycle 12"));
    expect(screen.getByText("Plan work")).toBeInTheDocument();
    expect(screen.getByText("Edit")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("opens no menu on a right click for a viewer who cannot manage cycles, so the gesture never offers a denied command", () => {
    renderCard(false);
    fireEvent.contextMenu(screen.getByText("Cycle 12"));
    expect(screen.queryByText("Plan work")).not.toBeInTheDocument();
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open Cycle 12" }),
    ).toBeInTheDocument();
  });

  it("offers Open and Copy link, so the menu mirrors the commands the card itself exposes", () => {
    renderCard(true);
    fireEvent.contextMenu(screen.getByText("Cycle 12"));
    expect(screen.getByText("Open").closest("a")).toHaveAttribute(
      "href",
      "/build/3/cycles/12",
    );
    fireEvent.click(screen.getByText("Copy link"));
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("/build/3/cycles/12"),
    );
  });

  it("reports a failed copy instead of claiming the link was copied", async () => {
    writeText.mockRejectedValue(new Error("denied"));
    renderCard(true);
    fireEvent.contextMenu(screen.getByText("Cycle 12"));
    fireEvent.click(screen.getByText("Copy link"));
    await Promise.resolve();
    await Promise.resolve();
    expect(toast.error).toHaveBeenCalledWith("Could not copy the link");
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("runs the same handler from the menu as the row action, so no command exists only in one place", () => {
    const { handlers } = renderCard(true);
    fireEvent.contextMenu(screen.getByText("Cycle 12"));
    fireEvent.click(screen.getByText("Edit"));
    expect(handlers.onEdit).toHaveBeenCalledWith(CYCLE);
  });
});

describe("CycleCard — every core field the page contract lists is on the card", () => {
  it("renders name, status, the date range, the work counts, capacity, goal and progress", () => {
    render(
      <CycleCard
        cycle={
          {
            ...CYCLE,
            capacity: 34,
            goal: "Ship the checkout rewrite",
            completedItems: 3,
            totalItems: 8,
            progress: 40,
          } as unknown as Cycle
        }
        projectId={3}
        canManage
        onEdit={jest.fn()}
        onChangeStatus={jest.fn()}
        onPlan={jest.fn()}
        onComplete={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.getByText("Cycle 12")).toBeInTheDocument();
    expect(screen.getByText("active")).toBeInTheDocument();
    expect(screen.getByText(/3\/8 done/)).toBeInTheDocument();
    expect(screen.getByText(/2026/)).toBeInTheDocument();
    expect(screen.getByText("34")).toBeInTheDocument();
    expect(screen.getByText("Ship the checkout rewrite")).toBeInTheDocument();
    expect(screen.getByText("40% complete")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "40");
  });

  it("omits capacity and goal when the cycle carries neither, so an unset field reads as unset rather than zero", () => {
    render(
      <CycleCard
        cycle={CYCLE}
        projectId={3}
        canManage
        onEdit={jest.fn()}
        onChangeStatus={jest.fn()}
        onPlan={jest.fn()}
        onComplete={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.queryByText(/capacity/)).not.toBeInTheDocument();
    expect(screen.queryByText("Ship the checkout rewrite")).not.toBeInTheDocument();
  });
});
