import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "@/lib/api-envelope";
import type { MyReportingLine } from "@/hooks/api/hr/reporting-lines-schema";
import type { MyReportingManagerRequest } from "@/hooks/api/hr/reporting-manager-requests-schema";
import { MyReportingLineSection } from "./my-reporting-line-section";
import { reportingIssueSchema, respondSchema, toCreateRequestPayload } from "./reporting-issue-schema";

let hrEnabled = true;
jest.mock("@/hooks/api/access", () => ({ useModuleEnabled: () => hrEnabled }));

let line: MyReportingLine | undefined;
let requests: MyReportingManagerRequest[] = [];
const create = jest.fn();
const cancel = jest.fn();
const respond = jest.fn();
const refetchRequests = jest.fn();
jest.mock("@/hooks/api/hr/my-reporting-line", () => ({
  useMyReportingLine: () => ({ data: line, isLoading: false, isError: false, error: null, refetch: jest.fn() }),
  useMyReportingManagerRequests: () => ({
    data: { pages: [{ items: requests, nextCursor: null }] },
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
    refetch: refetchRequests,
  }),
  useCreateReportingManagerRequest: () => ({ mutate: create, isPending: false }),
  useCancelReportingManagerRequest: () => ({ mutate: cancel, isPending: false }),
  useRespondReportingManagerRequest: () => ({ mutate: respond, isPending: false }),
}));

jest.mock("@/components/hr/reporting-lines/manager-candidate-picker", () => ({
  ...jest.requireActual("@/components/hr/reporting-lines/manager-candidate-picker"),
  ManagerCandidatePicker: () => <div data-testid="picker" />,
}));

const toastError = jest.fn();
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: (...a: unknown[]) => toastError(...a) } }));

const MANAGER = { userId: "u-m", name: "Mara Lead", email: null, designation: "Lead", state: "active" as const };

function entry(overrides: Partial<NonNullable<MyReportingLine["primary"]>> = {}): NonNullable<MyReportingLine["primary"]> {
  return {
    lineId: 1,
    relationshipType: "PRIMARY",
    label: null,
    manager: MANAGER,
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    source: "MANUAL",
    isFallback: false,
    fallbackConfirmedAt: null,
    recordedAt: "2026-01-01T00:00:00Z",
    changeReason: null,
    ...overrides,
  };
}

function request(overrides: Partial<MyReportingManagerRequest>): MyReportingManagerRequest {
  return {
    requestId: "req-1",
    status: "PENDING",
    employeeReason: "I moved teams in August and my manager changed.",
    suggestedManager: null,
    requestedEffectiveFrom: null,
    reviewReason: null,
    createdAt: "2026-09-20T10:00:00Z",
    updatedAt: "2026-09-20T10:00:00Z",
    resolvedAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  hrEnabled = true;
  line = { hasEmployment: true, primary: entry(), secondary: [], topLevel: null };
  requests = [];
  [create, cancel, respond, refetchRequests, toastError].forEach((fn) => fn.mockReset());
});

