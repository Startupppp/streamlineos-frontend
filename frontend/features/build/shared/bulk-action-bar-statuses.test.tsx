import { render, screen } from "@testing-library/react";
import { BulkActionBar } from "./bulk-action-bar";

let grantedKeys: string[] = ["build:tickets:update"];

jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => grantedKeys.includes(key),
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

beforeEach(() => {
  grantedKeys = ["build:tickets:update"];
});

function mountBar(
  statuses: { name: string; color: string | null; type: string | null }[] | undefined,
) {
  render(
    <BulkActionBar
      selectedCount={2}
      members={[]}
      cycles={[]}
      statuses={statuses}
      hideCycle
      onBulkStatus={noopString}
      onBulkPriority={noopString}
      onBulkAssignee={noopString}
      onBulkCycle={noopString}
      onBulkArchive={noop}
      onBulkExport={noop}
      onClear={noop}
    />,
  );
}

function renderBar(statuses: { name: string; color: string | null; type: string | null }[] | undefined) {
  mountBar(statuses);
  return screen
    .getAllByTestId("status-option")
    .map((node) => node.getAttribute("data-value"));
}

describe("BulkActionBar — permission gate (FE-44)", () => {
  const statuses = [{ name: "TODO", color: null, type: "unstarted" }];

  it("renders no bulk controls at all when build:tickets:update is denied", () => {
    grantedKeys = [];
    mountBar(statuses);
    expect(screen.queryByTestId("status-option")).not.toBeInTheDocument();
    expect(screen.queryByText("Set Status")).not.toBeInTheDocument();
    expect(screen.queryByText("Archive")).not.toBeInTheDocument();
    expect(screen.queryByText("Export")).not.toBeInTheDocument();
  });

  it("renders the bulk controls when build:tickets:update is granted, proving the denial test is not passing on a control that cannot render", () => {
    grantedKeys = ["build:tickets:update"];
    mountBar(statuses);
    expect(screen.getAllByTestId("status-option").length).toBeGreaterThan(0);
    expect(screen.getByText("Set Status")).toBeInTheDocument();
    expect(screen.getByText("Archive")).toBeInTheDocument();
    expect(screen.getByText("Export")).toBeInTheDocument();
  });

  it("hides the assign control when build:tickets:assign is denied even though update is granted", () => {
    grantedKeys = ["build:tickets:update"];
    mountBar(statuses);
    expect(screen.queryByText("Assign to")).not.toBeInTheDocument();
  });

  it("shows the assign control once build:tickets:assign is granted", () => {
    grantedKeys = ["build:tickets:update", "build:tickets:assign"];
    mountBar(statuses);
    expect(screen.getByText("Assign to")).toBeInTheDocument();
  });
});

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
