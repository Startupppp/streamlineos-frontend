import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import {
  INLINE_READ_ERROR,
  readErrorReachesBoundary,
} from "@/lib/query-error-policy";
import { WfhTabContent } from "../wfh-tab-content";

const HOOKS = join(process.cwd(), "hooks/api/hr/hr-settings.ts");

const wfhRequests = jest.fn();
const refetch = jest.fn();

jest.mock("@/hooks/api/hr", () => ({
  useHrWfhRequests: () => wfhRequests(),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: ({ isError, error }: { isError: boolean; error?: unknown }) =>
    isError ? { kind: "error", error } : { kind: "ready" },
}));

beforeEach(() => {
  jest.clearAllMocks();
  wfhRequests.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch,
  });
});

function failing(status: number) {
  return {
    data: undefined,
    isLoading: false,
    isError: true,
    error: new ApiError("Internal server error", status),
    refetch,
  };
}

describe("HRMS-B2-005 a failing WFH read does not claim the employee has filed nothing", () => {
  it("renders the WFH list surface on a healthy session, so the failure cases below are not passing on a panel that never mounts", () => {
    wfhRequests.mockReturnValue({
      data: [{ id: 1, date: "2026-10-01", status: "APPROVED", reason: null }],
      isLoading: false,
      isError: false,
      error: null,
      refetch,
    });
    render(<WfhTabContent />);

    expect(screen.getByRole("list", { name: /my wfh requests/i })).toBeInTheDocument();
  });

  it("opts the WFH read out of the route boundary, so a 500 degrades this tab instead of taking down /me/time-off", () => {
    const source = readFileSync(HOOKS, "utf8");
    const declaration = source.slice(source.indexOf("export function useHrWfhRequests"));
    const body = declaration.slice(0, declaration.indexOf("\n}\n"));

    expect(INLINE_READ_ERROR).toEqual({ throwOnError: false });
    expect(body).toContain("...INLINE_READ_ERROR,");
    expect(
      readErrorReachesBoundary(new ApiError("Internal server error", 500), {
        state: { data: undefined },
      }),
    ).toBe(true);
  });

  it("shows an inline error with retry when the WFH read 500s", () => {
    wfhRequests.mockReturnValue(failing(500));
    render(<WfhTabContent />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("does not claim there are no WFH requests when the read failed", () => {
    wfhRequests.mockReturnValue(failing(500));
    render(<WfhTabContent />);

    expect(screen.queryByText(/no wfh requests yet/i)).toBeNull();
  });

  it("offers no Request WFH next step while the panel is erroring, because retry is the action then", () => {
    wfhRequests.mockReturnValue(failing(500));
    render(<WfhTabContent onRequestWfh={jest.fn()} />);

    expect(screen.queryByRole("button", { name: /request wfh/i })).toBeNull();
  });

  it("does not report zero monthly and zero pending WFH days off a read that failed", () => {
    wfhRequests.mockReturnValue(failing(500));
    render(<WfhTabContent />);

    expect(screen.queryByRole("group", { name: /wfh statistics/i })).toBeNull();
    expect(screen.queryByText(/monthly wfh/i)).toBeNull();
  });

  it("retries the failed read on this tab rather than reloading the route", () => {
    wfhRequests.mockReturnValue(failing(500));
    render(<WfhTabContent />);
    screen.getByRole("button", { name: /try again/i }).click();

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("still shows the honest empty state with its CTA when the read genuinely returns no rows", () => {
    const onRequestWfh = jest.fn();
    render(<WfhTabContent onRequestWfh={onRequestWfh} />);

    expect(screen.getByText(/no wfh requests yet/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /request wfh/i })).toBeInTheDocument();
  });
});
