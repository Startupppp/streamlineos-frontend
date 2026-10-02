import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import {
  INLINE_READ_ERROR,
  readErrorReachesBoundary,
} from "@/lib/query-error-policy";
import { RecruitmentCommandCenterPage } from "./command-center-page";

const stats = jest.fn();
const jobPostings = jest.fn();
const interviews = jest.fn();
const candidates = jest.fn();
const deniedPermissions = new Set<string>();

jest.mock("@/hooks/api/hr", () => ({
  useRecruitmentStats: () => stats(),
  useJobPostings: () => jobPostings(),
  useInterviews: () => interviews(),
}));

jest.mock("@/hooks/api/hr/recruitment", () => ({
  useCandidates: () => candidates(),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (options: {
    permission?: string;
    isLoading: boolean;
    isError: boolean;
    error?: unknown;
  }) => {
    if (options.permission !== undefined && deniedPermissions.has(options.permission))
      return { kind: "denied", permission: options.permission };
    if (options.isLoading) return { kind: "loading" };
    if (options.isError) return { kind: "error", error: options.error };
    return { kind: "ready" };
  },
}));

const CORRELATION_ID = "req_7f3a91";

const OK = { isLoading: false, isError: false, error: null, refetch: jest.fn() };

function empty() {
  return { ...OK, data: [], refetch: jest.fn() };
}

function failing(status: number, refetch: jest.Mock) {
  return {
    data: undefined,
    isLoading: false,
    isError: true,
    error: new ApiError("Internal server error", status, undefined, {
      correlationId: CORRELATION_ID,
    }),
    refetch,
  };
}

function gatedShut() {
  return { ...OK, data: undefined, refetch: jest.fn() };
}

function statCardValue(label: string): string {
  const labelNode = screen.getByText(label);
  const card = labelNode.closest("div[class]")?.parentElement;
  return card?.textContent ?? "";
}

beforeEach(() => {
  jest.clearAllMocks();
  deniedPermissions.clear();
  stats.mockReturnValue({
    ...OK,
    data: {
      openJobs: 3,
      newCandidates: 4,
      hiredThisMonth: 1,
      avgTimeToHireDays: 12,
      totalCandidates: 9,
      sources: [],
    },
    refetch: jest.fn(),
  });
  jobPostings.mockReturnValue(empty());
  interviews.mockReturnValue(empty());
  candidates.mockReturnValue(empty());
});

const PAGE = join(process.cwd(), "features/recruitment/command-center-page.tsx");

describe("HRMS-B2-010 no Command Center tile reads a reassuring number out of a failed queue", () => {
  it("opts all four Command Center reads out of the recruitment error boundary, or the inline branches below are dead code in the browser", () => {
    const source = readFileSync(PAGE, "utf8");

    expect(INLINE_READ_ERROR).toEqual({ throwOnError: false });
    expect(
      readErrorReachesBoundary(new ApiError("Internal server error", 500), {
        state: { data: undefined },
      }),
    ).toBe(true);
    expect(source.match(/, INLINE_READ_ERROR\)/g) ?? []).toHaveLength(3);
    expect(
      readFileSync(
        join(process.cwd(), "hooks/api/hr/recruitment/jobs.ts"),
        "utf8",
      ),
    ).toContain("...INLINE_READ_ERROR,");
  });

  it("renders the stat grid and the queues on a healthy session, so the failure cases below are not passing on a page that never mounts", () => {
    render(<RecruitmentCommandCenterPage />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/command center/i);
    expect(screen.getByText(/no new applicants right now/i)).toBeInTheDocument();
    expect(screen.getByText(/nothing needs attention/i)).toBeInTheDocument();
    expect(statCardValue("Interviews Today")).toContain("0");
  });

  it("shows no count for interviews today or awaiting feedback when the interviews read 500s", () => {
    interviews.mockReturnValue(failing(500, jest.fn()));
    render(<RecruitmentCommandCenterPage />);

    expect(statCardValue("Interviews Today")).toContain("—");
    expect(statCardValue("Awaiting Feedback")).toContain("—");
  });

  it("renders the failing queue's request reference so the failure can be quoted to support", () => {
    candidates.mockReturnValue(failing(500, jest.fn()));
    render(<RecruitmentCommandCenterPage />);

    expect(screen.getByText(CORRELATION_ID)).toBeInTheDocument();
  });

  it("shows no count for interviews when the read is gated shut, which reports neither loading nor error", () => {
    deniedPermissions.add("hr:interviews:view");
    interviews.mockReturnValue(gatedShut());
    render(<RecruitmentCommandCenterPage />);

    expect(statCardValue("Interviews Today")).toContain("—");
    expect(statCardValue("Awaiting Feedback")).toContain("—");
  });

  it("does not claim nothing needs attention when the interviews read failed", () => {
    interviews.mockReturnValue(failing(500, jest.fn()));
    render(<RecruitmentCommandCenterPage />);

    expect(screen.queryByText(/nothing needs attention/i)).toBeNull();
  });

  it("does not claim nothing needs attention when the open-roles read failed", () => {
    jobPostings.mockReturnValue(failing(500, jest.fn()));
    render(<RecruitmentCommandCenterPage />);

    expect(screen.queryByText(/nothing needs attention/i)).toBeNull();
  });

  it("does not claim the queue is empty when its read failed, and offers a retry on the queue itself", () => {
    const refetch = jest.fn();
    candidates.mockReturnValue(failing(500, refetch));
    render(<RecruitmentCommandCenterPage />);

    expect(screen.queryByText(/no new applicants right now/i)).toBeNull();
    expect(screen.getAllByRole("alert").length).toBeGreaterThanOrEqual(1);
    screen.getAllByRole("button", { name: /try again/i })[0].click();
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("does not claim every open role has applicants when the open-roles read failed", () => {
    jobPostings.mockReturnValue(failing(500, jest.fn()));
    render(<RecruitmentCommandCenterPage />);

    expect(screen.queryByText(/every open role has applicants/i)).toBeNull();
  });

  it("still shows each honest empty label on a genuine zero-row read", () => {
    render(<RecruitmentCommandCenterPage />);

    expect(screen.getByText(/no new applicants right now/i)).toBeInTheDocument();
    expect(screen.getByText(/no interviews scheduled today/i)).toBeInTheDocument();
    expect(screen.getByText(/every open role has applicants/i)).toBeInTheDocument();
  });
});
