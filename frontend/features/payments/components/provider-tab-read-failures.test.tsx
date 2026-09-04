/**
 * The rest of the payments control room, pinned to the same rule
 * `payment-read-failure-states.test.tsx` established for the readiness rail
 * and the audit tab: a denied or failed read is never rendered as silence.
 *
 * Every read hook in `hooks/api/payments.ts` carries `enabled: canView`, so a
 * caller without the key — or a caller whose request 403s or 500s — settles to
 * `data === undefined, isLoading === false`. Four surfaces still read that as
 * "nothing to see" after the first pass fixed only the two files its own test
 * covered:
 *
 *   WebhooksTab          -> EmptyState "No webhook events yet"  (a failing
 *                           webhook pipeline reads as a healthy quiet one)
 *   ManualMethodsPanel   -> five blank editors marked "Missing instructions"
 *                           (configured bank details read as never configured,
 *                           and Save would overwrite them with blanks)
 *   LiveActivationPanel  -> `return null` (the panel vanishes; indistinguishable
 *                           from "this provider cannot go live")
 *   TestPaymentTab       -> the recent-test list silently does not render
 */
import { render, screen } from "@testing-library/react";
import { WebhooksTab } from "./webhooks-tab";
import { ManualMethodsPanel } from "./manual-methods-panel";
import { LiveActivationPanel } from "./live-activation-panel";
import { TestPaymentTab } from "./test-payment-tab";

const mockUseCan = jest.fn();
const mockWebhookEvents = jest.fn();
const mockManualMethods = jest.fn();
const mockReadiness = jest.fn();
const mockTestTransactions = jest.fn();

jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => Boolean(mockUseCan(key)),
}));

jest.mock("@/hooks/api/payments", () => ({
  useWebhookEvents: () => mockWebhookEvents(),
  useManualMethods: () => mockManualMethods(),
  usePaymentReadiness: () => mockReadiness(),
  useTestTransactions: () => mockTestTransactions(),
  usePaymentProviders: () => ({ data: [], isLoading: false, isError: false, error: null }),
  useGenerateWebhook: () => ({ mutate: jest.fn(), isPending: false }),
  useRetryWebhookEvent: () => ({ mutate: jest.fn(), isPending: false }),
  useActivateLivePayments: () => ({ mutate: jest.fn(), isPending: false }),
  useCreateTestTransaction: () => ({ mutate: jest.fn(), isPending: false }),
  useVerifyTestTransaction: () => ({ mutate: jest.fn(), isPending: false }),
  useSaveManualMethod: () => ({ mutate: jest.fn(), isPending: false }),
  useDisableManualMethod: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("next/script", () => ({
  __esModule: true,
  default: () => null,
}));

function queryResult(overrides: Record<string, unknown>) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  mockUseCan.mockReset();
  mockWebhookEvents.mockReset();
  mockManualMethods.mockReset();
  mockReadiness.mockReset();
  mockTestTransactions.mockReset();
  mockUseCan.mockReturnValue(true);
  mockWebhookEvents.mockReturnValue(queryResult({ data: [] }));
  mockManualMethods.mockReturnValue(queryResult({ data: [] }));
  mockReadiness.mockReturnValue(
    queryResult({ data: { readyForLive: true, blockers: [], warnings: [], completedChecks: [] } }),
  );
  mockTestTransactions.mockReturnValue(queryResult({ data: [] }));
});

describe("WebhooksTab — a failed webhook-event read is not an empty webhook log", () => {
  it("renders an error state rather than 'No webhook events yet'", () => {
    mockWebhookEvents.mockReturnValue(
      queryResult({ isError: true, error: new Error("Webhook log unavailable") }),
    );

    render(<WebhooksTab providerKey="razorpay" environment="live" />);

    expect(screen.getByRole("alert")).toHaveTextContent(/failed to load webhook events/i);
    expect(screen.getByText(/webhook log unavailable/i)).toBeInTheDocument();
    expect(screen.queryByText(/no webhook events yet/i)).not.toBeInTheDocument();
  });

  it("says the event read was denied rather than claiming nothing was received", () => {
    mockUseCan.mockImplementation((key: string) => key !== "payments:webhooks:view");

    render(<WebhooksTab providerKey="razorpay" environment="live" />);

    expect(screen.getByText(/webhook events hidden/i)).toBeInTheDocument();
    expect(screen.queryByText(/no webhook events yet/i)).not.toBeInTheDocument();
  });

  it("still reports a genuinely empty event log as empty", () => {
    render(<WebhooksTab providerKey="razorpay" environment="live" />);

    expect(screen.getByText(/no webhook events yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("ManualMethodsPanel — a failed read is not 'nothing is configured'", () => {
  it("renders an error state instead of blank editors", () => {
    mockManualMethods.mockReturnValue(
      queryResult({ isError: true, error: new Error("Manual methods unavailable") }),
    );

    render(<ManualMethodsPanel />);

    expect(screen.getByRole("alert")).toHaveTextContent(/failed to load payment instructions/i);
    expect(screen.getByText(/manual methods unavailable/i)).toBeInTheDocument();
    expect(screen.queryByText(/missing instructions/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^save$/i })).not.toBeInTheDocument();
  });

  it("says the read was denied rather than offering a Save that would blank the config", () => {
    mockUseCan.mockImplementation((key: string) => key !== "payments:providers:view");

    render(<ManualMethodsPanel />);

    expect(screen.getByText(/payment instructions hidden/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^save$/i })).not.toBeInTheDocument();
  });

  it("still renders the editors when the read genuinely returns nothing configured", () => {
    render(<ManualMethodsPanel />);

    expect(screen.getAllByText(/missing instructions/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("LiveActivationPanel — a failed readiness read does not disappear the panel", () => {
  it("renders an error state rather than nothing at all", () => {
    mockReadiness.mockReturnValue(
      queryResult({ isError: true, error: new Error("Readiness unavailable") }),
    );

    render(<LiveActivationPanel providerKey="razorpay" />);

    expect(screen.getByRole("alert")).toHaveTextContent(/failed to load live readiness/i);
    expect(screen.getByText(/readiness unavailable/i)).toBeInTheDocument();
  });

  it("still renders nothing when the caller simply cannot activate", () => {
    mockUseCan.mockImplementation((key: string) => key !== "payments:live:activate");

    const { container } = render(<LiveActivationPanel providerKey="razorpay" />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe("TestPaymentTab — a failed history read is not an empty history", () => {
  it("renders an error state where the recent-test list would be", () => {
    mockTestTransactions.mockReturnValue(
      queryResult({ isError: true, error: new Error("Test history unavailable") }),
    );

    render(<TestPaymentTab providerKey="razorpay" />);

    expect(screen.getByRole("alert")).toHaveTextContent(/failed to load recent test payments/i);
    expect(screen.getByText(/test history unavailable/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Recent test payments$/i)).not.toBeInTheDocument();
  });

  it("renders the history when the read succeeds", () => {
    mockTestTransactions.mockReturnValue(
      queryResult({ data: [{ id: 1, amount: "499.00", currency: "INR", status: "succeeded" }] }),
    );

    render(<TestPaymentTab providerKey="razorpay" />);

    expect(screen.getByText(/^Recent test payments$/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
