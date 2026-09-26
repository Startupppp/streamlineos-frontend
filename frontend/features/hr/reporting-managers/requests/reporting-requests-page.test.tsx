import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PageStateResolution } from "@/lib/page-state/resolve-page-state";
import type { HrReportingManagerRequest } from "@/hooks/api/hr/reporting-manager-requests-schema";
import { ReportingRequestsPage } from "./reporting-requests-page";

const replace = jest.fn();
let params = new URLSearchParams();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: jest.fn() }),
  usePathname: () => "/hr/employees/reporting-requests",
  useSearchParams: () => params,
}));

let resolution: PageStateResolution = { kind: "ready" };
const pageStateArgs = jest.fn();
jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (options: unknown) => {
    pageStateArgs(options);
    return resolution;
  },
}));

const listArgs = jest.fn();
const ROW: HrReportingManagerRequest = {
  requestId: "req-1",
  status: "PENDING",
  employeeReason: "Wrong manager after my transfer to platform.",
  suggestedManager: null,
  requestedEffectiveFrom: null,
  reviewReason: null,
  createdAt: "2026-09-20T10:00:00Z",
  updatedAt: "2026-09-20T10:00:00Z",
  resolvedAt: null,
  employee: { userId: "u-emp", name: "Eli Park", email: null, designation: "Engineer", state: "active" },
  currentManager: { userId: "u-old", name: "Olu Old", email: null, designation: null, state: "active" },
};
jest.mock("@/hooks/api/hr/reporting-manager-requests", () => ({
  useReportingManagerRequests: (filters: unknown) => {
    listArgs(filters);
    return { data: { items: [ROW], nextCursor: null }, isLoading: false, isError: false, error: null, refetch: jest.fn() };
  },
  useReportingManagerRequest: () => ({ data: undefined, isLoading: false, isError: false, error: null, refetch: jest.fn() }),
  useReviewReportingManagerRequest: () => ({ mutate: jest.fn(), isPending: false }),
}));

beforeAll(() => {
  Element.prototype.hasPointerCapture = jest.fn(() => false);
  Element.prototype.setPointerCapture = jest.fn();
  Element.prototype.releasePointerCapture = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();
});

beforeEach(() => {
  replace.mockReset();
  listArgs.mockReset();
  params = new URLSearchParams();
  resolution = { kind: "ready" };
});

describe("ReportingRequestsPage", () => {
  it("gates on the review permission and passes the read's error through", () => {
    render(<ReportingRequestsPage />);
    expect(pageStateArgs).toHaveBeenLastCalledWith(
      expect.objectContaining({ permission: "hr:reporting-lines:review", module: "hr", error: null }),
    );
  });

  it("renders a denial, not an empty queue, for a user without review access", () => {
    resolution = { kind: "denied", permission: "hr:reporting-lines:review" };
    render(<ReportingRequestsPage />);
    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
    expect(screen.queryByText("Eli Park")).not.toBeInTheDocument();
  });

  it("lists requests by name for a permitted reviewer", () => {
    render(<ReportingRequestsPage />);
    expect(screen.getByText("Eli Park")).toBeInTheDocument();
    expect(screen.getByText("Olu Old")).toBeInTheDocument();
    expect(screen.getByText("None suggested")).toBeInTheDocument();
    expect(screen.getByText("Pending review")).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("u-emp");
  });

  it("reads the status filter from the URL", () => {
    params = new URLSearchParams("status=MORE_INFO_REQUIRED");
    render(<ReportingRequestsPage />);
    expect(listArgs).toHaveBeenLastCalledWith(expect.objectContaining({ status: "MORE_INFO_REQUIRED", cursor: undefined }));
  });

  it("ignores an unknown status in the URL", () => {
    params = new URLSearchParams("status=BOGUS");
    render(<ReportingRequestsPage />);
    expect(listArgs).toHaveBeenLastCalledWith(expect.objectContaining({ status: undefined }));
  });

  it("writes a new status filter to the URL", async () => {
    const user = userEvent.setup();
    render(<ReportingRequestsPage />);
    await user.click(screen.getByRole("combobox", { name: "Filter by status" }));
    await user.click(await screen.findByRole("option", { name: "Rejected" }));
    expect(replace).toHaveBeenCalledWith("/hr/employees/reporting-requests?status=REJECTED", { scroll: false });
  });

  it("opens the review drawer through the URL on row activation", async () => {
    const user = userEvent.setup();
    render(<ReportingRequestsPage />);
    await user.click(screen.getByText("Eli Park"));
    expect(replace).toHaveBeenCalledWith("/hr/employees/reporting-requests?request=req-1", { scroll: false });
  });
});
