const mockEnforceRouteAccess = jest.fn();
const mockServerGet = jest.fn();
const mockRedirect = jest.fn((href: string) => {
  throw new Error(`redirect:${href}`);
});
const mockNotFound = jest.fn(() => {
  throw new Error("not-found");
});

jest.mock("@/lib/rbac/route-access/enforce-route-access", () => ({
  enforceRouteAccess: (...args: unknown[]) => mockEnforceRouteAccess(...args),
}));

jest.mock("@/lib/server-fetch", () => ({
  serverGet: (...args: unknown[]) => mockServerGet(...args),
}));

jest.mock("next/navigation", () => ({
  redirect: (href: string) => mockRedirect(href),
  notFound: () => mockNotFound(),
}));

import BugsSubmissionRedirectPage from "./page";

beforeEach(() => {
  jest.clearAllMocks();
  mockEnforceRouteAccess.mockResolvedValue(undefined);
});

describe("BugsSubmissionRedirectPage", () => {
  it("redirects to the intake list with ?item= when the lookup returns a non-null intakeId", async () => {
    mockServerGet.mockResolvedValue({ intakeId: 77 });

    await expect(
      BugsSubmissionRedirectPage({
        params: Promise.resolve({ projectId: "10", submissionId: "42" }),
      }),
    ).rejects.toThrow("redirect:/build/10/intake?item=77");

    expect(mockEnforceRouteAccess).toHaveBeenCalledWith(
      "/build/[projectId]/bugs/[submissionId]",
    );
    expect(mockServerGet).toHaveBeenCalledWith(
      "/build/10/intake/by-feedbucket/42",
      expect.objectContaining({ _def: expect.anything() }),
    );
    expect(mockRedirect).toHaveBeenCalledWith("/build/10/intake?item=77");
  });

  it("redirects to the intake index when no intake item is linked (intakeId is null)", async () => {
    mockServerGet.mockResolvedValue({ intakeId: null });

    await expect(
      BugsSubmissionRedirectPage({
        params: Promise.resolve({ projectId: "10", submissionId: "99" }),
      }),
    ).rejects.toThrow("redirect:/build/10/intake");

    expect(mockRedirect).toHaveBeenCalledWith("/build/10/intake");
  });

  it("calls notFound when projectId is not a positive integer", async () => {
    await expect(
      BugsSubmissionRedirectPage({
        params: Promise.resolve({ projectId: "abc", submissionId: "42" }),
      }),
    ).rejects.toThrow("not-found");

    expect(mockNotFound).toHaveBeenCalledTimes(1);
    expect(mockServerGet).not.toHaveBeenCalled();
  });

  it("calls notFound when submissionId is not a positive integer", async () => {
    await expect(
      BugsSubmissionRedirectPage({
        params: Promise.resolve({ projectId: "10", submissionId: "0" }),
      }),
    ).rejects.toThrow("not-found");

    expect(mockNotFound).toHaveBeenCalledTimes(1);
    expect(mockServerGet).not.toHaveBeenCalled();
  });

  it("calls notFound when submissionId is negative", async () => {
    await expect(
      BugsSubmissionRedirectPage({
        params: Promise.resolve({ projectId: "10", submissionId: "-5" }),
      }),
    ).rejects.toThrow("not-found");

    expect(mockNotFound).toHaveBeenCalledTimes(1);
    expect(mockServerGet).not.toHaveBeenCalled();
  });

  it("does not call serverGet or redirect before route access succeeds", async () => {
    mockEnforceRouteAccess.mockRejectedValueOnce(new Error("denied"));

    await expect(
      BugsSubmissionRedirectPage({
        params: Promise.resolve({ projectId: "10", submissionId: "42" }),
      }),
    ).rejects.toThrow("denied");

    expect(mockServerGet).not.toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(mockNotFound).not.toHaveBeenCalled();
  });
});
