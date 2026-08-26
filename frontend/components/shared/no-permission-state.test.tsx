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

  it("renders the default description when none is supplied", () => {
    render(<NoPermissionState permission="crm:contacts:view" />);
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
      screen.queryByText("Contact your administrator to request access."),
    ).not.toBeInTheDocument();
  });

  it("renders the administrator contact line in full mode", () => {
    render(<NoPermissionState permission="hr:employees:view" />);
    expect(
      screen.getByText("Contact your administrator to request access."),
    ).toBeInTheDocument();
  });
});
