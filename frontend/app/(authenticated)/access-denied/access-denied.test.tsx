import { render, screen } from "@testing-library/react";
import AccessDeniedPage from "./page";

describe("AccessDeniedPage", () => {
  it("names the module and offers the fix, rather than showing module:hr as a permission", async () => {
    render(
      await AccessDeniedPage({
        searchParams: Promise.resolve({ required: "module:hr", reason: "org-disabled" }),
      }),
    );
    expect(screen.queryByText("module:hr")).toBeNull();
    expect(screen.getByRole("link", { name: /modules/i })).toBeInTheDocument();
  });

  it("still lists a plain permission key when that is what was missing", async () => {
    render(
      await AccessDeniedPage({
        searchParams: Promise.resolve({ required: "hr:employees:view" }),
      }),
    );
    expect(screen.getByText("hr:employees:view")).toBeInTheDocument();
  });

  it("never renders the caller-supplied from query param, so it cannot be used to inject arbitrary text onto a security page", async () => {
    render(
      await AccessDeniedPage({
        searchParams: Promise.resolve({
          required: "hr:employees:view",
          from: "Your account is suspended, call 555-0100",
        }),
      }),
    );
    expect(screen.queryByText(/555-0100/)).toBeNull();
    expect(screen.queryByText(/suspended/i)).toBeNull();
  });
});
