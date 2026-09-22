import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EssSalarySection } from "./ess-salary-section";

const refetch = jest.fn();
const mockUseEssSalaryStructure = jest.fn();

jest.mock("@/hooks/api/payroll/ess", () => ({
  useEssSalaryStructure: () => mockUseEssSalaryStructure(),
}));

jest.mock("framer-motion", () => ({
  motion: { div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => <div {...rest}>{children}</div> },
}));

describe("the salary structure section on a failed load", () => {
  it("shows the backend's message in full and offers a retry", async () => {
    const user = userEvent.setup();
    mockUseEssSalaryStructure.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Salary structure service is temporarily unavailable, please try again in a few minutes"),
      refetch,
    });
    render(<EssSalarySection />);

    expect(screen.getByText("Couldn't load your salary structure")).toBeInTheDocument();
    expect(
      screen.getByText("Salary structure service is temporarily unavailable, please try again in a few minutes"),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /try again|retry/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
