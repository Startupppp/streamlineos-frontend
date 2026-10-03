import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { EssHomePage } from "./ess-home-page";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, title, subtitle }: { children: React.ReactNode; title: React.ReactNode; subtitle?: React.ReactNode }) => (
    <div>
      <h1>{title}</h1>
      {subtitle ? <p>{subtitle}</p> : null}
      {children}
    </div>
  ),
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: () => ({ kind: "ready" }),
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { name: "Asha Rao", email: "asha@example.test" } } }),
}));

const mockAttendanceStatus = jest.fn();
const mockCheckIn = jest.fn();
const mockCheckOut = jest.fn();
let checkInOptions: { onError?: (error: Error) => void } = {};
jest.mock("@/hooks/api/hr/attendance", () => ({
  useHrAttendanceStatus: () => mockAttendanceStatus(),
  useHrCheckIn: (options: { onError?: (error: Error) => void }) => {
    checkInOptions = options;
    return { mutate: mockCheckIn, isPending: false };
  },
  useHrCheckOut: () => ({ mutate: mockCheckOut, isPending: false }),
}));

const mockLeaveContext = jest.fn();
const mockMyLeaveRequests = jest.fn();
jest.mock("@/hooks/api/hr/leaves", () => ({
  useHrLeaveContext: () => mockLeaveContext(),
  useHrMyLeaveRequests: () => mockMyLeaveRequests(),
}));

const mockPayslips = jest.fn();
jest.mock("@/hooks/api/payroll/ess", () => ({
  useEssPayslips: () => mockPayslips(),
}));

const mockOnboarding = jest.fn();
jest.mock("@/hooks/api/hr/onboarding", () => ({
  useMyOnboarding: () => mockOnboarding(),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const mockCanState = jest.fn();
jest.mock("@/hooks/api/access", () => ({
  ...jest.requireActual("@/hooks/api/access"),
  useCanState: (key: string) => mockCanState(key),
}));

function settled(data: unknown) {
  return { data, isLoading: false, isError: false };
}

beforeEach(() => {
  jest.clearAllMocks();
  checkInOptions = {};
  mockAttendanceStatus.mockReturnValue(
    settled({ status: "ABSENT", logs: [], todayLog: null, dailyStats: { workHours: "0", breakHours: "0", isOvertime: false }, cooldownRemaining: 0 }),
  );
  mockLeaveContext.mockReturnValue(
    settled({ balances: [{ id: 1, leaveTypeId: 2, balance: "8", typeName: "Casual", daysPerYear: 12 }] }),
  );
  mockMyLeaveRequests.mockReturnValue(settled({ requests: [] }));
  mockPayslips.mockReturnValue(settled([]));
  mockOnboarding.mockReturnValue(settled([]));
  mockCanState.mockReturnValue("granted");
});

describe("EssHomePage — the employee's /me home (PAGE_DIRECTION §12)", () => {
  it("greets the employee and offers the three primary actions at a 44px target", () => {
    render(<EssHomePage />);

    expect(screen.getByRole("heading", { name: /Asha Rao/ })).toBeInTheDocument();
    for (const [name, href] of [
      ["Request leave or WFH", "/me/time-off"],
      ["View payslip", "/me/pay"],
      ["Upload a document", "/me/documents"],
    ] as const) {
      const link = screen.getByRole("link", { name });
      expect(link).toHaveAttribute("href", href);
      expect(link.className).toContain("min-h-11");
    }
  });

  it("states the attendance status honestly and clocks in on one tap", () => {
    render(<EssHomePage />);

    expect(screen.getByText("Not clocked in")).toBeInTheDocument();
    const button = screen.getByRole("button", { name: "Clock in" });
    expect(button.className).toContain("min-h-11");
    fireEvent.click(button);
    expect(mockCheckIn).toHaveBeenCalledWith({});
  });

  it("offers a regularisation path when the punch fails instead of swallowing it", () => {
    render(<EssHomePage />);

    expect(screen.queryByText(/request a regularisation/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clock in" }));
    expect(checkInOptions.onError).toBeDefined();
    act(() => {
      checkInOptions.onError?.(new Error("outside geofence"));
    });

    expect(screen.getByRole("link", { name: /request a regularisation/ })).toHaveAttribute("href", "/me/attendance");
  });

  it("shows the clock-out side once a punch exists", () => {
    mockAttendanceStatus.mockReturnValue(
      settled({
        status: "PRESENT",
        logs: [],
        todayLog: { checkIn: "2026-10-01T03:42:00.000Z", checkOut: null },
        dailyStats: { workHours: "1", breakHours: "0", isOvertime: false },
        cooldownRemaining: 0,
      }),
    );

    render(<EssHomePage />);

    expect(screen.getByText(/Clocked in since/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clock out" })).toBeInTheDocument();
  });

  it("prints the leave balance from /me/time-off", () => {
    render(<EssHomePage />);
    expect(screen.getByText("8 Casual")).toBeInTheDocument();
  });

  it("keeps the honest empty-pay sentence when HR has published nothing", () => {
    render(<EssHomePage />);
    expect(screen.getByText("No payslips yet. HR hasn't published a run.")).toBeInTheDocument();
  });

  it("says a payslip is outside the employee's access rather than that none exists", () => {
    mockCanState.mockImplementation((key: string) => (key === "self:payslips" ? "denied" : "granted"));
    render(<EssHomePage />);
    expect(screen.queryByText("No payslips yet. HR hasn't published a run.")).not.toBeInTheDocument();
    expect(screen.getByText("Not included in your access")).toBeInTheDocument();
  });

  it("links the last payslip once one exists", () => {
    mockPayslips.mockReturnValue(
      settled([
        { publicationId: 1, month: "2026-08", net: "50000", publishedAt: "2026-09-01", downloadHref: "/x" },
        { publicationId: 2, month: "2026-09", net: "51000", publishedAt: "2026-10-01", downloadHref: "/y" },
      ]),
    );

    render(<EssHomePage />);

    expect(screen.getByRole("link", { name: "Sep 2026" })).toHaveAttribute("href", "/me/pay");
  });

  it("shows the last leave decision, not a pending request", () => {
    mockMyLeaveRequests.mockReturnValue(
      settled({
        requests: [
          { id: 9, status: "PENDING", startDate: "2026-10-10", leaveType: { id: 1, name: "Casual" } },
          { id: 7, status: "APPROVED", startDate: "2026-09-20", leaveType: { id: 1, name: "Casual" } },
        ],
      }),
    );

    render(<EssHomePage />);

    expect(screen.getByRole("link", { name: /Casual · approved · Sep 20/ })).toHaveAttribute("href", "/me/time-off");
  });

  it("raises an onboarding task chip only while tasks are open", () => {
    const { unmount } = render(<EssHomePage />);
    expect(screen.queryByText(/onboarding task/)).not.toBeInTheDocument();
    unmount();

    mockOnboarding.mockReturnValue(
      settled([
        { id: 1, status: "PENDING", title: "Sign the handbook" },
        { id: 2, status: "COMPLETED", title: "Add bank details" },
      ]),
    );
    render(<EssHomePage />);
    expect(screen.getByRole("link", { name: "1 onboarding task" })).toHaveAttribute("href", "/me/onboarding");
  });

  it("keeps the Action Center, payroll runs and org admin out of the employee shell", () => {
    render(<EssHomePage />);

    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("href")).not.toMatch(/^\/hr\//);
      expect(link.getAttribute("href")).not.toMatch(/^\/payroll/);
      expect(link.getAttribute("href")).not.toMatch(/^\/settings/);
    }
  });
});
