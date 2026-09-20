import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

const useCanState = jest.fn();
const useProjectBudget = jest.fn();
const useUpdateProjectBudget = jest.fn();
const useProjectMembers = jest.fn();
const useOrgMembers = jest.fn();

jest.mock("@/hooks/api/access", () => ({
  useCanState: (key: string) => useCanState(key),
}));

jest.mock("@/hooks/api/build", () => ({
  useProjectBudget: (projectId: number) => useProjectBudget(projectId),
  useUpdateProjectBudget: (projectId: number) => useUpdateProjectBudget(projectId),
  useProjectMembers: (projectId: number) => useProjectMembers(projectId),
}));

jest.mock("@/hooks/api/organization", () => ({
  useOrgMembers: (page: number, limit: number) => useOrgMembers(page, limit),
}));

jest.mock("@/hooks/api/org-display", () => ({
  useOrgDisplay: () => ({ currency: "INR", locale: "en-IN" }),
}));

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...rest }: { children?: ReactNode }) => <div {...rest}>{children}</div>,
  },
  useReducedMotion: () => false,
}));

import { ProjectBudgetPage } from "./project-budget-page";

const BUDGET = {
  projectId: 101,
  plannedBudget: 50000,
  actualCost: 12000,
  remaining: 38000,
  utilizationPct: 24,
  currency: "INR",
  totalHours: 40,
  unratedHours: 0,
  currencyMismatch: false,
  excludedCurrencyHours: 0,
  memberBreakdown: [{ userId: "u1", hours: 40, cost: 12000, unratedHours: 0 }],
};

function settled<T>(data: T) {
  return { data, isLoading: false, isError: false, error: null, refetch: jest.fn() };
}

beforeEach(() => {
  jest.clearAllMocks();
  useCanState.mockReturnValue("granted");
  useProjectBudget.mockReturnValue(settled(BUDGET));
  useUpdateProjectBudget.mockReturnValue({ mutate: jest.fn(), isPending: false });
  useProjectMembers.mockReturnValue({ data: [] });
  useOrgMembers.mockReturnValue({ data: { data: [] } });
});

describe("ProjectBudgetPage — access is three-valued, not a boolean", () => {
  it("shows the loading skeleton while the access snapshot is still in flight, never an access denial", () => {
    useCanState.mockReturnValue("loading");

    render(<ProjectBudgetPage projectId="101" />);

    expect(screen.queryByText(/access restricted/i)).toBeNull();
  });

  it("renders NoPermissionState once build:manage has actually said no, instead of falling through to a zeroed-out budget", () => {
    useCanState.mockReturnValue("denied");
    useProjectBudget.mockReturnValue({ data: undefined, isLoading: false, isError: false, error: null, refetch: jest.fn() });

    render(<ProjectBudgetPage projectId="101" />);

    expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
    expect(screen.queryByText("Not set")).toBeNull();
    expect(screen.queryByText("Planned Budget")).toBeNull();
  });
});

describe("ProjectBudgetPage — the four remaining states", () => {
  it("renders the error state with a retry when the budget read fails", () => {
    useProjectBudget.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Network timeout"),
      refetch: jest.fn(),
    });

    render(<ProjectBudgetPage projectId="101" />);

    expect(screen.getByRole("button", { name: /try again|retry/i })).toBeInTheDocument();
  });

  it("renders the populated stat cards once budget has loaded", () => {
    render(<ProjectBudgetPage projectId="101" />);

    expect(screen.getByText("Planned Budget")).toBeInTheDocument();
    expect(screen.getByText("Actual Cost")).toBeInTheDocument();
  });
});
