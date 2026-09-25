import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { BulkJob, BulkJobRow } from "@/hooks/api/hr/reporting-line-bulk-jobs-schema";
import type { PageStateResolution } from "@/lib/page-state/resolve-page-state";
import { BulkPreviewForm } from "./bulk-preview-form";
import { BulkCommitPanel } from "./bulk-commit-panel";
import { BulkReportingChangePage } from "./bulk-reporting-change-page";

const createMutate = jest.fn();
const commitMutate = jest.fn();
const pageState = jest.fn<PageStateResolution, []>();

jest.mock("@/hooks/api/hr/reporting-line-bulk-jobs", () => ({
  useCreateReportingLineBulkJob: () => ({ mutate: createMutate, isPending: false }),
  useCommitReportingLineBulkJob: () => ({ mutate: commitMutate, isPending: false }),
  useReportingLineBulkJob: () => ({ data: undefined }),
  useReportingLineBulkJobs: () => ({ data: { items: [], nextCursor: null }, isLoading: false, isError: false, error: null, refetch: jest.fn() }),
  downloadReportingLineBulkJobFailures: jest.fn(),
}));
jest.mock("@/hooks/api/use-page-state", () => ({ usePageState: () => pageState() }));
jest.mock("./bulk-reporting-change-wizard", () => ({ BulkReportingChangeWizard: () => <div>wizard</div> }));

function row(overrides: Partial<BulkJobRow>): BulkJobRow {
  return {
    rowNumber: 1,
    employeeEmail: "priya@example.com",
    employee: { userId: "u-p", name: "Priya Sharma", email: "priya@example.com", designation: null, state: "active" },
    currentPrimary: { userId: "u-o", name: "Old Lead", email: null, designation: null, state: "active" },
    requestedPrimary: { userId: "u-n", name: "New Lead", email: null, designation: null, state: "active" },
    secondaryChanges: [],
    changesLast24h: 0,
    requiresRowReason: false,
    status: "READY",
    codes: [],
    message: null,
    ...overrides,
  };
}

function job(overrides: Partial<BulkJob>): BulkJob {
  return {
    jobId: "11111111-1111-4111-8111-111111111111",
    status: "PREVIEWED",
    jobReason: "Engineering reorganisation",
    rowCount: 2,
    readyCount: 1,
    warningCount: 1,
    errorCount: 0,
    committedCount: 0,
    requiresConfirmation: false,
    confirmationPhrase: null,
    createdAt: "2026-09-26T00:00:00Z",
    committedAt: null,
    rows: [row({}), row({ rowNumber: 2, employeeEmail: "sam@example.com", employee: null, status: "WARNING", codes: ["PRIMARY_CHANGE_THRESHOLD_EXCEEDED"], message: "Fourth change today", changesLast24h: 3, requiresRowReason: true })],
    nextRowCursor: null,
    ...overrides,
  };
}

beforeEach(() => {
  createMutate.mockReset();
  commitMutate.mockReset();
});

