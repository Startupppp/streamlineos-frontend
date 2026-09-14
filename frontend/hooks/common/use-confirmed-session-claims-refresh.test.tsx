import { act, renderHook } from "@testing-library/react";
import type { Session } from "next-auth";
import { toast } from "sonner";
import {
  SESSION_CLAIMS_UNCONFIRMED_MESSAGE,
  useConfirmedSessionClaimsRefresh,
  type SessionClaimsOutcome,
} from "./use-confirmed-session-claims-refresh";

const mockRefreshSessionClaims = jest.fn();

jest.mock("@/hooks/common/auth-hooks", () => ({
  useSessionClaimsRefresh: () => mockRefreshSessionClaims,
}));

jest.mock("sonner", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

const mockToastError = toast.error as jest.Mock;

function sessionWith(overrides: Partial<Session>): Session {
  return {
    user: { id: "user-1", role: "MEMBER", name: "Ada Lovelace" },
    orgId: "org-a",
    expires: "2099-01-01T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("a claims refresh is only confirmed when the session it returns is the one asked for", () => {
  it("passes the caller's payload straight through to the underlying refresh", async () => {
    mockRefreshSessionClaims.mockResolvedValue(sessionWith({ orgId: "org-b" }));
    const { result } = renderHook(() => useConfirmedSessionClaimsRefresh());

    let outcome: SessionClaimsOutcome | undefined;
    await act(async () => {
      outcome = await result.current().confirm({ orgId: "org-b" });
    });

    expect(mockRefreshSessionClaims).toHaveBeenCalledWith({ orgId: "org-b" });
    expect(outcome).toEqual({
      status: "confirmed",
      session: sessionWith({ orgId: "org-b" }),
    });
  });

  it("confirms a refresh with no expectation as long as a session came back", async () => {
    mockRefreshSessionClaims.mockResolvedValue(sessionWith({}));
    const { result } = renderHook(() => useConfirmedSessionClaimsRefresh());

    let outcome: SessionClaimsOutcome | undefined;
    await act(async () => {
      outcome = await result.current().confirm();
    });

    expect(mockRefreshSessionClaims).toHaveBeenCalledWith(undefined);
    expect(outcome?.status).toBe("confirmed");
  });

  it("treats an empty expectation as a pass-through payload that asserts nothing", async () => {
    mockRefreshSessionClaims.mockResolvedValue(sessionWith({ orgId: "org-z" }));
    const { result } = renderHook(() => useConfirmedSessionClaimsRefresh());

    let outcome: SessionClaimsOutcome | undefined;
    await act(async () => {
      outcome = await result.current().confirm({});
    });

    expect(mockRefreshSessionClaims).toHaveBeenCalledWith({});
    expect(outcome?.status).toBe("confirmed");
  });

  it("reports a timed-out refresh as unavailable rather than as success", async () => {
    mockRefreshSessionClaims.mockResolvedValue(null);
    const { result } = renderHook(() => useConfirmedSessionClaimsRefresh());

    let outcome: SessionClaimsOutcome | undefined;
    await act(async () => {
      outcome = await result.current().confirm({ orgId: "org-b" });
    });

    expect(outcome).toEqual({ status: "unavailable" });
    expect(outcome?.status).not.toBe("confirmed");
  });

  it("refuses a session whose orgId is not the org the mutation returned", async () => {
    mockRefreshSessionClaims.mockResolvedValue(sessionWith({ orgId: "org-a" }));
    const { result } = renderHook(() => useConfirmedSessionClaimsRefresh());

    let outcome: SessionClaimsOutcome | undefined;
    await act(async () => {
      outcome = await result.current().confirm({ orgId: "org-b" });
    });

    expect(outcome).toEqual({ status: "unconfirmed" });
  });

  it("accepts a cleared org when the mutation left the member with no organization", async () => {
    mockRefreshSessionClaims.mockResolvedValue(sessionWith({ orgId: null }));
    const { result } = renderHook(() => useConfirmedSessionClaimsRefresh());

    let outcome: SessionClaimsOutcome | undefined;
    await act(async () => {
      outcome = await result.current().confirm({ orgId: null });
    });

    expect(outcome?.status).toBe("confirmed");
  });

  it("refuses a still-joined session when the member expected to be out of every org", async () => {
    mockRefreshSessionClaims.mockResolvedValue(sessionWith({ orgId: "org-a" }));
    const { result } = renderHook(() => useConfirmedSessionClaimsRefresh());

    let outcome: SessionClaimsOutcome | undefined;
    await act(async () => {
      outcome = await result.current().confirm({ orgId: null });
    });

    expect(outcome).toEqual({ status: "unconfirmed" });
  });

  it("refuses a session still carrying the previous display name", async () => {
    mockRefreshSessionClaims.mockResolvedValue(sessionWith({}));
    const { result } = renderHook(() => useConfirmedSessionClaimsRefresh());

    let outcome: SessionClaimsOutcome | undefined;
    await act(async () => {
      outcome = await result.current().confirm({ name: "Grace Hopper" });
    });

    expect(outcome).toEqual({ status: "unconfirmed" });
  });

  it("confirms the session once it carries the name that was just saved", async () => {
    mockRefreshSessionClaims.mockResolvedValue(
      sessionWith({ user: { id: "user-1", role: "MEMBER", name: "Grace Hopper" } }),
    );
    const { result } = renderHook(() => useConfirmedSessionClaimsRefresh());

    let outcome: SessionClaimsOutcome | undefined;
    await act(async () => {
      outcome = await result.current().confirm({ name: "Grace Hopper" });
    });

    expect(outcome?.status).toBe("confirmed");
  });
});

describe("a refresh that lands after a newer run started cannot be acted on", () => {
  it("reports the stale run as superseded even when its session is valid", async () => {
    let settleFirst: ((session: Session) => void) | undefined;
    mockRefreshSessionClaims
      .mockImplementationOnce(
        () =>
          new Promise<Session>((resolve) => {
            settleFirst = resolve;
          }),
      )
      .mockResolvedValue(sessionWith({ orgId: "org-b" }));

    const { result } = renderHook(() => useConfirmedSessionClaimsRefresh());

    const firstRun = result.current();
    const firstOutcome = firstRun.confirm({ orgId: "org-a" });

    const secondRun = result.current();
    let secondOutcome: SessionClaimsOutcome | undefined;
    await act(async () => {
      secondOutcome = await secondRun.confirm({ orgId: "org-b" });
    });
    expect(secondOutcome?.status).toBe("confirmed");

    await act(async () => {
      settleFirst?.(sessionWith({ orgId: "org-a" }));
      await Promise.resolve();
    });

    await expect(firstOutcome).resolves.toEqual({ status: "superseded" });
  });

  it("stays silent for a superseded run instead of warning about a session that is fine", async () => {
    let settleFirst: ((session: Session | null) => void) | undefined;
    mockRefreshSessionClaims
      .mockImplementationOnce(
        () =>
          new Promise<Session | null>((resolve) => {
            settleFirst = resolve;
          }),
      )
      .mockResolvedValue(sessionWith({ orgId: "org-b" }));

    const { result } = renderHook(() => useConfirmedSessionClaimsRefresh());

    const firstWarned = result.current().confirmOrWarn({ orgId: "org-a" });
    await act(async () => {
      await result.current().confirmOrWarn({ orgId: "org-b" });
    });

    await act(async () => {
      settleFirst?.(null);
      await Promise.resolve();
    });

    await expect(firstWarned).resolves.toBe(false);
    expect(mockToastError).not.toHaveBeenCalled();
  });
});

describe("confirmOrWarn reports the outcome the caller must branch on", () => {
  it("returns true and stays quiet on a confirmed refresh", async () => {
    mockRefreshSessionClaims.mockResolvedValue(sessionWith({ orgId: "org-b" }));
    const { result } = renderHook(() => useConfirmedSessionClaimsRefresh());

    let confirmed: boolean | undefined;
    await act(async () => {
      confirmed = await result.current().confirmOrWarn({ orgId: "org-b" });
    });

    expect(confirmed).toBe(true);
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it("returns false and warns once when the refresh never confirmed", async () => {
    mockRefreshSessionClaims.mockResolvedValue(null);
    const { result } = renderHook(() => useConfirmedSessionClaimsRefresh());

    let confirmed: boolean | undefined;
    await act(async () => {
      confirmed = await result.current().confirmOrWarn({ orgId: "org-b" });
    });

    expect(confirmed).toBe(false);
    expect(mockToastError).toHaveBeenCalledTimes(1);
    expect(mockToastError).toHaveBeenCalledWith(
      SESSION_CLAIMS_UNCONFIRMED_MESSAGE,
    );
  });

  it("returns false and warns when the refreshed org is not the one asked for", async () => {
    mockRefreshSessionClaims.mockResolvedValue(sessionWith({ orgId: "org-a" }));
    const { result } = renderHook(() => useConfirmedSessionClaimsRefresh());

    let confirmed: boolean | undefined;
    await act(async () => {
      confirmed = await result.current().confirmOrWarn({ orgId: "org-b" });
    });

    expect(confirmed).toBe(false);
    expect(mockToastError).toHaveBeenCalledWith(
      SESSION_CLAIMS_UNCONFIRMED_MESSAGE,
    );
  });
});
