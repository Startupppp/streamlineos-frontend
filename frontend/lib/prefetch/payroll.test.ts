jest.mock("server-only", () => ({}));

jest.mock("@/lib/rbac/require-permission", () => ({
  requirePermission: jest.fn(),
}));

jest.mock("@/lib/prefetch/payroll", () => ({
  prefetchPayrollRuns: jest.fn(),
}));

jest.mock("@/features/payroll/runs/runs-page-content", () => ({
  RunsPageContent: () => null,
}));

import { requirePermission } from "@/lib/rbac/require-permission";
import { prefetchPayrollRuns } from "@/lib/prefetch/payroll";
import PayrollRunsPage from "@/app/(authenticated)/payroll/runs/page";

describe("PayrollRunsPage — permission check precedes data prefetch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not call prefetchPayrollRuns when the permission check redirects", async () => {
    const redirectError = Object.assign(new Error("NEXT_REDIRECT"), {
      digest: "NEXT_REDIRECT",
    });
    (requirePermission as jest.Mock).mockRejectedValueOnce(redirectError);

    await expect(PayrollRunsPage()).rejects.toMatchObject({
      digest: "NEXT_REDIRECT",
    });

    expect(prefetchPayrollRuns).not.toHaveBeenCalled();
  });

  it("calls prefetchPayrollRuns only after the permission check resolves", async () => {
    (requirePermission as jest.Mock).mockResolvedValueOnce(undefined);
    (prefetchPayrollRuns as jest.Mock).mockResolvedValueOnce({
      queries: [],
      mutations: [],
    });

    await PayrollRunsPage();

    expect(requirePermission).toHaveBeenCalledWith("payroll:runs:view");
    expect(prefetchPayrollRuns).toHaveBeenCalledTimes(1);
  });
});
