import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { AccessRequestsTab } from "./access-requests-tab";

const HOOKS = join(process.cwd(), "hooks/api/hr/access-requests.ts");

const requests = jest.fn();
const refetch = jest.fn();

const ALLOWED = {
  permission: "hr:assets:view",
  allowed: true,
  denied: false,
  pending: false,
  unavailable: false,
} as const;

const DENIED = { ...ALLOWED, allowed: false, denied: true } as const;

jest.mock("@/hooks/api/hr/access-requests", () => ({
  useAccessRequests: () => requests(),
  useCreateAccessRequest: () => ({ mutate: jest.fn(), isPending: false }),
  useUpdateAccessRequest: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/features/hr/shared/employee-picker", () => ({
  EmployeePicker: () => null,
}));

beforeEach(() => {
  jest.clearAllMocks();
  requests.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch,
    access: ALLOWED,
  });
});

function failing(error: unknown) {
  return {
    data: undefined,
    isLoading: false,
    isError: true,
    error,
    refetch,
    access: ALLOWED,
  };
}

describe("HRMS-B2-024 a failed access-request read is not reported as no access requests", () => {
  it("still shows the honest empty state, with its request CTA, when the read genuinely returns no rows", () => {
    render(<AccessRequestsTab employees={[]} canManage />);

    expect(screen.getByText(/no access requests/i)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /request access/i })).not.toHaveLength(0);
  });

  it("shows an inline error with retry, and no emptiness claim, when the read 500s", () => {
    requests.mockReturnValue(failing(new ApiError("Internal server error", 500)));
    render(<AccessRequestsTab employees={[]} canManage />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText(/no access requests/i)).toBeNull();
  });

  it("offers no request CTA while the panel is erroring, because retry is the action then", () => {
    requests.mockReturnValue(failing(new ApiError("Internal server error", 500)));
    render(<AccessRequestsTab employees={[]} canManage />);

    expect(screen.queryAllByRole("button", { name: /request access/i })).toHaveLength(0);
  });

  it("retries the read itself, with no click event leaking into the query's refetch options", () => {
    requests.mockReturnValue(failing(new ApiError("Internal server error", 500)));
    render(<AccessRequestsTab employees={[]} canManage />);
    screen.getByRole("button", { name: /try again/i }).click();

    expect(refetch).toHaveBeenCalledTimes(1);
    expect(refetch).toHaveBeenCalledWith();
  });

  it("opts the read out of the error boundary, because the branch above is dead code on the provider default", () => {
    expect(INLINE_READ_ERROR).toEqual({ throwOnError: false });

    const source = readFileSync(HOOKS, "utf8");
    const body = source.slice(source.indexOf("export function useAccessRequests"));
    expect(
      body.slice(0, body.indexOf("export function useCreateAccessRequest")),
    ).toContain("...INLINE_READ_ERROR,");
  });

  it("imports its error state from the owning leaf, not the shared barrel", () => {
    const source = readFileSync(
      join(process.cwd(), "features/hr/assets/access-requests-tab.tsx"),
      "utf8",
    );

    expect(source).toContain('from "@/components/shared/error-state"');
    expect(source).not.toContain('from "@/components/shared"');
  });

  it("renders a refusal, never an empty list, when the caller may not read access requests", () => {
    requests.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch,
      access: DENIED,
    });
    render(<AccessRequestsTab employees={[]} canManage />);

    expect(screen.queryByText(/no access requests/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /try again/i })).toBeNull();
    expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
  });

  it("says it could not read the list, rather than that there is none, when the permission read itself failed", () => {
    requests.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch,
      access: { ...ALLOWED, allowed: false, unavailable: true },
    });
    render(<AccessRequestsTab employees={[]} canManage />);

    expect(screen.queryByText(/no access requests/i)).toBeNull();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("renders the failed call's request id, so the reader can quote it to support", () => {
    requests.mockReturnValue(
      failing(
        new ApiError("Internal server error", 500, undefined, {
          correlationId: "req-7f3a",
        }),
      ),
    );
    render(<AccessRequestsTab employees={[]} canManage />);

    expect(screen.getByText("req-7f3a")).toBeInTheDocument();
  });
});
