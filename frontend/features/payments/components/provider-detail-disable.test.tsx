import { fireEvent, render, screen } from "@testing-library/react";
import { ProviderDetail } from "./provider-detail";
import type { PaymentProvider } from "@/hooks/api/payments";

const mockCan = jest.fn();
const mockDisable = jest.fn();

jest.mock("@/hooks/api/access", () => ({ useCan: (key: string) => mockCan(key) }));
jest.mock("@/hooks/api/payments", () => ({
  useDisablePaymentProvider: () => ({ mutate: mockDisable, isPending: false }),
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("./credentials-tab", () => ({ CredentialsTab: () => null }));
jest.mock("./webhooks-tab", () => ({ WebhooksTab: () => null }));
jest.mock("./test-payment-tab", () => ({ TestPaymentTab: () => null }));
jest.mock("./live-activation-panel", () => ({ LiveActivationPanel: () => null }));
jest.mock("./audit-tab", () => ({ AuditTab: () => null }));

const provider: PaymentProvider = {
  id: 1,
  orgId: "org-a",
  providerKey: "stripe",
  displayName: "Stripe",
  status: "test_mode_ready",
  environment: "test",
  isPrimary: false,
  supportedCurrencies: ["USD"],
  supportedPaymentMethods: ["card"],
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
  credentials: [],
};

beforeEach(() => {
  mockCan.mockReset();
  mockDisable.mockReset();
});

describe("ProviderDetail — disable provider", () => {
  it("confirms before disabling, for a provider manager", () => {
    mockCan.mockImplementation((key: string) => key === "payments:providers:manage");
    render(<ProviderDetail provider={provider} environment="test" />);
    fireEvent.click(screen.getByRole("button", { name: "Disable provider" }));
    expect(mockDisable).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole("button", { name: "Disable provider" }).at(-1) as HTMLElement);
    expect(mockDisable).toHaveBeenCalledTimes(1);
  });

  it("hides the control without the manage key, and on an already-disabled provider", () => {
    mockCan.mockReturnValue(false);
    const { rerender } = render(<ProviderDetail provider={provider} environment="test" />);
    expect(screen.queryByRole("button", { name: "Disable provider" })).toBeNull();
    mockCan.mockReturnValue(true);
    rerender(<ProviderDetail provider={{ ...provider, status: "disabled" }} environment="test" />);
    expect(screen.queryByRole("button", { name: "Disable provider" })).toBeNull();
  });
});
