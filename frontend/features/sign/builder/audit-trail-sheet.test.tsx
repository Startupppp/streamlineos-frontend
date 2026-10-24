import { render, screen } from "@testing-library/react";
import { AuditTrailSheet } from "./audit-trail-sheet";

jest.mock("@/hooks/api/sign/envelopes", () => ({
  useSignEnvelopeAudit: () => ({
    isLoading: false,
    data: [
      {
        id: 1,
        eventType: "envelope_voided",
        actorName: "QA Owner A",
        actorEmail: "qa-owner-a@example.test",
        ipAddress: "203.0.113.7",
        createdAt: "2026-10-23T15:32:11.000Z",
      },
    ],
  }),
}));
jest.mock("@/hooks/api/org-display", () => ({ useOrgTimeZone: () => "Asia/Kolkata" }));
jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (options: { isLoading: boolean; isError: boolean; isEmpty?: boolean; error?: unknown }) => {
    if (options.isLoading) return { kind: "loading" };
    if (options.isError) return { kind: "error", error: options.error };
    if (options.isEmpty) return { kind: "empty" };
    return { kind: "ready" };
  },
}));

describe("the envelope audit trail", () => {
  it("shows each event's time in the organisation's time zone and names that zone", () => {
    render(<AuditTrailSheet envelopeId={7} open onOpenChange={jest.fn()} />);

    expect(screen.getByText(/23 Oct 2026, 21:02:11 \(Asia\/Kolkata\)/)).toBeInTheDocument();
    expect(screen.getByText(/QA Owner A/)).toBeInTheDocument();
  });
});
