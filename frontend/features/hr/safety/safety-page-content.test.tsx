import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { ApiError } from "@/lib/api-envelope";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";

const SAFETY_HOOKS = join(process.cwd(), "hooks/api/hr/safety.ts");

const mockUseWellnessPulse = jest.fn();
const refetch = jest.fn();

jest.mock("next/dynamic", () => () => () => null);

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useAccess: () => ({ data: { scopes: { "hr:safety:view": "all" }, modules: {}, isOrgOwner: false }, isLoading: false }),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/hr/safety", () => ({
  useSafetyIncidents: () => ({
    data: { data: [], pagination: { nextCursor: null, hasMore: false } },
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  useWellnessPulse: () => mockUseWellnessPulse(),
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, title }: { children?: ReactNode; title?: string }) => (
    <div>
      {title && <h1>{title}</h1>}
      {children}
    </div>
  ),
}));

jest.mock("./wellness-widget", () => ({ WellnessWidget: () => null }));
jest.mock("./burnout-flags-list", () => ({ BurnoutFlagsList: () => null }));
jest.mock("./report-incident-sheet", () => ({ ReportIncidentSheet: () => null }));

import { SafetyPageContent } from "./safety-page-content";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("the 7-day wellness pulse card is not silent when its read fails", () => {
  it("offers retry on a failed load instead of rendering nothing", () => {
    mockUseWellnessPulse.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError("Internal server error", 500),
      refetch,
    });
    render(<SafetyPageContent />);
    fireEvent.click(screen.getByRole("tab", { name: /wellness/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load the wellness pulse/i);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("renders the pulse figures when the read succeeds", () => {
    mockUseWellnessPulse.mockReturnValue({
      data: { honestyNote: "Aggregated over 7 days", suppressed: false, minGroupSize: 5, avgScore: 4.2, respondents: 12, checkins: 30 },
      isLoading: false,
      isError: false,
      error: null,
      refetch,
    });
    render(<SafetyPageContent />);
    fireEvent.click(screen.getByRole("tab", { name: /wellness/i }));

    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("7-day wellness pulse")).toBeInTheDocument();
    expect(screen.getByText("4.2")).toBeInTheDocument();
  });

  it("keeps the failed pulse read inline instead of throwing it to the /hr boundary, which is what would have hidden the card's own error", () => {
    const source = readFileSync(SAFETY_HOOKS, "utf8");

    expect(INLINE_READ_ERROR).toEqual({ throwOnError: false });
    expect(source).toContain("...INLINE_READ_ERROR,");
  });
});

describe("the failed read's request id is quotable to support", () => {
  it("renders the copyable reference the backend echoed on the error envelope", () => {
    mockUseWellnessPulse.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError("Internal server error", 500, undefined, { correlationId: "req-abc123" }),
      refetch,
    });
    render(<SafetyPageContent />);
    fireEvent.click(screen.getByRole("tab", { name: /wellness/i }));
    expect(screen.getByText(/reference/i)).toBeInTheDocument();
    expect(screen.getByText("req-abc123")).toBeInTheDocument();
  });
});
