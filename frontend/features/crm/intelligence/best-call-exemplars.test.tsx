import { render, screen } from "@testing-library/react";
import type { CallExemplar, CallExemplarsResponse } from "@/types/crm/call-intelligence";
import { BestCallExemplars } from "./best-call-exemplars";

/**
 * CRM-P2-06's list, tested on the things that make a short list trustworthy.
 *
 * The server decides what may appear — consent and the rep's private window are
 * enforced there and asserted in `call-exemplars.service.spec.ts` and the seeded
 * e2e. What this component owes the reader is an honest account of what is
 * missing and why, because a rep who ran forty calls and sees three exemplars
 * will otherwise conclude either that they are bad at their job or that the
 * feature is broken, and both conclusions are wrong.
 *
 * It also owes them no verbatim customer speech: the row is a pointer, and the
 * absence of quotes is a property of the payload that the markup must not
 * quietly reintroduce.
 */

const exemplar = (over: Partial<CallExemplar> = {}): CallExemplar => ({
  activityId: "act-1",
  repUserId: "user-rep-a",
  repName: "Ana Reyes",
  occurredAt: "2026-09-02T09:00:00.000Z",
  analysedAt: "2026-09-02T10:00:00.000Z",
  talkRatioBps: 4_900,
  questionRateBps: 3_500,
  repTurnCount: 14,
  repQuestionCount: 5,
  nextStepCommitted: true,
  metricValueBps: 4_900,
  ...over,
});

const response = (
  rows: CallExemplar[],
  meta: Partial<CallExemplarsResponse["meta"]> = {},
): CallExemplarsResponse => ({
  data: rows,
  pagination: { page: 1, limit: 5, total: rows.length, totalPages: 1 },
  meta: {
    metric: "talk-ratio",
    sinceDays: 30,
    since: "2026-08-10T00:00:00.000Z",
    truncated: false,
    scope: "team",
    ineligible: 0,
    embargoed: 0,
    consentBlocked: 0,
    talkRatioTargetBps: 5_000,
    minimumRepTurns: 8,
    privateWindowHours: 24,
    ...meta,
  },
});

describe("BestCallExemplars", () => {
  it("links each exemplar to the call rather than showing its content", () => {
    render(<BestCallExemplars response={response([exemplar()])} />);

    const link = screen.getByRole("link", { name: /Ana Reyes/ });
    expect(link).toHaveAttribute("href", "/crm/intelligence/act-1");
    expect(screen.getByText("49%")).toBeInTheDocument();
    expect(screen.queryByText("user-rep-a")).not.toBeInTheDocument();
  });

  it("names the target the ranking aimed at, so a short list can be defended", () => {
    render(<BestCallExemplars response={response([exemplar()])} />);

    expect(screen.getByText(/Closest to 50%/)).toBeInTheDocument();
  });

  it("separates the three reasons a call is not on the list", () => {
    render(
      <BestCallExemplars
        response={response([exemplar()], {
          ineligible: 4,
          embargoed: 2,
          consentBlocked: 3,
        })}
      />,
    );

    const note = screen.getByText(/Not considered/);
    expect(note).toHaveTextContent("4 not measurable on this metric");
    expect(note).toHaveTextContent("2 still private to their rep");
    expect(note).toHaveTextContent("3 without a recording-consent record");
  });

  it("says every call was considered when nothing was excluded", () => {
    render(<BestCallExemplars response={response([exemplar()])} />);

    expect(screen.getByText(/Every analysed call in the last 30 days was considered/)).toBeInTheDocument();
  });

  it("explains an empty list caused by missing consent records", () => {
    render(<BestCallExemplars response={response([], { consentBlocked: 5 })} />);

    expect(screen.getByText(/waiting on a recording-consent record/)).toBeInTheDocument();
  });

  it("explains an empty list caused by the rep's private window", () => {
    render(<BestCallExemplars response={response([], { embargoed: 3 })} />);

    expect(screen.getByText(/still inside their rep's first 24 hours/)).toBeInTheDocument();
  });

  it("names the turn floor when nothing could be measured", () => {
    render(<BestCallExemplars response={response([], { ineligible: 9 })} />);

    expect(screen.getByText(/at least 8 turns from the rep/)).toBeInTheDocument();
  });

  it("shows turn count for next-step, where there is no ranked value to show", () => {
    render(
      <BestCallExemplars
        response={response([exemplar({ metricValueBps: null })], { metric: "next-step" })}
      />,
    );

    // Not "0%", and not a fabricated score: the metric is a boolean the row
    // already carries, so the cell shows a fact about the call instead.
    expect(screen.getByText("14 turns")).toBeInTheDocument();
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
  });

  it("labels an unattributed call as such rather than as a departed member", () => {
    render(
      <BestCallExemplars
        response={response([exemplar({ repUserId: null, repName: null })])}
      />,
    );

    expect(screen.getByText("Unattributed call")).toBeInTheDocument();
  });
});
