import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ManagerCoverageReport } from "@/hooks/api/hr/reporting-lines-schema";
import { ManagerCoveragePage } from "./manager-coverage-page";

const replace = jest.fn();
let search = "";
const can = jest.fn();
const setLine = jest.fn();
const confirmFallback = jest.fn();

let report: ManagerCoverageReport;
const REPORT: ManagerCoverageReport = {
  generatedAt: "2026-09-26T00:00:00Z",
  spanOfControlLimit: 12,
  summary: { employees: 10, withManager: 7, withoutManager: 1, inactiveManager: 0, circular: 0, overSpan: 0, topLevel: 2, fallback: 1, pendingReview: 1 },
  withoutManager: [
    { userId: "u-w", employmentId: 7, employeeNumber: "E-7", name: "Wanda Without", email: null, designation: null, departmentId: null, lifecycleStatus: "ACTIVE" },
  ],
  inactiveManager: [],
  circular: [],
  overSpan: [],
  policyMissing: true,
  fallback: [{ userId: "u-f", name: "Fay Fallback", managerUserId: "u-d", managerName: "Dana Default", effectiveFrom: "2026-09-01" }],
  pendingReview: [{ requestId: "r-1", userId: "u-p", name: "Pat Pending", createdAt: "2026-09-20T09:00:00Z" }],
};

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/hr/employees/manager-coverage",
  useSearchParams: () => new URLSearchParams(search),
}));
jest.mock("@/hooks/api/hr/reporting-lines", () => ({
  useManagerCoverage: () => ({ data: report, isLoading: false, isError: false, error: null, refetch: jest.fn() }),
  useSetReportingLine: () => ({ mutate: setLine, isPending: false }),
  useConfirmReportingFallback: () => ({ mutate: confirmFallback, isPending: false }),
}));
jest.mock("@/hooks/api/use-page-state", () => ({ usePageState: () => ({ kind: "ready" }) }));
jest.mock("@/hooks/api/access", () => ({ useCan: (key: string) => can(key) }));
jest.mock("@/hooks/api/organization", () => ({ useOrgMembersByIds: () => ({ data: undefined }) }));
jest.mock("@/components/hr/reporting-lines/manager-candidate-picker", () => ({
  ManagerCandidatePicker: ({ onChange, placeholder }: { onChange: (id: string) => void; placeholder: string }) => (
    <button type="button" onClick={() => onChange("u-new")}>
      {placeholder}
    </button>
  ),
}));
jest.mock("@/components/ui/select", () => ({
  Select: ({ children, onValueChange }: { children: React.ReactNode; onValueChange: (v: string) => void }) => (
    <div>
      {children}
      <button type="button" onClick={() => onValueChange("pendingReview")}>
        choose pending
      </button>
    </div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

beforeEach(() => {
  report = REPORT;
  search = "";
  replace.mockReset();
  setLine.mockReset();
  confirmFallback.mockReset();
  can.mockReset().mockReturnValue(false);
});

describe("Manager coverage — HRM-15 states", () => {
  it("counts temporary fallbacks and pending reviews, and states top-level roles are by design", () => {
    render(<ManagerCoveragePage />);
    const summary = screen.getByTestId("coverage-summary");
    expect(within(summary).getByText("Fallback")).toBeInTheDocument();
    expect(within(summary).getByText("In review")).toBeInTheDocument();
    expect(within(summary).getByText(/2 top-level by design/)).toBeInTheDocument();
  });

  it("warns when no default reporting manager is configured", () => {
    render(<ManagerCoveragePage />);
    expect(screen.getByRole("status")).toHaveTextContent("No default reporting manager is set.");
  });

  it("keeps the chosen category in the URL", async () => {
    render(<ManagerCoveragePage />);
    await userEvent.click(screen.getByRole("button", { name: "choose pending" }));
    expect(replace).toHaveBeenCalledWith("/hr/employees/manager-coverage?view=pendingReview", { scroll: false });
  });

  it("links a pending review only for reviewers (Addendum 1 Q6)", () => {
    search = "view=pendingReview";
    const { unmount } = render(<ManagerCoveragePage />);
    expect(screen.queryByRole("link", { name: "Review" })).not.toBeInTheDocument();
    expect(screen.getAllByText("Awaiting HR review").length).toBeGreaterThan(0);
    unmount();

    can.mockImplementation((key: string) => key === "hr:reporting-lines:review");
    render(<ManagerCoveragePage />);
    // Both the table row and the small-screen card link to the drawer.
    for (const link of screen.getAllByRole("link", { name: "Review" }))
      expect(link).toHaveAttribute("href", "/hr/employees/reporting-requests?request=r-1");
  });

  it("shows fallback rows with the PRD badge, and replace/keep only for managers of reporting lines", async () => {
    search = "view=fallback";
    const { unmount } = render(<ManagerCoveragePage />);
    const row = within(screen.getByRole("table")).getByText("Fay Fallback").closest("tr") as HTMLElement;
    expect(within(row).getByText("Temporarily assigned by onboarding policy")).toBeInTheDocument();
    expect(within(row).queryByRole("button", { name: "Keep" })).not.toBeInTheDocument();
    unmount();

    can.mockImplementation((key: string) => key === "hr:reporting-lines:manage");
    render(<ManagerCoveragePage />);
    const managed = within(screen.getByRole("table")).getByText("Fay Fallback").closest("tr") as HTMLElement;
    await userEvent.click(within(managed).getByRole("button", { name: "Keep" }));
    expect(confirmFallback).toHaveBeenCalledWith("u-f", expect.any(Object));
    await userEvent.click(within(managed).getByRole("button", { name: "Assign manager" }));
    expect(setLine).toHaveBeenCalledWith({ employeeUserId: "u-f", primaryManagerUserId: "u-new" }, expect.any(Object));
  });

  it("assigns a missing manager through the reporting-line PUT, not the profile PATCH", async () => {
    can.mockImplementation((key: string) => key === "hr:reporting-lines:manage");
    render(<ManagerCoveragePage />);
    const row = within(screen.getByRole("table")).getByText("Wanda Without").closest("tr") as HTMLElement;
    await userEvent.click(within(row).getByRole("button", { name: "Assign manager" }));
    expect(setLine).toHaveBeenCalledWith({ employeeUserId: "u-w", primaryManagerUserId: "u-new" }, expect.any(Object));
  });

  it("lays the six tiles out 2 / 3 / 6 across 375 / 768 / 1280 with short labels", () => {
    render(<ManagerCoveragePage />);
    const summary = screen.getByTestId("coverage-summary");
    expect(summary).toHaveClass("grid-cols-2", "md:grid-cols-3", "xl:grid-cols-6");
    expect(summary.children).toHaveLength(6);
  });

  it("wraps tile hints instead of cutting them off with an ellipsis", () => {
    render(<ManagerCoveragePage />);
    const hint = within(screen.getByTestId("coverage-summary")).getByText(/covered · 2 top-level by design/);
    expect(hint).not.toHaveClass("truncate");
    expect(hint).toHaveClass("break-words");
  });

  it("keeps Assign and Keep reachable on small screens as a stacked card", async () => {
    search = "view=fallback";
    can.mockImplementation((key: string) => key === "hr:reporting-lines:manage");
    render(<ManagerCoveragePage />);
    const cards = screen.getAllByText("Fay Fallback").map((node) => node.closest("div.rounded-lg")).filter(Boolean);
    const card = cards.find((node) => node && !node.closest("table")) as HTMLElement;
    expect(within(card).getByRole("button", { name: "Keep" })).toBeInTheDocument();
    await userEvent.click(within(card).getByRole("button", { name: "Assign manager" }));
    expect(setLine).toHaveBeenCalledWith({ employeeUserId: "u-f", primaryManagerUserId: "u-new" }, expect.any(Object));
  });

  it.each(["withoutManager", "fallback", "pendingReview"])(
    "shows the %s view as stacked cards until xl, so its actions stay reachable at 768/1024 with the sidebar open",
    (view) => {
      search = `view=${view}`;
      can.mockReturnValue(true);
      const { container } = render(<ManagerCoveragePage />);
      expect(screen.getByRole("table").closest(".hidden")).toHaveClass("xl:block");
      expect(container.querySelector(".xl\\:hidden")).not.toBeNull();
      expect(container.querySelector(".sm\\:hidden")).toBeNull();
    },
  );

  it("copes with a scope-filtered, empty pending-review list (and with none sent)", () => {
    search = "view=pendingReview";
    can.mockImplementation((key: string) => key === "hr:reporting-lines:review");
    report = { ...REPORT, summary: { ...REPORT.summary, pendingReview: 0 }, pendingReview: [] };
    const { unmount } = render(<ManagerCoveragePage />);
    expect(screen.getByText("No reviews pending")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Review" })).not.toBeInTheDocument();
    unmount();

    report = { ...REPORT, summary: { ...REPORT.summary, pendingReview: undefined }, pendingReview: undefined };
    render(<ManagerCoveragePage />);
    expect(screen.getByText("No reviews pending")).toBeInTheDocument();
  });
});
