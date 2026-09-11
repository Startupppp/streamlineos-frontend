import { render, screen } from "@testing-library/react";
import { AuditChainCheck } from "./audit-chain-check";
import { AuditTab } from "./audit-tab";
import type { AuditChainVerification } from "@/features/timesheets/types";

const verifyState: {
  data?: AuditChainVerification;
  isFetching: boolean;
  isError: boolean;
  error: unknown;
  canVerify: boolean;
} = { isFetching: false, isError: false, error: null, canVerify: true };

jest.mock("@/hooks/api/timesheets-core/audit-verify", () => ({
  useVerifyAuditChain: () => ({ ...verifyState, refetch: jest.fn() }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

jest.mock("@/hooks/api/timesheets-core/audit", () => ({
  useAuditEvents: () => ({
    data: { data: [], pagination: { total: 0 } },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

function complete(over: Partial<AuditChainVerification> = {}): AuditChainVerification {
  return {
    valid: true,
    checked: 120,
    verified: 120,
    legacyRows: 0,
    total: 120,
    truncated: false,
    ...over,
  };
}

beforeEach(() => {
  verifyState.data = undefined;
  verifyState.isFetching = false;
  verifyState.isError = false;
  verifyState.error = null;
  verifyState.canVerify = true;
});

describe("AuditChainCheck", () => {
  it("calls a complete clean walk intact", () => {
    verifyState.data = complete();
    render(<AuditChainCheck />);

    expect(screen.getByText("The record is intact")).toBeInTheDocument();
  });

  /**
   * The assertion this component exists for.
   *
   * The server verifies the OLDEST events first and stops at its limit, so on a
   * long chain `valid: true` describes the beginning of the trail and says
   * nothing about the recent events somebody is most likely asking about. A
   * green tick here would be believed, and would be wrong.
   */
  it("never reports a truncated walk as a clean bill of health", () => {
    verifyState.data = complete({ verified: 10_000, checked: 10_000, total: 90_000, truncated: true });
    render(<AuditChainCheck />);

    expect(screen.queryByText("The record is intact")).not.toBeInTheDocument();
    expect(screen.getByText("Intact as far as this check could read")).toBeInTheDocument();
    expect(screen.getByText(/90,000/)).toBeInTheDocument();
    expect(screen.getByText(/not a clean bill of health/i)).toBeInTheDocument();
  });

  it("says so when part of the trail predates hashing and cannot be checked", () => {
    verifyState.data = complete({ verified: 20, legacyRows: 380, checked: 400, total: 400 });
    render(<AuditChainCheck />);

    expect(screen.queryByText("The record is intact")).not.toBeInTheDocument();
    expect(
      screen.getByText("Intact, but part of the trail cannot be checked"),
    ).toBeInTheDocument();
    expect(screen.getByText(/neither confirm nor deny/i)).toBeInTheDocument();
  });

  it("names the event where the chain broke", () => {
    verifyState.data = complete({ valid: false, brokenAtId: 4127, verified: 4126, checked: 4126, total: 9000, truncated: true });
    render(<AuditChainCheck />);

    expect(screen.getByText("The record has been altered")).toBeInTheDocument();
    expect(screen.getByText(/4127/)).toBeInTheDocument();
  });

  it("renders nothing at all for a reader who cannot view the audit trail", () => {
    verifyState.canVerify = false;
    const { container } = render(<AuditChainCheck />);

    expect(container).toBeEmptyDOMElement();
  });
});

/**
 * A component with a green unit test and no mount point is this effort's
 * signature defect — `GET /timesheets/audit/verify` shipped with no caller at
 * all. So the check that it is actually rendered is written down.
 */
describe("the audit tab mounts the integrity check", () => {
  it("renders it above the event table", () => {
    verifyState.data = undefined;
    render(<AuditTab />);

    expect(screen.getByText("Has this record been altered?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /check integrity/i })).toBeInTheDocument();
  });
});
