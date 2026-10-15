import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ImportPage from "./import-page";

jest.mock("sonner", () => ({
  toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() },
}));

const { toast } = jest.requireMock("sonner") as {
  toast: { error: jest.Mock };
};

const mockReplace = jest.fn();
let mockSearchParams = new URLSearchParams();

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
  useImportKbPages: () => ({ mutate: jest.fn(), isPending: false }),
  useKbImportJob: () => ({ data: undefined }),
  useCancelImportJob: () => ({ mutate: jest.fn(), isPending: false }),
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
    toast.error.mockClear();
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
    expect(screen.getByText("guide")).toBeInTheDocument();
    expect(screen.queryByText("diagram")).not.toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining("diagram.png"),
    );
  });
});
