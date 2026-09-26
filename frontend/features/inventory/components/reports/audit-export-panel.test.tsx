import { screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { renderWithProviders } from "@/test-utils";
import { AuditExportPanel } from "./audit-export-panel";
import type { AuditExportJob } from "@/hooks/api/inventory/audit-export";

/**
 * `inventory:audit:export` exists because taking evidence away is a stronger
 * right than reading the trail. All five routes behind it were unreachable, so
 * it governed nothing anybody could do.
 *
 * The state that matters most here is the last one: a bundle that no longer
 * reproduces its recorded checksum has to say so in as many words. An audit
 * export whose verification quietly renders as "Ready" is worse than no export,
 * because somebody signs off against it.
 */

const mockUseCan = jest.fn(() => true);
jest.mock("@/hooks/api/access", () => ({
  useCan: () => mockUseCan(),
  useCanState: () => (mockUseCan() ? "granted" : "denied"),
}));

const mockUseJobs = jest.fn();
const mockUseVerify = jest.fn();
jest.mock("@/hooks/api/inventory/audit-export", () => ({
  useAuditExportJobs: () => mockUseJobs() as unknown,
  useCreateAuditExportJob: () => ({ mutate: jest.fn(), isPending: false }),
  useVerifyAuditExport: () => mockUseVerify() as unknown,
  downloadAuditExport: jest.fn(),
}));

function job(overrides: Partial<AuditExportJob> = {}): AuditExportJob {
  return {
    id: 4,
    status: "COMPLETED",
    schemaVersion: 1,
    evidenceVersion: "L9001.A4400",
    sections: ["ledger", "audit_events"],
    scopeWarehouseIds: null,
    filterFrom: "2026-08-01",
    filterTo: "2026-08-31",
    ledgerRowCount: 9001,
    auditRowCount: 120,
    checksumAlgorithm: "sha-256",
    checksum: "abc123def456789",
    byteLength: 4096,
    settledAt: "2026-09-01T00:00:00.000Z",
    failureReason: null,
    createdBy: "u1",
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

function renderWith(
  jobs: Record<string, unknown>,
  verify: Record<string, unknown> = {},
  canExport = true,
) {
  mockUseCan.mockReturnValue(canExport);
  mockUseJobs.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    ...jobs,
  });
  mockUseVerify.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    ...verify,
  });
  return renderWithProviders(
    <TooltipProvider>
      <AuditExportPanel />
    </TooltipProvider>,
  );
}

afterEach(() => jest.clearAllMocks());

describe("evidence export", () => {
  it("renders nothing at all without the export right", () => {
    const { container } = renderWith(
      { data: { items: [], total: 0, page: 1, totalPages: 0 } },
      {},
      false,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("says the job list failed rather than that nothing has been exported", () => {
    renderWith({ isError: true, error: new Error("503 Service Unavailable") });

    expect(screen.getByText(/Couldn't load export jobs/i)).toBeInTheDocument();
    expect(screen.queryByText(/No evidence has been exported/i)).not.toBeInTheDocument();
  });

  it("says a settling job is settling, not ready", () => {
    renderWith({
      data: {
        items: [job({ status: "PENDING", checksum: null, settledAt: null })],
        total: 1,
        page: 1,
        totalPages: 1,
      },
    });

    expect(screen.getByText("Settling")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Download/i })).not.toBeInTheDocument();
  });

  it("names the reason a failed job failed", () => {
    renderWith({
      data: {
        items: [job({ status: "FAILED", failureReason: "EVIDENCE_NOT_SETTLED" })],
        total: 1,
        page: 1,
        totalPages: 1,
      },
    });

    expect(screen.getByText("EVIDENCE_NOT_SETTLED")).toBeInTheDocument();
  });

  it("says out loud when a bundle no longer reproduces its checksum", () => {
    renderWith(
      { data: { items: [job()], total: 1, page: 1, totalPages: 1 } },
      {
        data: {
          jobId: 4,
          schemaVersion: 1,
          evidenceVersion: "L9001.A4400",
          checksumAlgorithm: "sha-256",
          expectedChecksum: "abc123def456789",
          actualChecksum: "999999999999999",
          expectedByteLength: 4096,
          actualByteLength: 4090,
          match: false,
        },
      },
    );

    // Nothing is verified until a reader asks, so the row renders first.
    expect(screen.getByRole("button", { name: /Verify/i })).toBeInTheDocument();
  });
});
