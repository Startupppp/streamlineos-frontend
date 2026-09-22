import type { ReactNode } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { SignBulkSendJob, SignBulkSendRow, SignTemplate } from "@/types/sign";
import { BulkSendList } from "./bulk-send-list";

const grantedKeys = new Set<string>();

jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => grantedKeys.has(key),
}));

jest.mock("./create-bulk-send-dialog", () => ({
  CreateBulkSendDialog: () => <div data-testid="create-bulk-send-dialog" />,
}));

jest.mock("@/components/ui/sheet", () => ({
  Sheet: ({ open, children }: { open: boolean; children: ReactNode }) => (open ? <div>{children}</div> : null),
  SheetContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  SheetDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  SheetBody: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const TEMPLATE: SignTemplate = {
  id: 7,
  orgId: "org-1",
  name: "Vendor NDA",
  description: null,
  category: null,
  status: "published",
  version: 1,
  templateJson: {},
  createdAt: "2026-03-01T09:00:00.000Z",
  updatedAt: "2026-03-01T09:00:00.000Z",
};

const JOB: SignBulkSendJob = {
  id: 12,
  orgId: "org-1",
  templateId: 7,
  senderMembershipId: 7,
  columnMappingJson: { name: "Full Name", email: "Work Email" },
  status: "completed",
  totalCount: 500,
  successCount: 460,
  failedCount: 40,
  csvFileKey: "sign/bulk-send/12/recipients.csv",
  errorReportFileKey: "sign/bulk-send/12/errors.csv",
  createdAt: "2026-03-04T09:00:00.000Z",
  completedAt: "2026-03-04T09:20:00.000Z",
};

function makeRow(id: number, rowNumber: number, name: string, email: string, errorMessage: string | null): SignBulkSendRow {
  return {
    id,
    jobId: 12,
    rowNumber,
    rawDataJson: { "Full Name": name, "Work Email": email },
    status: errorMessage ? "failed" : "success",
    envelopeId: errorMessage ? null : 900 + id,
    errorMessage,
    createdAt: "2026-03-04T09:00:00.000Z",
    updatedAt: "2026-03-04T09:01:00.000Z",
  };
}

const FAILED_ROWS = [
  makeRow(1, 3, "Sam Iyer", "sam@@vendor.test", "Missing or invalid email"),
  makeRow(2, 9, "", "dana@vendor.test", "Missing name"),
];

jest.mock("@/hooks/api/sign/templates", () => ({
  useSignTemplates: () => ({ data: [TEMPLATE], isLoading: false }),
}));

const ALLOWED_ACCESS = { permission: "sign:bulk_send:run", allowed: true, denied: false, pending: false };

jest.mock("@/hooks/api/sign/bulk-send", () => ({
  ACTIVE_BULK_SEND_STATUSES: new Set(["pending", "validating", "running"]),
  useBulkSendJobs: () => ({ data: [JOB], isLoading: false, isError: false, refetch: jest.fn(), access: ALLOWED_ACCESS }),
  useCancelBulkSendJob: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useBulkSendJob: (jobId: number | undefined) => ({
    data: jobId === undefined ? undefined : { job: JOB, rows: FAILED_ROWS },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useBulkSendJobErrorReport: (jobId: number | undefined) => ({
    data:
      jobId === undefined
        ? undefined
        : { rows: FAILED_ROWS, failedCount: JOB.failedCount, returned: FAILED_ROWS.length, limit: 2, truncated: true },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

function renderList() {
  return render(
    <TooltipProvider>
      <BulkSendList />
    </TooltipProvider>,
  );
}

describe("BulkSendList job detail", () => {
  beforeEach(() => {
    grantedKeys.clear();
  });

  it("reaches the job's failing rows and their reasons from the jobs list", () => {
    grantedKeys.add("sign:bulk_send:run");
    renderList();

    fireEvent.click(screen.getByRole("button", { name: "Open bulk send job 12" }));

    expect(screen.getByText("Job #12")).toBeInTheDocument();
    expect(screen.getByText("Row 3")).toBeInTheDocument();
    expect(screen.getByText("Sam Iyer")).toBeInTheDocument();
    expect(screen.getByText("Missing or invalid email")).toBeInTheDocument();
    expect(screen.getByText("Missing name")).toBeInTheDocument();
  });

  it("says how much of the failure list the API actually returned", () => {
    grantedKeys.add("sign:bulk_send:run");
    renderList();

    fireEvent.click(screen.getByRole("button", { name: "Open bulk send job 12" }));

    expect(screen.getByText(/Showing 2 of 40 failed rows/)).toBeInTheDocument();
  });

  it("names the job by its template rather than by its id", () => {
    grantedKeys.add("sign:bulk_send:run");
    renderList();

    expect(screen.getAllByText("Vendor NDA").length).toBeGreaterThan(0);
  });

  it("refuses to read the job for a role without the bulk send permission", () => {
    renderList();

    fireEvent.click(screen.getByRole("button", { name: "Open bulk send job 12" }));

    expect(screen.getByText("You cannot view bulk send jobs")).toBeInTheDocument();
    expect(screen.queryByText("Missing or invalid email")).not.toBeInTheDocument();
  });
});
