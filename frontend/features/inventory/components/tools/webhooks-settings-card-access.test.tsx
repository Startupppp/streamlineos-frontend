import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import { WebhooksSettingsCard } from "./webhooks-settings-card";
import type { AccessState } from "@/lib/rbac/gate";
import type { Webhook } from "@/hooks/api/inventory/webhooks";

let mockState: AccessState = "loading";

jest.mock("@/hooks/api/access", () => ({
  useCanState: () => mockState,
}));

const STUB_WEBHOOK: Webhook = {
  id: 1,
  orgId: "org-1",
  url: "https://example.test/hook",
  events: ["stock.adjusted"],
  isActive: true,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

jest.mock("@/hooks/api/inventory/webhooks", () => ({
  useWebhooks: () => ({ data: [STUB_WEBHOOK], isPending: false }),
  useDeleteWebhook: () => ({ mutate: jest.fn(), isPending: false }),
  useWebhookEvents: () => ({ data: { items: [] }, isLoading: false }),
  useRetryWebhookEvent: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("./webhook-create-sheet", () => ({
  WebhookCreateSheet: () => null,
}));

jest.mock("./webhook-delivery-log", () => ({
  WebhookDeliveryLog: () => null,
}));

afterEach(() => jest.clearAllMocks());

describe("WebhooksSettingsCard – access gate", () => {
  it("shows the Add Webhook button when access is granted", () => {
    mockState = "granted";
    renderWithProviders(<WebhooksSettingsCard />);
    expect(screen.getByRole("button", { name: /Add Webhook/i })).toBeInTheDocument();
    expect(screen.queryByText(/Access Restricted/i)).not.toBeInTheDocument();
  });

  it("hides the Add Webhook button and shows the denial notice when access is denied", () => {
    mockState = "denied";
    renderWithProviders(<WebhooksSettingsCard />);
    expect(screen.queryByRole("button", { name: /Add Webhook/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Access Restricted/i)).toBeInTheDocument();
  });

  it("hides the Add Webhook button while access is still loading — fails closed", () => {
    mockState = "loading";
    renderWithProviders(<WebhooksSettingsCard />);
    expect(screen.queryByRole("button", { name: /Add Webhook/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Access Restricted/i)).not.toBeInTheDocument();
  });
});
