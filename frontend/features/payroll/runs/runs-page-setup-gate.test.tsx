import { render, screen } from "@testing-library/react";

const mockUsePayrollRuns = jest.fn();
const mockUsePayrollPolicyCurrent = jest.fn();
const mockCreateMutate = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

jest.mock("@/hooks/api/payroll/runs", () => ({
  usePayrollRuns: () => mockUsePayrollRuns(),
  useCreateRun: () => ({ mutate: mockCreateMutate, isPending: false }),
}));

jest.mock("@/hooks/api/payroll/policies", () => ({
  usePayrollPolicyCurrent: () => mockUsePayrollPolicyCurrent(),
}));

jest.mock("@/hooks/api/payroll/entities", () => ({
  usePayrollEntities: () => ({ data: [] }),
}));

jest.mock("@/features/payroll/shared/month-picker", () => ({
  MonthPicker: () => null,
}));

import { RunsPageContent } from "./runs-page-content";

function withPolicy(policy: unknown, isLoading = false) {
  mockUsePayrollPolicyCurrent.mockReturnValue({
    data: policy === null ? { policy: null } : { policy },
    isLoading,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUsePayrollRuns.mockReturnValue({
    data: { data: [], pagination: { limit: 20, nextCursor: null, hasMore: false } },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  });
});

describe("BUG-001 the Runs page agrees with Settings about whether payroll is set up", () => {
  it("offers New run once a policy exists, so the negatives below are not passing on a control that never renders", () => {
    withPolicy({ id: 1, status: "ACTIVE" });
    render(<RunsPageContent />);

    expect(screen.getAllByRole("button", { name: /new run/i })).not.toHaveLength(0);
  });

  it("offers Set up payroll instead of New run when no policy exists, because the create call can only 409", () => {
    withPolicy(null);
    render(<RunsPageContent />);

    expect(screen.queryAllByRole("button", { name: /new run/i })).toEqual([]);
    expect(screen.getAllByRole("link", { name: /set up payroll/i })[0]).toHaveAttribute(
      "href",
      "/payroll/setup",
    );
  });

  it("says payroll is not set up in the empty state rather than inviting a first run that cannot start", () => {
    withPolicy(null);
    render(<RunsPageContent />);

    expect(screen.getByText(/payroll is not set up yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/start your first payroll run/i)).toBeNull();
  });

  it("invites a first run in the empty state once a policy exists", () => {
    withPolicy({ id: 1, status: "ACTIVE" });
    render(<RunsPageContent />);

    expect(screen.getByText(/start your first payroll run/i)).toBeInTheDocument();
  });

  it("claims neither answer while the policy read is still in flight, so setup status never flickers", () => {
    withPolicy(null, true);
    render(<RunsPageContent />);

    expect(screen.queryAllByRole("button", { name: /new run/i })).toEqual([]);
    expect(screen.queryAllByRole("link", { name: /set up payroll/i })).toEqual([]);
  });

  it("starts no create mutation from a render, so the gate cannot be mistaken for a submitted run", () => {
    withPolicy(null);
    render(<RunsPageContent />);

    expect(mockCreateMutate).not.toHaveBeenCalled();
  });
});
