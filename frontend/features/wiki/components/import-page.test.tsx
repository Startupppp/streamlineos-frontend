import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ImportPage from "./import-page";
import { ImportDryRunCard } from "./import-dry-run-card";

jest.mock("sonner", () => ({
  toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() },
}));

const { toast } = jest.requireMock("sonner") as {
  toast: { error: jest.Mock; success: jest.Mock };
};

const mockReplace = jest.fn();
const mockImportMutate = jest.fn();
const mockCancelMutate = jest.fn();
const mockUseKbImportJob = jest.fn();
let mockSearchParams = new URLSearchParams();

it("does not present the skip count as an update count in an update-policy dry run", () => {
  render(<ImportDryRunCard result={{ total: 2, wouldSucceed: 2, wouldSkip: 0, invalidItems: [] }} duplicatePolicy="update" onDismiss={jest.fn()} />);

  expect(screen.getByText("would import or update")).toBeInTheDocument();
  expect(screen.queryByText("would update")).not.toBeInTheDocument();
  expect(screen.getByText("This preview cannot separate new pages from updates.")).toBeInTheDocument();
});

it("keeps the measured duplicate skip count for skip-policy dry runs", () => {
  render(<ImportDryRunCard result={{ total: 2, wouldSucceed: 1, wouldSkip: 1, invalidItems: [] }} duplicatePolicy="skip" onDismiss={jest.fn()} />);

  expect(screen.getByText("would skip")).toBeInTheDocument();
  expect(screen.queryByText("This preview cannot separate new pages from updates.")).not.toBeInTheDocument();
});

function completeRead(reader: FileReader, result: string) {
  act(() => {
    reader.onload?.({ target: { result } } as unknown as ProgressEvent<FileReader>);
  });
}

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => mockSearchParams,
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useCanState: () => "granted",
  usePermissionGate: (permission: string) => ({
    permission,
    allowed: true,
    denied: false,
    pending: false,
  }),
}));

jest.mock("@/hooks/api/kb/pages", () => ({
  useKbPageTreeInfinite: () => ({ data: undefined, isLoading: false, hasNextPage: false, fetchNextPage: jest.fn() }),
}));

jest.mock("@/hooks/api/kb/spaces", () => ({
  useKbSpaces: () => ({ data: { data: [], pagination: { limit: 50, hasMore: false, nextCursor: null } } }),
}));

jest.mock("@/hooks/api/kb", () => ({
  useImportKbPages: () => ({ mutate: mockImportMutate, isPending: false }),
  useKbImportJob: (jobId: number | null) => mockUseKbImportJob(jobId),
  useCancelImportJob: () => ({ mutate: mockCancelMutate, isPending: false }),
  useRetryImportJob: () => ({ mutate: jest.fn(), isPending: false }),
  useDryRunImport: () => ({ mutate: jest.fn(), isPending: false, data: undefined, reset: jest.fn() }),
  useKbImportJobs: () => ({
    data: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
  }),
  useKbExportJobs: () => ({
    data: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
  }),
}));

