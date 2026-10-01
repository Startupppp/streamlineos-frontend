import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import type { PageStateResolution } from "@/lib/page-state/resolve-page-state";
import { AttendanceSection } from "./attendance-section";
import { WorkforceSection } from "./workforce-section";
import { CommandCenterSection } from "./command-center-section";
import { LeaveSection } from "./leave-section";
import { AttritionSection } from "./attrition-section";

const LEAVE_HOOKS = join(process.cwd(), "hooks/api/hr/leaves.ts");

const attendance = jest.fn();
const leave = jest.fn();
const attrition = jest.fn();
const commandCenter = jest.fn();
const emptyRead = () => ({ data: undefined, isLoading: false, isError: false, error: null, refetch: jest.fn() });
const pageState = jest.fn<PageStateResolution, []>();

jest.mock("@/hooks/api/hr/analytics", () => ({
  useHrAttendanceAnalytics: () => attendance(),
  useHrAttritionAnalytics: () => attrition(),
  useHrCommandCenter: () => commandCenter(),
  useHrAttritionPlus: () => emptyRead(),
  useHrLeaveTrends: () => emptyRead(),
  useHrEngagement: () => emptyRead(),
  useHrPerformanceDist: () => emptyRead(),
  useHrComplianceGaps: () => emptyRead(),
  useHrPayrollCost: () => emptyRead(),
  useHrDrilldown: () => emptyRead(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => false,
}));

jest.mock("@/hooks/api/org-display", () => ({
  useOrgDisplay: () => ({ currency: "INR", locale: "en-IN" }),
}));

jest.mock("@/hooks/api/hr/leaves-expenses", () => ({
  useHrLeaveAnalytics: () => leave(),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: () => pageState(),
}));

const OK = { isLoading: false, isError: false, error: null };

function failing(refetch: jest.Mock) {
  return {
    data: undefined,
    isLoading: false,
    isError: true,
    error: new ApiError("Internal server error", 500, undefined, {
      correlationId: "req-lane3",
    }),
    refetch,
  };
}

function paused(refetch: jest.Mock) {
  return { ...OK, data: undefined, refetch };
}

const ATTENDANCE_ZERO = {
  ...OK,
  data: {
    year: 2026,
    month: 10,
    totalAttendanceLogs: 0,
    byDepartment: [],
    daily: [],
  },
  refetch: jest.fn(),
};

const LEAVE_ZERO = {
  ...OK,
  data: {
    monthlyTrend: [],
    byDepartment: [],
    byLeaveType: [],
    avgDaysByDepartment: [],
  },
  refetch: jest.fn(),
};

const ATTRITION_ZERO = {
  ...OK,
  data: {
    totalEmployees: 0,
    resignedThisYear: 0,
    attritionRatePercent: "0.0",
    byMonth: [],
  },
  refetch: jest.fn(),
};

const COMMAND_CENTER_ZERO = {
  ...OK,
  data: {
    headcount: { total: 0, active: 0, probation: 0, notice: 0 },
    attritionRate12mo: 0,
    avgTenureMonths: 0,
    leaveUtilizationPct: 0,
    attendanceRatePct: 0,
    openCasesCount: 0,
    avgMood: null,
    payrollCostLastMonth: null,
  },
  refetch: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  pageState.mockReturnValue({ kind: "ready" });
  attendance.mockReturnValue(ATTENDANCE_ZERO);
  leave.mockReturnValue(LEAVE_ZERO);
  attrition.mockReturnValue(ATTRITION_ZERO);
  commandCenter.mockReturnValue(COMMAND_CENTER_ZERO);
});

