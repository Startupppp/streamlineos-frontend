import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "@/lib/api-envelope";
import type { HrReportingManagerRequest } from "@/hooks/api/hr/reporting-manager-requests-schema";
import { describeReportingWarning } from "@/components/hr/reporting-lines/reporting-line-warnings";
import { ReportingRequestReviewSheet } from "./reporting-request-review-sheet";
import { reviewDecisionSchema, toReviewPayload } from "./review-decision-schema";

const mutate = jest.fn();
const refetch = jest.fn();
let request: HrReportingManagerRequest | undefined;

jest.mock("@/hooks/api/hr/reporting-manager-requests", () => ({
  useReportingManagerRequest: () => ({ data: request, isLoading: false, isError: false, error: null, refetch }),
  useReviewReportingManagerRequest: () => ({ mutate, isPending: false }),
}));

jest.mock("@/components/hr/reporting-lines/manager-candidate-picker", () => ({
  ...jest.requireActual("@/components/hr/reporting-lines/manager-candidate-picker"),
  ManagerCandidatePicker: ({ onChange }: { onChange: (id: string | null, ref: null) => void }) => (
    <button type="button" onClick={() => onChange("u-cara", null)}>
      Pick Cara
    </button>
  ),
}));

const toastSuccess = jest.fn();
const toastError = jest.fn();
const toastWarning = jest.fn();
jest.mock("sonner", () => ({
  toast: {
    success: (...a: unknown[]) => toastSuccess(...a),
    error: (...a: unknown[]) => toastError(...a),
    warning: (...a: unknown[]) => toastWarning(...a),
  },
}));

function makeRequest(overrides: Partial<HrReportingManagerRequest> = {}): HrReportingManagerRequest {
  return {
    requestId: "req-1",
    status: "PENDING",
    employeeReason: "My manager changed when I moved to the platform team.",
    suggestedManager: { userId: "u-bea", name: "Bea Lin", email: null, designation: "Platform Lead", state: "active" },
    requestedEffectiveFrom: null,
    reviewReason: null,
    createdAt: "2026-09-20T10:00:00Z",
    updatedAt: "2026-09-20T10:00:00Z",
    resolvedAt: null,
    employee: { userId: "u-emp", name: "Eli Park", email: null, designation: "Engineer", state: "active" },
    currentManager: { userId: "u-old", name: "Olu Old", email: null, designation: null, state: "active" },
    ...overrides,
  };
}

beforeEach(() => {
  mutate.mockReset();
  refetch.mockReset();
  toastSuccess.mockReset();
  toastError.mockReset();
  toastWarning.mockReset();
  request = makeRequest();
});

async function decide(label: RegExp, reason: string) {
  const user = userEvent.setup();
  render(<ReportingRequestReviewSheet requestId="req-1" onOpenChange={jest.fn()} />);
  await user.click(screen.getByRole("radio", { name: label }));
  if (reason) await user.type(screen.getByRole("textbox", { name: /reason|what the employee/i }), reason);
  await user.click(screen.getByRole("button", { name: "Record decision" }));
  return user;
}

