import { render, screen } from "@testing-library/react";
import { VarianceTab } from "./variance-tab";

const variance = jest.fn();

jest.mock("@/hooks/api/payroll/run-employees", () => ({
  useRunVariance: () => variance(),
}));

function movers(nets: string[]) {
  return {
    data: {
      currentRun: { id: 1, month: "2026-10", grossTotal: "1000", netTotal: "1000" },
      previousRun: null,
      topMovers: nets.map((net, i) => ({ userId: `u${i}`, userName: `Person ${i}`, net })),
    },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  };
}

describe("PAY-B-017 the variance list does not present a negative net as an earner", () => {
  it("titles the list by change, not earnings, and flags the negative net as blocked", () => {
    variance.mockReturnValue(movers(["1000.00", "-500.00"]));
    render(<VarianceTab runId={1} />);

    expect(screen.getByText(/biggest changes this run/i)).toBeInTheDocument();
    expect(screen.queryByText(/top earners/i)).toBeNull();
    expect(screen.getAllByText(/negative net, blocked/i)).toHaveLength(1);
  });

  it("does not flag a positive net", () => {
    variance.mockReturnValue(movers(["1000.00"]));
    render(<VarianceTab runId={1} />);

    expect(screen.queryByText(/negative net, blocked/i)).toBeNull();
  });
});
