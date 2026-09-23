import { fireEvent, render, screen } from "@testing-library/react";
import { SubmissionBulkToolbar } from "./submission-bulk-toolbar";

const mockUseCan = jest.fn();
const mockMutate = jest.fn();

jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => mockUseCan(key),
}));

jest.mock("@/hooks/api/feedbucket", () => ({
  useBulkMutateFeedbucketSubmissions: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();

jest.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

jest.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button data-testid="ghost-button" onClick={onClick}>
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/loading-button", () => ({
  LoadingButton: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button data-testid="delete-selected" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: ({
    open,
    onConfirm,
    title,
  }: {
    open: boolean;
    onConfirm: () => void;
    title: string;
  }) =>
    open ? (
      <div data-testid="confirm-dialog">
        <span data-testid="confirm-title">{title}</span>
        <button data-testid="confirm-delete" onClick={onConfirm}>
          confirm
        </button>
      </div>
    ) : null,
}));

jest.mock("@/components/ui/user-combobox", () => ({
  UserCombobox: ({
    onChange,
    disabled,
  }: {
    onChange: (value: string) => void;
    disabled?: boolean;
  }) => (
    <button
      data-testid="assign-combobox"
      disabled={disabled}
      onClick={() => onChange("user-b")}
    />
  ),
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    onValueChange,
    disabled,
  }: {
    children: React.ReactNode;
    onValueChange?: (v: string) => void;
    disabled?: boolean;
  }) => (
    <div data-testid="select" data-disabled={String(!!disabled)}>
      {children}
      <button
        data-testid="select-pick"
        disabled={disabled}
        onClick={() => onValueChange?.("resolved")}
      />
      <button
        data-testid="select-pick-priority"
        disabled={disabled}
        onClick={() => onValueChange?.("high")}
      />
    </div>
  ),
  SelectTrigger: ({ children, "aria-label": ariaLabel }: { children: React.ReactNode; "aria-label"?: string }) => (
    <div aria-label={ariaLabel}>{children}</div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

const FILTERS = { widgetId: 7, status: "open" } as const;

function grantAll(key: string): boolean {
  return (
    key === "feedbucket:submissions:update" ||
    key === "feedbucket:submissions:assign" ||
    key === "feedbucket:submissions:delete"
  );
}

function renderToolbar(selectedIds: number[] = [1, 2], onClear = jest.fn()) {
  render(
    <SubmissionBulkToolbar
      selectedIds={selectedIds}
      filters={FILTERS}
      onClearSelection={onClear}
    />,
  );
  return onClear;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCan.mockImplementation(grantAll);
});

describe("SubmissionBulkToolbar — control gating", () => {
  it("renders no status or priority control for an actor without feedbucket:submissions:update", () => {
    mockUseCan.mockReturnValue(false);
    renderToolbar();

    expect(screen.queryAllByTestId("select")).toHaveLength(0);
  });

  it("renders the status and priority controls for an actor who does hold feedbucket:submissions:update", () => {
    mockUseCan.mockImplementation((key: string) => key === "feedbucket:submissions:update");
    renderToolbar();

    expect(screen.queryAllByTestId("select")).toHaveLength(2);
  });

  it("renders no assign control for an actor without feedbucket:submissions:assign", () => {
    mockUseCan.mockImplementation((key: string) => key === "feedbucket:submissions:update");
    renderToolbar();

    expect(screen.queryByTestId("assign-combobox")).not.toBeInTheDocument();
  });

  it("renders the assign control for an actor who does hold feedbucket:submissions:assign", () => {
    mockUseCan.mockImplementation((key: string) => key === "feedbucket:submissions:assign");
    renderToolbar();

    expect(screen.getByTestId("assign-combobox")).toBeInTheDocument();
  });

  it("renders no delete control for an actor without feedbucket:submissions:delete", () => {
    mockUseCan.mockImplementation((key: string) => key === "feedbucket:submissions:update");
    renderToolbar();

    expect(screen.queryByTestId("delete-selected")).not.toBeInTheDocument();
  });

  it("renders the delete control for an actor who does hold feedbucket:submissions:delete", () => {
    mockUseCan.mockImplementation((key: string) => key === "feedbucket:submissions:delete");
    renderToolbar();

    expect(screen.getByTestId("delete-selected")).toBeInTheDocument();
  });
});

describe("SubmissionBulkToolbar — the action carries the same predicate as the list", () => {
  it("sends the selected ids, the status action and the live list filters", () => {
    renderToolbar([1, 2]);

    fireEvent.click(screen.getAllByTestId("select-pick")[0]);

    expect(mockMutate).toHaveBeenCalledWith(
      {
        submissionIds: [1, 2],
        action: { type: "status", status: "resolved" },
        filters: FILTERS,
      },
      expect.anything(),
    );
  });

  it("sends a priority action with the same filters", () => {
    renderToolbar([3]);

    fireEvent.click(screen.getAllByTestId("select-pick-priority")[1]);

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        submissionIds: [3],
        action: { type: "priority", priority: "high" },
        filters: FILTERS,
      }),
      expect.anything(),
    );
  });

  it("sends an assign action carrying the chosen member", () => {
    renderToolbar([4]);

    fireEvent.click(screen.getByTestId("assign-combobox"));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ action: { type: "assign", assigneeId: "user-b" } }),
      expect.anything(),
    );
  });
});

