import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { apiClient } from "@/lib/api-client";
import type { PermissionKey } from "@/lib/rbac/permissions";
import type {
  ForecastAccuracy,
  ForecastBasis,
  ForecastNaiveReason,
  ForecastReadiness,
  LearnedForecastBasis,
  NaiveForecastBasis,
} from "@/types/crm/forecast";
import { ForecastBasisCard } from "./forecast-basis-card";

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

const mockToastSuccess = jest.fn();
const mockToastInfo = jest.fn();
const mockToastError = jest.fn();
jest.mock("sonner", () => ({
  toast: {
    success: (message: string) => mockToastSuccess(message),
    info: (message: string) => mockToastInfo(message),
    error: (message: string) => mockToastError(message),
  },
}));

const mockGranted = new Set<string>();
jest.mock("@/hooks/api/access", () => ({
  useCan: (permission: PermissionKey) => mockGranted.has(permission),
  useAccess: () => ({ data: { scopes: {}, isOrgOwner: false }, refetch: jest.fn() }),
}));

const mockedPost = apiClient.post as jest.Mock;

/**
 * CRM-P2-04. The forecast page says which forecast it is.
 *
 * The backend has reported a `basis` on every forecast read for a long time and
 * nothing rendered it, so a weighted sum of the tenant's own stage percentages
 * was presented with exactly the confidence a fitted model would be. This is the
 * number people plan a quarter around.
 *
 * Two properties carry the file. The union is rendered as a union — a naive
 * basis shows no accuracy figures at all, because a zero Brier there would read
 * as a measured result rather than an absent one. And a refused fit is reported
 * as the system working: `trained: false` is a successful request, and sending
 * it to `toast.error` would say something broke when what happened is that a
 * model was declined for not being better than the arithmetic it would replace.
 */

const accuracy = (over: Partial<ForecastAccuracy> = {}): ForecastAccuracy => ({
  count: 40,
  brier: 0.18,
  logLoss: 0.52,
  auc: 0.74,
  calibrationError: 0.03,
  baseRate: 0.41,
  ...over,
});

const readiness = (over: Partial<ForecastReadiness> = {}): ForecastReadiness => ({
  ready: false,
  closedDeals: 60,
  wonDeals: 10,
  lostDeals: 50,
  minimumClosedDeals: 100,
  minimumPerOutcome: 15,
  closedDealsNeeded: 40,
  wonDealsNeeded: 5,
  lostDealsNeeded: 0,
  ...over,
});

const learned = (over: Partial<LearnedForecastBasis> = {}): LearnedForecastBasis => ({
  kind: "learned",
  modelId: "m-1",
  trainedAt: "2026-08-01T00:00:00.000Z",
  featureSpecVersion: "v3",
  trainingDeals: 320,
  holdoutDeals: 80,
  holdout: accuracy({ brier: 0.18, auc: 0.74 }),
  naiveHoldout: accuracy({ brier: 0.235, auc: 0.58 }),
  becameAvailableAt: "2026-08-02T00:00:00.000Z",
  ...over,
});

const naive = (
  reason: ForecastNaiveReason = "insufficient-history",
  over: Partial<NaiveForecastBasis> = {},
): NaiveForecastBasis => ({
  kind: "naive-weighted",
  reason,
  readiness: readiness(),
  ...over,
});

function renderCard(basis: ForecastBasis) {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return render(<ForecastBasisCard basis={basis} />, { wrapper: Wrapper });
}

const REASONS: ForecastNaiveReason[] = [
  "insufficient-history",
  "not-trained-yet",
  "no-holdout",
  "cannot-discriminate",
  "no-better-than-naive",
  "did-not-converge",
];

