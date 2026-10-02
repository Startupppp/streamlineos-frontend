import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { ExitVerificationView } from "./exit-verification-view";

const HOOKS = join(process.cwd(), "hooks/api/hr/enterprise-ops-identity.ts");

const verification = jest.fn();
const refetch = jest.fn();

const ALLOWED = {
  permission: "hr:identity:view",
  allowed: true,
  denied: false,
  pending: false,
  unavailable: false,
} as const;

jest.mock("@/hooks/api/hr/enterprise-ops-identity", () => ({
  useExitVerification: () => verification(),
}));

jest.mock("@/components/ui/user-combobox", () => ({
  UserCombobox: ({ onChange }: { onChange: (value: string) => void }) => (
    <button type="button" onClick={() => onChange("user-1")}>
      pick employee
    </button>
  ),
}));

const CLEAN = {
  hasUnverifiedRevokes: false,
  unverified: [],
  total: 3,
};

function pickEmployeeAndCheck() {
  fireEvent.click(screen.getByRole("button", { name: /pick employee/i }));
  fireEvent.click(screen.getByRole("button", { name: /^check$/i }));
}

beforeEach(() => {
  jest.clearAllMocks();
  verification.mockReturnValue({
    data: CLEAN,
    isLoading: false,
    isError: false,
    error: null,
    refetch,
    access: ALLOWED,
  });
});

describe("HRMS-B2-016 a failed exit verification is not reported as nothing to verify", () => {
  it("prompts for an employee before anything has been checked", () => {
    render(<ExitVerificationView />);

    expect(screen.getByText(/select an employee to verify/i)).toBeInTheDocument();
  });

  it("states the verification result once a check succeeds", () => {
    render(<ExitVerificationView />);
    pickEmployeeAndCheck();

    expect(screen.getByText(/all access revoked and verified/i)).toBeInTheDocument();
  });

  it("shows an inline error, and never the select-an-employee prompt, when the check 500s", () => {
    verification.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError("Internal server error", 500),
      refetch,
      access: ALLOWED,
    });
    render(<ExitVerificationView />);
    pickEmployeeAndCheck();

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText(/select an employee to verify/i)).toBeNull();
    expect(screen.queryByText(/all access revoked and verified/i)).toBeNull();
  });

  it("retries the check itself, with no click event leaking into the query's refetch options", () => {
    verification.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError("Internal server error", 500),
      refetch,
      access: ALLOWED,
    });
    render(<ExitVerificationView />);
    pickEmployeeAndCheck();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(refetch).toHaveBeenCalledTimes(1);
    expect(refetch).toHaveBeenCalledWith();
  });

  it("opts the read out of the error boundary, because the branch above is dead code on the provider default", () => {
    expect(INLINE_READ_ERROR).toEqual({ throwOnError: false });

    const source = readFileSync(HOOKS, "utf8");
    const body = source.slice(source.indexOf("export function useExitVerification"));
    expect(
      body.slice(0, body.indexOf("export function useCreateProvisioning")),
    ).toContain("...INLINE_READ_ERROR,");
  });

  it("states that the status could not be determined, rather than rendering a blank panel, when the read returns nothing", () => {
    verification.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch,
      access: ALLOWED,
    });
    render(<ExitVerificationView />);
    pickEmployeeAndCheck();

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(
      screen.getByText(/couldn't determine exit verification status/i),
    ).toBeInTheDocument();
  });

  it("renders a refusal with no retry when the caller may not read identity records", () => {
    verification.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch,
      access: { ...ALLOWED, allowed: false, denied: true },
    });
    render(<ExitVerificationView />);
    pickEmployeeAndCheck();

    expect(screen.queryByRole("button", { name: /try again/i })).toBeNull();
    expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
  });

  it("renders the failed call's request id, so the reader can quote it to support", () => {
    verification.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError("Internal server error", 500, undefined, {
        correlationId: "req-91cd",
      }),
      refetch,
      access: ALLOWED,
    });
    render(<ExitVerificationView />);
    pickEmployeeAndCheck();

    expect(screen.getByText("req-91cd")).toBeInTheDocument();
  });
});
