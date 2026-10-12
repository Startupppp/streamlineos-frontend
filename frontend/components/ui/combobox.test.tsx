import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { Combobox } from "./combobox";

const OPTIONS = [
  { value: "1", label: "Atlas" },
  { value: "2", label: "Borealis" },
];

function openList(name: string) {
  fireEvent.click(screen.getByRole("combobox", { name }));
}

describe("Combobox footer placement", () => {
  it("renders the footer inside the scrolling list, so a paging sentinel is clipped by the list instead of firing the moment the popover opens", () => {
    render(
      <Combobox
        options={OPTIONS}
        value=""
        onChange={jest.fn()}
        aria-label="Project"
        footer={<div data-testid="pager-sentinel" />}
      />,
    );
    openList("Project");

    const sentinel = screen.getByTestId("pager-sentinel");
    const scroller = sentinel.closest(".overflow-y-auto");
    expect(scroller).not.toBeNull();
    expect(scroller).toContainElement(sentinel);
  });

  it("still renders the footer when nothing matched, because a filtered-empty page may have further pages to load", () => {
    render(
      <Combobox
        options={[]}
        value=""
        onChange={jest.fn()}
        aria-label="Project"
        emptyText="No projects found."
        footer={<div data-testid="pager-sentinel" />}
      />,
    );
    openList("Project");

    expect(screen.getByText("No projects found.")).toBeInTheDocument();
    expect(screen.getAllByTestId("pager-sentinel")).toHaveLength(1);
  });

  it("renders exactly one footer when options are present, so the sentinel cannot double-fire", () => {
    render(
      <Combobox
        options={OPTIONS}
        value=""
        onChange={jest.fn()}
        aria-label="Project"
        footer={<div data-testid="pager-sentinel" />}
      />,
    );
    openList("Project");

    expect(screen.getAllByTestId("pager-sentinel")).toHaveLength(1);
  });

  it("omits the footer entirely when the caller passes none", () => {
    render(
      <Combobox options={OPTIONS} value="" onChange={jest.fn()} aria-label="Project" />,
    );
    openList("Project");

    expect(screen.queryByTestId("pager-sentinel")).not.toBeInTheDocument();
    expect(screen.getByText("Atlas")).toBeInTheDocument();
  });
});