describe("bulk preview form", () => {
  const source = { kind: "selection" as const, employeeUserIds: ["u-a"], primaryManagerUserId: "u-m" };

  it("blocks the preview until the job reason has 10 characters", async () => {
    const user = userEvent.setup();
    render(<BulkPreviewForm source={source} onPreviewed={jest.fn()} />);
    await user.type(screen.getByLabelText("Reason for this change"), "too short");
    await user.click(screen.getByRole("button", { name: "Preview changes" }));
    expect(await screen.findByText("Explain the change in at least 10 characters")).toBeInTheDocument();
    expect(createMutate).not.toHaveBeenCalled();
  });

  it("previews with the reason and leaves a blank date to the server", async () => {
    const user = userEvent.setup();
    render(<BulkPreviewForm source={source} onPreviewed={jest.fn()} />);
    await user.type(screen.getByLabelText("Reason for this change"), "Platform team split");
    await user.click(screen.getByRole("button", { name: "Preview changes" }));
    await waitFor(() =>
      expect(createMutate).toHaveBeenCalledWith(
        { jobReason: "Platform team split", employeeUserIds: ["u-a"], primaryManagerUserId: "u-m" },
        expect.anything(),
      ),
    );
  });

  it("cannot preview without a source", () => {
    render(<BulkPreviewForm source={null} onPreviewed={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Preview changes" })).toBeDisabled();
  });
});

describe("bulk commit panel", () => {
  it("shows each row's status, codes and message", () => {
    render(<BulkCommitPanel job={job({})} onStartOver={jest.fn()} />);
    const table = within(screen.getByRole("table"));
    expect(table.getByText("Priya Sharma")).toBeInTheDocument();
    expect(table.getByText("Ready")).toBeInTheDocument();
    expect(table.getByText("Warning")).toBeInTheDocument();
    expect(table.getByText("PRIMARY_CHANGE_THRESHOLD_EXCEEDED")).toBeInTheDocument();
    expect(table.getByText("Fourth change today")).toBeInTheDocument();
  });

  it("requires a reason for a threshold-exceeding row before committing, then sends it", async () => {
    const user = userEvent.setup();
    render(<BulkCommitPanel job={job({})} onStartOver={jest.fn()} />);
    await user.click(screen.getByRole("button", { name: "Commit 2 changes" }));
    expect(commitMutate).not.toHaveBeenCalled();
    expect(await screen.findByText("Give a reason of at least 10 characters")).toBeInTheDocument();
    expect(screen.getByLabelText("Reason for sam@example.com")).toHaveAccessibleDescription("Give a reason of at least 10 characters");

    await user.type(screen.getByLabelText("Reason for sam@example.com"), "Correcting a data error");
    await user.click(screen.getByRole("button", { name: "Commit 2 changes" }));
    expect(commitMutate).toHaveBeenCalledWith(
      { jobId: job({}).jobId, rowReasons: [{ rowNumber: 2, reason: "Correcting a data error" }] },
      expect.anything(),
    );
    // Below the threshold there is no phrase to type.
    expect(screen.queryByText(/to confirm\./)).not.toBeInTheDocument();
  });

  it("gates a 10+ employee commit behind the server's confirmation phrase", async () => {
    const user = userEvent.setup();
    const large = job({
      readyCount: 12,
      warningCount: 0,
      rowCount: 12,
      requiresConfirmation: true,
      confirmationPhrase: "CONFIRM 12",
      rows: [row({})],
    });
    render(<BulkCommitPanel job={large} onStartOver={jest.fn()} />);
    await user.click(screen.getByRole("button", { name: "Commit 12 changes" }));

    const dialog = await screen.findByRole("alertdialog");
    const confirm = screen.getAllByRole("button", { name: "Commit 12 changes" }).at(-1);
    expect(confirm).toBeDisabled();
    await user.type(screen.getByRole("textbox", { name: "Confirmation" }), "CONFIRM 11");
    expect(confirm).toBeDisabled();
    expect(commitMutate).not.toHaveBeenCalled();

    await user.clear(screen.getByRole("textbox", { name: "Confirmation" }));
    await user.type(screen.getByRole("textbox", { name: "Confirmation" }), "CONFIRM 12");
    expect(confirm).toBeEnabled();
    await user.click(confirm!);
    expect(dialog).toBeInTheDocument();
    expect(commitMutate).toHaveBeenCalledWith({ jobId: large.jobId, confirmationPhrase: "CONFIRM 12" }, expect.anything());
  });
});

describe("bulk reporting change page access", () => {
  it("shows the wizard to a permitted user", () => {
    pageState.mockReturnValue({ kind: "ready" });
    render(<BulkReportingChangePage />);
    expect(screen.getByText("wizard")).toBeInTheDocument();
  });

  it("shows a denial, not the wizard, without hr:reporting-lines:manage", () => {
    pageState.mockReturnValue({ kind: "denied", permission: "hr:reporting-lines:manage" });
    render(<BulkReportingChangePage />);
    expect(screen.queryByText("wizard")).not.toBeInTheDocument();
    expect(screen.queryByText("Recent jobs")).not.toBeInTheDocument();
  });
});
