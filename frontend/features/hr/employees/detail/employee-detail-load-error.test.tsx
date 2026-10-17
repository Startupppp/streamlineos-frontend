import { render, screen } from "@testing-library/react";
import { EmployeeDetailLoadError } from "./employee-detail-load-error";

/**
 * HRMS-E2E-006: a failed employee-detail load must hand the person the
 * backend's correlationId (BE-20), so support can find the request. The page
 * passes it as `supportCode`; this pins that it reaches the screen, and that
 * the copy does not invent one when the server sent none.
 */

jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh: jest.fn(), push: jest.fn() }) }));
jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe("EmployeeDetailLoadError", () => {
  it("shows the correlation id to quote to support", () => {
    render(<EmployeeDetailLoadError supportCode="corr-7f3a" />);
    expect(screen.getByText(/quote corr-7f3a to support/)).toBeInTheDocument();
  });

  it("asks the person to contact support, with no code, when there is none", () => {
    render(<EmployeeDetailLoadError />);
    expect(screen.getByText(/contact support/)).toBeInTheDocument();
    expect(screen.queryByText(/quote/)).not.toBeInTheDocument();
  });
});