describe("ImportPage — Import / Export tabs", () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockImportMutate.mockReset();
    mockCancelMutate.mockReset();
    mockUseKbImportJob.mockReturnValue({ data: undefined });
    toast.error.mockClear();
    toast.success.mockClear();
    mockSearchParams = new URLSearchParams();
  });

  it("shows Import tab chrome with Choose files and Paste text, not Export list", () => {
    render(<ImportPage />);

    expect(screen.getByRole("tab", { name: /^import$/i })).toHaveAttribute(
      "data-state",
      "active",
    );
    expect(screen.getByRole("button", { name: /choose files/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /paste text/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /recent imports/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^exports$/i })).toBeNull();
    expect(screen.getByText("0/100 files loaded")).toBeInTheDocument();
  });

  it("switches to Export tab via the URL", () => {
    mockSearchParams = new URLSearchParams("tab=export");
    render(<ImportPage />);

    expect(screen.getByRole("tab", { name: /^export$/i })).toHaveAttribute(
      "data-state",
      "active",
    );
    expect(screen.getByText("No exports yet")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^exports$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /choose files/i })).toBeNull();
    expect(screen.queryByRole("heading", { name: /recent imports/i })).toBeNull();
  });

  it("opens paste from the header button on the Import tab", async () => {
    const user = userEvent.setup();
    render(<ImportPage />);

    await user.click(screen.getByRole("button", { name: /paste text/i }));

    expect(screen.getByLabelText("Page title")).toBeInTheDocument();
  });

  it("names each import setting combobox for keyboard and screen reader navigation", async () => {
    const user = userEvent.setup();
    render(<ImportPage />);

    await user.click(screen.getByRole("button", { name: /paste text/i }));

    for (const name of ["Target team folder", "Parent page", "Default visibility", "Duplicate items"]) {
      expect(screen.getByRole("combobox", { name })).toBeInTheDocument();
    }
    expect(screen.getByRole("combobox", { name: "Parent page" })).toBeDisabled();
  });

  it("names the pending page remove action and removes the selected page", async () => {
    const user = userEvent.setup();
    render(<ImportPage />);

    await user.click(screen.getByRole("button", { name: /paste text/i }));
    await user.type(screen.getByRole("textbox", { name: "Page title" }), "Policy A");
    await user.type(screen.getByRole("textbox", { name: "Content" }), "Policy details");
    await user.click(screen.getByRole("button", { name: "Add to list" }));

    await user.click(screen.getByRole("button", { name: "Remove Policy A from import" }));

    expect(screen.queryByText("Policy A")).not.toBeInTheDocument();
    expect(screen.getByText("0/100 files loaded")).toBeInTheDocument();
  });

  it("writes tab=export into the URL when Export is selected", async () => {
    const user = userEvent.setup();
    render(<ImportPage />);

    await user.click(screen.getByRole("tab", { name: /^export$/i }));

    expect(mockReplace).toHaveBeenCalledWith(
      "/knowledge/wiki/import?tab=export",
      { scroll: false },
    );
  });

  it("skips unsupported file formats even when a file input supplies them directly", async () => {
    const { container } = render(<ImportPage />);
    const input = container.querySelector('input[type="file"]');
    expect(input).not.toBeNull();

    fireEvent.change(input!, {
      target: {
        files: [
          new File(["# Guide"], "guide.MD", { type: "text/markdown" }),
          new File(["binary"], "diagram.png", { type: "image/png" }),
        ],
      },
    });

    expect(await screen.findByText("1/100 files loaded")).toBeInTheDocument();
    // KB-B-019: the opening H1 is the page title, not the file name.
    expect(screen.getByText("Guide")).toBeInTheDocument();
    expect(screen.queryByText("diagram")).not.toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining("diagram.png"),
    );
  });

  it("skips a text file that exceeds the backend page-content limit", async () => {
    const { container } = render(<ImportPage />);
    const input = container.querySelector('input[type="file"]');
    expect(input).not.toBeNull();

    fireEvent.change(input!, {
      target: { files: [new File(["x".repeat(50001)], "large.md", { type: "text/markdown" })] },
    });

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("50,000-character")));
    expect(screen.getByText("0/100 files loaded")).toBeInTheDocument();
  });

  it("keeps selected files in their selection order when reads finish out of order", async () => {
    const readers: FileReader[] = [];
    const readAsText = jest.spyOn(FileReader.prototype, "readAsText").mockImplementation(function (this: FileReader) {
      readers.push(this);
    });
    try {
      const { container } = render(<ImportPage />);
      const input = container.querySelector('input[type="file"]');
      fireEvent.change(input!, {
        target: { files: [new File(["A"], "first.md"), new File(["B"], "second.md")] },
      });

      completeRead(readers[1], "B");
      completeRead(readers[0], "A");

      expect(await screen.findByText("2/100 files loaded")).toBeInTheDocument();
      const rows = screen.getAllByRole("button", { name: /Remove .* from import/ });
      expect(rows.map((row) => row.getAttribute("aria-label"))).toEqual([
        "Remove first from import",
        "Remove second from import",
      ]);
    } finally {
      readAsText.mockRestore();
    }
  });

  it("does not restore cleared pages when an earlier file read finishes later", async () => {
    const { container } = render(<ImportPage />);
    const input = container.querySelector('input[type="file"]');
    fireEvent.change(input!, {
      target: { files: [new File(["A"], "first.md")] },
    });
    expect(await screen.findByText("1/100 files loaded")).toBeInTheDocument();

    const readers: FileReader[] = [];
    const readAsText = jest.spyOn(FileReader.prototype, "readAsText").mockImplementation(function (this: FileReader) {
      readers.push(this);
    });
    try {
      fireEvent.change(input!, {
        target: { files: [new File(["B"], "late.md")] },
      });
      fireEvent.click(screen.getByRole("button", { name: "Clear all" }));

      expect(screen.getByText("0/100 files loaded")).toBeInTheDocument();
      completeRead(readers[0], "B");

      expect(screen.getByText("0/100 files loaded")).toBeInTheDocument();
      expect(screen.queryByText("late")).not.toBeInTheDocument();
    } finally {
      readAsText.mockRestore();
    }
  });

  it("keeps oversized pasted content out of the import list", async () => {
    const user = userEvent.setup();
    render(<ImportPage />);
    await user.click(screen.getByRole("button", { name: /paste text/i }));
    fireEvent.change(screen.getByLabelText("Page title"), { target: { value: "Policy" } });
    fireEvent.change(screen.getByLabelText("Content"), { target: { value: "x".repeat(50001) } });
    await user.click(screen.getByRole("button", { name: "Add to list" }));

    expect(toast.error).toHaveBeenCalledWith("Content exceeds the 50,000-character page limit");
    expect(screen.getByText("0/100 files loaded")).toBeInTheDocument();
  });

  it("shows numeric progress as the import job processes pages", async () => {
    const user = userEvent.setup();
    mockImportMutate.mockImplementation((_input, options) => {
      options.onSuccess({ jobId: 7, status: "pending" });
    });
    mockUseKbImportJob.mockReturnValue({
      data: { id: 7, status: "processing", processedItems: 1, totalItems: 3 },
    });

    const view = render(<ImportPage />);
    await user.click(screen.getByRole("button", { name: "Paste text" }));
    await user.type(screen.getByLabelText("Page title"), "Policy");
    await user.type(screen.getByLabelText("Content"), "Body");
    await user.click(screen.getByRole("button", { name: "Add to list" }));
    await user.click(screen.getByRole("button", { name: "Import 1 page" }));

    expect(screen.getByText("Processing import… 1/3 pages")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Import progress" })).toHaveAttribute(
      "aria-valuetext",
      "1 of 3 pages processed",
    );

    mockUseKbImportJob.mockReturnValue({
      data: { id: 7, status: "processing", processedItems: 2, totalItems: 3 },
    });
    view.rerender(<ImportPage />);

    expect(screen.getByText("Processing import… 2/3 pages")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Import progress" })).toHaveAttribute(
      "aria-valuetext",
      "2 of 3 pages processed",
    );
  });

  it("offers Cancel while a job is pending before processing starts", async () => {
    const user = userEvent.setup();
    mockImportMutate.mockImplementation((_input, options) => {
      options.onSuccess({ jobId: 11, status: "pending" });
    });
    mockUseKbImportJob.mockImplementation((jobId) => ({
      data: jobId === 11 ? {
        id: 11,
        status: "pending",
        processedItems: 0,
        totalItems: 1,
      } : undefined,
    }));

    render(<ImportPage />);
    await user.click(screen.getByRole("button", { name: "Paste text" }));
    await user.type(screen.getByLabelText("Page title"), "Policy");
    await user.click(screen.getByRole("button", { name: "Add to list" }));
    await user.click(screen.getByRole("button", { name: "Import 1 page" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(mockCancelMutate).toHaveBeenCalledWith(11, expect.anything());
  });

  it("reports imported, skipped, and failed counts when a partial import completes", async () => {
    const user = userEvent.setup();
    mockImportMutate.mockImplementation((_input, options) => {
      options.onSuccess({ jobId: 7, status: "pending" });
    });
    mockUseKbImportJob.mockImplementation((jobId) => ({
      data: jobId === 7 ? {
        id: 7,
        status: "completed",
        succeededItems: 1,
        duplicateItems: 1,
        failedItems: 1,
        errorReport: { failedTitles: ["Failed Policy"] },
      } : undefined,
    }));

    render(<ImportPage />);
    await user.click(screen.getByRole("button", { name: "Paste text" }));
    await user.type(screen.getByLabelText("Page title"), "Policy");
    await user.click(screen.getByRole("button", { name: "Add to list" }));
    await user.click(screen.getByRole("button", { name: "Import 1 page" }));

    expect(toast.success).toHaveBeenCalledWith(
      "Imported 1 page (1 skipped, 1 failed)",
      expect.anything(),
    );
    expect(screen.getByText("Failed Policy")).toBeInTheDocument();
  });

  it("shows failed page titles in the alert when the import job fails", async () => {
    const user = userEvent.setup();
    mockImportMutate.mockImplementation((_input, options) => {
      options.onSuccess({ jobId: 9, status: "pending" });
    });
    mockUseKbImportJob.mockImplementation((jobId) => ({
      data: jobId === 9 ? {
        id: 9,
        status: "failed",
        failedItems: 1,
        errorReport: {
          failedTitles: ["Failed Guide"],
          itemErrors: [{
            index: 0,
            title: "Failed Guide",
            code: "INVALID_SPACE",
            reason: "Choose an existing space and import again.",
          }],
        },
      } : undefined,
    }));

    render(<ImportPage />);
    await user.click(screen.getByRole("button", { name: "Paste text" }));
    await user.type(screen.getByLabelText("Page title"), "Policy");
    await user.click(screen.getByRole("button", { name: "Add to list" }));
    await user.click(screen.getByRole("button", { name: "Import 1 page" }));

    expect(screen.getByText("Failed Guide")).toBeInTheDocument();
    expect(screen.getByText("Item 1:")).toBeInTheDocument();
    expect(screen.getByText("Choose an existing space and import again.")).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith("Import failed — 1 page could not be imported");
  });

  it("keeps manual reconciliation guidance visible after the active job fails", async () => {
    const user = userEvent.setup();
    const reason = "Saved import progress cannot be mapped to individual pages. Contact support before retrying the remaining items.";
    mockImportMutate.mockImplementation((_input, options) => {
      options.onSuccess({ jobId: 12, status: "pending" });
    });
    mockUseKbImportJob.mockImplementation((jobId) => ({
      data: jobId === 12 ? {
        id: 12,
        status: "failed",
        failedItems: 0,
        errorReport: { code: "PROGRESS_RECONCILIATION_REQUIRED", reason },
      } : undefined,
    }));

    render(<ImportPage />);
    await user.click(screen.getByRole("button", { name: "Paste text" }));
    await user.type(screen.getByLabelText("Page title"), "Policy");
    await user.click(screen.getByRole("button", { name: "Add to list" }));
    await user.click(screen.getByRole("button", { name: "Import 1 page" }));

    expect(screen.getByRole("alert")).toHaveTextContent(reason);
    expect(toast.error).toHaveBeenCalledWith(reason);
  });
});
