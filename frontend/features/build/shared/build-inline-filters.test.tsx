import { render } from "@testing-library/react";
import { BuildInlineFilters } from "./build-inline-filters";

describe("BuildInlineFilters", () => {
  it("keeps two columns below tablet and one row from tablet up", () => {
    const { container } = render(
      <BuildInlineFilters
        filters={[
          { id: "period", control: <button type="button">All time</button> },
          { id: "team", control: <button type="button">All teams</button> },
          { id: "status", control: <button type="button">All statuses</button> },
          { id: "segment", control: <button type="button">All segments</button> },
        ]}
      />,
    );
    const root = container.querySelector("[data-slot=build-inline-filters]");
    expect(root?.className).toContain("grid-cols-2");
    expect(root?.className).toContain("md:flex-nowrap");
    expect(root?.querySelectorAll("[data-filter-id]")).toHaveLength(4);
    expect(container.querySelector("[data-filter-id=segment]")?.className).toContain(
      "md:flex-1",
    );
  });

  it("renders nothing when there are no filters", () => {
    const { container } = render(<BuildInlineFilters filters={[]} />);
    expect(container.querySelector("[data-slot=build-inline-filters]")).toBeNull();
  });
});
