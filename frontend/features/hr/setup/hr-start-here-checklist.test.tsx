import * as React from "react";
import { render, screen } from "@testing-library/react";

import { HrStartHereChecklist } from "./hr-start-here-checklist";
import type { HrSetupSignals } from "./hr-start-here";

/**
 * V-132. The checklist model is tested; the component that renders it was not,
 * so nothing held the three things a reader depends on — that a finished org
 * gets no checklist at all, that a done step loses its action button, and that
 * the "N of M" line only appears when at least one signal is readable.
 */
function signals(overrides: Partial<HrSetupSignals> = {}): HrSetupSignals {
  return { people: 0, leaveTypes: 0, shifts: 0, documents: 0, ...overrides };
}

describe("HrStartHereChecklist", () => {
  it("renders nothing once every readable step is done", () => {
    const { container } = render(
      <HrStartHereChecklist
        signals={signals({ people: 4, leaveTypes: 3, shifts: 1, documents: 9 })}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("still renders while one readable step is outstanding", () => {
    // The paired positive: without it, a component that always returned null
    // would satisfy the case above.
    render(
      <HrStartHereChecklist
        signals={signals({ people: 4, leaveTypes: 3, shifts: 1, documents: 0 })}
      />,
    );

    expect(screen.getByText("Start here")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Upload a document" }),
    ).toHaveAttribute("href", "/hr/documents");
  });

  it("line-throughs a done step and hides its action button", () => {
    render(<HrStartHereChecklist signals={signals({ people: 4 })} />);

    expect(screen.getByText("Add your people")).toHaveClass("line-through");
    expect(
      screen.queryByRole("link", { name: "Add an employee" }),
    ).not.toBeInTheDocument();

    // An outstanding step keeps both its description and its button.
    expect(screen.getByText("Set up leave")).not.toHaveClass("line-through");
    expect(
      screen.getByRole("link", { name: "Configure leave" }),
    ).toBeInTheDocument();
  });

  it("shows N of M only when at least one signal is readable", () => {
    const unreadable = render(
      <HrStartHereChecklist
        signals={{ people: null, leaveTypes: null, shifts: null, documents: null }}
      />,
    );

    expect(screen.queryByText(/\d+ of \d+ done/)).not.toBeInTheDocument();
    expect(
      screen.getByText(/Work through these in order/),
    ).toBeInTheDocument();
    unreadable.unmount();

    render(
      <HrStartHereChecklist
        signals={{ people: 4, leaveTypes: 0, shifts: null, documents: null }}
      />,
    );

    expect(screen.getByText(/1 of 2 done/)).toBeInTheDocument();
  });
});
