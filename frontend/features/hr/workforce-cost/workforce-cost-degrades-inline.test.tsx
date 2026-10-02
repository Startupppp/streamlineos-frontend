import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import {
  INLINE_READ_ERROR,
  readErrorReachesBoundary,
} from "@/lib/query-error-policy";
import { WorkforceCostPage } from "./workforce-cost-page";

const HOOKS = join(process.cwd(), "hooks/api/hr/enterprise-comp.ts");

const summary = jest.fn();
const byDepartment = jest.fn();
const byLocation = jest.fn();
const refetchSummary = jest.fn();
const refetchDept = jest.fn();

jest.mock("@/hooks/api/hr/enterprise-comp", () => ({
  useWorkforceCostSummary: () => summary(),
  useCostByDepartment: () => byDepartment(),
  useCostByLocation: () => byLocation(),
}));

jest.mock("@/hooks/api/org-display", () => ({
  useOrgDisplay: () => ({ currency: "INR", locale: "en-IN" }),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: ({ isError }: { isError: boolean }) => ({
    kind: isError ? "error" : "ready",
  }),
}));

const OK = { isLoading: false, isError: false, error: null };

function failing(status: number, refetch = jest.fn()) {
  return {
    data: undefined,
    isLoading: false,
    isError: true,
    error: new ApiError("Internal server error", status),
    refetch,
  };
}

function healthy() {
  return {
    ...OK,
    data: { totalHeadcount: 2, totalMonthlyCostCents: 20000000, totalAnnualCtcCents: 240000000 },
    refetch: refetchSummary,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  summary.mockReturnValue(healthy());
  byDepartment.mockReturnValue({ ...OK, data: [], refetch: refetchDept });
  byLocation.mockReturnValue({ ...OK, data: [], refetch: jest.fn() });
});

describe("BUG-007 a failing costing read stays on the page instead of failing the whole HR module", () => {
  it("is the default policy that would otherwise throw a 500 to the /hr error boundary, which is what the inline opt-out below exists to prevent", () => {
    expect(
      readErrorReachesBoundary(new ApiError("Internal server error", 500), {
        state: { data: undefined },
      }),
    ).toBe(true);
  });

  it("opts all three costing reads out of the boundary, so none of them can render Failed to load the HR module", () => {
    const source = readFileSync(HOOKS, "utf8");
    const costing = source.slice(source.indexOf("export function useWorkforceCostSummary("));
    const optOuts = costing.match(/\.\.\.INLINE_READ_ERROR,/g) ?? [];

    expect(INLINE_READ_ERROR).toEqual({ throwOnError: false });
    expect(costing).toContain("export function useCostByLocation(");
    expect(optOuts).toHaveLength(3);
  });

  it("renders the page heading and its cost panels on a healthy session, so the failure cases below are not passing on a page that never mounts", () => {
    render(<WorkforceCostPage />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/workforce costing/i);
    expect(screen.getByText("Cost by Department")).toBeInTheDocument();
  });

  it("shows an inline error with retry on the same surface when the summary read 500s", () => {
    summary.mockReturnValue(failing(500, refetchSummary));
    render(<WorkforceCostPage />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("keeps the summary and location panels usable when only the by-department read 500s", () => {
    byDepartment.mockReturnValue(failing(500, refetchDept));
    render(<WorkforceCostPage />);

    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/couldn't load cost by department/i)).toBeInTheDocument();
    expect(screen.getByText(/total headcount/i)).toBeInTheDocument();
  });

  it("retries the failed read on the same surface rather than reloading the module", () => {
    byDepartment.mockReturnValue(failing(500, refetchDept));
    render(<WorkforceCostPage />);
    screen.getByRole("button", { name: /try again/i }).click();

    expect(refetchDept).toHaveBeenCalledTimes(1);
  });

  it("does not claim the tenant has no cost data when a read failed, which is the lie an empty state would tell", () => {
    byDepartment.mockReturnValue(failing(500, refetchDept));
    render(<WorkforceCostPage />);

    expect(screen.queryByText(/no department cost data/i)).toBeNull();
  });

  it("still shows the honest empty state when the read genuinely returns no rows", () => {
    render(<WorkforceCostPage />);

    expect(screen.getByText(/no department cost data/i)).toBeInTheDocument();
  });

  it("leaves a 402 module denial to the page-state branch, which never reached the boundary and must not be turned into a retry", () => {
    expect(
      readErrorReachesBoundary(new ApiError("Not enabled", 402, "MODULE_NOT_ENABLED"), {
        state: { data: undefined },
      }),
    ).toBe(false);
  });
});

describe("BUG-009 the read-only HR routes offer a way out of an empty screen", () => {
  it("points an empty department panel at where compensation is recorded", () => {
    render(<WorkforceCostPage />);

    expect(
      screen.getByRole("link", { name: /open salary profiles/i }),
    ).toHaveAttribute("href", "/payroll/employees");
  });

  it("points an empty location panel at the directory that assigns locations", () => {
    render(<WorkforceCostPage />);

    expect(screen.getByRole("link", { name: /open the directory/i })).toHaveAttribute(
      "href",
      "/hr/employees",
    );
  });

  it("offers no next step while a panel is erroring, because retry is the action then", () => {
    byDepartment.mockReturnValue(failing(500, refetchDept));
    render(<WorkforceCostPage />);

    expect(screen.queryByRole("link", { name: /open salary profiles/i })).toBeNull();
  });
});
