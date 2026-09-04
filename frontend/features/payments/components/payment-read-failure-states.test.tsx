/**
 * A denied or failed provider read must not read as "nothing to see".
 *
 * `usePaymentReadiness` / `usePaymentAudit` gate themselves on a permission and
 * hand the query `enabled: false` when it is missing, so a denied read settles
 * to `data === undefined, isLoading === false` — indistinguishable from a read
 * that finished and found nothing. The rail used to branch on
 * `isLoading || !readiness` and spin a skeleton forever; the audit tab used to
 * render `EmptyState "No audit events yet"`, so a 403 or a 500 read as a clean
 * audit trail. Both are pinned here: an error is an error, a denial is a
 * denial, and neither is silence.
 */
import { render, screen } from "@testing-library/react";
import { AuditTab } from "./audit-tab";
import { ReadinessRail } from "./readiness-rail";

const mockUseCan = jest.fn();
const mockReadiness = jest.fn();
const mockAudit = jest.fn();

jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => Boolean(mockUseCan(key)),
}));

jest.mock("@/hooks/api/payments", () => ({
  usePaymentReadiness: () => mockReadiness(),
  usePaymentAudit: () => mockAudit(),
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
  mockReadiness.mockReset();
  mockAudit.mockReset();
  mockUseCan.mockReturnValue(true);
  mockReadiness.mockReturnValue(queryResult({}));
  mockAudit.mockReturnValue(queryResult({}));
});

describe("ReadinessRail — a failed readiness read is not a permanent skeleton", () => {
  it("renders an error state when the readiness read fails", () => {
    mockReadiness.mockReturnValue(
      queryResult({ isError: true, error: new Error("Provider readiness unavailable") }),
    );

    const { container } = render(<ReadinessRail providerKey="razorpay" />);

    expect(screen.getByRole("alert")).toHaveTextContent(/failed to load readiness/i);
    expect(screen.getByText(/provider readiness unavailable/i)).toBeInTheDocument();
    expect(container.querySelectorAll('.skeleton-shimmer')).toHaveLength(0);
  });

  it("says the read was denied rather than spinning when the permission is missing", () => {
    mockUseCan.mockImplementation((key: string) => key !== "payments:providers:view");

    const { container } = render(<ReadinessRail providerKey="razorpay" />);

    expect(screen.getByText(/readiness hidden/i)).toBeInTheDocument();
    expect(container.querySelectorAll('.skeleton-shimmer')).toHaveLength(0);
  });

  it("still shows the skeleton while the read is genuinely in flight", () => {
    mockReadiness.mockReturnValue(queryResult({ isLoading: true }));

    const { container } = render(<ReadinessRail providerKey="razorpay" />);

    expect(container.querySelectorAll('.skeleton-shimmer').length).toBeGreaterThan(0);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders the readiness summary on success", () => {
    mockReadiness.mockReturnValue(
      queryResult({
        data: { readyForLive: true, blockers: [], warnings: [], completedChecks: ["webhook_secret"] },
      }),
    );

    render(<ReadinessRail providerKey="razorpay" />);

    expect(screen.getByText(/ready for live payments/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("AuditTab — a failed audit read is not an empty audit trail", () => {
  it("renders an error state when the audit read fails", () => {
    mockAudit.mockReturnValue(
      queryResult({ isError: true, error: new Error("Audit log unavailable") }),
    );

    render(<AuditTab providerKey="razorpay" />);

    expect(screen.getByRole("alert")).toHaveTextContent(/failed to load audit events/i);
    expect(screen.getByText(/audit log unavailable/i)).toBeInTheDocument();
    expect(screen.queryByText(/no audit events yet/i)).not.toBeInTheDocument();
  });

  it("says the read was denied rather than claiming there is nothing logged", () => {
    mockUseCan.mockImplementation((key: string) => key !== "payments:audit:view");

    render(<AuditTab providerKey="razorpay" />);

    expect(screen.getByText(/audit trail hidden/i)).toBeInTheDocument();
    expect(screen.queryByText(/no audit events yet/i)).not.toBeInTheDocument();
  });

  it("still reports a genuinely empty audit trail as empty", () => {
    mockAudit.mockReturnValue(queryResult({ data: [] }));

    render(<AuditTab providerKey="razorpay" />);

    expect(screen.getByText(/no audit events yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