describe("SubmissionBulkToolbar — destructive confirmation", () => {
  it("does not send a delete until the destructive confirmation is accepted", () => {
    renderToolbar([1, 2]);

    fireEvent.click(screen.getByTestId("delete-selected"));

    expect(mockMutate).not.toHaveBeenCalled();
    expect(screen.getByTestId("confirm-title")).toHaveTextContent("Delete 2 submissions?");
  });

  it("sends the delete action once the confirmation is accepted", () => {
    renderToolbar([1, 2]);

    fireEvent.click(screen.getByTestId("delete-selected"));
    fireEvent.click(screen.getByTestId("confirm-delete"));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ action: { type: "delete" } }),
      expect.anything(),
    );
  });
});

describe("SubmissionBulkToolbar — partial outcomes are reported, not rounded up", () => {
  function successWith(result: { requested: number; succeeded: number; skipped: number }) {
    mockMutate.mockImplementation((_input, handlers) => {
      handlers.onSuccess({ ...result, results: [] });
    });
  }

  it("names only the rows the server actually changed when some were skipped", () => {
    successWith({ requested: 2, succeeded: 1, skipped: 1 });
    renderToolbar([1, 2]);

    fireEvent.click(screen.getAllByTestId("select-pick")[0]);

    expect(mockToastSuccess).toHaveBeenCalledWith(expect.stringContaining("1 of 2 updated"));
    expect(mockToastSuccess).toHaveBeenCalledWith(expect.stringContaining("1 no longer matched"));
  });

  it("does not mention skipped rows when every target was changed", () => {
    successWith({ requested: 2, succeeded: 2, skipped: 0 });
    renderToolbar([1, 2]);

    fireEvent.click(screen.getAllByTestId("select-pick")[0]);

    expect(mockToastSuccess).toHaveBeenCalledWith("2 of 2 updated");
  });

  it("clears the selection after a successful bulk so the toolbar cannot re-fire a stale set", () => {
    successWith({ requested: 1, succeeded: 1, skipped: 0 });
    const onClear = renderToolbar([1]);

    fireEvent.click(screen.getAllByTestId("select-pick")[0]);

    expect(onClear).toHaveBeenCalledTimes(1);
  });
});

describe("SubmissionBulkToolbar — the 100-row ceiling is visible, not just enforced server-side", () => {
  const OVER_CAP = Array.from({ length: 101 }, (_, index) => index + 1);

  it("disables every bulk control when more than 100 rows are selected", () => {
    renderToolbar(OVER_CAP);

    expect(screen.getByTestId("delete-selected")).toBeDisabled();
    expect(screen.getByTestId("assign-combobox")).toBeDisabled();
    expect(screen.getAllByTestId("select-pick")[0]).toBeDisabled();
  });

  it("states the ceiling so the disabled controls are explained rather than mysterious", () => {
    renderToolbar(OVER_CAP);

    expect(screen.getByText(/at most 100 submissions/)).toBeInTheDocument();
  });

  it("leaves the controls enabled at exactly 100 rows, so the ceiling is inclusive", () => {
    renderToolbar(Array.from({ length: 100 }, (_, index) => index + 1));

    expect(screen.getByTestId("delete-selected")).not.toBeDisabled();
    expect(screen.getAllByTestId("select-pick")[0]).not.toBeDisabled();
  });

  it("labels the selection as this page's rows, so a bulk is never read as acting on the whole result set", () => {
    renderToolbar([1, 2, 3]);

    expect(screen.getByText("3 selected on this page")).toBeInTheDocument();
  });
});
