import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import {
  INLINE_READ_ERROR,
  readErrorReachesBoundary,
} from "@/lib/query-error-policy";

const policy = jest.fn();
const refetch = jest.fn();

jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));

jest.mock("@/hooks/api/payroll", () => ({
  usePayrollPolicyCurrent: () => policy(),
}));

jest.mock("./settings/policy-profile-section", () => ({ PolicyProfileSection: () => null }));
jest.mock("./settings/toggle-settings-section", () => ({ ToggleSettingsSection: () => null }));
jest.mock("./settings/version-history-section", () => ({ VersionHistorySection: () => null }));
jest.mock("./settings/calendar-section", () => ({ CalendarSection: () => null }));
jest.mock("./settings/fx-rates-section", () => ({ FxRatesSection: () => null }));
jest.mock("./settings/entities-section", () => ({ EntitiesSection: () => null }));

import { SettingsPageContent } from "./settings/settings-page";

const CORRELATED = new ApiError("Internal server error", 500, "INTERNAL", {
  correlationId: "req_8f21ac",
});

const SATELLITE_READS: readonly (readonly [string, string])[] = [
  ["hooks/api/payroll/calendar.ts", "usePayrollCalendar"],
  ["hooks/api/payroll/filings.ts", "usePayrollFilings"],
];

function hookBody(file: string, hook: string): string {
  const source = readFileSync(join(process.cwd(), file), "utf8");
  const declaration = source.slice(source.indexOf(`export function ${hook}`));
  return declaration.slice(0, declaration.indexOf("\n}\n"));
}

beforeEach(() => {
  jest.clearAllMocks();
  policy.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch,
  });
});

describe("HRMS-B2-028 a failed payroll settings read is quotable to support", () => {
  it("still shows the honest not-set-up empty state when the read succeeds with no policy, so the error case below is not the only thing this page can render", () => {
    render(<SettingsPageContent />);

    expect(screen.getByText(/payroll not set up yet/i)).toBeInTheDocument();
  });

  it("renders the failed call's request id under the message instead of swallowing it", () => {
    policy.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: CORRELATED,
      refetch,
    });
    render(<SettingsPageContent />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("req_8f21ac")).toBeInTheDocument();
    expect(screen.queryByText(/payroll not set up yet/i)).toBeNull();
  });
});

describe("HRMS-B3-021 the payroll calendar and filings tabs degrade on their own surface", () => {
  it("would otherwise throw a 500 to the payroll boundary, which is what the per-read opt-outs below prevent", () => {
    expect(
      readErrorReachesBoundary(new ApiError("Internal server error", 500), {
        state: { data: undefined },
      }),
    ).toBe(true);
    expect(INLINE_READ_ERROR).toEqual({ throwOnError: false });
  });

  it.each(SATELLITE_READS)(
    "keeps a failing %s read inside its own tab instead of taking its sibling tabs down with it",
    (file, hook) => {
      expect(hookBody(file, hook)).toContain("...INLINE_READ_ERROR,");
    },
  );
});
