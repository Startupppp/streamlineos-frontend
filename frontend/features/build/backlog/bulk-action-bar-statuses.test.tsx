import { render, screen } from "@testing-library/react";
import { BulkActionBar } from "./bulk-action-bar";

jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => key === "build:tickets:update",
}));
jest.mock("@/hooks/api/build/ticket-search", () => ({
  useTicketSearch: () => ({ data: [] }),
}));
jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <div data-testid="status-option" data-value={value}>
      {children}
    </div>
  ),
}));

const noop = () => {};
const noopString = (_value: string) => {};

function renderBar(statuses: { name: string; color: string | null; type: string | null }[] | undefined) {
  render(
    <BulkActionBar
      selectedCount={2}
      members={[]}
      sprints={[]}
      statuses={statuses}
      hideSprint
      onBulkStatus={noopString}
      onBulkPriority={noopString}
      onBulkAssignee={noopString}
      onBulkSprint={noopString}
      onClear={noop}
    />,
  );
  return screen
    .getAllByTestId("status-option")
    .map((node) => node.getAttribute("data-value"));
}

describe("the bulk Set Status menu", () => {
  it("offers the organisation's configured workflow states, because a bulk transition to a state absent from the menu cannot be performed at all", () => {
    const values = renderBar([
      { name: "CODE_REVIEW", color: "#0f0", type: "started" },
      { name: "BLOCKED", color: "#f00", type: "started" },
    ]);
    expect(values).toEqual(
      expect.arrayContaining(["CODE_REVIEW", "BLOCKED", "LOW", "MEDIUM", "HIGH", "URGENT"]),
    );
    expect(values).not.toContain("IN_REVIEW");
  });

  it("falls back to the four default states while the org's states are still loading, so the menu is never empty", () => {
    const values = renderBar(undefined);
    expect(values).toEqual(
      expect.arrayContaining(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]),
    );
  });

  it("labels a custom state without its underscores rather than echoing the stored enum value", () => {
    renderBar([{ name: "CODE_REVIEW", color: null, type: "started" }]);
    expect(screen.getByText("CODE REVIEW")).toBeInTheDocument();
  });
});
