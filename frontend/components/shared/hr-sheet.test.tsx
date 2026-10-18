import { render, screen } from "@testing-library/react";
import { HrSheet } from "./hr-sheet";
import { AppDialog } from "./app-dialog";

const MISSING_DESCRIPTION = /Missing `Description` or `aria-describedby=\{undefined\}`/;

function warnings(spy: jest.SpyInstance): string[] {
  return spy.mock.calls.map((call) => String(call[0]));
}

describe("HR overlay descriptions (UX-07)", () => {
  let warn: jest.SpyInstance;

  beforeEach(() => {
    warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it("links the sheet to its description when one is given", () => {
    render(
      <HrSheet open onOpenChange={jest.fn()} title="Request leave" description="Fields marked * are required.">
        <p>body</p>
      </HrSheet>,
    );
    const sheet = screen.getByRole("dialog", { name: "Request leave" });
    expect(sheet).toHaveAccessibleDescription("Fields marked * are required.");
    expect(warnings(warn).some((message) => MISSING_DESCRIPTION.test(message))).toBe(false);
  });

  it("declares no description instead of pointing at a missing one, so Radix logs no warning", () => {
    render(
      <HrSheet open onOpenChange={jest.fn()} title="Edit verification">
        <p>body</p>
      </HrSheet>,
    );
    const sheet = screen.getByRole("dialog", { name: "Edit verification" });
    expect(sheet).not.toHaveAttribute("aria-describedby");
    expect(warnings(warn).some((message) => MISSING_DESCRIPTION.test(message))).toBe(false);
  });

  it("does the same for the shared app dialog", () => {
    render(
      <AppDialog open onOpenChange={jest.fn()} title="Add note">
        <p>body</p>
      </AppDialog>,
    );
    expect(screen.getByRole("dialog", { name: "Add note" })).not.toHaveAttribute("aria-describedby");
    expect(warnings(warn).some((message) => MISSING_DESCRIPTION.test(message))).toBe(false);
  });
});
