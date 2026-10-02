import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { QuickAddInput } from "./kanban-quick-add";

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

jest.mock("@/hooks/api/build/tickets", () => ({
  useCreateTicket: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("@animateicons/react/lucide", () => ({
  PlusIcon: () => null,
}));

function renderQuickAdd() {
  const client = createAppQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<QuickAddInput columnId="TODO" projectId={1} />, { wrapper });
}

function openPanel() {
  renderQuickAdd();
  fireEvent.click(screen.getByLabelText("Add ticket to column"));
  const panel = screen.getByPlaceholderText("Ticket title...").closest("div.absolute");
  if (!(panel instanceof HTMLElement)) {
    throw new Error("quick-add panel not found");
  }
  return panel;
}

function backgroundClasses(el: HTMLElement) {
  return Array.from(el.classList).filter((c) => c.startsWith("bg-"));
}

describe("kanban quick-add panel opacity (FE-352)", () => {
  it("floats above the column's ticket cards rather than taking part in layout, which is the reason its background has to be opaque", () => {
    const panel = openPanel();

    expect(panel.classList.contains("absolute")).toBe(true);
    expect(panel.classList.contains("top-full")).toBe(true);
    expect(panel.classList.contains("z-50")).toBe(true);
  });

  it("carries no fractional-opacity background utility, because a translucent overlay lets the first card's title show through and collide with the title being typed", () => {
    const panel = openPanel();

    expect(backgroundClasses(panel).filter((c) => c.includes("/"))).toEqual([]);
  });

  it("declares an opaque background, so the assertion above cannot be satisfied by removing the background altogether and leaving the panel fully transparent", () => {
    const panel = openPanel();

    expect(backgroundClasses(panel).length).toBeGreaterThan(0);
  });

  it("still shows the add button and no input before the panel is opened, so the opacity assertions are not passing against an unopened panel", () => {
    renderQuickAdd();

    expect(screen.getByLabelText("Add ticket to column")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Ticket title...")).not.toBeInTheDocument();
  });
});
