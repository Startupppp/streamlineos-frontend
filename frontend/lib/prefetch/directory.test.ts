jest.mock("server-only", () => ({}));

jest.mock("@/lib/rbac/require-permission", () => ({
  requirePermission: jest.fn(),
}));

jest.mock("@/lib/prefetch/directory", () => ({
  prefetchWorkers: jest.fn(),
}));

jest.mock("@/features/directory/workers/workers-page", () => ({
  WorkersPage: () => null,
}));

import { requirePermission } from "@/lib/rbac/require-permission";
import { prefetchWorkers } from "@/lib/prefetch/directory";
import WorkersRoute from "@/app/(authenticated)/directory/workers/page";

describe("WorkersRoute — permission check precedes data prefetch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not call prefetchWorkers when the permission check redirects", async () => {
    const redirectError = Object.assign(new Error("NEXT_REDIRECT"), {
      digest: "NEXT_REDIRECT",
    });
    (requirePermission as jest.Mock).mockRejectedValueOnce(redirectError);

    await expect(WorkersRoute()).rejects.toMatchObject({ digest: "NEXT_REDIRECT" });

    expect(prefetchWorkers).not.toHaveBeenCalled();
  });

  it("calls prefetchWorkers only after the permission check resolves", async () => {
    (requirePermission as jest.Mock).mockResolvedValueOnce(undefined);
    (prefetchWorkers as jest.Mock).mockResolvedValueOnce({ queries: [], mutations: [] });

    await WorkersRoute();

    expect(requirePermission).toHaveBeenCalledWith("directory:workers:view");
    expect(prefetchWorkers).toHaveBeenCalledTimes(1);
  });
});
