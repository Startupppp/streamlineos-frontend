import type { ReactNode } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { CaseCategory, CaseSeverity, CaseStatus, ListCasesParams } from "@/hooks/api/hr/cases";

let mockReplace: jest.Mock;
let mockSearchParams: URLSearchParams;
const mockUseHrCases = jest.fn();
let mockCasesPage: {
  data: { id: number }[];
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
};

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => "/hr/cases",
}));

jest.mock("@animateicons/react/lucide", () => ({ PlusIcon: () => null }));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
}));

jest.mock("@/hooks/api/hr/cases", () => ({
  useHrCases: (params: ListCasesParams) => mockUseHrCases(params),
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ filters, children }: { filters?: ReactNode; children: ReactNode }) => (
    <div>
      {filters}
      {children}
    </div>
  ),
}));

jest.mock("@/components/ui/data-table", () => ({
  DataTable: ({ data, emptyState }: { data: { id: number }[]; emptyState: ReactNode }) =>
    data.length === 0 ? emptyState : <div data-testid="rows">{data.length}</div>,
}));

jest.mock("@/components/illustrations", () => ({ StateIllustration: () => null }));
jest.mock("@/features/hr/cases/case-detail-sheet", () => ({ CaseDetailSheet: () => null }));
jest.mock("@/features/hr/cases/new-case-sheet", () => ({ NewCaseSheet: () => null }));
jest.mock("@/features/hr/cases/anonymous-report-dialog", () => ({ AnonymousReportDialog: () => null }));
jest.mock("@/features/hr/cases/issue-warning-sheet", () => ({ IssueWarningSheet: () => null }));
jest.mock("@/features/hr/cases/disciplinary-actions-tab", () => ({ DisciplinaryActionsTab: () => null }));
jest.mock("@/features/hr/cases/case-columns", () => ({ CASE_COLUMNS: [] }));

jest.mock("@/features/hr/cases/cases-filter-bar", () => ({
  ...jest.requireActual("@/features/hr/cases/cases-filter-bar"),
  CasesFilterBar: ({
    search,
    status,
    category,
    severity,
    onSearchChange,
    onStatusChange,
    onCategoryChange,
    onSeverityChange,
  }: {
    search: string;
    status: CaseStatus | "";
    category: CaseCategory | "";
    severity: CaseSeverity | "";
    onSearchChange: (value: string) => void;
    onStatusChange: (value: CaseStatus | "") => void;
    onCategoryChange: (value: CaseCategory | "") => void;
    onSeverityChange: (value: CaseSeverity | "") => void;
  }) => (
    <div>
      <input
        aria-label="Search cases"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
      />
      <output data-testid="status">{status}</output>
      <output data-testid="category">{category}</output>
      <output data-testid="severity">{severity}</output>
      <button onClick={() => onStatusChange("open")}>status:open</button>
      <button onClick={() => onStatusChange("")}>status:all</button>
      <button onClick={() => onCategoryChange("harassment")}>category:harassment</button>
      <button onClick={() => onSeverityChange("high")}>severity:high</button>
    </div>
  ),
}));

import { CasesPageContent } from "../cases-page-content";

function lastCasesParams(): ListCasesParams {
  const calls = mockUseHrCases.mock.calls;
  return calls[calls.length - 1][0] as ListCasesParams;
}

function lastReplacedParams(): URLSearchParams {
  const calls = mockReplace.mock.calls;
  const url = calls[calls.length - 1][0] as string;
  return new URLSearchParams(url.includes("?") ? url.split("?")[1] : "");
}

beforeEach(() => {
  jest.useFakeTimers();
  mockReplace = jest.fn();
  mockSearchParams = new URLSearchParams();
  mockCasesPage = { data: [], pagination: { limit: 20, hasMore: false, nextCursor: null } };
  mockUseHrCases.mockReset();
  mockUseHrCases.mockImplementation(() => ({
    data: mockCasesPage,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }));
});

afterEach(() => {
  jest.useRealTimers();
});