describe("HRMS-B3-004 a broken analytics section is visible rather than absent", () => {
  it("opts the leave analytics read out of the /hr boundary, so its inline branch is reachable at all", () => {
    expect(INLINE_READ_ERROR).toEqual({ throwOnError: false });
    expect(readFileSync(LEAVE_HOOKS, "utf8")).toContain("...INLINE_READ_ERROR,");
  });

  it("renders an alert with retry instead of nothing when the attendance read 500s", () => {
    const refetch = jest.fn();
    attendance.mockReturnValue(failing(refetch));
    render(<AttendanceSection year={2026} month={10} />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      /couldn't load attendance analytics/i,
    );
    expect(screen.getByText("req-lane3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("renders an alert rather than vanishing when the attendance read settles with no payload", () => {
    attendance.mockReturnValue(paused(jest.fn()));
    const { container } = render(<AttendanceSection year={2026} month={10} />);

    expect(container).not.toBeEmptyDOMElement();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("still names its genuine zero-row result on the attendance panels", () => {
    render(<AttendanceSection year={2026} month={10} />);

    expect(screen.getByText(/no department attendance data/i)).toBeInTheDocument();
    expect(screen.getByText(/no daily attendance data/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("renders an alert with retry instead of nothing when the leave read 500s", () => {
    const refetch = jest.fn();
    leave.mockReturnValue(failing(refetch));
    render(<LeaveSection year={2026} />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      /couldn't load leave analytics/i,
    );
    expect(screen.queryByText(/no department leave data/i)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("renders an alert rather than vanishing when the leave read settles with no payload", () => {
    leave.mockReturnValue(paused(jest.fn()));
    const { container } = render(<LeaveSection year={2026} />);

    expect(container).not.toBeEmptyDOMElement();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("still names its genuine zero-row result on the leave panels", () => {
    render(<LeaveSection year={2026} />);

    expect(screen.getByText(/no department leave data/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("says the leave section is refused rather than empty when hr:leaves:view is missing", () => {
    pageState.mockReturnValue({ kind: "denied", permission: "hr:leaves:view" });
    leave.mockReturnValue(paused(jest.fn()));
    render(<LeaveSection year={2026} />);

    expect(screen.getByRole("status")).toHaveTextContent(/access restricted/i);
    expect(screen.queryByText(/no department leave data/i)).toBeNull();
  });

  it("stops the attrition section pretending to still be loading after its read failed", () => {
    const refetch = jest.fn();
    attrition.mockReturnValue(failing(refetch));
    render(<AttritionSection isLoading={false} />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      /couldn't load attrition analytics/i,
    );
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("still names its genuine zero-row result on the attrition trend", () => {
    render(<AttritionSection isLoading={false} />);

    expect(screen.getByText(/no resignation data for this year/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("the sibling analytics panels in this file set tell the same truth", () => {
  it("says the workforce overview failed rather than rendering nothing when it has no payload", () => {
    const { container } = render(<WorkforceSection data={undefined} isLoading={false} />);

    expect(container).not.toBeEmptyDOMElement();
    expect(screen.getByRole("alert")).toHaveTextContent(
      /couldn't load the workforce overview/i,
    );
  });

  it("renders the workforce figures it actually read", () => {
    render(
      <WorkforceSection
        data={{
          headcount: { total: 4, active: 3, newThisMonth: 1 },
          departments: [],
          gender: [],
          roles: [],
          attendance: { totalLogsThisMonth: 0 },
          leaves: { byStatus: {}, byMonth: [] },
          payroll: { totalCostYTD: "0" },
          expenses: { approvedYTD: "0" },
          joiningExitsTrend: [],
        }}
        isLoading={false}
      />,
    );

    expect(screen.getByText(/workforce overview/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("prints no command-centre KPI figure at all when the read behind every card 500d", () => {
    const refetch = jest.fn();
    commandCenter.mockReturnValue(failing(refetch));
    render(<CommandCenterSection />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      /couldn't load the command centre/i,
    );
    expect(screen.queryByText("12-Mo Attrition")).toBeNull();
    expect(screen.queryByText("0.0%")).toBeNull();
    expect(screen.queryByText("0.0 mo")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("still prints a genuine zero when the command-centre read returned zeroes", () => {
    render(<CommandCenterSection />);

    expect(screen.getByText("12-Mo Attrition")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
