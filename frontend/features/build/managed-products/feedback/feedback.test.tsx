import { render, screen, fireEvent } from "@testing-library/react";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
  useModuleEnabled: jest.fn(() => true),
}));

jest.mock("@/hooks/api/feedbucket/use-feedbucket-submissions", () => ({
  useFeedbucketSubmissions: jest.fn(() => ({
    data: { data: [], pagination: { hasMore: false, nextCursor: null, limit: 25 } },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  })),
  useFeedbucketSubmission: jest.fn(() => ({
    data: null,
    isLoading: false,
  })),
  useCaptureSubmission: jest.fn(() => ({
    mutate: jest.fn(),
    isPending: false,
  })),
  useClassifySubmission: jest.fn(() => ({
    mutate: jest.fn(),
    isPending: false,
  })),
  useMarkDuplicate: jest.fn(() => ({
    mutate: jest.fn(),
    isPending: false,
  })),
  useUnmarkDuplicate: jest.fn(() => ({
    mutate: jest.fn(),
    isPending: false,
  })),
}));

jest.mock("@/hooks/common/use-debounce", () => ({
  useDebouncedValue: (v: string) => v,
}));

jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ setQueryData: jest.fn(), invalidateQueries: jest.fn() }),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("@/lib/get-error-message", () => ({
  getErrorMessage: jest.fn((e: unknown) => String(e)),
}));

import { CaptureSubmissionSheet } from "./capture-submission-sheet";
import { ClassifySubmissionSheet } from "./classify-submission-sheet";
import { MarkDuplicateDialog } from "./mark-duplicate-dialog";
import { LinkToOpportunityDialog } from "./link-to-opportunity-dialog";

