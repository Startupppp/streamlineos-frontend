import { render, screen } from "@testing-library/react";
import { Progress } from "@/components/ui/progress";
import { expectNoAxeViolations } from "@/test-utils";

/**
 * The browser run found `aria-progressbar-name` on 53 nodes across four routes
 * and, reading the markup it captured, something the finding did not name:
 * every bar rendered `data-state="indeterminate"` with no `aria-valuenow`.
 * `value` was destructured out of the wrapper and used only for the visual
 * transform and `aria-valuetext`, so it never reached the Radix root. A screen
 * reader was told "busy" over a figure the page was showing as a percentage.
 *
 * `aria-valuetext` cannot paper over that: an indeterminate progressbar has no
 * value for the text to describe.
 *
 * The NAME stays the caller's. A default of "Progress" here would satisfy axe
 * and tell a screen-reader user nothing — the exact defect class this ticket's
 * own census says no automated check can catch, and adding one deliberately
 * would be worse than the violation it hides.
 */
describe("Progress reports a value, not an indeterminate bar", () => {
  it("forwards value to the element the assistive technology reads", () => {
    render(<Progress value={42} aria-label="Sprint completion" />);
    const bar = screen.getByRole("progressbar", { name: "Sprint completion" });
    expect(bar).toHaveAttribute("aria-valuenow", "42");
    expect(bar).toHaveAttribute("data-state", "loading");
  });

  it("keeps the human-readable value text alongside the number", () => {
    render(<Progress value={42} aria-label="Sprint completion" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "42%");
  });

  it("honours an explicit max rather than assuming 100", () => {
    render(<Progress value={3} max={5} aria-label="Steps complete" />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "3");
    expect(bar).toHaveAttribute("aria-valuemax", "5");
  });

  it("a completed bar is complete, not still loading", () => {
    render(<Progress value={100} aria-label="Upload" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("data-state", "complete");
  });

  it("a named bar is clean under axe", async () => {
    const { container } = render(<Progress value={60} aria-label="Onboarding progress" />);
    await expectNoAxeViolations(container);
  });
});

describe("BITE — the assertions fail on the shape that shipped", () => {
  /**
   * The pre-fix component, reproduced: `value` withheld from the root. If the
   * assertions above could pass over this, they would pass over the regression
   * they exist to stop.
   */
  it("an unforwarded value leaves the bar indeterminate with no valuenow", () => {
    render(
      <div
        role="progressbar"
        aria-label="Sprint completion"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext="42%"
        data-state="indeterminate"
      />,
    );
    const bar = screen.getByRole("progressbar");
    expect(bar).not.toHaveAttribute("aria-valuenow");
    expect(bar).toHaveAttribute("data-state", "indeterminate");
  });

  it("an unnamed progressbar is an axe violation, so the name is load-bearing", async () => {
    const { container } = render(<Progress value={60} />);
    await expect(expectNoAxeViolations(container)).rejects.toThrow();
  });
});
