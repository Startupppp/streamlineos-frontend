import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import { NoPermissionState } from "./no-permission-state";

jest.mock("lucide-react", () => ({
  ShieldAlert: () => <svg data-testid="shield-icon" aria-hidden="true" />,
}));

describe("NoPermissionState — semantic structure", () => {
  it("carries role=status so screen readers announce the restricted state", () => {
    render(<NoPermissionState permission="hr:employees:view" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders a heading with the default title so screen readers can identify the region", () => {
    render(<NoPermissionState permission="hr:employees:view" />);
    expect(screen.getByRole("heading", { name: "Access Restricted" })).toBeInTheDocument();
  });

  it("renders a custom title in the heading when provided", () => {
    render(
      <NoPermissionState permission="payroll:runs:view" title="Payroll Restricted" />,
    );
    expect(
      screen.getByRole("heading", { name: "Payroll Restricted" }),
    ).toBeInTheDocument();
  });

  it("renders the permission key so support staff can identify the missing grant", () => {
    render(<NoPermissionState permission="build:tickets:view" />);
    expect(screen.getByText("build:tickets:view")).toBeInTheDocument();
  });

  it("names the permission in the default description, so the reader knows which one is missing", () => {
    render(<NoPermissionState permission="crm:contacts:view" />);
    expect(
      screen.getByText("You need the Crm › Contacts › View permission."),
    ).toBeInTheDocument();
  });

  it("falls back to the generic sentence when no permission is named", () => {
    render(<NoPermissionState />);
    expect(
      screen.getByText(/you don.t have the required permission for this section/i),
    ).toBeInTheDocument();
  });

  it("renders a custom description when provided", () => {
    render(
      <NoPermissionState
        permission="crm:contacts:view"
        description="Ask your CRM admin for access."
      />,
    );
    expect(screen.getByText("Ask your CRM admin for access.")).toBeInTheDocument();
  });

  it("omits the administrator contact line in compact mode", () => {
    render(<NoPermissionState permission="hr:employees:view" compact />);
    expect(
      screen.queryByText(/Contact your administrator to request access/),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "copy an access request" })).not.toBeInTheDocument();
  });

  it("renders the administrator contact line in full mode", () => {
    render(<NoPermissionState permission="hr:employees:view" />);
    expect(
      screen.getByText(/Contact your administrator to request access, or/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "copy an access request" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /request/ })).not.toBeInTheDocument();
    expect(document.querySelector('a[href^="mailto:"]')).toBeNull();
  });

  it("copies a real access request naming this page and the permission, and confirms it", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<NoPermissionState permission="hr:employees:view" />);
    await userEvent.click(screen.getByRole("button", { name: "copy an access request" }));
    expect(writeText).toHaveBeenCalledWith(
      `Please give me access to ${window.location.href}. I need: hr:employees:view.`,
    );
    expect(await screen.findByText("Copied.")).toBeInTheDocument();
  });
});
