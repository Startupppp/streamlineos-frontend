jest.mock("server-only", () => ({}));

jest.mock("@/lib/rbac/require-permission", () => ({
  requirePermission: jest.fn(),
}));

jest.mock("@/lib/prefetch/hr", () => ({
  prefetchHrDocuments: jest.fn(),
  prefetchHrAssets: jest.fn(),
}));

jest.mock("@/features/hr/documents/documents-page", () => ({
  DocumentsPage: () => null,
}));

jest.mock("@/features/hr/assets/assets-page", () => ({
  AssetsPage: () => null,
}));

import { requirePermission } from "@/lib/rbac/require-permission";
import { prefetchHrDocuments, prefetchHrAssets } from "@/lib/prefetch/hr";
import HrDocumentsPage from "@/app/(authenticated)/hr/documents/page";
import HrAssetsPage from "@/app/(authenticated)/hr/assets/page";

const REDIRECT_ERROR = Object.assign(new Error("NEXT_REDIRECT"), {
  digest: "NEXT_REDIRECT",
});

describe("HrDocumentsPage — permission check precedes data prefetch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not call prefetchHrDocuments when the permission check redirects", async () => {
    (requirePermission as jest.Mock).mockRejectedValueOnce(REDIRECT_ERROR);

    await expect(HrDocumentsPage()).rejects.toMatchObject({
      digest: "NEXT_REDIRECT",
    });

    expect(prefetchHrDocuments).not.toHaveBeenCalled();
  });

  it("calls prefetchHrDocuments only after the permission check resolves", async () => {
    (requirePermission as jest.Mock).mockResolvedValueOnce(undefined);
    (prefetchHrDocuments as jest.Mock).mockResolvedValueOnce({
      queries: [],
      mutations: [],
    });

    await HrDocumentsPage();

    expect(requirePermission).toHaveBeenCalledWith("hr:documents:view");
    expect(prefetchHrDocuments).toHaveBeenCalledTimes(1);
  });
});

describe("HrAssetsPage — permission check precedes data prefetch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not call prefetchHrAssets when the permission check redirects", async () => {
    (requirePermission as jest.Mock).mockRejectedValueOnce(REDIRECT_ERROR);

    await expect(HrAssetsPage()).rejects.toMatchObject({
      digest: "NEXT_REDIRECT",
    });

    expect(prefetchHrAssets).not.toHaveBeenCalled();
  });

  it("calls prefetchHrAssets only after the permission check resolves", async () => {
    (requirePermission as jest.Mock).mockResolvedValueOnce(undefined);
    (prefetchHrAssets as jest.Mock).mockResolvedValueOnce({
      queries: [],
      mutations: [],
    });

    await HrAssetsPage();

    expect(requirePermission).toHaveBeenCalledWith("hr:assets:view");
    expect(prefetchHrAssets).toHaveBeenCalledTimes(1);
  });
});
