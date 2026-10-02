import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render as renderBare, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ApiError } from "@/lib/api-envelope";
import {
  INLINE_READ_ERROR,
  readErrorReachesBoundary,
} from "@/lib/query-error-policy";

jest.mock("@animateicons/react/lucide", () => ({
  ChevronLeftIcon: () => null,
  ChevronRightIcon: () => null,
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

const calendar = jest.fn();
const refetch = jest.fn();

jest.mock("@/hooks/api/hr/compliance-calendar", () => ({
  useComplianceCalendar: () => calendar(),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: ({ isError, error }: { isError: boolean; error?: unknown }) =>
    isError ? { kind: "error", error } : { kind: "ready" },
}));

import { ComplianceCalendar } from "./compliance-calendar";

function render(ui: React.ReactElement) {
  return renderBare(<TooltipProvider>{ui}</TooltipProvider>);
}

const EXTENDED_TAB_READS: readonly (readonly [string, string])[] = [
  ["hooks/api/hr/letters.ts", "useLetters"],
  ["hooks/api/hr/documents.ts", "useHrDocumentExpiry"],
  ["hooks/api/hr/compliance-calendar.ts", "useComplianceCalendar"],
  ["hooks/api/hr/rich-documents.ts", "useRichDocuments"],
];

function hookBody(file: string, hook: string): string {
  const source = readFileSync(join(process.cwd(), file), "utf8");
  const declaration = source.slice(source.indexOf(`export function ${hook}`));
  return declaration.slice(0, declaration.indexOf("\n}\n"));
}

beforeEach(() => {
  jest.clearAllMocks();
  calendar.mockReturnValue({
    data: { events: [] },
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

describe("HRMS-B2-007 the /hr/documents extended tabs degrade on their own surface", () => {
  it("would otherwise throw a 500 to the /hr boundary, which is what the per-read opt-outs below prevent", () => {
    expect(
      readErrorReachesBoundary(new ApiError("Internal server error", 500), {
        state: { data: undefined },
      }),
    ).toBe(true);
    expect(INLINE_READ_ERROR).toEqual({ throwOnError: false });
  });

  it.each(EXTENDED_TAB_READS)(
    "keeps a failing %s read inside its own tab instead of blanking /hr/documents",
    (file, hook) => {
      expect(hookBody(file, hook)).toContain("...INLINE_READ_ERROR,");
    },
  );

  it("quotes the failed call's request id under the message, so an admin can hand it to support", () => {
    calendar.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError("Internal server error", 500, "INTERNAL", {
        correlationId: "req_b30f12",
      }),
      refetch,
    });
    render(<ComplianceCalendar />);

    expect(screen.getByText("req_b30f12")).toBeInTheDocument();
  });

  it("renders the compliance calendar month on a healthy session, so the failure cases below are not passing on a tab that never mounts", () => {
    render(<ComplianceCalendar />);

    expect(screen.getByRole("button", { name: /previous month/i })).toBeInTheDocument();
  });

  it("shows an inline error with retry when the compliance calendar read 500s", () => {
    calendar.mockReturnValue(failing(500));
    render(<ComplianceCalendar />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("does not claim there are no compliance events when the read failed", () => {
    calendar.mockReturnValue(failing(500));
    render(<ComplianceCalendar />);

    expect(screen.queryByText(/no compliance events/i)).toBeNull();
  });

  it("retries the failed read on this tab rather than reloading the route", () => {
    calendar.mockReturnValue(failing(500));
    render(<ComplianceCalendar />);
    screen.getByRole("button", { name: /try again/i }).click();

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("still shows the honest empty state when the month genuinely has no expiries", () => {
    render(<ComplianceCalendar />);

    expect(screen.getByText(/no compliance events/i)).toBeInTheDocument();
  });
});