jest.mock("./use-submission-opportunities", () => ({
  useProductOpportunitiesSearch: jest.fn(() => ({
    data: { data: [{ id: 10, title: "Speed up checkout", state: "identified" }], pagination: { hasMore: false, nextCursor: null, limit: 25 } },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  })),
  useAddEvidenceToOpportunity: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

jest.mock("@/components/ui/table-pagination", () => ({
  TablePagination: () => null,
  useCursorPager: jest.fn(() => ({
    cursor: undefined,
    pageNumber: 1,
    hasPrevious: false,
    goNext: jest.fn(),
    goPrevious: jest.fn(),
    reset: jest.fn(),
  })),
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: ({ onRetry }: { onRetry?: () => void }) => (
    <div role="alert" data-testid="error-state">
      Error loading data.
      {onRetry ? <button type="button" onClick={onRetry}>Try again</button> : null}
    </div>
  ),
}));

jest.mock("@/components/shared", () => ({
  EntityFormSheet: ({
    open,
    onOpenChange,
    title,
    children,
    _onSubmit,
    defaultValues,
    _resolver,
  }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    title: string;
    children: (form: {
      control: unknown;
      handleSubmit: (fn: (v: Record<string, string>) => void) => (e: React.FormEvent) => void;
    }) => React.ReactNode;
    _onSubmit: (v: Record<string, string>) => void;
    defaultValues: Record<string, string>;
    _resolver: unknown;
  }) => {
    if (!open) return null;
    const mockForm = {
      control: {},
      handleSubmit: (fn: (v: Record<string, string>) => void) => (e: React.FormEvent) => {
        e.preventDefault();
        fn(defaultValues ?? {});
      },
    };
    return (
      <div data-testid="entity-form-sheet">
        <h2>{title}</h2>
        {children(mockForm)}
        <button type="button" onClick={() => onOpenChange(false)} data-testid="close-sheet">Close</button>
      </div>
    );
  },
}));

jest.mock("@/components/ui/form", () => ({
  FormField: ({ render }: { render: (opts: { field: { onChange: () => void; value: string; name: string } }) => React.ReactNode }) =>
    render({ field: { onChange: jest.fn(), value: "", name: "test" } }),
  FormItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FormLabel: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
  FormControl: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FormMessage: () => null,
}));

jest.mock("@/components/ui/input", () => ({
  Input: ({ onChange, value, placeholder, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input data-testid="input" placeholder={placeholder} value={value ?? ""} onChange={onChange} {...rest} />
  ),
}));

jest.mock("@/components/ui/textarea", () => ({
  Textarea: ({ placeholder }: { placeholder?: string }) => (
    <textarea data-testid="textarea" placeholder={placeholder} />
  ),
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <div data-value={value}>{children}</div>
  ),
}));

jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/loading-button", () => ({
  LoadingButton: ({
    children,
    isPending,
    disabled,
    onClick,
  }: {
    children: React.ReactNode;
    isPending?: boolean;
    disabled?: boolean;
    onClick?: () => void;
  }) => (
    <button type="button" disabled={disabled || isPending} onClick={onClick} data-testid="loading-btn">
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button type="button" onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

const { useFeedbucketSubmissions, useMarkDuplicate } = jest.requireMock("@/hooks/api/feedbucket/use-feedbucket-submissions") as {
  useFeedbucketSubmissions: jest.Mock;
  useMarkDuplicate: jest.Mock;
};
const { useProductOpportunitiesSearch, useAddEvidenceToOpportunity } = jest.requireMock("./use-submission-opportunities") as {
  useProductOpportunitiesSearch: jest.Mock;
  useAddEvidenceToOpportunity: jest.Mock;
};
const { useCursorPager: mockUseCursorPager } = jest.requireMock("@/components/ui/table-pagination") as {
  useCursorPager: jest.Mock;
};

const DEFAULT_PAGER = {
  cursor: undefined as string | undefined,
  pageNumber: 1,
  hasPrevious: false,
  goNext: jest.fn(),
  goPrevious: jest.fn(),
  reset: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCursorPager.mockReturnValue({ ...DEFAULT_PAGER, goNext: jest.fn(), goPrevious: jest.fn(), reset: jest.fn() });
});

describe("CaptureSubmissionSheet — form validation (FE-73)", () => {
  it("renders the sheet when open", () => {
    render(
      <CaptureSubmissionSheet managedProductId={7} open onOpenChange={jest.fn()} />,
    );
    expect(screen.getByTestId("entity-form-sheet")).toBeInTheDocument();
    expect(screen.getByText("Capture feedback")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(
      <CaptureSubmissionSheet managedProductId={7} open={false} onOpenChange={jest.fn()} />,
    );
    expect(screen.queryByTestId("entity-form-sheet")).not.toBeInTheDocument();
  });
});

describe("ClassifySubmissionSheet — classification form", () => {
  it("renders when open with classify title", () => {
    render(
      <ClassifySubmissionSheet
        submissionId={1}
        open
        onOpenChange={jest.fn()}
        currentTheme="Performance"
        currentSegment="Enterprise"
      />,
    );
    expect(screen.getByText("Classify submission")).toBeInTheDocument();
  });
});

describe("MarkDuplicateDialog — duplicate search (BSN-DUP-01)", () => {
  it("shows candidates from useFeedbucketSubmissions excluding the current submission", () => {
    useFeedbucketSubmissions.mockReturnValue({
      data: {
        data: [
          { id: 10, message: "Existing feedback A" },
          { id: 20, message: "Existing feedback B" },
          { id: 5, message: "This submission itself" },
        ],
        total: 3,
      },
    });
    render(
      <MarkDuplicateDialog
        managedProductId={7}
        submissionId={5}
        open
        onOpenChange={jest.fn()}
      />,
    );
    expect(screen.getByText("Existing feedback A")).toBeInTheDocument();
    expect(screen.getByText("Existing feedback B")).toBeInTheDocument();
    expect(screen.queryByText("This submission itself")).not.toBeInTheDocument();
  });

  it("calls markDuplicate.mutate with the selected submission id when confirmed (BSN-DUP-01)", () => {
    const mockMutate = jest.fn();
    useMarkDuplicate.mockReturnValue({ mutate: mockMutate, isPending: false });
    useFeedbucketSubmissions.mockReturnValue({
      data: { data: [{ id: 10, message: "Original submission" }], total: 1 },
    });
    render(
      <MarkDuplicateDialog
        managedProductId={7}
        submissionId={5}
        open
        onOpenChange={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByText("Original submission"));
    fireEvent.click(screen.getByTestId("loading-btn"));
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ submissionId: 5, duplicateOfId: 10 }),
      expect.any(Object),
    );
  });

  it("confirm button is disabled when no candidate is selected", () => {
    useFeedbucketSubmissions.mockReturnValue({
      data: { data: [{ id: 10, message: "Candidate" }], total: 1 },
    });
    render(
      <MarkDuplicateDialog
        managedProductId={7}
        submissionId={5}
        open
        onOpenChange={jest.fn()}
      />,
    );
    expect(screen.getByTestId("loading-btn")).toBeDisabled();
  });
});

describe("LinkToOpportunityDialog — opportunity linking (BSN-OPP-01)", () => {
  it("renders opportunity candidates from useProductOpportunitiesSearch", () => {
    render(
      <LinkToOpportunityDialog
        managedProductId={7}
        submissionId={5}
        open
        onOpenChange={jest.fn()}
      />,
    );
    expect(screen.getByText("Speed up checkout")).toBeInTheDocument();
  });

  it("calls addEvidence.mutate with the correct payload when an opportunity is selected and confirmed", () => {
    const mockMutate = jest.fn();
    useAddEvidenceToOpportunity.mockReturnValue({ mutate: mockMutate, isPending: false });
    render(
      <LinkToOpportunityDialog
        managedProductId={7}
        submissionId={5}
        open
        onOpenChange={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByText("Speed up checkout"));
    fireEvent.click(screen.getByTestId("loading-btn"));
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        managedProductId: 7,
        opportunityId: 10,
        submissionId: 5,
      }),
      expect.any(Object),
    );
  });

  it("confirm button is disabled when no opportunity is selected", () => {
    render(
      <LinkToOpportunityDialog
        managedProductId={7}
        submissionId={5}
        open
        onOpenChange={jest.fn()}
      />,
    );
    expect(screen.getByTestId("loading-btn")).toBeDisabled();
  });
});

