import { render, screen } from "@testing-library/react";
import { EmployeeDetailLoadError } from "./employee-detail-load-error";


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
