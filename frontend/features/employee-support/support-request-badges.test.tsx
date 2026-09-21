import { render, screen } from "@testing-library/react";
import { ConfidentialBadge, SlaMarker, slaVerdict } from "./support-request-badges";

const now = new Date("2026-09-21T15:00:00.000Z");

describe("slaVerdict — the marker a queue agent reads before opening a request", () => {
  it("a resolved request carries no marker at all", () => {
    expect(
      slaVerdict({ status: "DONE", firstResponseDueAt: "2026-09-21T10:00:00.000Z", firstRespondedAt: null, slaDueAt: "2026-09-21T11:00:00.000Z", escalatedAt: null }, now),
    ).toEqual({ kind: "resolved" });
  });

  it("escalation outranks every other verdict", () => {
    expect(
      slaVerdict({ status: "TODO", firstResponseDueAt: "2026-09-21T10:00:00.000Z", firstRespondedAt: null, slaDueAt: "2026-09-21T11:00:00.000Z", escalatedAt: "2026-09-21T12:00:00.000Z" }, now),
    ).toEqual({ kind: "escalated", at: "2026-09-21T12:00:00.000Z" });
  });

  it("a missed first response is overdue only while nobody has answered", () => {
    expect(
      slaVerdict({ status: "TODO", firstResponseDueAt: "2026-09-21T13:00:00.000Z", firstRespondedAt: null, slaDueAt: "2026-09-22T09:00:00.000Z", escalatedAt: null }, now),
    ).toEqual({ kind: "overdue", breach: "first_response", dueAt: "2026-09-21T13:00:00.000Z" });
    expect(
      slaVerdict({ status: "TODO", firstResponseDueAt: "2026-09-21T13:00:00.000Z", firstRespondedAt: "2026-09-21T12:00:00.000Z", slaDueAt: "2026-09-22T09:00:00.000Z", escalatedAt: null }, now),
    ).toEqual({ kind: "due", dueAt: "2026-09-22T09:00:00.000Z" });
  });

  it("a request past its resolution stamp is overdue whatever the response state", () => {
    expect(
      slaVerdict({ status: "IN_PROGRESS", firstResponseDueAt: null, firstRespondedAt: "2026-09-21T10:00:00.000Z", slaDueAt: "2026-09-21T14:00:00.000Z", escalatedAt: null }, now),
    ).toEqual({ kind: "overdue", breach: "resolution", dueAt: "2026-09-21T14:00:00.000Z" });
  });
});

describe("badges", () => {
  it("renders the confidential badge with a lock and a label a screen reader can read", () => {
    render(<ConfidentialBadge />);
    expect(screen.getByText("Confidential")).toBeInTheDocument();
  });

  it("names a first-response breach differently from a resolution breach", () => {
    const { rerender } = render(
      <SlaMarker now={now} ticket={{ status: "TODO", firstResponseDueAt: "2026-09-21T13:00:00.000Z", firstRespondedAt: null, slaDueAt: "2026-09-22T09:00:00.000Z", escalatedAt: null }} />,
    );
    expect(screen.getByText("Response overdue")).toBeInTheDocument();

    rerender(
      <SlaMarker now={now} ticket={{ status: "TODO", firstResponseDueAt: null, firstRespondedAt: null, slaDueAt: "2026-09-21T14:00:00.000Z", escalatedAt: null }} />,
    );
    expect(screen.getByText("Overdue")).toBeInTheDocument();
  });
});
