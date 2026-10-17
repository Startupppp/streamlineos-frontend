import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import {
  INLINE_READ_ERROR,
  readErrorReachesBoundary,
} from "@/lib/query-error-policy";
import { EmployeeSensitiveTab } from "./sensitive-tab";

const HOOKS = join(process.cwd(), "hooks/api/hr/employee-profile.ts");

const employment = jest.fn();
const sensitive = jest.fn();
const refetchSensitive = jest.fn();

jest.mock("@/hooks/api/hr/employees", () => ({
  useEmployeeEmployment: () => employment(),
  useEmployeeSensitive: () => sensitive(),
  useUpdateSensitive: () => ({ mutate: jest.fn(), isPending: false }),
}));

const employmentAccess = jest.fn();

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useCanState: () => employmentAccess(),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: ({ isError, error }: { isError: boolean; error: unknown }) =>
    isError ? { kind: "error", error } : { kind: "ready" },
}));

const OK = { isLoading: false, isError: false, error: null };
const EMPLOYMENT = { id: 7 };

function failing(status: number, refetch = jest.fn()) {
  return {
    data: undefined,
    isLoading: false,
    isError: true,
    error: new ApiError("Internal server error", status),
    refetch,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  employmentAccess.mockReturnValue("granted");
  employment.mockReturnValue({ ...OK, data: EMPLOYMENT, refetch: jest.fn() });
  sensitive.mockReturnValue({ ...OK, data: {}, refetch: refetchSensitive });
});

describe("HRMS-B2-015 a failed sensitive read is not reported as an absent sensitive record", () => {
  it("renders the tab on a healthy session, so the failure cases below are not passing on a tab that never mounts", () => {
    render(<EmployeeSensitiveTab userId="user-1" />);

    expect(screen.getByText(/sensitive information/i)).toBeInTheDocument();
  });

  it("shows an inline error with retry when the sensitive read 500s", () => {
    sensitive.mockReturnValue(failing(500, refetchSensitive));
    render(<EmployeeSensitiveTab userId="user-1" />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("does not claim the employee has no employment record when the read failed, which is the lie an empty state would tell", () => {
    sensitive.mockReturnValue(failing(500, refetchSensitive));
    render(<EmployeeSensitiveTab userId="user-1" />);

    expect(screen.queryByText(/no employment record found/i)).toBeNull();
    expect(screen.queryByText(/sensitive information/i)).toBeNull();
  });

  it("retries the failed read on the same surface rather than reloading the profile", () => {
    sensitive.mockReturnValue(failing(500, refetchSensitive));
    render(<EmployeeSensitiveTab userId="user-1" />);
    screen.getByRole("button", { name: /try again/i }).click();

    expect(refetchSensitive).toHaveBeenCalledTimes(1);
  });

  it("still draws the honest absent-record state when the employee genuinely has no employment", () => {
    employment.mockReturnValue({ ...OK, data: undefined, refetch: jest.fn() });
    render(<EmployeeSensitiveTab userId="user-1" />);

    expect(screen.getByText(/no employment record found/i)).toBeInTheDocument();
  });

  it("opts the sensitive read out of the error boundary, because the branch above is dead code on the provider default", () => {
    expect(
      readErrorReachesBoundary(new ApiError("Internal server error", 500), {
        state: { data: undefined },
      }),
    ).toBe(true);
    expect(INLINE_READ_ERROR).toEqual({ throwOnError: false });

    const source = readFileSync(HOOKS, "utf8");
    const body = source.slice(source.indexOf("export function useEmployeeSensitive"));
    expect(body.slice(0, body.indexOf("export function useUpdateSensitive"))).toContain(
      "...INLINE_READ_ERROR,",
    );
  });

  it("leaves a 402 module denial to the page-state branch and never turns it into a retry", () => {
    expect(
      readErrorReachesBoundary(new ApiError("Not enabled", 402, "MODULE_NOT_ENABLED"), {
        state: { data: undefined },
      }),
    ).toBe(false);
  });

  it("renders a refusal, never an absent-record claim, when the caller may not read employment records", () => {
    employmentAccess.mockReturnValue("denied");
    employment.mockReturnValue({ ...OK, data: undefined, refetch: jest.fn() });
    render(<EmployeeSensitiveTab userId="user-1" />);

    expect(screen.queryByText(/no employment record found/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /try again/i })).toBeNull();
    expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
  });

  it("renders the failed call's request id, so the reader can quote it to support", () => {
    sensitive.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError("Internal server error", 500, undefined, {
        correlationId: "req-44b2",
      }),
      refetch: refetchSensitive,
    });
    render(<EmployeeSensitiveTab userId="user-1" />);

    expect(screen.getByText("req-44b2")).toBeInTheDocument();
  });
});
