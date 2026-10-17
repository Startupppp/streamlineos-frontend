import React from "react";
import { render, screen } from "@testing-library/react";
import { DiversityReportPage } from "./diversity-report-page";

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({
    children,
    title,
    state,
    loading,
    empty,
  }: {
    children: React.ReactNode;
    title?: string;
    state?: { kind: string; permission?: string | null };
    loading?: React.ReactNode;
    empty?: React.ReactNode;
  }) => {
    let body: React.ReactNode = children;
    if (state?.kind === "loading") body = loading;
    else if (state?.kind === "denied") body = <div role="status">Access Restricted</div>;
    else if (state?.kind === "error") body = <div role="alert">Something went wrong</div>;
    else if (state?.kind === "empty") body = empty ?? children;
    return (
      <div>
        {title ? <h1>{title}</h1> : null}
        {body}
      </div>
    );
  },
}));

jest.mock("@/features/recruitment/components/recruitment-empty-state", () => ({
  RecruitmentEmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

jest.mock("@/components/ui/date-picker", () => ({
  DatePicker: () => <input data-testid="date-picker" />,
}));

jest.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuCheckboxItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/stat-card", () => ({
  StatCard: ({ label, value }: { label: string; value: number }) => (
    <div data-testid={`stat-${label}`}>{value}</div>
  ),
  StatCardGrid: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/hooks/api/hr", () => ({
  useHrDepartments: () => ({ data: [] }),
}));

const mockUseDiversityReport = jest.fn();
jest.mock("@/hooks/api/hr/recruitment", () => ({
  useDiversityReport: (...args: unknown[]) => mockUseDiversityReport(...args),
}));

const mockUsePageState = jest.fn();
jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (...args: Parameters<typeof mockUsePageState>) => mockUsePageState(...args),
}));

const REPORT = {
  total: 4,
  genderBreakdown: [{ gender: "FEMALE", count: 4 }],
  locationBreakdown: [{ location: "Remote", count: 4 }],
  sourceBreakdown: [{ source: "Referral", count: 4 }],
  stageBreakdown: [{ stage: "Applied", count: 4 }],
};

function stubReport(overrides: Partial<{ data: unknown; isLoading: boolean; isError: boolean; error: unknown }>) {
  mockUseDiversityReport.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
    ...overrides,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  stubReport({});
  mockUsePageState.mockReturnValue({ kind: "loading" });
});

describe("DiversityReportPage — loading, denied, error and empty are four different screens", () => {
  it("gates its own state on the route's key, hr:sensitive:view, and hands the error through so a 402/403 is explained", () => {
    const error = new Error("boom");
    stubReport({ isError: true, error });
    mockUsePageState.mockReturnValue({ kind: "error", error });

    render(<DiversityReportPage />);

    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "hr:sensitive:view", isError: true, error, isEmpty: true }),
    );
  });

  it("while access is still resolving it shows the skeleton, never 'No applicant data found'", () => {
    mockUsePageState.mockReturnValue({ kind: "loading" });

    render(<DiversityReportPage />);

    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
    expect(screen.queryByText("No applicant data found")).not.toBeInTheDocument();
    expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
  });

  it("a user without hr:sensitive:view sees the denial, not an empty report", () => {
    mockUsePageState.mockReturnValue({ kind: "denied", permission: "hr:sensitive:view" });

    render(<DiversityReportPage />);

    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
    expect(screen.queryByText("No applicant data found")).not.toBeInTheDocument();
  });

  it("a failed read is an error, not an empty report", () => {
    stubReport({ isError: true, error: new Error("boom") });
    mockUsePageState.mockReturnValue({ kind: "error", error: new Error("boom") });

    render(<DiversityReportPage />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText("No applicant data found")).not.toBeInTheDocument();
  });

  it("only a permitted, finished read with zero applicants reads as empty", () => {
    stubReport({ data: { ...REPORT, total: 0 } });
    mockUsePageState.mockReturnValue({ kind: "empty" });

    render(<DiversityReportPage />);

    expect(screen.getByText("No applicant data found")).toBeInTheDocument();
    expect(mockUsePageState).toHaveBeenCalledWith(expect.objectContaining({ isEmpty: true }));
  });

  it("renders the report when the read is ready", () => {
    stubReport({ data: REPORT });
    mockUsePageState.mockReturnValue({ kind: "ready" });

    render(<DiversityReportPage />);

    expect(screen.getByTestId("stat-Total Applicants")).toHaveTextContent("4");
    expect(mockUsePageState).toHaveBeenCalledWith(expect.objectContaining({ isEmpty: false }));
    expect(screen.queryByText("No applicant data found")).not.toBeInTheDocument();
  });
});