describe("ForecastBasisCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGranted.clear();
    mockGranted.add("crm:deals:manage");
  });

  describe("on the arithmetic", () => {
    it("calls the total arithmetic rather than a prediction", () => {
      renderCard(naive());

      expect(screen.getByText(/weighted pipeline, not a prediction/i)).toBeInTheDocument();
      expect(screen.getByText("arithmetic")).toBeInTheDocument();
    });

    it("shows no accuracy figure at all, rather than a zero", () => {
      /**
       * The union rendered as a union. A shared block showing 0.00 for a
       * workspace with no model would read as a measured result — the worst
       * possible one — instead of an absent one.
       */
      renderCard(naive());

      expect(screen.queryByText(/tested on/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/tells deals apart/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/closer to outcomes/i)).not.toBeInTheDocument();
      expect(screen.queryByText("0.00")).not.toBeInTheDocument();
    });

    it("says how far off the workspace is", () => {
      renderCard(naive());
      expect(screen.getByText("60 of 100")).toBeInTheDocument();
    });

    it("says the outcome floor is a second bar, not a footnote to the first", () => {
      /**
       * A workspace on sixty closed deals of which ten were won still needs
       * five more, and they have to be wins. The headline count alone would be
       * a promise the next screen breaks.
       */
      renderCard(naive());

      expect(screen.getByText(/5 more won/)).toBeInTheDocument();
      expect(screen.getByText(/lost is met/)).toBeInTheDocument();
    });

    it("says nothing about outcomes once both are met", () => {
      renderCard(
        naive("insufficient-history", {
          readiness: readiness({ wonDealsNeeded: 0, lostDealsNeeded: 0 }),
        }),
      );

      expect(screen.queryByText(/of each outcome are needed/i)).not.toBeInTheDocument();
    });

    it.each(REASONS)("explains %s in its own words", (reason) => {
      renderCard(naive(reason));
      expect(screen.getByText(/^(There|A model)/)).toBeInTheDocument();
    });

    it("never collapses the six reasons into one message", () => {
      /**
       * "Not enough data" for all six would tell a workspace with plenty of
       * history, refused a model on its merits, that the fault is theirs.
       */
      const seen = REASONS.map((reason) => {
        const { unmount } = renderCard(naive(reason));
        const text = screen.getByText(/^(There|A model)/).textContent ?? "";
        unmount();
        return text;
      });

      expect(new Set(seen).size).toBe(REASONS.length);
    });

    it("distinguishes the workspace's gap from ours", () => {
      const { unmount } = renderCard(naive("insufficient-history"));
      expect(screen.getByText(/not yet enough closed deals/i)).toBeInTheDocument();
      unmount();

      renderCard(naive("not-trained-yet"));
      expect(screen.getByText(/our gap, not yours/i)).toBeInTheDocument();
    });
  });

  describe("on a model", () => {
    it("says what it was learned from and what it was tested on", () => {
      renderCard(learned());

      expect(screen.getByText("320 closed deals")).toBeInTheDocument();
      expect(screen.getByText("80 it never saw")).toBeInTheDocument();
    });

    it("reports the model's score against the arithmetic it replaced", () => {
      /**
       * A Brier of 0.18 on its own is unreadable. The acceptance rule is that
       * it had to be lower than the naive score on the same deals, so the
       * comparison is the number, not the raw figure.
       */
      renderCard(learned());

      expect(screen.getByText("by 0.055")).toBeInTheDocument();
    });

    it("says no better rather than a negative margin", () => {
      renderCard(learned({ naiveHoldout: accuracy({ brier: 0.16 }) }));

      expect(screen.getByText("no better")).toBeInTheDocument();
      expect(screen.queryByText(/by -/)).not.toBeInTheDocument();
    });

    it("shows no readiness bar, which would imply the model is provisional", () => {
      /** The bar counts progress towards a model this workspace already has. */
      renderCard(learned());
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });

    it("does show one on the arithmetic, so the check above is not vacuous", () => {
      renderCard(naive());
      expect(screen.getByRole("progressbar")).toBeInTheDocument();
    });
  });

  describe("fitting one now", () => {
    it("offers no refit to somebody who may only read the forecast", () => {
      mockGranted.clear();
      renderCard(naive());

      expect(screen.queryByRole("button", { name: /fit a model/i })).not.toBeInTheDocument();
    });

    it("asks the training route", async () => {
      mockedPost.mockResolvedValue({
        trained: true,
        modelId: "m-2",
        readiness: readiness({ ready: true }),
        trainingDeals: 400,
        holdoutDeals: 90,
        learned: accuracy(),
        naive: accuracy(),
        scored: 55,
      });
      const user = userEvent.setup();
      renderCard(naive());

      await user.click(screen.getByRole("button", { name: /fit a model/i }));

      await waitFor(() => expect(mockedPost).toHaveBeenCalledWith("/deals/forecast/train", {}));
      expect(mockToastSuccess).toHaveBeenCalledWith(
        "Fitted on 400 closed deals and scored 55 open ones.",
      );
    });

    it("reports a refused fit as the system working, not as a failure", async () => {
      /**
       * `trained: false` is a successful request. Routing it to `toast.error`
       * would report an outage every time the product correctly declined to
       * replace a number the workspace understands with one that was not
       * closer to the outcomes.
       */
      mockedPost.mockResolvedValue({
        trained: false,
        reason: "no-better-than-naive",
        readiness: readiness({ ready: true }),
        learned: accuracy(),
        naive: accuracy(),
      });
      const user = userEvent.setup();
      renderCard(naive());

      await user.click(screen.getByRole("button", { name: /fit a model/i }));

      await waitFor(() => expect(mockToastInfo).toHaveBeenCalled());
      expect(mockToastInfo.mock.calls[0][0]).toMatch(/discarded rather than shown to you/i);
      expect(mockToastError).not.toHaveBeenCalled();
      expect(mockToastSuccess).not.toHaveBeenCalled();
    });

    it("reports a request that actually failed as an error", async () => {
      mockedPost.mockRejectedValue(new Error("Training is already running"));
      const user = userEvent.setup();
      renderCard(naive());

      await user.click(screen.getByRole("button", { name: /fit a model/i }));

      await waitFor(() =>
        expect(mockToastError).toHaveBeenCalledWith("Training is already running"),
      );
      expect(mockToastInfo).not.toHaveBeenCalled();
    });
  });
});
