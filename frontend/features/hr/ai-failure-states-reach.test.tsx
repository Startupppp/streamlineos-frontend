import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ApiError } from "@/lib/api-envelope";

/**
 * PRD-C155's reach clause on the three AI surfaces that answered every backend
 * refusal with one grey toast.
 *
 * `toast.error(getErrorMessage(e))` renders 402 INSUFFICIENT_CREDITS, 429
 * queue-full, 503 breaker and 403 revoked-permission as the same transient
 * sentence: no upgrade path, no retry where retry helps, and no retry
 * suppression where it cannot. The nine states already existed in
 * `components/ai`; these three screens simply never reached them.
 *
 * Each assertion is two-sided on purpose. Asserting only that the state
 * renders would still pass if the toast fired alongside it, which is the
 * behaviour being removed — so every case also asserts `toast.error` was NOT
 * called for the AI failure.
 */

const toastError = jest.fn();
const toastSuccess = jest.fn();

jest.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastError(...args),
    success: (...args: unknown[]) => toastSuccess(...args),
  },
}));

let rejection: unknown = null;

const post = jest.fn(() =>
  rejection ? Promise.reject(rejection) : Promise.resolve({}),
);

jest.mock("@/lib/api-client", () => {
  const envelope = jest.requireActual("@/lib/api-envelope");
  return {
    apiClient: {
      post: (...args: unknown[]) => post(...(args as [])),
      get: jest.fn(() => Promise.resolve({})),
      download: jest.fn(),
    },
    ApiError: envelope.ApiError,
    isApiError: envelope.isApiError,
    getApiErrorCode: envelope.getApiErrorCode,
  };
});

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useAccess: () => ({
    data: { isOrgOwner: true, scopes: {} },
    isLoading: false,
    refetch: () => Promise.resolve({ data: { isOrgOwner: true, scopes: {} } }),
  }),
}));

jest.mock("@/lib/billing/use-feature", () => ({
  useFeature: () => ({ enabled: true, requiredPlan: null }),
}));

jest.mock("@/lib/api/hooks/executive-brief", () => ({
  useExecutiveBrief: () => ({
    data: { snapshot: null, isStale: false },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  useGenerateBrief: () => briefMutation,
}));

import { useMutation } from "@tanstack/react-query";
import { AIScoreCandidateButton } from "@/features/hr/recruitment/ai-score-candidate-button";
import { AIGenerateReviewButton } from "@/features/hr/performance/ai-generate-review-button";
import ExecutiveBriefPage from "@/app/(authenticated)/ai/executive-brief/page";

let briefMutation: ReturnType<typeof useMutation>;

function BriefHarness() {
  briefMutation = useMutation({
    mutationKey: ["executive-brief", "generate"],
    mutationFn: () => post("/ai/executive-brief/generate"),
  });
  return <ExecutiveBriefPage />;
}

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: 0 },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>{ui}</TooltipProvider>
    </QueryClientProvider>,
  );
}

interface Surface {
  name: string;
  /** Opened before the AI trigger is reachable (a dialog or popover). */
  open?: RegExp;
  trigger: RegExp;
  ui: () => React.ReactElement;
}

const SURFACES: Surface[] = [
  {
    name: "candidate scoring",
    trigger: /get ai estimate/i,
    ui: () => <AIScoreCandidateButton candidateId={1} jobId={2} />,
  },
  {
    name: "performance review draft",
    open: /ai draft review/i,
    trigger: /generate review draft/i,
    ui: () => <AIGenerateReviewButton userId="u1" userName="Ada" periodStart="2026-01-01" periodEnd="2026-06-01" />,
  },
  {
    name: "executive brief",
    trigger: /generate brief/i,
    ui: () => <BriefHarness />,
  },
];

beforeEach(() => {
  toastError.mockClear();
  toastSuccess.mockClear();
  post.mockClear();
  rejection = null;
});

describe.each(SURFACES)("$name distinguishes AI failures", ({ open, trigger, ui }) => {
  async function fire(error: unknown) {
    rejection = error;
    renderWithClient(ui());
    if (open) await userEvent.click(screen.getAllByRole("button", { name: open })[0]!);
    const buttons = await screen.findAllByRole("button", { name: trigger });
    await userEvent.click(buttons[0]!);
    await waitFor(() => expect(post).toHaveBeenCalled());
  }

  it("credit exhaustion renders the quota state, not a toast", async () => {
    await fire(new ApiError("Not enough AI credits", 402, "INSUFFICIENT_CREDITS"));
    await waitFor(() =>
      expect(screen.getByText(/AI credits exhausted/i)).toBeInTheDocument(),
    );
    expect(toastError).not.toHaveBeenCalled();
  });

  it("permission revocation renders denied with no retry, not a toast", async () => {
    await fire(new ApiError("Missing permission", 403, "FORBIDDEN"));
    await waitFor(() =>
      expect(
        screen.getByText(/don't have access to this AI feature/i),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("button", { name: /try again|retry|run again/i }),
    ).toBeNull();
    expect(toastError).not.toHaveBeenCalled();
  });

  it("queue-full renders the queued state with a retry, not a toast", async () => {
    await fire(new ApiError("Too many AI requests", 429, "TOO_MANY_REQUESTS"));
    await waitFor(() =>
      expect(screen.getByText(/AI is busy right now/i)).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("button", { name: /try again|retry|run again/i }),
    ).toBeInTheDocument();
    expect(toastError).not.toHaveBeenCalled();
  });

  it("provider failure renders the unavailable state, not a toast", async () => {
    await fire(new ApiError("upstream exploded", 503, "SERVICE_UNAVAILABLE"));
    await waitFor(() =>
      expect(screen.getByText(/AI is temporarily unavailable/i)).toBeInTheDocument(),
    );
    expect(toastError).not.toHaveBeenCalled();
  });
});
