import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { InstanceDetailSheet } from "./instance-detail-sheet";

const HOOKS = join(process.cwd(), "hooks/api/hr/hr-workflows.ts");

const detail = jest.fn();
const refetch = jest.fn();

jest.mock("@/hooks/api/hr/hr-workflows", () => ({
  useWorkflowInstanceDetail: () => detail(),
  useApproveInstance: () => ({ mutate: jest.fn(), isPending: false }),
  useRejectInstance: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

function noop(): void {}

function renderSheet() {
  return render(<InstanceDetailSheet instanceId={12} onClose={noop} />);
}

function healthy(timeline: unknown[]) {
  return {
    data: {
      id: 12,
      status: "pending",
      objectType: "leave_request",
      requester: { name: "Asha", email: "asha@example.test" },
      subjectEmployee: { name: "Asha", email: "asha@example.test" },
      dueAt: null,
      timeline,
    },
    isLoading: false,
    isError: false,
    error: null,
    refetch,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  detail.mockReturnValue(healthy([]));
});

describe("HRMS-B3-014 a failed instance read must not read as an approval with no history", () => {
  it("keeps the failed instance read inline instead of throwing it to the /hr boundary", () => {
    const source = readFileSync(HOOKS, "utf8");

    expect(INLINE_READ_ERROR).toEqual({ throwOnError: false });
    expect(source).toContain("...INLINE_READ_ERROR,");
  });

  it("shows an inline error with retry on the sheet when the instance read 500s", () => {
    detail.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError("Internal server error", 500),
      refetch,
    });
    renderSheet();

    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load instance detail/i);
  });

  it("does not claim the request has no actions when the read failed", () => {
    detail.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError("Internal server error", 500),
      refetch,
    });
    renderSheet();

    expect(screen.queryByText(/no actions yet/i)).toBeNull();
  });

  it("retries the instance read itself rather than reloading the workflows route", () => {
    detail.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError("Internal server error", 500),
      refetch,
    });
    renderSheet();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("still shows the honest empty timeline when the instance really has no actions", () => {
    renderSheet();

    expect(screen.getByText(/no actions yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("still renders a timeline the read returned", () => {
    detail.mockReturnValue(
      healthy([
        {
          id: 1,
          action: "approved",
          actedBy: { name: "Ravi", email: "ravi@example.test" },
          actedAt: "2026-01-02T00:00:00.000Z",
          stepOrder: 1,
          comment: null,
        },
      ]),
    );
    renderSheet();

    expect(screen.getByText("Ravi")).toBeInTheDocument();
    expect(screen.queryByText(/no actions yet/i)).toBeNull();
  });
});

describe("the failed read's request id is quotable to support", () => {
  it("renders the copyable reference the backend echoed on the error envelope", () => {
    detail.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError("Internal server error", 500, undefined, { correlationId: "req-abc123" }),
      refetch,
    });
    renderSheet();
    expect(screen.getByText(/reference/i)).toBeInTheDocument();
    expect(screen.getByText("req-abc123")).toBeInTheDocument();
  });
});
