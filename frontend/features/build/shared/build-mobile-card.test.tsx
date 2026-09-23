import { fireEvent, render, screen } from "@testing-library/react";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { BuildMobileCard } from "./build-mobile-card";

interface Row {
  id: number;
  name: string;
  status: string;
  owner: { firstName: string; lastName: string };
  progress: number;
}

const ROWS: Row[] = [
  {
    id: 1,
    name: "Atlas migration",
    status: "Active",
    owner: { firstName: "Priya", lastName: "Nair" },
    progress: 62,
  },
];

const COLUMNS = [
  { key: "name", header: "Name", cell: (row: Row) => row.name },
  { key: "status", header: "Status", cell: (row: Row) => row.status },
  {
    key: "owner",
    header: "Owner",
    cell: (row: Row) => `${row.owner.firstName} ${row.owner.lastName}`,
  },
];

function renderCard(row: Row) {
  return (
    <BuildMobileCard
      title={row.name}
      status={<span>{row.status}</span>}
      person={{ user: row.owner, role: "Owner" }}
      meta={[
        { label: "Progress", value: `${row.progress}%` },
        { label: "Projects", value: 4 },
      ]}
      actions={
        <button type="button" aria-label={`Actions for ${row.name}`}>
          ⋯
        </button>
      }
    />
  );
}

function getRowKey(row: Row) {
  return row.id;
}

describe("BuildMobileCard", () => {
  it("shows identity, status, the owner's name and the row actions", () => {
    render(renderCard(ROWS[0]));
    expect(screen.getByText("Atlas migration")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Priya Nair")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Actions for Atlas migration" }),
    ).toBeInTheDocument();
  });

  it("announces which role the person holds instead of showing an id", () => {
    render(renderCard(ROWS[0]));
    expect(screen.getByText("Owner:")).toBeInTheDocument();
    expect(screen.queryByText(/[0-9a-f]{8}-[0-9a-f]{4}/)).toBeNull();
  });

  it("names an unassigned owner rather than leaving the field blank", () => {
    render(
      <BuildMobileCard
        title="Unowned"
        person={{ user: null, role: "Owner" }}
      />,
    );
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
  });

  it("renders the initials fallback for an avatar-less person", () => {
    render(renderCard(ROWS[0]));
    expect(screen.getByText("PN")).toBeInTheDocument();
  });
});

describe("Build list cards inside DataTable", () => {
  it("keeps the desktop table available beside the mobile cards", () => {
    const { container } = render(
      <DataTable
        data={ROWS}
        columns={COLUMNS}
        getRowKey={getRowKey}
        mobileCard={renderCard}
        pagination={{ pageSize: 25 }}
      />,
    );
    expect(container.querySelector("table")).not.toBeNull();
    expect(container.querySelector(".sm\\:hidden")).not.toBeNull();
  });

  it("activates a card from the keyboard the way a row does", () => {
    const onRowClick = jest.fn();
    const { container } = render(
      <DataTable
        data={ROWS}
        columns={COLUMNS}
        getRowKey={getRowKey}
        mobileCard={renderCard}
        onRowClick={onRowClick}
        pagination={{ pageSize: 25 }}
      />,
    );
    const card = container.querySelector<HTMLElement>(
      ".sm\\:hidden [role=button][tabindex='0']",
    );
    expect(card).not.toBeNull();
    fireEvent.keyDown(card as HTMLElement, { key: "Enter" });
    expect(onRowClick).toHaveBeenCalledWith(ROWS[0]);
  });
});

describe("Build list empty states", () => {
  it("offers the create action when the dataset is truly empty", () => {
    render(
      <EmptyState
        title="No portfolios yet"
        description="Create a portfolio to group and govern your projects."
        action={{ label: "New portfolio" }}
        onClearFilters={jest.fn()}
      />,
    );
    expect(screen.getByText("No portfolios yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New portfolio" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear filters" })).toBeNull();
  });

  it("offers Clear filters instead of Create when filters caused the emptiness", () => {
    const onClearFilters = jest.fn();
    render(
      <EmptyState
        title="No portfolios yet"
        action={{ label: "New portfolio" }}
        filtersActive
        onClearFilters={onClearFilters}
      />,
    );
    expect(screen.getByText("No results match your filters.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "New portfolio" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });

  it("gives a full-page empty state the large illustration box and a fill chain", () => {
    const { container } = render(<EmptyState title="No portfolios yet" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("flex-1");
    expect(root.className).toContain("h-full");
    expect(root.querySelector("img")).not.toBeNull();
    expect(container.querySelector(".size-48")).not.toBeNull();
  });

  it("states a refusal rather than emptiness when the read was denied", () => {
    render(
      <EmptyState
        title="No portfolios yet"
        access={{
          permission: "build:portfolios:view",
          allowed: false,
          denied: true,
          pending: false,
        }}
      />,
    );
    expect(screen.queryByText("No portfolios yet")).toBeNull();
  });
});

describe("Build list loading skeleton", () => {
  it("mirrors the mobile cards instead of a table the page will not paint", () => {
    const { container } = render(
      <DataTableSkeleton mobileCards rows={3} headers={["Name", "Status", "Owner"]} />,
    );
    const cards = container.querySelector('[class~="sm:hidden"]');
    expect(cards).not.toBeNull();
    expect(container.querySelector('[class~="sm:block"]')).not.toBeNull();
  });

  it("names the real columns instead of numbered placeholders", () => {
    render(<DataTableSkeleton headers={["Name", "Status", "Owner"]} />);
    for (const header of ["Name", "Status", "Owner"]) {
      expect(screen.getByRole("columnheader", { name: header })).toBeInTheDocument();
    }
    expect(screen.queryByText("Column 1")).toBeNull();
  });

  it("falls back to numbered placeholders only when a caller passes a count", () => {
    render(<DataTableSkeleton columns={2} />);
    expect(screen.getByText("Column 1")).toBeInTheDocument();
  });
});
