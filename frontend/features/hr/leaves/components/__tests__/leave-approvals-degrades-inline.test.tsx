import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import {
  INLINE_READ_ERROR,
  readErrorReachesBoundary,
} from "@/lib/query-error-policy";
import { LeaveApprovalsContent } from "../leave-approvals";

const LEAVES_HOOKS = join(process.cwd(), "hooks/api/hr/leaves.ts");
const SETTINGS_HOOKS = join(process.cwd(), "hooks/api/hr/hr-settings.ts");

jest.mock("../wfh-approvals-card", () => ({
  WfhApprovalsCard: () => null,
}));

jest.mock("../leave-approvals-list", () => ({
  LeaveApprovalsList: () => <div>leave rows</div>,
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: ({ isError, error }: { isError: boolean; error: unknown }) => {
    if (!isError) return { kind: "ready" };
    if (error instanceof ApiError && error.status === 403)
      return { kind: "denied", permission: "hr:leaves:view" };
    return { kind: "error", error };
  },
}));

const refetch = jest.fn();

function hookBody(source: string, name: string, next: string): string {
  const body = source.slice(source.indexOf(`export function ${name}`));
  return body.slice(0, body.indexOf(`export function ${next}`));
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("HRMS-B2-017 a failed approvals read is not reported as an empty approvals queue", () => {
  it("renders the queue and its empty copy on a healthy session with no rows", () => {
    render(
      <LeaveApprovalsContent
        incomingLeaveRequests={[]}
        allIncomingLeaveRequests={[]}
      />,
    );

    expect(screen.getByText("No leave requests")).toBeInTheDocument();
  });

  it("shows an inline error with retry on the approvals surface when the read 500s", () => {
    render(
      <LeaveApprovalsContent
        incomingLeaveRequests={[]}
        allIncomingLeaveRequests={[]}
        isError
        error={new ApiError("Internal server error", 500)}
        onRetry={refetch}
      />,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("does not claim there are no pending leave requests when the read failed", () => {
    render(
      <LeaveApprovalsContent
        incomingLeaveRequests={[]}
        allIncomingLeaveRequests={[]}
        isError
        error={new ApiError("Internal server error", 500)}
        onRetry={refetch}
      />,
    );

    expect(screen.queryByText("No leave requests")).toBeNull();
    expect(screen.queryByText(/there are no leave requests to display/i)).toBeNull();
  });

  it("retries the failed read on the same surface rather than reloading the route", () => {
    render(
      <LeaveApprovalsContent
        incomingLeaveRequests={[]}
        allIncomingLeaveRequests={[]}
        isError
        error={new ApiError("Internal server error", 500)}
        onRetry={refetch}
      />,
    );
    screen.getByRole("button", { name: /try again/i }).click();

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("renders a refusal rather than a retry when the approvals read is denied", () => {
    render(
      <LeaveApprovalsContent
        incomingLeaveRequests={[]}
        allIncomingLeaveRequests={[]}
        isError
        error={new ApiError("Forbidden", 403)}
        onRetry={refetch}
      />,
    );

    expect(screen.queryByRole("button", { name: /try again/i })).toBeNull();
    expect(screen.queryByText("No leave requests")).toBeNull();
  });

  it("opts the approvals read out of the error boundary, because the branch above is dead code on the provider default", () => {
    expect(
      readErrorReachesBoundary(new ApiError("Internal server error", 500), {
        state: { data: undefined },
      }),
    ).toBe(true);
    expect(INLINE_READ_ERROR).toEqual({ throwOnError: false });
    expect(
      hookBody(
        readFileSync(LEAVES_HOOKS, "utf8"),
        "useHrLeaveApprovals",
        "useHrLeavesThisWeek",
      ),
    ).toContain("...INLINE_READ_ERROR,");
  });
});

describe("HRMS-005 the WFH sub-query's own failure stays visible on the surface that depends on it", () => {
  it("opts the pending WFH read out of the boundary, so its failure does not replace the whole leaves route", () => {
    expect(
      hookBody(
        readFileSync(SETTINGS_HOOKS, "utf8"),
        "useHrPendingWfhRequests",
        "useCreateWfhRequest",
      ),
    ).toContain("...INLINE_READ_ERROR,");
  });
});