describe("MyReportingLineSection", () => {
  it("shows the primary and additional managers without reasons", () => {
    line = {
      hasEmployment: true,
      primary: entry({ isFallback: true }),
      secondary: [entry({ lineId: 2, relationshipType: "SECONDARY", label: "Functional", manager: { ...MANAGER, userId: "u-s", name: "Sol Second" } })],
      topLevel: null,
    };
    render(<MyReportingLineSection />);
    expect(screen.getByText("Primary reporting manager")).toBeInTheDocument();
    expect(screen.getByText("Mara Lead")).toBeInTheDocument();
    expect(screen.getByText("Temporarily assigned by onboarding policy")).toBeInTheDocument();
    expect(screen.getByText("Additional reporting managers")).toBeInTheDocument();
    expect(screen.getByText("Functional")).toBeInTheDocument();
  });

  it("renders nothing for a member with no employment, or with HR off", () => {
    line = { hasEmployment: false, primary: null, secondary: [], topLevel: null };
    const { container, rerender } = render(<MyReportingLineSection />);
    expect(container).toBeEmptyDOMElement();
    line = { hasEmployment: true, primary: entry(), secondary: [], topLevel: null };
    hrEnabled = false;
    rerender(<MyReportingLineSection />);
    expect(container).toBeEmptyDOMElement();
  });

  it("files a request with a trimmed reason and no blank optional fields", async () => {
    const user = userEvent.setup();
    render(<MyReportingLineSection />);
    await user.click(screen.getByRole("button", { name: "Report an issue" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByRole("textbox", { name: "What is wrong?" }), "  My manager left the company last week.  ");
    await user.click(within(dialog).getByRole("button", { name: "Send to HR" }));
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][0]).toEqual({ reason: "My manager left the company last week." });
  });

  it("tells the employee when a request is already under review (409)", async () => {
    create.mockImplementation((_input, options) => options.onError(new ApiError("dup", 409, "REQUEST_DUPLICATE_ACTIVE")));
    const user = userEvent.setup();
    render(<MyReportingLineSection />);
    await user.click(screen.getByRole("button", { name: "Report an issue" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByRole("textbox", { name: "What is wrong?" }), "My manager left the company last week.");
    await user.click(within(dialog).getByRole("button", { name: "Send to HR" }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("You already have a request under review"));
    expect(refetchRequests).toHaveBeenCalled();
  });

  it("disables a second report while one is active", () => {
    requests = [request({ status: "PENDING" })];
    render(<MyReportingLineSection />);
    expect(screen.getByRole("button", { name: "Report an issue" })).toBeDisabled();
    expect(screen.getByText(/You have a request under review/)).toBeInTheDocument();
  });

  it("cancels an active request after confirmation", async () => {
    requests = [request({ status: "PENDING" })];
    const user = userEvent.setup();
    render(<MyReportingLineSection />);
    await user.click(screen.getByRole("button", { name: "Cancel request" }));
    const confirm = await screen.findByRole("alertdialog");
    await user.click(within(confirm).getByRole("button", { name: "Cancel request" }));
    expect(cancel).toHaveBeenCalledWith("req-1", expect.anything());
  });

  it("offers Respond only when HR asked for more information", () => {
    requests = [
      request({ requestId: "a", status: "MORE_INFO_REQUIRED", reviewReason: "Which team?" }),
      request({ requestId: "b", status: "REJECTED", reviewReason: "Line is correct" }),
    ];
    render(<MyReportingLineSection />);
    expect(screen.getAllByRole("button", { name: "Respond" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Cancel request" })).toHaveLength(1);
  });
});

describe("reporting issue schemas", () => {
  const base = { suggestedManagerUserId: "", requestedEffectiveFrom: "" };

  it("rejects 19 characters and accepts 20", () => {
    expect(reportingIssueSchema.safeParse({ ...base, reason: "a".repeat(19) }).success).toBe(false);
    expect(reportingIssueSchema.safeParse({ ...base, reason: "a".repeat(20) }).success).toBe(true);
    expect(reportingIssueSchema.safeParse({ ...base, reason: "a".repeat(1001) }).success).toBe(false);
  });

  it("does not count surrounding whitespace toward the minimum", () => {
    expect(reportingIssueSchema.safeParse({ ...base, reason: `  ${"a".repeat(19)}  ` }).success).toBe(false);
  });

  it("sends optional fields only when filled", () => {
    expect(
      toCreateRequestPayload({ reason: "x".repeat(20), suggestedManagerUserId: "u-m", requestedEffectiveFrom: "2026-10-01" }),
    ).toEqual({ reason: "x".repeat(20), suggestedManagerUserId: "u-m", requestedEffectiveFrom: "2026-10-01" });
  });

  it("holds a reply to the same 20..1000 bounds", () => {
    expect(respondSchema.safeParse({ reason: "short" }).success).toBe(false);
    expect(respondSchema.safeParse({ reason: "b".repeat(20) }).success).toBe(true);
  });
});
