import { fireEvent, render, screen } from "@testing-library/react";
import { AccessDenied } from "./access-denied";

const mockBack = jest.fn();
const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ back: mockBack, push: mockPush }),
}));

jest.mock("lucide-react", () => ({
  ShieldAlert: () => <svg data-testid="shield-icon" aria-hidden="true" />,
}));

beforeEach(() => {
  mockBack.mockClear();
  mockPush.mockClear();
});

describe("AccessDenied — semantic structure", () => {
  it("renders a heading so screen readers can identify the page state", () => {
    render(<AccessDenied />);
    expect(
      screen.getByRole("heading", { name: "Access Restricted" }),
    ).toBeInTheDocument();
  });

  it("renders the default message when none is supplied", () => {
    render(<AccessDenied />);
    expect(
      screen.getByText("You don't have permission to view this page."),
    ).toBeInTheDocument();
  });

  it("renders a custom message when provided", () => {
    render(<AccessDenied message="Payroll admin access is required." />);
    expect(
      screen.getByText("Payroll admin access is required."),
    ).toBeInTheDocument();
  });

  it("renders a Go Back button keyboard users can activate", () => {
    render(<AccessDenied />);
    expect(screen.getByRole("button", { name: "Go Back" })).toBeInTheDocument();
  });

  it("renders a Dashboard button keyboard users can activate", () => {
    render(<AccessDenied />);
    expect(screen.getByRole("button", { name: "Dashboard" })).toBeInTheDocument();
  });

  it("calls router.back() when the Go Back button is clicked", () => {
    render(<AccessDenied />);
    fireEvent.click(screen.getByRole("button", { name: "Go Back" }));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it("navigates to /dashboard when the Dashboard button is clicked", () => {
    render(<AccessDenied />);
    fireEvent.click(screen.getByRole("button", { name: "Dashboard" }));
    expect(mockPush).toHaveBeenCalledWith("/dashboard");
  });

  it("displays the current role and required roles when both are supplied", () => {
    render(
      <AccessDenied
        currentRole="EMPLOYEE"
        requiredRoles={["HR_ADMIN", "BRANCH_HR"]}
      />,
    );
    expect(screen.getByText(/EMPLOYEE/)).toBeInTheDocument();
    expect(screen.getByText(/HR_ADMIN, BRANCH_HR/)).toBeInTheDocument();
  });

  it("omits the role row when currentRole is not provided", () => {
    render(<AccessDenied requiredRoles={["HR_ADMIN"]} />);
    expect(screen.queryByText(/Your role:/)).not.toBeInTheDocument();
  });
});
