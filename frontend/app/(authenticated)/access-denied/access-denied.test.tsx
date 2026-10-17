import { render, screen } from "@testing-library/react";
import AccessDeniedPage from "./page";

jest.mock("@/components/shared/enable-module-button", () => ({ EnableModuleButton: () => null }));

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

  it("shows a human-readable label and puts the raw key behind a details toggle", async () => {
    render(
      await AccessDeniedPage({
        searchParams: Promise.resolve({ required: "hr:employees:view" }),
      }),
    );
    expect(screen.getByText(/Hr › Employees › View/)).toBeInTheDocument();
    const rawKey = screen.getByText("hr:employees:view");
    expect(rawKey.closest("details")).not.toBeNull();
  });

  it("never echoes a required value the catalogue does not know, so the URL cannot put arbitrary text on the page", async () => {
    render(
      await AccessDeniedPage({
        searchParams: Promise.resolve({ required: "call:555-0100:now" }),
      }),
    );
    expect(screen.queryByText(/555-0100/)).toBeNull();
    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
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

  it("names every key of a multi-key gate (/hr/approvals sends required=a,b), instead of naming nothing", async () => {
    render(
      await AccessDeniedPage({
        searchParams: Promise.resolve({ required: "hr:workflows:approve,hr:leaves:approve" }),
      }),
    );
    expect(screen.getByText("hr:workflows:approve")).toBeInTheDocument();
    expect(screen.getByText("hr:leaves:approve")).toBeInTheDocument();
    expect(screen.getByText(/any one of these permissions/i)).toBeInTheDocument();
  });

  it("drops unknown entries from a multi-key list, so the URL still cannot put arbitrary text on the page", async () => {
    render(
      await AccessDeniedPage({
        searchParams: Promise.resolve({ required: "hr:leaves:approve,call 555-0100" }),
      }),
    );
    expect(screen.getByText("hr:leaves:approve")).toBeInTheDocument();
    expect(screen.queryByText(/555-0100/)).toBeNull();
  });
});