describe("CasesPageContent — URL-canonical filters (HRM-X-FE-CASES-FILTER-URL-001)", () => {
  it("restores status, category, severity and q from the URL into the server query and the filter bar on mount", () => {
    mockSearchParams = new URLSearchParams("status=open&category=harassment&severity=high&q=leave");
    render(<CasesPageContent />);

    expect(lastCasesParams()).toMatchObject({
      status: "open",
      category: "harassment",
      severity: "high",
      search: "leave",
    });
    expect(screen.getByTestId("status")).toHaveTextContent("open");
    expect(screen.getByTestId("category")).toHaveTextContent("harassment");
    expect(screen.getByTestId("severity")).toHaveTextContent("high");
    expect(screen.getByLabelText("Search cases")).toHaveValue("leave");
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("ignores URL values outside the case vocabulary instead of forwarding them to the server", () => {
    mockSearchParams = new URLSearchParams("status=bogus&category=nope&severity=extreme");
    render(<CasesPageContent />);

    const params = lastCasesParams();
    expect(params.status).toBeUndefined();
    expect(params.category).toBeUndefined();
    expect(params.severity).toBeUndefined();
    expect(screen.getByTestId("status")).toHaveTextContent("");
  });

  it("choosing a status writes ?status=open via router.replace without scrolling and keeps other params", () => {
    mockSearchParams = new URLSearchParams("category=harassment");
    render(<CasesPageContent />);

    fireEvent.click(screen.getByText("status:open"));

    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringMatching(/^\/hr\/cases\?/),
      expect.objectContaining({ scroll: false }),
    );
    const params = lastReplacedParams();
    expect(params.get("status")).toBe("open");
    expect(params.get("category")).toBe("harassment");
  });

  it("choosing the all sentinel removes the status param rather than writing a sentinel value", () => {
    mockSearchParams = new URLSearchParams("status=open&severity=high");
    render(<CasesPageContent />);

    fireEvent.click(screen.getByText("status:all"));

    const params = lastReplacedParams();
    expect(params.has("status")).toBe(false);
    expect(params.get("severity")).toBe("high");
  });

  it("typing a search keeps the draft in the input and writes ?q= only after the debounce", () => {
    const view = render(<CasesPageContent />);

    fireEvent.change(screen.getByLabelText("Search cases"), { target: { value: "harass" } });

    expect(screen.getByLabelText("Search cases")).toHaveValue("harass");
    expect(mockReplace).not.toHaveBeenCalled();
    expect(lastCasesParams().search).toBeUndefined();

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(lastReplacedParams().get("q")).toBe("harass");

    mockSearchParams = new URLSearchParams("q=harass");
    view.rerender(<CasesPageContent />);
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(screen.getByLabelText("Search cases")).toHaveValue("harass");
    expect(lastCasesParams().search).toBe("harass");
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  it("Back/Forward: a URL change re-renders the new filters and does not bounce the URL back", () => {
    mockSearchParams = new URLSearchParams("status=open&q=old");
    const view = render(<CasesPageContent />);

    mockSearchParams = new URLSearchParams("status=resolved&q=new");
    view.rerender(<CasesPageContent />);

    expect(lastCasesParams()).toMatchObject({ status: "resolved", search: "new" });
    expect(screen.getByLabelText("Search cases")).toHaveValue("new");

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("clearing an empty result's filters removes every filter param from the URL", () => {
    mockSearchParams = new URLSearchParams("status=open&category=harassment&severity=high&q=leave");
    render(<CasesPageContent />);

    fireEvent.click(screen.getByRole("button", { name: /clear filters/i }));

    const params = lastReplacedParams();
    expect(params.has("status")).toBe(false);
    expect(params.has("category")).toBe(false);
    expect(params.has("severity")).toBe(false);
    expect(params.has("q")).toBe(false);
  });

  it("a filter change rewinds cursor pagination to the first page", () => {
    mockCasesPage = { data: [{ id: 1 }], pagination: { limit: 20, hasMore: true, nextCursor: "cursor-2" } };
    render(<CasesPageContent />);

    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(lastCasesParams().cursor).toBe("cursor-2");

    fireEvent.click(screen.getByText("severity:high"));
    expect(lastCasesParams().cursor).toBeUndefined();
  });
});