describe("MarkDuplicateDialog — error and retry states (MP-02)", () => {
  it("renders an error state with retry when the submission list fails, so a failed read is never reported as no matching submissions", () => {
    const mockRefetch = jest.fn();
    useFeedbucketSubmissions.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Network error"),
      refetch: mockRefetch,
    });
    render(<MarkDuplicateDialog managedProductId={7} submissionId={5} open onOpenChange={jest.fn()} />);
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
    expect(screen.queryByText(/No submissions found/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it("keeps the dialog open and preserves search text when retrying after a failed submission list fetch", () => {
    useFeedbucketSubmissions.mockReturnValue({
      data: undefined, isLoading: false, isError: true, error: new Error("err"), refetch: jest.fn(),
    });
    const onOpenChange = jest.fn();
    render(<MarkDuplicateDialog managedProductId={7} submissionId={5} open onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("shows the empty list when the submission list succeeds with no results, not the error state", () => {
    useFeedbucketSubmissions.mockReturnValue({
      data: { data: [], pagination: { hasMore: false, nextCursor: null, limit: 25 } },
      isLoading: false, isError: false, error: null, refetch: jest.fn(),
    });
    render(<MarkDuplicateDialog managedProductId={7} submissionId={5} open onOpenChange={jest.fn()} />);
    expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
    expect(screen.getByText("No submissions found.")).toBeInTheDocument();
  });
});

describe("MarkDuplicateDialog — server-side search and cursor pagination (MP-03)", () => {
  it("sends typed search to the server rather than filtering one local page, so results the server knows about appear", () => {
    render(<MarkDuplicateDialog managedProductId={7} submissionId={5} open onOpenChange={jest.fn()} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "crash" } });
    expect(useFeedbucketSubmissions).toHaveBeenCalledWith(
      expect.objectContaining({ search: "crash", managedProductId: 7 }),
    );
  });

  it("passes the cursor from useCursorPager to the query so submissions beyond the first page are reachable", () => {
    mockUseCursorPager.mockReturnValue({
      cursor: "next-page-cursor",
      pageNumber: 2,
      hasPrevious: true,
      goNext: jest.fn(),
      goPrevious: jest.fn(),
      reset: jest.fn(),
    });
    useFeedbucketSubmissions.mockReturnValue({
      data: { data: [{ id: 99, message: "Page two submission" }], pagination: { hasMore: false, nextCursor: null, limit: 25 } },
      isLoading: false, isError: false, error: null, refetch: jest.fn(),
    });
    render(<MarkDuplicateDialog managedProductId={7} submissionId={5} open onOpenChange={jest.fn()} />);
    expect(useFeedbucketSubmissions).toHaveBeenCalledWith(
      expect.objectContaining({ cursor: "next-page-cursor" }),
    );
    expect(screen.getByText("Page two submission")).toBeInTheDocument();
  });
});

describe("LinkToOpportunityDialog — error and retry states (MP-02)", () => {
  it("renders an error state with retry when the opportunity list fails, so a failed read is never reported as no matching opportunities", () => {
    const mockRefetch = jest.fn();
    useProductOpportunitiesSearch.mockReturnValue({
      data: undefined, isLoading: false, isError: true, error: new Error("fail"), refetch: mockRefetch,
    });
    render(<LinkToOpportunityDialog managedProductId={7} submissionId={5} open onOpenChange={jest.fn()} />);
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
    expect(screen.queryByText(/No opportunities found/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it("keeps the dialog open when retrying after a failed opportunity list fetch", () => {
    useProductOpportunitiesSearch.mockReturnValue({
      data: undefined, isLoading: false, isError: true, error: new Error("fail"), refetch: jest.fn(),
    });
    const onOpenChange = jest.fn();
    render(<LinkToOpportunityDialog managedProductId={7} submissionId={5} open onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("shows the empty list when opportunities succeed with no results, not the error state", () => {
    useProductOpportunitiesSearch.mockReturnValue({
      data: { data: [], pagination: { hasMore: false, nextCursor: null, limit: 25 } },
      isLoading: false, isError: false, error: null, refetch: jest.fn(),
    });
    render(<LinkToOpportunityDialog managedProductId={7} submissionId={5} open onOpenChange={jest.fn()} />);
    expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
    expect(screen.getByText("No opportunities found.")).toBeInTheDocument();
  });
});

describe("LinkToOpportunityDialog — server-side search and cursor pagination (MP-03)", () => {
  it("sends typed search to the server rather than filtering one local page, so opportunities only the server knows about appear", () => {
    render(<LinkToOpportunityDialog managedProductId={7} submissionId={5} open onOpenChange={jest.fn()} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "checkout" } });
    expect(useProductOpportunitiesSearch).toHaveBeenCalledWith(
      7, "checkout", true, expect.objectContaining({}),
    );
  });

  it("passes cursor from useCursorPager to the query so opportunities beyond the first page are reachable", () => {
    mockUseCursorPager.mockReturnValue({
      cursor: "opp-page-2",
      pageNumber: 2,
      hasPrevious: true,
      goNext: jest.fn(),
      goPrevious: jest.fn(),
      reset: jest.fn(),
    });
    useProductOpportunitiesSearch.mockReturnValue({
      data: { data: [{ id: 55, title: "Second page opp", state: "validated" }], pagination: { hasMore: false, nextCursor: null, limit: 25 } },
      isLoading: false, isError: false, error: null, refetch: jest.fn(),
    });
    render(<LinkToOpportunityDialog managedProductId={7} submissionId={5} open onOpenChange={jest.fn()} />);
    expect(useProductOpportunitiesSearch).toHaveBeenCalledWith(
      7, expect.any(String), true, expect.objectContaining({ cursor: "opp-page-2" }),
    );
    expect(screen.getByText("Second page opp")).toBeInTheDocument();
  });
});
