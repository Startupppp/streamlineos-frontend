jest.mock("server-only", () => ({}));

jest.mock("react", () => ({
  cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));

jest.mock("@/lib/server-fetch", () => ({
  serverGet: jest.fn(),
}));

import { ApiError } from "@/lib/api-envelope";
import { serverGet } from "@/lib/server-fetch";
import { getServerAccessResult } from "@/lib/rbac/get-server-access";

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
