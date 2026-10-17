import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { ReorgScenariosTab } from "./reorg-scenarios-tab";

const HOOKS = join(process.cwd(), "features/hr/governance/hooks/use-positions.ts");

const scenarios = jest.fn();
const simulate = jest.fn();
const simRefetch = jest.fn();

jest.mock("../hooks/use-positions", () => ({
  useReorgScenarios: () => scenarios(),
  useSimulateScenario: () => simulate(),
  useDeleteReorgScenario: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

function openSimulation() {
  render(<ReorgScenariosTab />);
  fireEvent.click(screen.getByRole("button", { name: /simulate/i }));
}

function failingSim() {
  return {
    data: undefined,
    isLoading: false,
    isError: true,
    error: new ApiError("Internal server error", 500),
    refetch: simRefetch,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  scenarios.mockReturnValue({
    data: { data: [{ id: 4, name: "Split sales", status: "draft", createdAt: "2026-01-01T00:00:00.000Z" }] },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  });
  simulate.mockReturnValue({
    data: {
      scenarioName: "Split sales",
      projectedEffect: { affectedPositions: 7, affectedReportingLines: 3 },
      warning: "Projection only",
    },
    isLoading: false,
    isError: false,
    error: null,
    refetch: simRefetch,
  });
});

describe("HRMS-B3-019 a failed simulation must not render an empty preview", () => {
  it("keeps the failed simulate read inline instead of throwing it to the /hr boundary", () => {
    const source = readFileSync(HOOKS, "utf8");

    expect(INLINE_READ_ERROR).toEqual({ throwOnError: false });
    expect(source).toContain("...INLINE_READ_ERROR,");
  });

  it("says the simulation could not be loaded instead of drawing a blank preview panel", () => {
    simulate.mockReturnValue(failingSim());
    openSimulation();

    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load simulation/i);
  });

  it("claims no projected effect while the simulate read is erroring", () => {
    simulate.mockReturnValue(failingSim());
    openSimulation();

    expect(screen.queryByText(/affected positions/i)).toBeNull();
  });

  it("retries the simulation itself rather than reloading the governance route", () => {
    simulate.mockReturnValue(failingSim());
    openSimulation();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(simRefetch).toHaveBeenCalledTimes(1);
  });

  it("still renders the projection when the simulate read succeeds", () => {
    openSimulation();

    expect(screen.getByText(/affected positions/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("still shows the honest empty state when the tenant has no scenarios", () => {
    scenarios.mockReturnValue({
      data: { data: [] },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<ReorgScenariosTab />);

    expect(screen.getByText(/no reorg scenarios yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("does not claim the tenant has no scenarios when the scenario list itself 500s", () => {
    scenarios.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError("Internal server error", 500),
      refetch: jest.fn(),
    });
    render(<ReorgScenariosTab />);

    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load reorg scenarios/i);
    expect(screen.queryByText(/no reorg scenarios yet/i)).toBeNull();
  });
});

describe("the failed read's request id is quotable to support", () => {
  it("renders the copyable reference the backend echoed on the error envelope", () => {
    simulate.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError("Internal server error", 500, undefined, { correlationId: "req-abc123" }),
      refetch: simRefetch,
    });
    openSimulation();
    expect(screen.getByText(/reference/i)).toBeInTheDocument();
    expect(screen.getByText("req-abc123")).toBeInTheDocument();
  });
});
