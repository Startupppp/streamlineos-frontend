import { requireSession } from "@/lib/rbac/require-permission";
import { recordLegacyRedirect } from "@/lib/observability/legacy-redirect";
import { redirect } from "next/navigation";
import KnowledgeRootPage from "./page";

jest.mock("@/lib/rbac/require-permission", () => ({
  requireSession: jest.fn(),
}));
jest.mock("@/lib/observability/legacy-redirect", () => ({
  recordLegacyRedirect: jest.fn(),
}));
jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

describe("/knowledge compatibility redirect", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("authenticates, records a hit, and redirects to the Docs home", async () => {
    await KnowledgeRootPage();
    expect(requireSession).toHaveBeenCalledTimes(1);
    expect(recordLegacyRedirect).toHaveBeenCalledWith("/knowledge", "/knowledge/wiki");
    expect(redirect).toHaveBeenCalledWith("/knowledge/wiki");
    expect(jest.mocked(requireSession).mock.invocationCallOrder[0]).toBeLessThan(
      jest.mocked(recordLegacyRedirect).mock.invocationCallOrder[0] ?? 0,
    );
    expect(jest.mocked(recordLegacyRedirect).mock.invocationCallOrder[0]).toBeLessThan(
      jest.mocked(redirect).mock.invocationCallOrder[0] ?? 0,
    );
  });

  it("does not record a hit or redirect when authentication fails", async () => {
    jest.mocked(requireSession).mockRejectedValueOnce(new Error("sign in required"));
    await expect(KnowledgeRootPage()).rejects.toThrow("sign in required");
    expect(recordLegacyRedirect).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});
