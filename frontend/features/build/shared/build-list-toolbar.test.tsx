import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { BuildListToolbar } from "./build-list-toolbar";
import { BuildFilterSelect } from "./build-filter-select";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "open", label: "Open" },
];

const SEVERITY_OPTIONS = [
  { value: "all", label: "All severities" },
  { value: "high", label: "High" },
];

function noop() {
  return undefined;
}

function statusFilter(active = false) {
  return {
    id: "status",
    label: "Status",
    active,
    control: (
      <BuildFilterSelect
        label="Status"
        value={active ? "open" : "all"}
        onValueChange={noop}
        options={STATUS_OPTIONS}
      />
    ),
  };
}

function severityFilter(active = false) {
  return {
    id: "severity",
    label: "Severity",
    active,
    control: (
      <BuildFilterSelect
        label="Severity"
        value={active ? "high" : "all"}
        onValueChange={noop}
        options={SEVERITY_OPTIONS}
      />
    ),
  };
}

const search = {
  value: "",
  onValueChange: noop,
  placeholder: "Search bugs…",
  label: "Search bugs",
};

describe("BuildListToolbar", () => {
  it("puts search before every filter in the DOM", () => {
    const { container } = render(
      <BuildListToolbar search={search} filters={[statusFilter()]} />,
    );
    const slots = container.querySelectorAll(
      "[data-slot=search-input], [data-slot=build-toolbar-filter]",
    );
    expect(slots[0]?.getAttribute("data-slot")).toBe("search-input");
    expect(slots[1]?.getAttribute("data-filter-id")).toBe("status");
  });

  it("renders a lone filter inline with no drawer trigger", () => {
    render(<BuildListToolbar filters={[statusFilter()]} />);
    expect(screen.getByLabelText("Status")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Filters/ })).toBeNull();
  });

  it("keeps search and one filter inline as two equal slots", () => {
    const { container } = render(
      <BuildListToolbar search={search} filters={[statusFilter()]} />,
    );
    expect(screen.queryByRole("button", { name: /^Filters/ })).toBeNull();
    const root = container.querySelector("[data-slot=build-list-toolbar]");
    expect(root?.className).toContain("grid-cols-2");
    const slot = container.querySelector("[data-filter-id=status]");
    expect(slot?.className).toContain("max-md:w-full");
    expect(slot?.className).not.toContain("max-md:hidden");
  });

  it("gives a lone filter the whole mobile row", () => {
    const { container } = render(<BuildListToolbar filters={[statusFilter()]} />);
    const root = container.querySelector("[data-slot=build-list-toolbar]");
    expect(root?.className).toContain("grid-cols-1");
  });

  it("keeps the collapsed row at two columns", () => {
    const { container } = render(
      <BuildListToolbar
        search={search}
        filters={[statusFilter(), severityFilter()]}
      />,
    );
    const root = container.querySelector("[data-slot=build-list-toolbar]");
    expect(root?.className).toContain("grid-cols-2");
  });

  it("collapses a third control into the mobile filters drawer", () => {
    const { container } = render(
      <BuildListToolbar
        search={search}
        filters={[statusFilter(), severityFilter()]}
      />,
    );
    expect(screen.getByRole("button", { name: /^Filters/ })).toBeInTheDocument();
    for (const id of ["status", "severity"]) {
      expect(
        container.querySelector(`[data-filter-id=${id}]`)?.className,
      ).toContain("max-md:hidden");
    }
  });

  it("counts the active filters the drawer hides", () => {
    render(
      <BuildListToolbar
        search={search}
        filters={[statusFilter(true), severityFilter(true)]}
      />,
    );
    const trigger = screen.getByRole("button", { name: /^Filters/ });
    expect(within(trigger).getByText("2")).toBeInTheDocument();
  });

  it("shows no count badge when nothing is active", () => {
    render(
      <BuildListToolbar
        search={search}
        filters={[statusFilter(), severityFilter()]}
      />,
    );
    const trigger = screen.getByRole("button", { name: /^Filters/ });
    expect(within(trigger).queryByText("0")).toBeNull();
  });

  it("opens a titled, described drawer holding every collapsed filter", async () => {
    render(
      <BuildListToolbar
        search={search}
        filters={[statusFilter(), severityFilter()]}
        drawerTitle="Filter bugs"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /^Filters/ }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Filter bugs")).toBeInTheDocument();
    expect(
      within(dialog).getByText(/Changes apply immediately/),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("Status")).toBeInTheDocument();
    expect(within(dialog).getByText("Severity")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Done" })).toBeInTheDocument();
  });

  it("offers Clear all in the drawer only while something is active", async () => {
    const onClearAll = jest.fn();
    const { rerender } = render(
      <BuildListToolbar
        search={search}
        filters={[statusFilter(), severityFilter()]}
        onClearAll={onClearAll}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /^Filters/ }));
    let dialog = await screen.findByRole("dialog");
    expect(within(dialog).queryByRole("button", { name: "Clear all" })).toBeNull();

    rerender(
      <BuildListToolbar
        search={search}
        filters={[statusFilter(true), severityFilter()]}
        onClearAll={onClearAll}
      />,
    );
    dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Clear all" }));
    expect(onClearAll).toHaveBeenCalledTimes(1);
  });

  it("returns focus to the Filters trigger when the drawer closes", async () => {
    render(
      <BuildListToolbar
        search={search}
        filters={[statusFilter(), severityFilter()]}
      />,
    );
    const trigger = screen.getByRole("button", { name: /^Filters/ });
    fireEvent.click(trigger);
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Done" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("shows Clear all inline on desktop and never a chip row", () => {
    const onClearAll = jest.fn();
    const { container } = render(
      <BuildListToolbar
        search={search}
        filters={[statusFilter(true)]}
        onClearAll={onClearAll}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(onClearAll).toHaveBeenCalledTimes(1);
    expect(container.querySelectorAll("[data-slot=build-list-toolbar]")).toHaveLength(1);
  });

  it("moves view and display controls into the drawer rather than a fourth row", async () => {
    render(
      <BuildListToolbar
        search={search}
        filters={[statusFilter()]}
        trailingLabel="Display"
        trailing={<button type="button">Grid view</button>}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /^Filters/ }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Display")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Grid view" })).toBeInTheDocument();
  });

  it("names the search field for assistive technology", () => {
    render(<BuildListToolbar search={search} filters={[statusFilter()]} />);
    expect(screen.getByLabelText("Search bugs")).toBeInTheDocument();
  });
});