describe("review decision payloads", () => {
  it("approves with the suggested manager and omits a blank effective date", async () => {
    await decide(/Approve/, "Confirmed with the department head");
    await waitFor(() => expect(mutate).toHaveBeenCalled());
    expect(mutate.mock.calls[0][0]).toEqual({
      requestId: "req-1",
      decision: "APPROVE",
      managerUserId: "u-bea",
      reviewReason: "Confirmed with the department head",
    });
  });

  it("approves with a manager the reviewer picked", async () => {
    const user = userEvent.setup();
    render(<ReportingRequestReviewSheet requestId="req-1" onOpenChange={jest.fn()} />);
    await user.click(screen.getByRole("button", { name: "Pick Cara" }));
    await user.type(screen.getByRole("textbox", { name: /Reason for the change/ }), "Moved teams");
    await user.click(screen.getByRole("button", { name: "Record decision" }));
    await waitFor(() => expect(mutate).toHaveBeenCalled());
    expect(mutate.mock.calls[0][0]).toMatchObject({ decision: "APPROVE", managerUserId: "u-cara" });
  });

  it.each([
    [/^Reject$/, "REJECT"],
    [/duplicate/, "CANCEL_DUPLICATE"],
    [/more information/, "REQUEST_INFO"],
  ])("sends only the decision and reason for %s", async (label, decision) => {
    await decide(label, "  Checked the org chart  ");
    await waitFor(() => expect(mutate).toHaveBeenCalled());
    expect(mutate.mock.calls[0][0]).toEqual({ requestId: "req-1", decision, reviewReason: "Checked the org chart" });
  });

  it("requires a reason for every decision", async () => {
    await decide(/^Reject$/, "");
    expect(await screen.findByText("Give a reason for this decision")).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it("marks the decision reason required for assistive tech", () => {
    render(<ReportingRequestReviewSheet requestId="req-1" onOpenChange={jest.fn()} />);
    expect(screen.getByRole("textbox", { name: /reason|what the employee/i })).toHaveAttribute("aria-required", "true");
  });

  it("labels a rejection reason as visible to the employee", async () => {
    const user = userEvent.setup();
    render(<ReportingRequestReviewSheet requestId="req-1" onOpenChange={jest.fn()} />);
    await user.click(screen.getByRole("radio", { name: /^Reject$/ }));
    expect(screen.getByRole("textbox", { name: "Reason shown to the employee" })).toBeInTheDocument();
  });

  it("requires a manager to approve when none was suggested", () => {
    const refused = reviewDecisionSchema.safeParse({ decision: "APPROVE", managerUserId: "", effectiveFrom: "", reviewReason: "Ok" });
    expect(refused.success).toBe(false);
    expect(refused.error?.issues[0]?.path).toEqual(["managerUserId"]);
    expect(
      reviewDecisionSchema.safeParse({ decision: "REJECT", managerUserId: "", effectiveFrom: "", reviewReason: "No" }).success,
    ).toBe(true);
    expect(toReviewPayload({ decision: "APPROVE", managerUserId: "u-x", effectiveFrom: "2026-10-01", reviewReason: "Ok" })).toEqual({
      decision: "APPROVE",
      managerUserId: "u-x",
      effectiveFrom: "2026-10-01",
      reviewReason: "Ok",
    });
  });
});

describe("review outcomes", () => {
  it("reports warnings and a past-tense success", async () => {
    mutate.mockImplementation((_input, options) =>
      options.onSuccess({ request: makeRequest(), warnings: ["PRIMARY_CHANGE_THRESHOLD_EXCEEDED"] }),
    );
    await decide(/Approve/, "Ok");
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("Approved — Eli Park's reporting manager was changed"));
    expect(toastWarning).toHaveBeenCalledWith(describeReportingWarning("PRIMARY_CHANGE_THRESHOLD_EXCEEDED"));
    expect(toastWarning).not.toHaveBeenCalledWith("PRIMARY_CHANGE_THRESHOLD_EXCEEDED");
  });

  it("reloads the request when it changed underneath the reviewer (409)", async () => {
    mutate.mockImplementation((_input, options) =>
      options.onError(new ApiError("stale", 409, "REQUEST_INVALID_TRANSITION")),
    );
    await decide(/^Reject$/, "No");
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("This request changed since you opened it. It has been reloaded."));
    expect(refetch).toHaveBeenCalled();
  });

  it("shows a resolved request read-only", () => {
    request = makeRequest({ status: "APPROVED", reviewReason: "Done" });
    render(<ReportingRequestReviewSheet requestId="req-1" onOpenChange={jest.fn()} />);
    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Record decision" })).not.toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });

  it("describes the drawer to assistive tech, open or resolved (no Radix 'Missing Description')", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const { unmount } = render(<ReportingRequestReviewSheet requestId="req-1" onOpenChange={jest.fn()} />);
    expect(screen.getByRole("dialog")).toHaveAccessibleDescription(/Nothing changes until you record a decision/);
    unmount();
    request = makeRequest({ status: "REJECTED", reviewReason: "No" });
    render(<ReportingRequestReviewSheet requestId="req-1" onOpenChange={jest.fn()} />);
    expect(screen.getByRole("dialog")).toHaveAccessibleDescription(/Nothing changes until you record a decision/);
    expect(warn.mock.calls.flat().join(" ")).not.toMatch(/Missing `Description`/);
    warn.mockRestore();
  });
});
