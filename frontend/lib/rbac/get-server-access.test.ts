jest.mock("server-only", () => ({}));

jest.mock("react", () => ({
  cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));

jest.mock("@/lib/server-fetch", () => ({
  serverGet: jest.fn(),
}));

import { ApiError } from "@/lib/api-envelope";
import { serverGet } from "@/lib/server-fetch";
import { getServerAccess, getServerAccessResult } from "@/lib/rbac/get-server-access";

const access = {
  scopes: {},
  isOrgOwner: true,
  canManageOrganizationMembership: true,
  modules: {},
  mfa: { enforced: false, satisfied: true },
};

describe("getServerAccessResult", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("recovers from a transient backend outage", async () => {
    jest.mocked(serverGet)
      .mockRejectedValueOnce(
        new ApiError("Unavailable", 503, "BACKEND_UNREACHABLE"),
      )
      .mockResolvedValueOnce(access);

    const result = getServerAccessResult();
    await jest.advanceTimersByTimeAsync(250);

    await expect(result).resolves.toEqual({ ok: true, access });
    expect(serverGet).toHaveBeenCalledTimes(2);
  });

  it("retries a timed-out access snapshot instead of locking the layout", async () => {
    jest.mocked(serverGet)
      .mockRejectedValueOnce(new ApiError("slow", undefined, "TIMEOUT"))
      .mockResolvedValueOnce(access);

    const result = getServerAccessResult();
    await jest.advanceTimersByTimeAsync(250);

    await expect(result).resolves.toEqual({ ok: true, access });
    expect(serverGet).toHaveBeenCalledTimes(2);
  });

  it("does not retry authentication or authorization failures", async () => {
    jest.mocked(serverGet).mockRejectedValueOnce(
      new ApiError("Not authenticated", 401, "UNAUTHENTICATED"),
    );

    await expect(getServerAccessResult()).resolves.toMatchObject({ ok: false });
    expect(serverGet).toHaveBeenCalledTimes(1);
  });

  it("fails closed after the transient retry budget is exhausted", async () => {
    jest.mocked(serverGet).mockRejectedValue(
      new ApiError("Unavailable", 503, "BACKEND_UNREACHABLE"),
    );

    const result = getServerAccessResult();
    await jest.advanceTimersByTimeAsync(2_500);

    await expect(result).resolves.toMatchObject({ ok: false });
    expect(serverGet).toHaveBeenCalledTimes(4);
  });
});

describe("getServerAccess falls back to a constant that actually denies", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not waive the MFA redirect when /me/access fails, because a DENIED constant carrying satisfied:true skips the layout's enforcement branch", async () => {
    jest.mocked(serverGet).mockRejectedValue(
      new ApiError("Not authenticated", 401, "UNAUTHENTICATED"),
    );

    const fallback = await getServerAccess();

    expect(fallback.mfa).toEqual({ enforced: true, satisfied: false });
  });

  it("grants no scope, no module and no owner standing in the same fallback, so the MFA field is the only one that changed", async () => {
    jest.mocked(serverGet).mockRejectedValue(
      new ApiError("Not authenticated", 401, "UNAUTHENTICATED"),
    );

    const fallback = await getServerAccess();

    expect(fallback).toMatchObject({
      scopes: {},
      modules: {},
      isOrgOwner: false,
      canManageOrganizationMembership: false,
    });
  });

  it("returns the real snapshot untouched when /me/access succeeds, so the fallback is never mistaken for the answer", async () => {
    jest.mocked(serverGet).mockResolvedValue(access);

    await expect(getServerAccess()).resolves.toEqual(access);
  });
});
