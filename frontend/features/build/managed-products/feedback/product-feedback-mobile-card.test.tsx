import { render, screen } from "@testing-library/react";
import { ProductFeedbackMobileCard } from "./product-feedback-mobile-card";

const ROW = {
  message: "Checkout spinner never ends",
  type: "bug" as const,
  status: "open" as const,
  sourceChannel: "widget" as const,
  sentiment: "negative" as const,
  duplicateCount: 1,
  createdAt: "2026-04-11T00:00:00Z",
  reporterName: "Grace Hopper",
  reporterEmail: "grace@example.com",
  consentStatus: "granted" as const,
  customer: { crmOrganizationId: 3, name: "Navy" },
  segment: "Enterprise",
};

describe("ProductFeedbackMobileCard", () => {
  it("shows channel, sentiment, and frequency tone badges", () => {
    render(<ProductFeedbackMobileCard row={ROW} />);
    expect(screen.getByText("Checkout spinner never ends")).toBeInTheDocument();
    expect(screen.getByText("Widget")).toBeInTheDocument();
    expect(screen.getByText("Negative")).toBeInTheDocument();
    expect(screen.getByText("2 reports")).toBeInTheDocument();
    expect(screen.getByText("Navy")).toBeInTheDocument();
    expect(screen.queryByText(/[0-9a-f]{8}-[0-9a-f]{4}/i)).not.toBeInTheDocument();
  });

  it("hides the reporter when consent is denied", () => {
    render(
      <ProductFeedbackMobileCard
        row={{ ...ROW, consentStatus: "denied" }}
      />,
    );
    expect(screen.queryByText("Grace Hopper")).not.toBeInTheDocument();
  });
});
