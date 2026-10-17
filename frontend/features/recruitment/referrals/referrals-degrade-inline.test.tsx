import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import {
  INLINE_READ_ERROR,
  readErrorReachesBoundary,
} from "@/lib/query-error-policy";
import { InternalReferralsTab } from "./internal-referrals-tab";
import { ExternalReferralsTab } from "./external-referrals-tab";

const REFERRALS_HOOKS = join(process.cwd(), "hooks/api/hr/recruitment/referrals.ts");
const EXTERNAL_HOOKS = join(
  process.cwd(),
  "hooks/api/hr/recruitment/external-referrals.ts",
);

const allReferrals = jest.fn();
const externalReferrals = jest.fn();
const externalReferrers = jest.fn();
const deniedPermissions = new Set<string>();

jest.mock("@/hooks/api/hr/recruitment/referrals", () => ({
  useAllReferrals: () => allReferrals(),
  useUpdateReferralStatus: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/hr/recruitment/external-referrals", () => ({
  useExternalReferrals: () => externalReferrals(),
  useExternalReferrers: () => externalReferrers(),
  useUpdateExternalReferral: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useUpdateExternalReferrerStatus: () => ({ mutateAsync: jest.fn(), isPending: false }),
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

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

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

beforeEach(() => {
  jest.clearAllMocks();
  deniedPermissions.clear();
  allReferrals.mockReturnValue(empty());
  externalReferrals.mockReturnValue(empty());
  externalReferrers.mockReturnValue(empty());
});

describe("HRMS-D-003 a failing referrals read stays on the referrals route", () => {
  it("is the default policy that would otherwise throw a 500 to the recruitment error boundary, which is the Recruitment Error the ticket reports", () => {
    expect(
      readErrorReachesBoundary(new ApiError("Internal server error", 500), {
        state: { data: undefined },
      }),
    ).toBe(true);
  });

  it("opts both referral reads and the referrer roster out of that boundary", () => {
    expect(INLINE_READ_ERROR).toEqual({ throwOnError: false });
    expect(
      readFileSync(REFERRALS_HOOKS, "utf8").match(/\.\.\.INLINE_READ_ERROR,/g) ?? [],
    ).toHaveLength(1);
    expect(
      readFileSync(EXTERNAL_HOOKS, "utf8").match(/\.\.\.INLINE_READ_ERROR,/g) ?? [],
    ).toHaveLength(2);
  });

  it("shows an inline error with a retry when the internal referrals read 500s", () => {
    const refetch = jest.fn();
    allReferrals.mockReturnValue(failing(500, refetch));
    render(<InternalReferralsTab />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(CORRELATION_ID)).toBeInTheDocument();
    screen.getByRole("button", { name: /try again/i }).click();
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("does not claim the tenant has no internal referrals when that read failed", () => {
    allReferrals.mockReturnValue(failing(500, jest.fn()));
    render(<InternalReferralsTab />);

    expect(screen.queryByText(/no referrals yet/i)).toBeNull();
  });

  it("still shows the honest internal empty state on a genuine zero-row read", () => {
    render(<InternalReferralsTab />);

    expect(screen.getByText(/no referrals yet/i)).toBeInTheDocument();
  });

  it("renders a denial rather than an empty list when the internal read is gated shut", () => {
    deniedPermissions.add("hr:requisitions:view");
    render(<InternalReferralsTab />);

    expect(screen.queryByText(/no referrals yet/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /try again/i })).toBeNull();
  });

  it("shows an inline error with a retry when the external referrals read 500s", () => {
    const refetch = jest.fn();
    externalReferrals.mockReturnValue(failing(500, refetch));
    render(<ExternalReferralsTab />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(CORRELATION_ID)).toBeInTheDocument();
    screen.getByRole("button", { name: /try again/i }).click();
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("does not claim the tenant has no external referrals when that read failed, and withholds the roster control while it is erroring", () => {
    externalReferrals.mockReturnValue(failing(500, jest.fn()));
    render(<ExternalReferralsTab />);

    expect(screen.queryByText(/no external referrals yet/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /manage referrers/i })).toBeNull();
  });

  it("still shows the honest external empty state on a genuine zero-row read", () => {
    render(<ExternalReferralsTab />);

    expect(screen.getByText(/no external referrals yet/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /manage referrers/i })).toBeInTheDocument();
  });

  it("leaves a 402 module denial to the page-state branch instead of turning it into a retry", () => {
    expect(
      readErrorReachesBoundary(new ApiError("Not enabled", 402, "MODULE_NOT_ENABLED"), {
        state: { data: undefined },
      }),
    ).toBe(false);
  });
});
