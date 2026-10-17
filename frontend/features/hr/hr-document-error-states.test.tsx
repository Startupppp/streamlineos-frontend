import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * PRD-C009's error clause on the two HR document surfaces that conflated a
 * FAILED read with an EMPTY one.
 *
 * Both screens branched straight from "the array is empty" to a reassuring
 * empty state, and neither read `isError` at all. So a 500 on the checklist
 * told a new joiner "No documents required" — the most dangerous possible lie,
 * because it is indistinguishable from the truth and the user acts on it. The
 * reviewer's side said "No documents submitted" about an employee whose
 * submissions simply had not loaded.
 *
 * The assertions below are therefore two-sided: the failure must be REACHABLE
 * (an alert with a retry), and the reassuring text must be ABSENT. Asserting
 * only the first would pass with both rendered at once.
 */

type Mode = "error" | "empty";

let mode: Mode = "error";

const refetchSpy = jest.fn();

// The page now resolves its state through usePageState, which reads session,
// access and entitlements; resolve it as granted so the test exercises the
// page, not the provider tree.
jest.mock("@/hooks/api/use-page-state", () => {
  const { resolvePageState } = jest.requireActual<typeof import("@/lib/page-state/resolve-page-state")>(
    "@/lib/page-state/resolve-page-state",
  );
  return {
    usePageState: (options: Omit<Parameters<typeof resolvePageState>[0], "access">) =>
      resolvePageState({ ...options, access: "granted" }),
  };
});

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useAccess: () => ({ can: () => true, isLoading: false }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn(() =>
      mode === "error"
        ? Promise.reject(new Error("read failed"))
        : Promise.resolve({ data: [], pagination: { hasMore: false } }),
    ),
    post: jest.fn(() => Promise.resolve({})),
    patch: jest.fn(() => Promise.resolve({})),
  },
}));

jest.mock("@/hooks/api/hr/document-types", () => ({
  useHrDocumentTypes: () => ({
    data: mode === "error" ? undefined : [],
    isLoading: false,
    isError: mode === "error",
    refetch: refetchSpy,
  }),
}));

import { EmployeeDocumentsTab } from "@/features/hr/onboarding/onboarding-detail-sheet";
import { ReviewSheet } from "@/features/hr/document-review/review-sheet";

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>{ui}</TooltipProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  refetchSpy.mockClear();
});

describe("the new joiner's document checklist tells the truth about a failed read", () => {
  it("a failed read is announced as a failure, not as 'No documents required'", async () => {
    mode = "error";
    renderWithClient(<EmployeeDocumentsTab hideNav />);
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.queryByText("No documents required")).not.toBeInTheDocument();
  });

  it("the failure offers a way out of the dead end", async () => {
    mode = "error";
    renderWithClient(<EmployeeDocumentsTab hideNav />);
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(
      screen.getByRole("button", { name: /try again/i }),
    ).toBeInTheDocument();
  });

  it("a genuinely empty checklist still reads as empty, so the branch is not just always-error", async () => {
    mode = "empty";
    renderWithClient(<EmployeeDocumentsTab hideNav />);
    await waitFor(() =>
      expect(screen.getByText("No documents required")).toBeInTheDocument(),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("the reviewer's queue tells the truth about a failed read", () => {
  it("a failed read is announced as a failure, not as 'No documents submitted'", async () => {
    mode = "error";
    renderWithClient(
      <ReviewSheet
        userId="u1"
        userName="Ada"
        canReview
        onClose={() => undefined}
      />,
    );
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.queryByText("No documents submitted")).not.toBeInTheDocument();
  });

  it("the failure offers a way out of the dead end", async () => {
    mode = "error";
    renderWithClient(
      <ReviewSheet
        userId="u1"
        userName="Ada"
        canReview
        onClose={() => undefined}
      />,
    );
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(
      screen.getByRole("button", { name: /try again/i }),
    ).toBeInTheDocument();
  });

  it("a genuinely empty queue still reads as empty", async () => {
    mode = "empty";
    renderWithClient(
      <ReviewSheet
        userId="u1"
        userName="Ada"
        canReview
        onClose={() => undefined}
      />,
    );
    await waitFor(() =>
      expect(screen.getByText("No documents submitted")).toBeInTheDocument(),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
